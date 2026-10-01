"""Copy aggregate phase-two evidence into the portfolio, without individual rows.

Usage: python scripts/export-evaluation.py /path/to/repository churn|fraud
"""
from pathlib import Path
import csv
import json
import shutil
import subprocess
import sys

source = Path(sys.argv[1]).resolve()
project = sys.argv[2]
if project not in {"churn", "fraud"}:
    raise SystemExit("Choose churn or fraud")
root = Path(__file__).resolve().parents[1]
results = source / "results/phase2"
meta = json.loads((results / "metrics.json").read_text())
policies = list(csv.DictReader((results / "operating_policies.csv").open()))
for row in policies:
    for key, value in row.items():
        if key != "split":
            row[key] = float(value)
payload = {
    "source": source.name + "/results/phase2",
    "commit": subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip(),
    "model": meta["selected_model"], "protocol": meta["protocol"],
    "test": meta["test"], "baseline": meta["baseline_test"], "policies": policies,
}
(root / "data" / f"{project}-evaluation.json").write_text(json.dumps(payload, indent=2) + "\n")
for output in ["ranking", "reliability"]:
    shutil.copy2(results / f"{output}.png", root / "images/outputs" / f"{project}-{output}.png")
dashboard = source / "results/charts/dashboard.png"
if dashboard.is_file():
    shutil.copy2(dashboard, root / "images/outputs" / f"{project}-overview.png")
print(f"Exported {project} aggregate evidence; no individual predictions or model files bundled.")
