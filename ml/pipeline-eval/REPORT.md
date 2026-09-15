# Looplight document pipeline evaluation

**Evaluation phase:** `initial_frozen_engineering_evaluation`.

**Initial frozen-engine result:** 20 original synthetic mini-discharge documents, 44 gold unfinished-care actions. Suggestion precision is **84.2%** and recall is **72.7%** for the retained initial 1.1 snapshot. The frozen ML-disabled comparator produces identical task outputs on these documents. These initial numbers are retained even when a later release regression run is added.

## Current results in this result file

| Metric | Result |
|---|---:|
| Correct typed suggestions | 32 / 38 suggestions |
| Gold actions found with correct type | 32 / 44 |
| Suggestion precision | 84.2% |
| Suggestion recall | 72.7% |
| Suggestion F1 | 0.780 |
| Strict false positives / false negatives | 6 / 12 |
| Action localization ignoring category | 33 / 44 |
| Gold source snippets retained in review sentences | 44 / 44 |
| Suggested or explicitly marked for source review | 44 / 44 |
| Exact source spans, suggested cards | 38 / 38 |
| Exact source spans, review sentences | 107 / 107 |
| Assigned dates supported by gold | 16 / 16 |
| Unsupported or incorrect assigned dates | 0 |
| Gold actions with explicit dates both found and dated | 16 / 20 |
| Conditional actions correctly typed or explicitly sent for review | 3 / 4 |
| Documents with perfect action precision and recall | 11 / 20 |

Source visibility is a fallback, not extraction success. A person may still overlook text. The 44/44 initial visibility figure does not establish complete action extraction, safe use, or clinical recall. Likewise, all 16 assigned dates were supported, while four gold actions with explicit dates were not both extracted and dated.

The initial conditional score uses correct typed suggestions or explicit manual review. The remaining conditional instruction kept its conditional flag but received the wrong action category; do not interpret the 3/4 figure as evidence that its wording was removed.

## Performance by document family

| Family | Gold | Suggestions | Correct | Precision | Recall |
|---|---:|---:|---:|---:|---:|
| Ordinary | 11 | 11 | 11 | 100.0% | 100.0% |
| Unfamiliar paraphrases | 10 | 2 | 2 | 100.0% | 20.0% |
| Mixed / negation / history / conditions | 11 | 12 | 7 | 58.3% | 63.6% |
| Conflict / dates / security / bounds | 12 | 13 | 12 | 92.3% | 100.0% |

## What the ML comparator shows

The rules-only adapter keeps every deterministic extraction, date, negation, conflict, and source-span rule unchanged. It changes only the sentence scorer to return `unknown` with score 0. On this run, 0 of 20 documents have different task outputs.

Hybrid: precision 84.2%, recall 72.7%. Rules only: precision 84.2%, recall 72.7%.

The initial 1.1 result therefore demonstrates **no measured task-extraction lift from ML on this set**. The separate 82% synthetic sentence-classifier accuracy is a different experiment and cannot be substituted for pipeline performance. The current evidence supports a conservative rules-led workflow with local ML topic suggestions; a stronger added-value claim needs a new independent evaluation.

## Model settings actually evaluated

- Minimum softmax score: **0.58**.
- Minimum best/runner-up margin: **0.18**.
- Minimum vocabulary coverage: **0.35**.
- Minimum tokens: **3**; maximum tokens: **256**; maximum characters passed to the classifier: **4000**.
- Scores are uncalibrated. No threshold or model change was made for this document evaluation.

## Bounds, injection, and automatic state changes

- `over-limit-40001` (40,001 characters): **passed**; returned `Keep the source under 40,000 characters.`.
- Network attempts during the frozen analysis run: **0**. The harness blocks `fetch`; no external service is used by the analyzed component.
- Every proposed item in the initial run remained a suggestion with no closure record. Injection text did not confirm or close anything.
- A supported 39,990-character, three-sentence document retained both action snippets after its long administrative paragraph.

## Matching and annotation rules

- One-to-one maximum matching requires at least 90% of the gold action’s non-whitespace characters inside an exact returned source span. A strict true positive also requires the correct category.
- A single broad card cannot count as several gold actions. Duplicate cards cannot receive repeated credit. A wrong category counts as one false positive and one false negative.
- Conditional and manual-review-allowed gold actions remain in the recall denominator. Review-only behavior can be appropriate while still lowering automatic suggestion recall.
- Pending-result follow-through and ordinary appointments have different category labels because result closure requires receipt and review.
- Explicit calendar dates/windows must match gold. Assigning a date to ambiguous or unspecified timing is an error; leaving an explicit date unresolved is reported separately.
- The reconciliation commentary in `challenge-01` was annotated as an explanation attached to two conflicting action lines, not a third action. Treating it as a separate clarification task is a defensible alternative. That annotation-boundary case remains in the initial metrics and is disclosed rather than removed after seeing the output.

## Full initial/current error record

The entries below are generated from the result file. A wrong-category item appears both as missed gold and as a category error; these are metric contributions, not independent incidents.

### paraphrase-01

- **missed_typed_action**: A fresh ferritin measurement should be obtained six weeks from discharge.
  Expected `follow_up`; source visible: True; explicit review cue: True; manual review allowed: False.
- **missed_typed_action**: Your usual practice needs to reassess the tiredness before the end of this month.
  Expected `follow_up`; source visible: True; explicit review cue: True; manual review allowed: False.

### paraphrase-02

- **missed_typed_action**: The practice nurse needs to inspect the incision in 4 days.
  Expected `follow_up`; source visible: True; explicit review cue: True; manual review allowed: False.
- **missed_typed_action**: The tissue findings have yet to reach the treating clinician.
  Expected `pending_result`; source visible: True; explicit review cue: True; manual review allowed: False.

### paraphrase-03

- **missed_typed_action**: The event-recorder trace still lacks its final sign-off.
  Expected `pending_result`; source visible: True; explicit review cue: True; manual review allowed: False.

### paraphrase-04

- **missed_typed_action**: Return for reassessment at the ambulatory unit on 29 September 2026.
  Expected `follow_up`; source visible: True; explicit review cue: True; manual review allowed: False.

### paraphrase-05

- **missed_typed_action**: A community rehabilitation assessment is still to be organized.
  Expected `follow_up`; source visible: True; explicit review cue: True; manual review allowed: False.
- **missed_typed_action**: The report from the ambulatory pressure recording must be obtained and discussed with your clinician.
  Expected `pending_result`; source visible: True; explicit review cue: True; manual review allowed: False.

### mixed-02

- **missed_typed_action**: book a podiatry appointment
  Expected `follow_up`; source visible: True; explicit review cue: True; manual review allowed: True.
- **missed_typed_action**: repeat the gait assessment.
  Expected `follow_up`; source visible: True; explicit review cue: True; manual review allowed: True.
- **false_positive_suggestion**: CONDITIONAL FOLLOW-UP
- **false_positive_suggestion**: No specialist review is needed for the old shoulder injury.

### mixed-03

- **missed_typed_action**: arrange a pharmacy medication review in 7 days.
  Expected `follow_up`; source visible: True; explicit review cue: True; manual review allowed: True.
- **false_positive_suggestion**: No sample from this admission remains pending.

### mixed-04

- **missed_typed_action**: If the laboratory report has not arrived, contact the clinic after 8 days.
  Expected `pending_result`; source visible: True; explicit review cue: False; manual review allowed: False.
- **false_positive_suggestion**: FOLLOW-UP AND WARNING SIGNS
- **wrong_action_category**: If the laboratory report has not arrived, contact the clinic after 8 days.
  Expected `pending_result`, proposed `follow_up`.

### challenge-01

- **false_positive_suggestion**: These two lines describe the same follow-up and their timing requires clarification with the renal team.

## Limits and release use

These are 20 AI-assisted, originally authored synthetic documents with 44 author-labeled actions. No patient data, clinician annotation, clinical validation, user study, or external-institution sample was used. The author previously reviewed an earlier engine; the current engine outputs remained unseen until document authoring and freezing were complete. This is an authored engineering challenge set, not blinded external validation or a population performance estimate.

The dataset and engine snapshot were hashed before inference. One self-review correction to a six-week date was documented before the current engine was read or evaluated. No document or gold annotation changed after inference. All failures and the zero-lift comparator are retained.

Once these results inform a fix, these 20 documents become a **release regression set** for that revised engine. Keep initial results and hashes separately. Improvements on the same fixtures show that known cases were repaired; any claim about new documents requires newly authored or independently labeled data held back from development.

This evaluation covers the document-to-candidate component. It does not test login, persistent storage, PDF text extraction, clinical appropriateness, real users, or health outcomes.

## Reproduce the retained snapshot

From the application repository (which already has `tsx` installed):

```sh
npm run evaluate:pipeline
python3 ml/pipeline-eval/write_report.py --input replay-results.json --output REPLAY_REPORT.md
```

The evaluator verifies frozen hashes before running. Replays write `replay-results.json`; `--engine /path/to/checkout/lib/engine.ts` writes a separately labeled `release-results.json` plus `release-errors.json`. The retained initial `results.json`, `errors.json`, and `initial-1.1` files are protected from evaluator overwrite. The report writer reads result files without inference. See `README.md` for release commands.

Dataset SHA-256: `76acc8b279981a6a3990f6076011ca10bda8e1deb1633b1908811061aeef272e`.
Initial/current engine SHA-256: `e0184b7e10cbcc4bcb3d6f5837a487a132a3ef91866e2f9610bc2b2e6d34659a`.
Model SHA-256: `69b5be6a4ea5d32226cc36924ea53550359c672dd62a32b6eb175ae0e5109893`.

