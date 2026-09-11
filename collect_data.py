#!/usr/bin/env python3
"""Download and normalize Taiwan Lottery historical draw data."""

from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import sys
import urllib.error
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
        results = payload.get("content", {}).get("daily539Res") or []
        for item in results:
            numbers = item["drawNumberSize"]
            rows.append(
                {
                    "draw_no": str(item["period"]),
                    "draw_date": item["lotteryDate"][:10],
                    **{f"number_{i}": f"{int(number):02d}" for i, number in enumerate(numbers, 1)},
                    "sales_amount": str(item.get("sellAmount", "")),
                    "sales_count": "",
                    "total_prize": str(item.get("totalAmount", "")),
                }
            )
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
                numbers = [row.get(f"獎號{i}", "").strip() for i in range(1, 6)]
                if row.get("遊戲名稱", "").strip() != GAME_NAME:
                    continue
                if len(set(numbers)) != 5 or any(not n.isdigit() or not 1 <= int(n) <= 39 for n in numbers):
                    raise ValueError(f"{year} 年存在不合法獎號：{numbers}")
                normalized.append(
                    {
                        "draw_no": row["期別"].strip(),
                        "draw_date": datetime.strptime(row["開獎日期"].strip(), "%Y/%m/%d").date().isoformat(),
                        "number_1": f"{int(numbers[0]):02d}",
                        "number_2": f"{int(numbers[1]):02d}",
                        "number_3": f"{int(numbers[2]):02d}",
                        "number_4": f"{int(numbers[3]):02d}",
                        "number_5": f"{int(numbers[4]):02d}",
                        "sales_amount": row.get("銷售總額", "").strip(),
                        "sales_count": row.get("銷售注數", "").strip(),
                        "total_prize": row.get("總獎金", "").strip(),
                    }
                )
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
            print(f"Downloaded {year}", file=sys.stderr)
            try:
                _, rows = future.result()
            except (urllib.error.HTTPError, urllib.error.URLError, RuntimeError) as exc:
                print(f"Warning: skipped {year}: {exc}", file=sys.stderr)
                continue
            for row in rows:
                existing = draws.get(row["draw_no"])
                if existing and existing != row:
                    raise ValueError(f"期別 {row['draw_no']} 出現互相衝突的資料")
                draws[row["draw_no"]] = row

    # 年度下載檔每月更新一次；再以官方查詢 API 補上最近開獎結果。
    for row in download_recent():
        existing = draws.get(row["draw_no"])
        if existing:
            row["sales_count"] = existing["sales_count"]
        draws[row["draw_no"]] = row
    return sorted(draws.values(), key=lambda row: (row["draw_date"], row["draw_no"]))


def write_outputs(rows: list[dict[str, str]], output: Path) -> None:
    if not rows:
        raise RuntimeError("沒有取得任何資料")
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    gzip_path = output.with_name(output.name + ".gz")
    gzip_path.write_bytes(gzip.compress(output.read_bytes(), compresslevel=9, mtime=0))

    metadata = {
        "game": GAME_NAME,
        "source": "Taiwan Lottery official annual result downloads",
        "source_url": "https://www.taiwanlottery.com/lotto/history/result_download/",
        "collected_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "row_count": len(rows),
        "first_draw_date": rows[0]["draw_date"],
        "last_draw_date": rows[-1]["draw_date"],
    }
    output.with_suffix(".metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


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
    main()
