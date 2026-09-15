#!/usr/bin/env python3
"""Build the homepage bulletin from official Taiwan Lottery results."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
import urllib.error
import urllib.request
from datetime import date, datetime, time, timedelta, timezone
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


def expected_games(target_date: date) -> list[str]:
    return [key for key, game in GAMES.items() if target_date.weekday() in game["weekdays"]]


def validation_target_date(now: datetime) -> date:
    return now.astimezone(TAIPEI).date() - timedelta(days=1)


def validation_errors(latest: dict[str, object], target_date: date) -> list[str]:
    errors = []
    for key in expected_games(target_date):
        game = GAMES[key]
        result = latest.get(game["result"])
        raw_date = result.get("lotteryDate") if isinstance(result, dict) else None
        actual_date = str(raw_date).strip()[:10] if raw_date is not None else ""
        if not actual_date:
            reason = "API 日期缺漏"
            actual_display = "未提供"
        else:
            try:
                parsed_date = date.fromisoformat(actual_date)
            except ValueError:
                reason = "API 日期格式不合法"
                actual_display = actual_date
            else:
                if parsed_date == target_date:
                    continue
                reason = "API 日期早於目標日期" if parsed_date < target_date else "API 日期晚於目標日期"
                actual_display = actual_date
        errors.append(
            f"{game['name']}：預期日期 {target_date.isoformat()}，實際日期 {actual_display}；錯誤原因：{reason}。"
        )
    return errors


def build(latest: dict[str, object], now: datetime) -> dict[str, object]:
    target_date = validation_target_date(now)
    errors = validation_errors(latest, target_date)

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
            game_name = game["name"]
            if any(error.startswith(f"{game_name}：") for error in errors):
                game_name = f"{game_name}（資訊未更新）"
            jackpots.append({
                "game": game_name,
                "amount": amount,
                "source_draw_no": str(result.get("period", "")),
                "next_draw_at": next_draw_at(now, game["weekdays"]).isoformat(),
            })

    return {
        "generated_at": now.isoformat(),
        "jackpots": jackpots,
        "errors": errors,
    }


def preserved_jackpots(output: Path) -> list[dict[str, object]]:
    if not output.exists():
        return []
    try:
        existing = json.loads(output.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    preserved = []
    for jackpot in existing.get("jackpots", []):
        if not isinstance(jackpot, dict):
            continue
        item = dict(jackpot)
        game = str(item.get("game", ""))
        if "資訊未更新" not in game:
            item["game"] = f"{game}（資訊未更新）"
        preserved.append(item)
    return preserved


def api_failure_payload(now: datetime, output: Path) -> dict[str, object]:
    target_date = validation_target_date(now)
    errors = [
        f"{GAMES[key]['name']}：預期日期 {target_date.isoformat()}，實際日期 未取得；錯誤原因：公告 API 請求或回傳驗證失敗。"
        for key in expected_games(target_date)
    ]
    return {
        "generated_at": now.isoformat(),
        "jackpots": preserved_jackpots(output),
        "errors": errors,
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
    parser.add_argument("--output", type=Path, default=Path("data/bulletin.json"))
    args = parser.parse_args()
    now = datetime.now(TAIPEI)
    try:
        payload = build(fetch_latest(), now)
    except (OSError, TypeError, ValueError, RuntimeError, urllib.error.URLError, json.JSONDecodeError):
        payload = api_failure_payload(now, args.output)
    write_json(payload, args.output)


if __name__ == "__main__":
    main()
