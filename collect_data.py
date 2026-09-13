#!/usr/bin/env python3
"""Download, validate, and atomically publish Taiwan Lottery draw data."""

from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import os
import sys
import tempfile
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path


API_BASE = "https://api.taiwanlottery.com/TLCAPIWeB/Lottery"
DOWNLOAD_URL = f"{API_BASE}/ResultDownload"
SOURCE_URL = "https://www.taiwanlottery.com/lotto/history/result_download/"
BASE_COLUMNS = ["draw_no", "draw_date"]
VALUE_COLUMNS = ["sales_amount", "sales_count", "total_prize"]


@dataclass(frozen=True)
class GameConfig:
    key: str
    name: str
    api_endpoint: str
    api_result_key: str
    number_count: int
    number_max: int
    output_name: str
    special_csv_column: str | None = None
    special_max: int | None = None
    start_year: int = 2007
    number_min: int = 1
    unique_numbers: bool = True

    @property
    def number_columns(self) -> list[str]:
        return [f"number_{index}" for index in range(1, self.number_count + 1)]

    @property
    def output_columns(self) -> list[str]:
        special = ["special_number"] if self.special_max else []
        return [*BASE_COLUMNS, *self.number_columns, *special, *VALUE_COLUMNS]


GAMES = {
    config.key: config
    for config in (
        GameConfig("daily539", "今彩539", "Daily539Result", "daily539Res", 5, 39, "daily_cash.csv"),
        GameConfig("lotto649", "大樂透", "Lotto649Result", "lotto649Res", 6, 49, "lotto649.csv", "特別號", 49),
        GameConfig("power638", "威力彩", "SuperLotto638Result", "superLotto638Res", 6, 38, "super_lotto638.csv", "第二區", 8, 2008),
        GameConfig("markSix39", "39樂合彩", "39M5Result", "m539Res", 5, 39, "39_m5.csv", None, None, 2010),
        GameConfig("markSix49", "49樂合彩", "49M6Result", "m649Res", 6, 49, "49_m6.csv"),
        GameConfig("threeStar", "3星彩", "3DResult", "lotto3DRes", 3, 9, "3_d.csv", None, None, 2007, 0, False),
        GameConfig("fourStar", "4星彩", "4DResult", "lotto4DRes", 4, 9, "4_d.csv", None, None, 2007, 0, False),
    )
}


def annual_game_names(config: GameConfig) -> set[str]:
    aliases = {
        "threeStar": {"3星彩", "三星彩"},
        "fourStar": {"4星彩", "四星彩"},
    }
    return aliases.get(config.key, {config.name})


def validate_row(row: dict[str, object], source: str, config: GameConfig = GAMES["daily539"]) -> dict[str, str]:
    draw_no = str(row.get("draw_no", "")).strip()
    if not draw_no.isdigit():
        raise ValueError(f"{source} has an invalid draw number: {draw_no!r}")

    raw_date = str(row.get("draw_date", "")).strip().replace("/", "-")
    try:
        draw_date = datetime.strptime(raw_date, "%Y-%m-%d").date().isoformat()
    except ValueError as exc:
        raise ValueError(f"{source} has an invalid date: {raw_date!r}") from exc

    actual_number_columns = {key for key in row if key.startswith("number_")}
    if actual_number_columns != set(config.number_columns):
        raise ValueError(f"{source} must contain exactly {config.number_count} main numbers")

    numbers: list[int] = []
    for column in config.number_columns:
        value = str(row.get(column, "")).strip()
        if not value.isdigit() or not config.number_min <= int(value) <= config.number_max:
            raise ValueError(f"{source} has an invalid main number: {value!r}")
        numbers.append(int(value))
    if config.unique_numbers and len(set(numbers)) != config.number_count:
        raise ValueError(f"{source} has duplicate main numbers: {numbers}")

    if config.special_max:
        value = str(row.get("special_number", "")).strip()
        if not value.isdigit() or not 1 <= int(value) <= config.special_max:
            raise ValueError(f"{source} has an invalid special/second-zone number: {value!r}")
        if config.key == "lotto649" and int(value) in numbers:
            raise ValueError(f"{source} has a special number duplicated in the main numbers: {value}")

    normalized = {column: str(row.get(column, "")).strip() for column in config.output_columns}
    normalized["draw_no"] = draw_no
    normalized["draw_date"] = draw_date
    for column, number in zip(config.number_columns, numbers):
        normalized[column] = str(number) if config.number_min == 0 else f"{number:02d}"
    if config.special_max:
        normalized["special_number"] = f"{int(str(row['special_number']).strip()):02d}"
    return normalized


def request_bytes(url: str, timeout: int = 60) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "taiwan-lottery-data-collector/1.1"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def download_year(year: int) -> bytes:
    payload = json.loads(request_bytes(f"{DOWNLOAD_URL}?year={year}"))
    path = payload.get("content", {}).get("path")
    if payload.get("rtCode") != 0 or not path:
        raise RuntimeError(f"Result download API failed for {year}: {payload}")
    return request_bytes(path)


def recent_months(count: int = 2) -> list[str]:
    today = date.today()
    year, month = today.year, today.month
    months = []
    for _ in range(count):
        months.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    return months


def parse_year(zip_bytes: bytes, year: int, configs: list[GameConfig]) -> dict[str, list[dict[str, str]]]:
    parsed: dict[str, list[dict[str, str]]] = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
        for member in archive.infolist():
            if member.is_dir() or not member.filename.lower().endswith(".csv"):
                continue
            rows = list(csv.DictReader(io.StringIO(archive.read(member).decode("utf-8-sig"))))
            if not rows:
                continue
            game_name = rows[0].get("遊戲名稱", "").strip()
            config = next((item for item in configs if game_name in annual_game_names(item)), None)
            if not config:
                continue
            normalized = []
            for row in rows:
                if row.get("遊戲名稱", "").strip() not in annual_game_names(config):
                    continue
                raw = {
                    "draw_no": row.get("期別", ""),
                    "draw_date": row.get("開獎日期", ""),
                    **{column: row.get(f"獎號{index}", "") for index, column in enumerate(config.number_columns, 1)},
                    "sales_amount": row.get("銷售總額", ""),
                    "sales_count": row.get("銷售注數", ""),
                    "total_prize": row.get("總獎金", ""),
                }
                if config.special_csv_column:
                    raw["special_number"] = row.get(config.special_csv_column, "")
                normalized.append(validate_row(raw, f"{year} {config.name}", config))
            parsed[config.key] = normalized

    missing = [config.name for config in configs if not parsed.get(config.key)]
    if missing:
        raise RuntimeError(f"{year} ZIP is missing game data: {', '.join(missing)}")
    return parsed


def download_recent(config: GameConfig) -> list[dict[str, str]]:
    rows = []
    for month in recent_months():
        query = f"month={month}&endMonth={month}&pageNum=1&pageSize=200"
        payload = json.loads(request_bytes(f"{API_BASE}/{config.api_endpoint}?{query}"))
        content = payload.get("content")
        if payload.get("rtCode") != 0 or not isinstance(content, dict):
            raise RuntimeError(f"Recent API failed for {config.name} {month}: {payload}")
        results = content.get(config.api_result_key)
        if not isinstance(results, list):
            raise RuntimeError(f"Recent API returned invalid data for {config.name} {month}: {payload}")
        for item in results:
            values = item.get("drawNumberSize") or item.get("drawNumberAppear")
            expected_count = config.number_count + (1 if config.special_max else 0)
            if not isinstance(values, list) or len(values) != expected_count:
                raise ValueError(f"Recent API returned invalid numbers for {config.name} {month}: {values!r}")
            raw = {
                "draw_no": str(item.get("period", "")),
                "draw_date": str(item.get("lotteryDate", ""))[:10],
                **{column: values[index] for index, column in enumerate(config.number_columns)},
                "sales_amount": str(item.get("sellAmount", "")),
                "sales_count": "",
                "total_prize": str(item.get("totalAmount", "")),
            }
            if config.special_max:
                raw["special_number"] = values[-1]
            rows.append(validate_row(raw, f"Recent API {config.name} {month}", config))
    return rows


def collect(configs: list[GameConfig], start_year: int, end_year: int) -> dict[str, list[dict[str, str]]]:
    draws = {config.key: {} for config in configs}
    years = list(range(start_year, end_year + 1))

    def fetch(year: int) -> tuple[int, dict[str, list[dict[str, str]]]]:
        active_configs = [config for config in configs if year >= config.start_year]
        return year, parse_year(download_year(year), year, active_configs)

    with ThreadPoolExecutor(max_workers=min(6, len(years))) as executor:
        futures = {executor.submit(fetch, year): year for year in years}
        for future in as_completed(futures):
            year, yearly = future.result()
            print(f"Downloaded {year}", file=sys.stderr)
            for config in configs:
                for row in yearly.get(config.key, []):
                    existing = draws[config.key].get(row["draw_no"])
                    if existing and existing != row:
                        raise ValueError(f"Conflicting {config.name} draw: {row['draw_no']}")
                    draws[config.key][row["draw_no"]] = row

    for config in configs:
        for row in download_recent(config):
            existing = draws[config.key].get(row["draw_no"])
            if existing:
                identity = ["draw_date", *config.number_columns]
                if config.special_max:
                    identity.append("special_number")
                if any(existing[column] != row[column] for column in identity):
                    raise ValueError(f"Annual/recent conflict for {config.name} draw {row['draw_no']}")
                row["sales_count"] = existing["sales_count"]
            draws[config.key][row["draw_no"]] = row

    result = {}
    for config in configs:
        rows = sorted(draws[config.key].values(), key=lambda row: (row["draw_date"], row["draw_no"]))
        if not rows:
            raise RuntimeError(f"No valid rows collected for {config.name}")
        result[config.key] = [validate_row(row, f"Combined {config.name}", config) for row in rows]
    return result


def write_outputs(all_rows: dict[str, list[dict[str, str]]], configs: list[GameConfig], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output_dir, prefix=".lottery-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        replacements: list[tuple[Path, Path]] = []
        for config in configs:
            rows = [validate_row(row, f"Output {config.name}", config) for row in all_rows[config.key]]
            output = output_dir / config.output_name
            temp_csv = temp_dir / output.name
            with temp_csv.open("w", encoding="utf-8", newline="") as file:
                writer = csv.DictWriter(file, fieldnames=config.output_columns)
                writer.writeheader()
                writer.writerows(rows)
            temp_gzip = temp_dir / f"{output.name}.gz"
            temp_gzip.write_bytes(gzip.compress(temp_csv.read_bytes(), compresslevel=9, mtime=0))
            metadata = {
                "game": config.name,
                "source": "Taiwan Lottery official annual downloads and recent-results API",
                "source_url": SOURCE_URL,
                "collected_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
                "row_count": len(rows),
                "first_draw_date": rows[0]["draw_date"],
                "last_draw_date": rows[-1]["draw_date"],
            }
            temp_metadata = temp_dir / f"{output.stem}.metadata.json"
            temp_metadata.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            replacements.extend([
                (temp_csv, output),
                (temp_gzip, output.with_name(f"{output.name}.gz")),
                (temp_metadata, output.with_suffix(".metadata.json")),
            ])

        for temporary, destination in replacements:
            os.replace(temporary, destination)


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect official Taiwan Lottery draw data")
    parser.add_argument("--start-year", type=int, default=2007)
    parser.add_argument("--end-year", type=int, default=date.today().year)
    parser.add_argument("--games", nargs="+", choices=[*GAMES, "all"], default=["all"])
    parser.add_argument("--output-dir", type=Path, default=Path("data"))
    args = parser.parse_args()
    if args.start_year > args.end_year:
        parser.error("--start-year cannot be later than --end-year")
    keys = list(GAMES) if "all" in args.games else list(dict.fromkeys(args.games))
    configs = [GAMES[key] for key in keys]
    rows = collect(configs, args.start_year, args.end_year)
    write_outputs(rows, configs, args.output_dir)
    for config in configs:
        print(f"Saved {len(rows[config.key])} draws to {args.output_dir / config.output_name}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
