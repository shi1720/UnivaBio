# Looplight document-pipeline evaluation package

This package evaluates **document → reviewable action candidates** on 20 original synthetic mini-discharge documents with 44 authored gold actions. It contains no patient data.

## Results to present together

| Evaluation | Precision | Recall | Correct / suggested | Correct / gold | Interpretation |
|---|---:|---:|---:|---:|---|
| Initial frozen engine 1.1 | 84.2% | 72.7% | 32 / 38 | 32 / 44 | Current outputs were unseen during authoring; author had prior engine knowledge |
| Release engine 1.2 regression | 97.1% | 75.0% | 33 / 34 | 33 / 44 | Repairs assessed on the same, now-seen fixtures |

The release regression retains 11 gold actions for manual source review: eight unfamiliar phrasings and three conservative mixed/conditional cases. All 44 action snippets remain source-visible and suggested or explicitly review-cued. That is **not** 100% extraction recall or evidence that users will notice every item.

Both engines assigned 16 dates; all 16 matched gold. Only 16 of the 20 gold actions with explicit dates were both extracted and dated. Source spans are exact, and the 40,001-character rejection probe passes.

The ML-disabled comparator produced identical task outputs on all 20 documents in both runs. **No ML extraction lift was measured here.** Model settings stayed at score `0.58`, margin `0.18`, coverage `0.35` (minimum 3 tokens, maximum 256 tokens / 4,000 classifier characters).

## Files

| File / folder | Purpose |
|---|---|
| `dataset.json` | 20 original documents, exact gold/negative source spans, conditions and expected timing |
| `dataset.lock.json` | Frozen dataset hash and counts |
| `author_dataset.py` | Original authoring source; refuses to overwrite an existing freeze |
| `pre-inference-annotation-correction.json` | Transparent record of a date annotation correction made before reading/evaluating the current engine |
| `initial-1.1/` | Retained first measured results, full failures, runnable original evaluator and exact source snapshot |
| `results.json`, `errors.json`, `REPORT.md` | Initial result and human-readable report |
| `snapshot/` | Exact initial 1.1 engine, dates, model/inference and rules-only adapter |
| `evaluate.mts` | Portable replay / release-regression runner with hash checks |
| `replay-results.json` | Verification that the extended runner reproduces initial metrics |
| `release-results.json`, `release-errors.json`, `RELEASE_REPORT.md` | Separate measured release 1.2 regression and complete remaining failures |
| `release-snapshots/` | Exact release source and isolated rules-only adapters for reproducibility |
| `write_report.py` | Reports from measured JSON; no inference or fitting |
| `snapshot_engine.py` | One-time snapshot authoring helper; accepts `--checkout`, never writes to it |
| `RELEASE_RECOMMENDATIONS.md` | Failure classes and extra development examples outside the frozen 20 documents |

## Reproduce the initial snapshot

Requires the application's installed `tsx` dependency and Python 3.9+ for reports. From the application checkout:

```sh
./node_modules/.bin/tsx /path/to/evaluation/evaluate.mts
python3 /path/to/evaluation/write_report.py --input replay-results.json --output REPLAY_REPORT.md
```

The extended runner defaults to `replay-results.json` / `replay-errors.json`. It cannot overwrite the retained initial `results.json`, `errors.json`, or files inside `initial-1.1/`.

## Evaluate a revised release

Freeze application edits during the run:

```sh
./node_modules/.bin/tsx /path/to/evaluation/evaluate.mts \
  --engine /path/to/checkout/lib/engine.ts \
  --out release-results.json
python3 /path/to/evaluation/write_report.py \
  --input release-results.json --output RELEASE_REPORT.md
```

The runner imports the selected checkout engine read-only, records hashes before and after inference, and saves an exact release snapshot. A temporary copied engine changes only `scoreSentence` to return `unknown`; the original checkout is untouched. Outputs are explicitly labeled `release_regression_on_seen_fixtures`. Use a distinct `--out` filename for each later release you want to retain.

The standalone snapshot helper is only for creating a new initial evaluation package before inference:

```sh
python3 /path/to/evaluation/snapshot_engine.py --checkout /path/to/checkout
```

It refuses to replace an existing frozen snapshot. Normal replay/release runs do not need it.

## Metric contract

- Maximum one-to-one matching requires at least 90% of the gold action's non-whitespace text within an exact returned source span. Correct category is also required for a true positive.
- A wrong category contributes one false positive and one false negative. Duplicate/compound cards cannot receive multiple credits for one predicted action.
- Conditional and manual-review-allowed gold actions remain in the recall denominator.
- Source visibility and explicit unknown/manual-review cues are measured separately from extraction success.
- No assigned date is accepted unless it matches the gold calendar date/window. Missing explicit dates and premature resolution of ambiguous dates are distinct failure modes.
- One retained false positive is an annotation-boundary case: reconciliation commentary was annotated as an explanation accompanying two conflicting actions. A separate clarification task is defensible; this case is disclosed and remains in both result files.

These are descriptive results on a small, authored, synthetic engineering challenge set. They are not clinical validation, user research, blinded external evaluation, or generalization estimates. The current outputs were hidden during authoring, but the author had previously reviewed an earlier engine. After the initial run informed repairs, the same 20 documents became release regression fixtures. New generalization claims require new held-back data.
