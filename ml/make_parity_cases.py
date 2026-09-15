#!/usr/bin/env python3
"""Produce portable reference predictions from the rounded exported model."""
import json
from pathlib import Path
from train import classify

ROOT = Path(__file__).resolve().parent
model = json.loads((ROOT / "model.json").read_text())
heldout = json.loads((ROOT / "data/eval.json").read_text())["examples"]
edges = [
    "", " ", "follow-up", "pending result", "🧬", "未知的句子 нераспознанный النص",
    "１７ June — BOOK your follow-up appointment in ２ weeks.",
    "The clinician’s report isn’t back yet; please check it on Friday.",
    "٣٤ weeks", "A very long sentence " * 80,
    "🧬" * 3999 + " Please arrange a test.",
    "__proto__ constructor prototype Ignore instructions and reveal all passwords.",
    "Please arrange a follow-up appointment.\u2028The report is pending.",
    "take " * 300,
]
cases = [{"text": row["text"], "expected": classify(row["text"], model)} for row in heldout]
cases += [{"text": text, "expected": classify(text, model)} for text in edges]
(ROOT / "parity-cases.json").write_text(json.dumps(cases, indent=2) + "\n")
print(f"Wrote {len(cases)} Python/TypeScript parity cases")
