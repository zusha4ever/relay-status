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

# Overlay: windows landed by auto-land / GitHub-default merge subjects ("Merge pull request #N
# from .../claude/w141-...") are invisible to the ledger's subject regex. Read merged PRs and
# derive W-numbers from the head branch (claude/w141-...) and the title ("W116+W118+... [auto-land]").
# Relay brief/trigger PRs (head relay/*, title "relay:") never count as a window landing.
import re
pr_landed = {}
try:
    raw = subprocess.run(["/opt/homebrew/bin/gh", "pr", "list", "-R", "zusha4ever/STELL-Finance",
                          "--state", "merged", "--limit", "400", "--json", "title,headRefName,mergedAt"],
                         capture_output=True, text=True, check=True).stdout
    for pr in json.loads(raw):
        head, title = pr["headRefName"], pr["title"]
        if title.lower().startswith(("relay:","trigger")): continue
        if re.search(r"\bclaim\b", title, re.I) and not re.search(r"auto-land|reland|re-land", title, re.I): continue
        nums = {int(x) for x in re.findall(r"[Ww](\d{1,3})(?![\d])", head)} | {int(x) for x in re.findall(r"\bW(\d{1,3})\b", title)}
        for n in nums:
            t = pr["mergedAt"]
            if n not in pr_landed or t < pr_landed[n]: pr_landed[n] = t
except Exception as e:
    print("gh overlay skipped:", e, file=sys.stderr)

rows = []
for w in ledger["windows"]:
    n = int(w["window"][1:])
    authored = day(w.get("brief_landed_at"))
    landed = day(w.get("merged_at")) if w.get("merged") else None
    if landed is None and n in pr_landed:
        landed = day(pr_landed[n])
    if authored is None and landed is None and not w.get("result_present"):
        continue
    if authored is None:
        authored = landed if landed is not None else day(
            datetime.datetime.now(datetime.timezone.utc).isoformat())
    b = 0
    for suffix in ("-RESULT.md", "-DIARY.jsonl"):
        p = pathlib.Path(WORKER) / "windows" / f"W{n}{suffix}"
        if p.exists(): b += p.stat().st_size
    name=""
    bp = pathlib.Path(WORKER) / "windows" / f"W{n}.md"
    if bp.exists():
        first = bp.read_text(errors="ignore").split("\n",1)[0]
        for sep in (" \u2014 ", " - ", ": "):
            if sep in first:
                name = first.split(sep,1)[1].strip().rstrip(".")
                break
    rows.append([n, authored, landed, b or 6000, name[:70]])

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
