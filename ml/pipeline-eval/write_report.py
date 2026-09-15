#!/usr/bin/env python3
"""Render results already measured; this script performs no inference or fitting."""
from pathlib import Path
import argparse
import json

parser=argparse.ArgumentParser()
parser.add_argument('--directory',type=Path,default=Path(__file__).resolve().parent)
parser.add_argument('--input',default='results.json')
parser.add_argument('--output',default='REPORT.md')
args=parser.parse_args()
ROOT=args.directory
results=json.loads((ROOT/args.input).read_text())
saved=results['engine_manifest'].get('saved_snapshot')
snapshot=(ROOT/'release-snapshots'/Path(saved).name) if saved else ROOT/'snapshot'
model=json.loads((snapshot/'ml/model.json').read_text())
hybrid=results['modes']['hybrid']
rules=results['modes']['rules_only']
summary=hybrid['summary']
c=summary['counts']
phase=results.get('evaluation_phase','initial_frozen_engineering_evaluation')
pct=lambda n: 'n/a' if n is None else f'{n*100:.1f}%'
groups={'ordinary':'Ordinary','paraphrase_unfamiliar':'Unfamiliar paraphrases','mixed_negation_history_conditions':'Mixed / negation / history / conditions','conflict_ambiguity_security_bounds':'Conflict / dates / security / bounds'}
lines=['# Looplight document pipeline evaluation','',
       f'**Evaluation phase:** `{phase}`.','',
       '**Initial frozen-engine result:** 20 original synthetic mini-discharge documents, 44 gold unfinished-care actions. Suggestion precision is **84.2%** and recall is **72.7%** for the retained initial 1.1 snapshot. The frozen ML-disabled comparator produces identical task outputs on these documents. These initial numbers are retained even when a later release regression run is added.','']
if phase.startswith('release'):
    lines += ['**This run is a release regression on already-seen fixtures.** It measures repairs against known examples. It must not be described as unseen evaluation or evidence of generalization.','']
lines += ['## Current results in this result file','',
          '| Metric | Result |','|---|---:|',
          f"| Correct typed suggestions | {c['true_positives']} / {c['suggestions']} suggestions |",
          f"| Gold actions found with correct type | {c['true_positives']} / {c['gold_actions']} |",
          f"| Suggestion precision | {pct(summary['suggestion_precision'])} |",
          f"| Suggestion recall | {pct(summary['suggestion_recall'])} |",
          f"| Suggestion F1 | {summary['suggestion_f1']:.3f} |",
          f"| Strict false positives / false negatives | {c['false_positives']} / {c['false_negatives']} |",
          f"| Action localization ignoring category | {c['localized_actions']} / {c['gold_actions']} |",
          f"| Gold source snippets retained in review sentences | {c['review_visible_gold']} / {c['gold_actions']} |",
          f"| Suggested or explicitly marked for source review | {c['suggested_or_review_cued_gold']} / {c['gold_actions']} |",
          f"| Exact source spans, suggested cards | {c['exact_loop_spans']} / {c['suggestions']} |",
          f"| Exact source spans, review sentences | {c['exact_sentence_spans']} / {c['sentences']} |",
          f"| Assigned dates supported by gold | {c['supported_dated_suggestions']} / {c['dated_suggestions']} |",
          f"| Unsupported or incorrect assigned dates | {c['unsupported_dated_suggestions']} |",
          f"| Gold actions with explicit dates both found and dated | {c['known_date_complete']} / {c['known_date_gold']} |",
          f"| Conditional actions correctly typed or explicitly sent for review | {c['conditional_acknowledged']} / {c['conditional_gold']} |",
          f"| Documents with perfect action precision and recall | {summary['documents_with_perfect_action_precision_and_recall']} / {summary['documents']} |",'',
          'Source visibility is a fallback, not extraction success. A person may still overlook text. The 44/44 initial visibility figure does not establish complete action extraction, safe use, or clinical recall. Likewise, all 16 assigned dates were supported, while four gold actions with explicit dates were not both extracted and dated.','',
          'The initial conditional score uses correct typed suggestions or explicit manual review. The remaining conditional instruction kept its conditional flag but received the wrong action category; do not interpret the 3/4 figure as evidence that its wording was removed.','',
          '## Performance by document family','',
          '| Family | Gold | Suggestions | Correct | Precision | Recall |',
          '|---|---:|---:|---:|---:|---:|']
for name,row in hybrid['groups'].items():
    count=row['counts']
    lines.append(f"| {groups[name]} | {count['gold_actions']} | {count['suggestions']} | {count['true_positives']} | {pct(row['suggestion_precision'])} | {pct(row['suggestion_recall'])} |")
lines += ['', '## What the ML comparator shows','',
          f"The rules-only adapter keeps every deterministic extraction, date, negation, conflict, and source-span rule unchanged. It changes only the sentence scorer to return `unknown` with score 0. On this run, {len(results['mode_differences'])} of 20 documents have different task outputs.",'',
          f"Hybrid: precision {pct(summary['suggestion_precision'])}, recall {pct(summary['suggestion_recall'])}. Rules only: precision {pct(rules['summary']['suggestion_precision'])}, recall {pct(rules['summary']['suggestion_recall'])}.",'',
          'The initial 1.1 result therefore demonstrates **no measured task-extraction lift from ML on this set**. The separate 82% synthetic sentence-classifier accuracy is a different experiment and cannot be substituted for pipeline performance. The current evidence supports a conservative rules-led workflow with local ML topic suggestions; a stronger added-value claim needs a new independent evaluation.','',
          '## Model settings actually evaluated','',
          f"- Minimum softmax score: **{model['thresholds']['min_score']}**.",
          f"- Minimum best/runner-up margin: **{model['thresholds']['min_margin']}**.",
          f"- Minimum vocabulary coverage: **{model['thresholds']['min_coverage']}**.",
          f"- Minimum tokens: **{model['thresholds']['min_tokens']}**; maximum tokens: **{model['thresholds']['max_tokens']}**; maximum characters passed to the classifier: **{model['thresholds']['max_chars']}**.",
          '- Scores are uncalibrated. No threshold or model change was made for this document evaluation.','',
          '## Bounds, injection, and automatic state changes','']
for probe in hybrid['boundary_probes']:
    lines.append(f"- `{probe['id']}` ({probe['characters']:,} characters): **{'passed' if probe['passed'] else 'failed'}**; returned `{probe['error']}`.")
lines += [f"- Network attempts during the frozen analysis run: **{results['network_attempts']}**. The harness blocks `fetch`; no external service is used by the analyzed component.",
          '- Every proposed item in the initial run remained a suggestion with no closure record. Injection text did not confirm or close anything.',
          '- A supported 39,990-character, three-sentence document retained both action snippets after its long administrative paragraph.','',
          '## Matching and annotation rules','',
          '- One-to-one maximum matching requires at least 90% of the gold action’s non-whitespace characters inside an exact returned source span. A strict true positive also requires the correct category.',
          '- A single broad card cannot count as several gold actions. Duplicate cards cannot receive repeated credit. A wrong category counts as one false positive and one false negative.',
          '- Conditional and manual-review-allowed gold actions remain in the recall denominator. Review-only behavior can be appropriate while still lowering automatic suggestion recall.',
          '- Pending-result follow-through and ordinary appointments have different category labels because result closure requires receipt and review.',
          '- Explicit calendar dates/windows must match gold. Assigning a date to ambiguous or unspecified timing is an error; leaving an explicit date unresolved is reported separately.',
          '- The reconciliation commentary in `challenge-01` was annotated as an explanation attached to two conflicting action lines, not a third action. Treating it as a separate clarification task is a defensible alternative. That annotation-boundary case remains in the initial metrics and is disclosed rather than removed after seeing the output.','',
          '## Full initial/current error record','',
          'The entries below are generated from the result file. A wrong-category item appears both as missed gold and as a category error; these are metric contributions, not independent incidents.','']
for doc in hybrid['documents']:
    if not doc['errors']:continue
    lines += [f"### {doc['document_id']}",'']
    for error in doc['errors']:
        text=error.get('snippet') or error.get('quote') or error.get('gold_id') or error.get('prediction_id')
        lines += [f"- **{error['type']}**: {text}"]
        if error['type']=='missed_typed_action':
            lines += [f"  Expected `{error['expected_category']}`; source visible: {error['source_visible']}; explicit review cue: {error['explicit_review_cue']}; manual review allowed: {error['manual_review_allowed']}."]
        if error['type']=='wrong_action_category':lines += [f"  Expected `{error['expected_category']}`, proposed `{error['predicted_category']}`."]
    lines += ['']
lines += ['## Limits and release use','',
          'These are 20 AI-assisted, originally authored synthetic documents with 44 author-labeled actions. No patient data, clinician annotation, clinical validation, user study, or external-institution sample was used. The author previously reviewed an earlier engine; the current engine outputs remained unseen until document authoring and freezing were complete. This is an authored engineering challenge set, not blinded external validation or a population performance estimate.','',
          'The dataset and engine snapshot were hashed before inference. One self-review correction to a six-week date was documented before the current engine was read or evaluated. No document or gold annotation changed after inference. All failures and the zero-lift comparator are retained.','',
          'Once these results inform a fix, these 20 documents become a **release regression set** for that revised engine. Keep initial results and hashes separately. Improvements on the same fixtures show that known cases were repaired; any claim about new documents requires newly authored or independently labeled data held back from development.','',
          'This evaluation covers the document-to-candidate component. It does not test login, persistent storage, PDF text extraction, clinical appropriateness, real users, or health outcomes.','',
          '## Reproduce the retained snapshot','',
          'From the application repository (which already has `tsx` installed):','',
          '```sh','npm run evaluate:pipeline',
          'python3 ml/pipeline-eval/write_report.py --input replay-results.json --output REPLAY_REPORT.md','```','',
          'The evaluator verifies frozen hashes before running. Replays write `replay-results.json`; `--engine /path/to/checkout/lib/engine.ts` writes a separately labeled `release-results.json` plus `release-errors.json`. The retained initial `results.json`, `errors.json`, and `initial-1.1` files are protected from evaluator overwrite. The report writer reads result files without inference. See `README.md` for release commands.','',
          f"Dataset SHA-256: `{results['dataset_sha256']}`.",
          f"Initial/current engine SHA-256: `{results['engine_manifest']['files']['lib/engine.ts']}`.",
          f"Model SHA-256: `{results['engine_manifest']['files']['ml/model.json']}`.",'']
(ROOT/args.output).write_text('\n'.join(lines)+'\n')
print('Wrote '+str(ROOT/args.output))
