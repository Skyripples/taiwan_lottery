#!/usr/bin/env python3
"""Download and normalize Taiwan Lottery historical draw data."""

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
from datetime import date, datetime, timezone
from pathlib import Path


API_URL = "https://api.taiwanlottery.com/TLCAPIWeB/Lottery/ResultDownload"
GAME_NAME = "今彩539"
OUTPUT_COLUMNS = [
    "draw_no",
    "draw_date",
    "number_1",
    "number_2",
    "number_3",
    "number_4",
    "number_5",
    "sales_amount",
    "sales_count",
    "total_prize",
]
NUMBER_COLUMNS = [f"number_{i}" for i in range(1, 6)]


def validate_row(row: dict[str, object], source: str) -> dict[str, str]:
    draw_no = str(row.get("draw_no", "")).strip()
    if not draw_no.isdigit():
        raise ValueError(f"{source} 的期別不合法：{draw_no!r}")

    raw_date = str(row.get("draw_date", "")).strip().replace("/", "-")
    try:
        draw_date = date.fromisoformat(raw_date).isoformat()
    except ValueError as exc:
        raise ValueError(f"{source} 的開獎日期不合法：{raw_date!r}") from exc

    actual_number_columns = {key for key in row if key.startswith("number_")}
    if actual_number_columns != set(NUMBER_COLUMNS):
        raise ValueError(f"{source} 必須恰好包含 5 個獎號")

    numbers = []
    for column in NUMBER_COLUMNS:
        value = str(row.get(column, "")).strip()
        if not value.isdigit() or not 1 <= int(value) <= 39:
            raise ValueError(f"{source} 的獎號不合法：{value!r}")
        numbers.append(int(value))
    if len(set(numbers)) != 5:
        raise ValueError(f"{source} 的 5 個獎號必須互異：{numbers}")

    normalized = {column: str(row.get(column, "")).strip() for column in OUTPUT_COLUMNS}
    normalized["draw_no"] = draw_no
    normalized["draw_date"] = draw_date
    for column, number in zip(NUMBER_COLUMNS, numbers):
        normalized[column] = f"{number:02d}"
    return normalized


def request_bytes(url: str, timeout: int = 60) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "taiwan-lottery-data-collector/1.0"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def download_year(year: int) -> bytes:
    payload = json.loads(request_bytes(f"{API_URL}?year={year}"))
    if payload.get("rtCode") != 0 or not payload.get("content", {}).get("path"):
        raise RuntimeError(f"官方 API 未提供 {year} 年資料：{payload}")
    return request_bytes(payload["content"]["path"])


def recent_months(count: int = 2) -> list[str]:
    today = date.today()
    months = []
    year, month = today.year, today.month
    for _ in range(count):
        months.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    return months


def download_recent() -> list[dict[str, str]]:
    rows = []
    for month in recent_months():
        query = f"month={month}&endMonth={month}&pageNum=1&pageSize=200"
        payload = json.loads(request_bytes(f"{API_URL.rsplit('/', 1)[0]}/Daily539Result?{query}"))
        content = payload.get("content")
        if payload.get("rtCode") != 0 or not isinstance(content, dict):
            raise RuntimeError(f"近期 API 回傳錯誤（{month}）：{payload}")
        results = content.get("daily539Res")
        if not isinstance(results, list):
            raise RuntimeError(f"近期 API 資料格式錯誤（{month}）：{payload}")
        for item in results:
            numbers = item.get("drawNumberSize")
            if not isinstance(numbers, list):
                raise ValueError(f"近期 API 的獎號格式錯誤（{month}）：{numbers!r}")
            row = {
                "draw_no": str(item.get("period", "")),
                "draw_date": str(item.get("lotteryDate", ""))[:10],
                **{f"number_{i}": number for i, number in enumerate(numbers, 1)},
                "sales_amount": str(item.get("sellAmount", "")),
                "sales_count": "",
                "total_prize": str(item.get("totalAmount", "")),
            }
            rows.append(validate_row(row, f"近期 API {month}"))
    return rows


def parse_game_csv(zip_bytes: bytes, year: int) -> list[dict[str, str]]:
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
        for member in archive.infolist():
            if member.is_dir() or not member.filename.lower().endswith(".csv"):
                continue
            text = archive.read(member).decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
            if not rows or rows[0].get("遊戲名稱", "").strip() != GAME_NAME:
                continue

            normalized = []
            for row in rows:
                if row.get("遊戲名稱", "").strip() != GAME_NAME:
                    continue
                normalized.append(validate_row({
                    "draw_no": row.get("期別", ""),
                    "draw_date": row.get("開獎日期", ""),
                    **{f"number_{i}": row.get(f"獎號{i}", "") for i in range(1, 6)},
                    "sales_amount": row.get("銷售總額", ""),
                    "sales_count": row.get("銷售注數", ""),
                    "total_prize": row.get("總獎金", ""),
                }, f"{year} 年年度資料"))
            return normalized
    raise RuntimeError(f"{year} 年 ZIP 中找不到 {GAME_NAME} CSV")


def collect(start_year: int, end_year: int) -> list[dict[str, str]]:
    draws: dict[str, dict[str, str]] = {}
    years = list(range(start_year, end_year + 1))

    def fetch(year: int) -> tuple[int, list[dict[str, str]]]:
        return year, parse_game_csv(download_year(year), year)

    with ThreadPoolExecutor(max_workers=min(6, len(years))) as executor:
        futures = {executor.submit(fetch, year): year for year in years}
        for future in as_completed(futures):
            year = futures[future]
            _, rows = future.result()
            print(f"Downloaded {year}", file=sys.stderr)
            for row in rows:
                existing = draws.get(row["draw_no"])
                if existing and existing != row:
                    raise ValueError(f"期別 {row['draw_no']} 出現互相衝突的資料")
                draws[row["draw_no"]] = row

    # 年度下載檔每月更新一次；再以官方查詢 API 補上最近開獎結果。
    for row in download_recent():
        existing = draws.get(row["draw_no"])
        if existing:
            identity_columns = ["draw_date", *NUMBER_COLUMNS]
            if any(existing[column] != row[column] for column in identity_columns):
                raise ValueError(f"期別 {row['draw_no']} 的年度與近期資料互相衝突")
            row["sales_count"] = existing["sales_count"]
        draws[row["draw_no"]] = row
    rows = sorted(draws.values(), key=lambda row: (row["draw_date"], row["draw_no"]))
    return [validate_row(row, "合併資料") for row in rows]


def write_outputs(rows: list[dict[str, str]], output: Path) -> None:
    if not rows:
        raise RuntimeError("沒有取得任何資料")
    rows = [validate_row(row, "輸出資料") for row in rows]
    output.parent.mkdir(parents=True, exist_ok=True)
    gzip_path = output.with_name(output.name + ".gz")
    metadata_path = output.with_suffix(".metadata.json")
    metadata = {
        "game": GAME_NAME,
        "source": "Taiwan Lottery official annual result downloads",
        "source_url": "https://www.taiwanlottery.com/lotto/history/result_download/",
        "collected_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "row_count": len(rows),
        "first_draw_date": rows[0]["draw_date"],
        "last_draw_date": rows[-1]["draw_date"],
    }
    with tempfile.TemporaryDirectory(dir=output.parent, prefix=".lottery-") as temp_dir:
        temp_output = Path(temp_dir) / output.name
        temp_gzip = Path(temp_dir) / gzip_path.name
        temp_metadata = Path(temp_dir) / metadata_path.name
        with temp_output.open("w", encoding="utf-8", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=OUTPUT_COLUMNS)
            writer.writeheader()
            writer.writerows(rows)
        temp_gzip.write_bytes(gzip.compress(temp_output.read_bytes(), compresslevel=9, mtime=0))
        temp_metadata.write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        os.replace(temp_output, output)
        os.replace(temp_gzip, gzip_path)
        os.replace(temp_metadata, metadata_path)


def main() -> None:
    parser = argparse.ArgumentParser(description=f"蒐集台灣彩券官方 {GAME_NAME} 歷史資料")
    parser.add_argument("--start-year", type=int, default=2007)
    parser.add_argument("--end-year", type=int, default=date.today().year)
    parser.add_argument("--output", type=Path, default=Path("data/daily_cash.csv"))
    args = parser.parse_args()
    if args.start_year > args.end_year:
        parser.error("--start-year 不可晚於 --end-year")
    rows = collect(args.start_year, args.end_year)
    write_outputs(rows, args.output)
    print(f"Saved {len(rows)} draws to {args.output}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
