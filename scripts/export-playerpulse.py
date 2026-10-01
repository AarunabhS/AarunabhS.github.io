"""Export a small, recorded player comparison from the local PlayerPulse archive.

Usage: python scripts/export-playerpulse.py /path/to/PlayerPulse-project
Only five players' aggregate club-league statistics are bundled, never app code.
"""
from pathlib import Path
import json
import math
import subprocess
import sys

source = Path(sys.argv[1]).resolve()
root = Path(__file__).resolve().parents[1]
archive = source / "public/data"
names = ["Lionel Messi", "Ronaldinho", "Cristiano Ronaldo", "Kylian Mbappé", "Erling Haaland"]
index = json.loads((archive / "players.compact.json").read_text())
players = []
candidates = {
    "matches": [("playingTime", "MP")],
    "minutes": [("playingTime", "Min")],
    "goals": [("shooting", "Standard Gls"), ("shooting", "Gls")],
    "assists": [("passing", "Ast")],
}

def available_sum(values):
    values = [value for value in values if isinstance(value, (int, float)) and math.isfinite(value)]
    return round(sum(values), 1) if values else None

def read_metric(row, field):
    for group, label in candidates[field]:
        value = row.get("categories", {}).get(group, {}).get(label)
        if isinstance(value, (int, float)) and math.isfinite(value):
            return value
    return None

for name in names:
    player = next(entry for entry in index if entry["name"] == name)
    bundle = json.loads((archive / player["dataPath"]).read_text())
    rows = [row for row in bundle["seasons"] if row.get("dataScope") == "club_league"]
    ages = []
    for age in sorted({row["age"] for row in rows}):
        selected = [row for row in rows if row["age"] == age]
        ages.append({
            "age": age,
            "seasonEnds": sorted({row["season"] for row in selected}),
            "clubs": sorted({row["squad"] for row in selected}),
            "competitions": sorted({row["comp"] for row in selected}),
            "sourceRows": len(selected),
            "nineties": available_sum([row.get("nineties") for row in selected]),
            **{field: available_sum([read_metric(row, field) for row in selected]) for field in candidates},
        })
    players.append({"id": player["id"], "name": name, "ages": ages})

payload = {
    "source": "Saved PlayerPulse club-league archive · recorded FBref season totals",
    "commit": subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip(),
    "workingTreeChanges": bool(subprocess.check_output(["git", "-C", str(source), "status", "--porcelain"], text=True).strip()),
    "capturedOn": "2026-09-30",
    "scope": "club_league",
    "players": players,
}
(root / "data/playerpulse.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
print(f"Exported {len(players)} players and {sum(len(p['ages']) for p in players)} recorded age summaries.")
