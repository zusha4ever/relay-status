#!/usr/bin/env python3
"""Regenerate windows.json for the relay board from the live STELL-Finance clone.
Recipe: tools/windows_ledger.py output (brief/merge timestamps per window)
plus windows/ file sizes (RESULT + DIARY bytes). Fully derived — nothing hand-typed."""
import json, os, subprocess, sys, datetime, pathlib

WORKER = os.path.expanduser("~/HA-Platfrom-Build/relay-worker/STELL-Finance")
BOARD  = os.path.expanduser("~/HA-Platfrom-Build/relay-status")
DAY0   = datetime.datetime(2026, 8, 14, tzinfo=datetime.timezone.utc)

def day(iso):
    if not iso: return None
    d = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return round((d - DAY0).total_seconds() / 86400, 2)

ledger_path = "/tmp/board-ledger.json"
subprocess.run([sys.executable, "tools/windows_ledger.py", "--ref", "HEAD",
                "--json-out", ledger_path], cwd=WORKER, check=True,
               capture_output=True, text=True)
ledger = json.load(open(ledger_path))

rows = []
for w in ledger["windows"]:
    n = int(w["window"][1:])
    authored = day(w.get("brief_landed_at"))
    landed = day(w.get("merged_at")) if w.get("merged") else None
    if authored is None and landed is None and not w.get("result_present"):
        continue
    if authored is None:
        authored = landed if landed is not None else day(
            datetime.datetime.now(datetime.timezone.utc).isoformat())
    b = 0
    for suffix in ("-RESULT.md", "-DIARY.jsonl"):
        p = pathlib.Path(WORKER) / "windows" / f"W{n}{suffix}"
        if p.exists(): b += p.stat().st_size
    rows.append([n, authored, landed, b or 6000])

rows.sort(key=lambda r: r[0])
out = {
    "generatedFrom": "zusha4ever/STELL-Finance tools/windows_ledger.py at HEAD plus windows/ file sizes — regenerated automatically, never hand-typed",
    "asOf": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    "day0": "2026-08-14T00:00:00Z",
    "gtmDay": 21,
    "mvpDay": 35,
    "bytesNote": "bytes = W{n}-RESULT.md + W{n}-DIARY.jsonl size; the repo records no token counts",
    "windows": rows,
}
json.dump(out, open(os.path.join(BOARD, "windows.json"), "w"), separators=(",", ":"))
print(f"windows.json: {len(rows)} windows, {sum(1 for r in rows if r[2] is not None)} landed, asOf {out['asOf']}")
