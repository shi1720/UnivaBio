#!/usr/bin/env python3
"""Train and evaluate Looplight's reproducible, dependency-free linear model.

Run: python3 train.py
Only data/train.json is used for features and fitting. data/eval.json is opened
after model.json has been written. Hyperparameters and abstention cutoffs are
fixed engineering choices; do not interpret scores as calibrated probabilities.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TOKEN_RE = re.compile(r"[a-z]+(?:'[a-z]+)?|[0-9]+")
HYPERPARAMETERS = {
    "epochs": 700,
    "learning_rate": 1.2,
    "l2": 0.003,
    "bigram_weight": 0.7,
    "min_score": 0.58,
    "min_margin": 0.18,
    "min_coverage": 0.35,
    "min_tokens": 3,
    "max_tokens": 256,
    "max_chars": 4000,
}

def tokenize(text):
    text = unicodedata.normalize("NFKC", text).lower().replace("\u2019", "'")
    return ["<num>" if w.isdigit() else w for w in TOKEN_RE.findall(text)]

def raw_features(tokens, bigram_weight=HYPERPARAMETERS["bigram_weight"]):
    counts = Counter("u:" + token for token in tokens)
    for left, right in zip(tokens, tokens[1:]):
        counts["b:" + left + " " + right] += bigram_weight
    return counts

def vectorize(tokens, vocab, bigram_weight=HYPERPARAMETERS["bigram_weight"]):
    # Normalize with ALL features, including unknown terms, so unfamiliar text
    # cannot inflate a lone recognized word's contribution.
    features = raw_features(tokens, bigram_weight)
    norm = math.sqrt(sum(value * value for value in features.values())) or 1.0
    return [(vocab[key], value / norm) for key, value in features.items() if key in vocab]

def softmax(logits):
    peak = max(logits)
    exp = [math.exp(x - peak) for x in logits]
    total = sum(exp)
    return [x / total for x in exp]

def classify(text, model):
    h = model["thresholds"]
    tokens = tokenize(text[:h["max_chars"]])
    truncated = len(text) > h["max_chars"] or len(tokens) > h["max_tokens"]
    tokens = tokens[:h["max_tokens"]]
    vocab = {feature: i for i, feature in enumerate(model["vocabulary"])}
    x = vectorize(tokens, vocab, model["features"]["bigram_weight"])
    logits = [bias + sum(weights[j] * val for j, val in x)
              for weights, bias in zip(model["weights"], model["intercepts"])]
    scores = softmax(logits)
    ranked = sorted(range(len(scores)), key=lambda i: (-scores[i], i))
    best, runner = ranked[:2]
    coverage = sum("u:" + token in vocab for token in tokens) / max(1, len(tokens))
    margin = scores[best] - scores[runner]
    reason = ("input_too_long" if truncated else
              "too_few_tokens" if len(tokens) < h["min_tokens"] else
              "low_vocabulary_coverage" if coverage < h["min_coverage"] else
              "low_model_score" if scores[best] < h["min_score"] else
              "ambiguous_scores" if margin < h["min_margin"] else None)
    return {
        "label": "unknown" if reason else model["labels"][best],
        "candidate": model["labels"][best],
        "confidence": scores[best],
        "margin": margin,
        "coverage": coverage,
        "scores": dict(zip(model["labels"], scores)),
        "reason": reason,
    }

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def fit(training, train_path):
    labels = training["labels"]
    examples = training["examples"]
    all_tokens = [tokenize(row["text"]) for row in examples]
    vocabulary = sorted({feature for tokens in all_tokens for feature in raw_features(tokens)})
    vocab = {feature: i for i, feature in enumerate(vocabulary)}
    X = [vectorize(tokens, vocab) for tokens in all_tokens]
    y = [labels.index(row["label"]) for row in examples]
    weights = [[0.0] * len(vocabulary) for _ in labels]
    intercepts = [0.0] * len(labels)
    n = len(X)
    h = HYPERPARAMETERS
    loss = None
    for epoch in range(h["epochs"]):
        grad_w = [[h["l2"] * w for w in row] for row in weights]
        grad_b = [0.0] * len(labels)
        loss = 0.0
        for x, target in zip(X, y):
            logits = [b + sum(row[j] * val for j, val in x)
                      for row, b in zip(weights, intercepts)]
            probabilities = softmax(logits)
            loss -= math.log(max(probabilities[target], 1e-15)) / n
            for k in range(len(labels)):
                error = (probabilities[k] - (1 if k == target else 0)) / n
                grad_b[k] += error
                for j, val in x:
                    grad_w[k][j] += error * val
        for k in range(len(labels)):
            intercepts[k] -= h["learning_rate"] * grad_b[k]
            for j in range(len(vocabulary)):
                weights[k][j] -= h["learning_rate"] * grad_w[k][j]
    model = {
        "schema_version": 1,
        "model_id": "looplight-sentence-softmax-v1",
        "algorithm": "multinomial_logistic_regression",
        "labels": labels,
        "vocabulary": vocabulary,
        "weights": [[round(w, 8) for w in row] for row in weights],
        "intercepts": [round(b, 8) for b in intercepts],
        "features": {"tokenizer": "nfkc-lower-ascii-words-numbers-v1", "unigrams": True,
                     "bigrams": True, "bigram_weight": h["bigram_weight"], "normalization": "l2_all_features"},
        "thresholds": {k: h[k] for k in ["min_score", "min_margin", "min_coverage", "min_tokens", "max_tokens", "max_chars"]},
        "training": {"examples": n, "class_counts": dict(Counter(row["label"] for row in examples)),
                     "epochs": h["epochs"], "learning_rate": h["learning_rate"], "l2": h["l2"],
                     "final_cross_entropy": loss, "data_sha256": digest(train_path), "seed": "none; deterministic full-batch zero initialization",
                     "provenance": "Original synthetic English examples; not patient data or clinician-validated annotations"},
        "limitations": ["Scores are uncalibrated and are not clinical probabilities.",
                        "Topic classification only; no diagnosis, urgency decision, instruction completion, or date extraction.",
                        "Synthetic-only evaluation does not establish clinical performance.",
                        "One category per sentence cannot represent every action in a mixed sentence.",
                        "Unknown and context sentences must remain visible for review; never use this model to suppress safety instructions.",
                        "English-only; negation and unfamiliar wording can be misclassified."],
    }
    return model

def evaluate(model, heldout, eval_path):
    labels = model["labels"]
    columns = labels + ["unknown"]
    raw = {label: {other: 0 for other in labels} for label in labels}
    accepted = {label: {other: 0 for other in columns} for label in labels}
    predictions = []
    for row in heldout["examples"]:
        prediction = classify(row["text"], model)
        raw[row["label"]][prediction["candidate"]] += 1
        accepted[row["label"]][prediction["label"]] += 1
        predictions.append({**row, "prediction": prediction})
    total = len(predictions)
    accepted_n = sum(row["prediction"]["label"] != "unknown" for row in predictions)
    accepted_correct = sum(row["prediction"]["label"] == row["label"] for row in predictions)
    metrics = {}
    for label in labels:
        tp = raw[label][label]
        recall = tp / sum(raw[label].values())
        precision = tp / max(1, sum(raw[other][label] for other in labels))
        metrics[label] = {"precision": precision, "recall": recall,
                          "f1": 2 * precision * recall / max(1e-15, precision + recall),
                          "support": sum(raw[label].values()),
                          "accepted_correct": accepted[label][label],
                          "abstained": accepted[label]["unknown"]}
    action_rows = [row for row in predictions if row["label"] != "context"]
    slices = {}
    for tag in sorted({tag for row in predictions for tag in row.get("tags", [])}):
        rows = [row for row in predictions if tag in row.get("tags", [])]
        slices[tag] = {"support": len(rows),
                       "raw_accuracy": sum(r["label"] == r["prediction"]["candidate"] for r in rows) / len(rows),
                       "abstained": sum(r["prediction"]["label"] == "unknown" for r in rows)}
    return {
        "model_id": model["model_id"], "evaluation_type": "fixed original synthetic held-out engineering challenge set",
        "held_out_examples": total, "eval_data_sha256": digest(eval_path),
        "raw_top1_accuracy": sum(row["prediction"]["candidate"] == row["label"] for row in predictions) / total,
        "macro_f1": sum(row["f1"] for row in metrics.values()) / len(labels),
        "coverage": accepted_n / total,
        "accepted_accuracy": accepted_correct / accepted_n if accepted_n else None,
        "accepted_count": accepted_n,
        "abstained_count": total - accepted_n,
        "action_bearing_sentences": len(action_rows),
        "raw_action_retention": sum(r["prediction"]["candidate"] != "context" for r in action_rows) / len(action_rows),
        "accepted_action_retention": sum(r["prediction"]["label"] not in ("context", "unknown") for r in action_rows) / len(action_rows),
        "metric_notes": ["Raw top-1 metrics ignore abstention and measure five-way category prediction.",
                         "Accepted accuracy is computed only over non-abstained sentences; always report coverage beside it.",
                         "Action retention means predicting any non-context category, not extracting the correct action or clinical sensitivity.",
                         "All numbers come from 50 synthetic examples; this small, single-author-style test cannot establish real-world performance.",
                         "Thresholds were fixed before evaluation, not tuned on this set."],
        "per_class": metrics, "confusion_matrix_raw": raw, "confusion_matrix_with_abstention": accepted,
        "slices": slices, "predictions": predictions,
    }

def report_markdown(model, report):
    pct = lambda x: f"{100*x:.1f}%" if x is not None else "n/a"
    lines = ["# Looplight sentence classifier — engineering evaluation", "",
             "## What was evaluated", "",
             f"A five-class linear softmax classifier trained on {model['training']['examples']} original synthetic English sentences, evaluated once against {report['held_out_examples']} independently worded synthetic examples. No patient records, pretrained language model, external API, or clinician labels were used.", "",
             "The held-out split and hyperparameters were fixed before fitting. This measures an engineering component's behavior on authored fixtures. It is not clinical validation, a user study, or evidence of health outcomes.", "",
             "## Results", "",
             "| Metric | Value |", "|---|---:|",
             f"| Raw five-way top-1 accuracy | {pct(report['raw_top1_accuracy'])} |",
             f"| Raw macro F1 | {report['macro_f1']:.3f} |",
             f"| Accepted coverage | {pct(report['coverage'])} ({report['accepted_count']}/{report['held_out_examples']}) |",
             f"| Accuracy among accepted sentences | {pct(report['accepted_accuracy'])} |",
             f"| Abstained sentences | {report['abstained_count']} |",
             f"| Raw action-category retention | {pct(report['raw_action_retention'])} |",
             f"| Accepted action-category retention | {pct(report['accepted_action_retention'])} |", "",
             "Action-category retention asks whether an action-bearing fixture received any action category. It does not establish that an action, date, person, medication, or warning was extracted correctly. Never describe it as clinical recall.", "",
             "## Per-class raw metrics", "", "| Category | Precision | Recall | F1 | n | Abstained |",
             "|---|---:|---:|---:|---:|---:|"]
    for label, row in report["per_class"].items():
        lines.append(f"| {label} | {pct(row['precision'])} | {pct(row['recall'])} | {row['f1']:.3f} | {row['support']} | {row['abstained']} |")
    lines += ["", "## Raw confusion matrix", "", "Rows are authored labels; columns are predictions before abstention.", "",
              "| Actual ↓ / Predicted → | " + " | ".join(model["labels"]) + " |",
              "|---|" + "---:|" * len(model["labels"])]
    for label, row in report["confusion_matrix_raw"].items():
        lines.append("| " + label + " | " + " | ".join(str(row[other]) for other in model["labels"]) + " |")
    lines += ["", "## Errors and abstentions", ""]
    for row in report["predictions"]:
        pred = row["prediction"]
        if pred["candidate"] != row["label"] or pred["label"] == "unknown":
            lines += [f"- `{row['id']}` — expected **{row['label']}**, candidate **{pred['candidate']}**, returned **{pred['label']}** (score {pred['confidence']:.3f}; {pred['reason'] or 'accepted'}): {row['text']}"]
    lines += ["", "## Required interpretation", "",
              "- Scores are relative softmax scores, not calibrated confidence or a probability that a medical statement is correct.",
              "- Unknown means the model abstained. Preserve the original sentence and ask for review; do not treat unknown as unimportant.",
              "- Negation is a hard case: 'do not restart' is still an instruction, while 'no follow-up is required' describes the absence of one.",
              "- Multi-action sentences receive one training label using the documented priority. The application must split or separately inspect clauses so another instruction is not lost.",
              "- Injection examples are inert strings for this arithmetic model. Their labels do not replace security boundaries for any later generative system.",
              "- Input beyond 4,000 characters or 256 tokens abstains; short and unfamiliar inputs also abstain.",
              "- Expected next validation: consented, de-identified clinical samples independently labeled by clinicians; external institution holdout; language, literacy, specialty, and error-category audits.", "",
              "`evaluation.json` contains all predictions, slice results, hashes, and both confusion matrices. `model.json` records training parameters. `python3 train.py` reproduces both.", ""]
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", type=Path, default=ROOT / "data/train.json")
    parser.add_argument("--eval", type=Path, default=ROOT / "data/eval.json")
    parser.add_argument("--out", type=Path, default=ROOT)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    training = json.loads(args.train.read_text())
    if len({r["text"] for r in training["examples"]}) != len(training["examples"]):
        raise ValueError("Duplicate training text")
    model = fit(training, args.train)
    (args.out / "model.json").write_text(json.dumps(model, separators=(",", ":")) + "\n")
    # Deliberately do not read the held-out file until fitting/export has ended.
    heldout = json.loads(args.eval.read_text())
    train_texts = {r["text"].lower() for r in training["examples"]}
    if any(r["text"].lower() in train_texts for r in heldout["examples"]):
        raise ValueError("Exact text leaked between train and held-out sets")
    report = evaluate(model, heldout, args.eval)
    (args.out / "evaluation.json").write_text(json.dumps(report, indent=2) + "\n")
    (args.out / "EVALUATION.md").write_text(report_markdown(model, report))
    print(json.dumps({k: report[k] for k in ["raw_top1_accuracy", "macro_f1", "coverage", "accepted_accuracy", "abstained_count", "raw_action_retention", "accepted_action_retention"]}, indent=2))

if __name__ == "__main__":
    main()
