# Looplight local sentence model

A small, real trained machine-learning component that proposes a category for each discharge-note sentence. Everything runs locally with no API key, account, model download, or inference fee. Its job is narrow: suggest which text might concern unfinished care, then let explicit extraction rules and a human review the original wording.

## Files

| File | Purpose |
|---|---|
| `model.json` | Portable feature vocabulary, learned weights, thresholds, and provenance |
| `inference.ts` | Dependency-free browser/server TypeScript inference |
| `data/train.json` | 225 original synthetic labeled training sentences; 45 per class |
| `data/eval.json` | 50 separately worded synthetic held-out sentences; 10 per class |
| `data/build_data.py` | Readable source authoring for both fixed datasets |
| `train.py` | Reproducible Python-standard-library fitting and evaluation |
| `EVALUATION.md` | Human-readable result, failure analysis, and limits |
| `evaluation.json` | Every held-out prediction, confusion matrices, and tagged slices |
| `make_parity_cases.py` | Generate Python reference output for interoperability tests |
| `test-inference.mjs` | Verify TypeScript matches Python and input boundaries |

## Integrate

```ts
import model from './model.json';
import { createSentenceClassifier } from './inference';

const classifySentence = createSentenceClassifier(model);
const proposal = classifySentence('The biopsy report is still pending.');
// {
//   label: 'pending_result' | ... | 'unknown',
//   candidate: 'pending_result' | ...,
//   confidence: 0..1, // UNCALIBRATED model score
//   margin: 0..1,
//   coverage: 0..1,
//   scores: { follow_up, pending_result, medication, safety, context },
//   reason: null | 'low_model_score' | ...
// }
```

Create the classifier once per application instance. Repeated calls use a cached vocabulary map. `classifySentence(text, model)` is also exported as a convenience, but recreates the map each time. Input is sentence text; the caller must perform sentence/line segmentation and retain source spans.

### Category contract

| Category | Meaning | Example |
|---|---|---|
| `follow_up` | Future appointment, referral, new or repeat investigation, or review instruction | “Arrange another blood test in two weeks.” |
| `pending_result` | A test already performed with an outstanding result, report, or review | “The sample report is awaited.” |
| `medication` | Instructions to start, stop, continue, clarify, collect, or use a medicine | “Do not restart the old tablets.” |
| `safety` | Existing source instructions about urgent help or warning symptoms | “Seek urgent care if breathing worsens.” |
| `context` | History, completed care, non-action information, or administrative/injection text | “The result was reviewed; no further action is needed.” |
| `unknown` | Model abstention; original text still requires review | Unfamiliar or ambiguous text |

For training sentences with multiple action categories, the annotation priority is **safety → medication → pending_result → follow_up → context**. This is a topic-label convention, not a clinical priority recommendation. A single label cannot represent all clauses. The application must not let this convention hide another action.

### Required downstream behavior

1. Preserve the source sentence, document identifier, and offsets so every suggestion is inspectable.
2. Run deterministic checks independently of the model. In particular, the model must never hide safety instructions, erase a negated instruction, choose a medication dose, infer an absent deadline, or resolve a contradiction.
3. Retain `unknown` and `context` sentences in the review interface. The `candidate` can appear as “possible category — review needed”; it is never an approved task.
4. Keep “if,” “unless,” “do not,” owner names, and conflicting wording visible. Ask the reviewer to clarify unresolved details.
5. Require user confirmation before adding proposed actions to the care ledger. Completing a ledger item is a separate user action with an audit trail.

The conservative fixed cutoffs abstain on 44 of the 50 challenge sentences. That is intentional uncertainty behavior, but it means the candidate is often only a review aid. Do not market accepted-only accuracy without its 12% coverage. Raw top-1 accuracy is 82% on this small synthetic set. These numbers do not establish clinical performance.

## Reproduce

Requires Python 3.9+ (standard library only). To validate the TS implementation, use Node 22.6+ with type stripping or the application's TypeScript runner.

```sh
python3 data/build_data.py
python3 train.py
python3 make_parity_cases.py
node --experimental-strip-types test-inference.mjs
```

Training is deterministic: zero initialization, full-batch updates, 700 epochs, fixed learning rate and L2 penalty. Features are normalized counts of ASCII English words/numbers plus adjacent word pairs. The learned model uses multinomial logistic regression; this is not a keyword-only classifier or an external LLM. Scores are softmax outputs, uncalibrated on real records.

Vocabulary and weights use only `train.json`. The trainer writes the model before opening `eval.json`. Thresholds were fixed before the first evaluation and have not been tuned against the held-out examples. The report includes every failure instead of selecting only successful demonstrations.

## Data and medical limitations

All examples were originally authored with AI assistance for this project. They contain no real patient information and were not annotated or validated by clinicians. Example care instructions are fictional text-classification fixtures, not advice to follow. Even independently worded synthetic examples can share author style with training data; performance on authentic documents could be substantially lower.

The model is English-only, does not read PDFs/images, and cannot diagnose, choose care, verify a plan, infer a patient's current condition, or judge whether an instruction is medically appropriate. It can mishandle negation, historical statements, uncommon specialties, abbreviations, spelling errors, and mixed instructions. It must not be used for automated triage or as the only detector of unfinished care.

Potential future validation should use consented de-identified documents, independent clinician labels, external institution splits, subgroup and error-category analysis, and formal review of the complete workflow. None of that validation is claimed as completed.
