#!/usr/bin/env python3
"""Build the homepage bulletin from official Taiwan Lottery results."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
import urllib.request
from datetime import datetime, time, timedelta, timezone
from pathlib import Path


LATEST_RESULT_URL = "https://api.taiwanlottery.com/TLCAPIWeB/Lottery/LatestResult"
TAIPEI = timezone(timedelta(hours=8), name="Asia/Taipei")
JACKPOT_THRESHOLD = 2_000_000_000
GAMES = {
    "power638": {"name": "威力彩", "result": "superLotto638Result", "jackpot": "super638JackpotAssign", "weekdays": {0, 3}},
    "lotto649": {"name": "大樂透", "result": "lotto649Result", "jackpot": "jackpotAssign", "weekdays": {1, 4}},
    "daily539": {"name": "今彩 539", "result": "daily539Result", "weekdays": {0, 1, 2, 3, 4, 5}},
    "markSix39": {"name": "39 樂合彩", "result": "m539Result", "weekdays": {0, 1, 2, 3, 4, 5}},
    "markSix49": {"name": "49 樂合彩", "result": "m649Result", "weekdays": {1, 4}},
    "threeStar": {"name": "3 星彩", "result": "lotto3DResult", "weekdays": {0, 1, 2, 3, 4, 5}},
    "fourStar": {"name": "4 星彩", "result": "lotto4DResult", "weekdays": {0, 1, 2, 3, 4, 5}},
}


def fetch_latest() -> dict[str, object]:
    request = urllib.request.Request(LATEST_RESULT_URL, headers={"User-Agent": "taiwan-lottery-data-collector/1.1"})
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.load(response)
    content = payload.get("content")
    if payload.get("rtCode") != 0 or not isinstance(content, dict):
        raise RuntimeError(f"Latest-result API failed: {payload}")
    return content


def next_draw_at(now: datetime, weekdays: set[int]) -> datetime:
    for offset in range(8):
        candidate = datetime.combine(now.date() + timedelta(days=offset), time(20, 30), TAIPEI)
        if candidate.weekday() in weekdays and candidate > now:
            return candidate
    raise RuntimeError("Unable to calculate next draw time")


def expected_games(now: datetime) -> list[str]:
    return [key for key, game in GAMES.items() if now.weekday() in game["weekdays"]]


def build(latest: dict[str, object], now: datetime, attempt: int) -> dict[str, object]:
    stale = []
    if attempt:
        for key in expected_games(now):
            result = latest.get(GAMES[key]["result"])
            draw_date = str(result.get("lotteryDate", ""))[:10] if isinstance(result, dict) else ""
            if draw_date != now.date().isoformat():
                stale.append(key)
        if stale and attempt < 3:
            names = ", ".join(GAMES[key]["name"] for key in stale)
            raise RuntimeError(f"Attempt {attempt}: latest draw is not available for {names}")

    jackpots = []
    for key in ("power638", "lotto649"):
        game = GAMES[key]
        result = latest.get(game["result"])
        if not isinstance(result, dict):
            continue
        assignment = result.get(game["jackpot"])
        if not isinstance(assignment, dict) or int(assignment.get("winnerCount") or 0) > 0:
            continue
        amount = int(assignment.get("prize") or 0) + int(assignment.get("lastPrize") or 0)
        if amount > JACKPOT_THRESHOLD:
            jackpots.append({
                "game": game["name"],
                "amount": amount,
                "source_draw_no": str(result.get("period", "")),
                "next_draw_at": next_draw_at(now, game["weekdays"]).isoformat(),
            })

    return {
        "generated_at": now.isoformat(),
        "jackpots": jackpots,
        "errors": ["本日最後一次排程更新未能確認最新資料"] if stale and attempt >= 3 else [],
    }


def write_json(payload: dict[str, object], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=output.parent, delete=False) as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)
        file.write("\n")
        temporary = Path(file.name)
    os.replace(temporary, output)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--attempt", type=int, choices=range(4), default=0)
    parser.add_argument("--mark-expected-failed", action="store_true")
    parser.add_argument("--output", type=Path, default=Path("data/bulletin.json"))
    args = parser.parse_args()
    now = datetime.now(TAIPEI)
    if args.mark_expected_failed:
        existing = json.loads(args.output.read_text(encoding="utf-8")) if args.output.exists() else {"jackpots": []}
        payload = {
            "generated_at": now.isoformat(),
            "jackpots": existing.get("jackpots", []),
            "errors": ["本日最後一次排程更新未能確認最新資料"],
        }
    else:
        payload = build(fetch_latest(), now, args.attempt)
    write_json(payload, args.output)


if __name__ == "__main__":
    main()
