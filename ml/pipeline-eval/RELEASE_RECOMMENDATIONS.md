# Repair guidance from the initial frozen evaluation

The original 20-document results are retained. These recommendations are development feedback. Any later evaluation on the same documents must be called a **release regression on seen fixtures**. No model threshold or dataset change is proposed.

## 1. Resolve negation before creating a positive task

Two confirmed false positives were “No specialist review is needed for the old shoulder injury” and “No sample from this admission remains pending.” The first omits `review` from the existing negated-object vocabulary; the second places subject words between `no` and `pending`.

Use clause-local negation frames that combine a negative determiner, a care object, and its predicate. Do not apply a document-wide `no … pending` expression: a sentence such as “No new symptoms were reported; the culture is pending” contains a real pending result. When scope crosses a conjunction and cannot be determined, preserve the clause as unknown/manual review rather than making a positive card.

Development fixtures outside the frozen set:

| New fixture | Conservative expectation |
|---|---|
| No imaging review is required after the completed appointment. | No new follow-up card |
| None of the specimens are awaiting a report. | No pending-result card |
| There are no laboratory reports left to chase. | No pending-result card |
| No headache was reported; check the pending culture. | Preserve the positive result follow-through |
| No scan is required, but the histology is still pending. | Pending-result candidate or explicit mixed/manual review; never silently discard both clauses |

## 2. Recognize result-related escalation without removing closure requirements

“If the laboratory report has not arrived, contact the clinic after 8 days” was labeled as an ordinary follow-up. It concerns obtaining a result and therefore needs the result workflow’s receipt/reviewer requirements. Preserve the conditional flag and leave the open-ended `after` time unresolved.

Combine an explicit result/report/specimen referent with a missing-arrival/finalization predicate. Do not classify every sentence mentioning a report as a pending result: some describe a future appointment or a completed report.

Development fixtures outside the frozen set:

| New fixture | Conservative expectation |
|---|---|
| If the report is still not back, call the diagnostics office. | Conditional pending-result candidate; no invented date |
| The requested pathology findings have not reached the practice. | Pending-result candidate or explicit review |
| The report has arrived and has been reviewed. | Completed context |
| After the future scan, arrange a consultation to discuss its report. | Follow-up or explicit review; do not assume the test/result already exists |

## 3. Recognize richer headings using structure and absence of a directive

The headings “CONDITIONAL FOLLOW-UP” and “FOLLOW-UP AND WARNING SIGNS” became action cards. Heading recognition should accommodate common modifiers and grouped section labels. Capital letters alone cannot identify a heading because legitimate instructions can also be uppercase.

Development fixtures outside the frozen set:

| New fixture | Conservative expectation |
|---|---|
| RESULT TRACKING AND AFTERCARE | Heading/context |
| Your next appointments | Heading/context when structurally presented as a heading |
| REPEAT THE BLOOD TEST IN 10 DAYS | Action candidate; uppercase text is not automatically a heading |
| Pending reports: | Heading/context |

## 4. Treat unfamiliar wording as an unresolved action-review problem

Only two of ten unfamiliar-paraphrase gold actions became correct suggestions. Eight remain visible with unknown-category review cues. More vocabulary rules may improve known phrasings but do not establish generalization. A future model or semantic extraction change should be assessed on new held-back documents; do not tune thresholds to improve this retained set and then call it unseen evaluation.

The initial comparison measured zero ML task-extraction lift. Keep that finding. A supported future AI value proposition could be action-focused review prioritization, but its incremental benefit would need its own evaluation.

## 5. Avoid optimizing away useful clarification solely to satisfy one annotation

The sentence explaining that two conflicting follow-ups need timing clarification became an additional task. The author annotated it as reconciliation commentary attached to the two existing actions. A separate clarification task is also defensible. Prefer a clear product choice: attach a question to the affected cards, or intentionally create an explicit clarification item. Disclose the annotation boundary; do not silently change the original gold set after seeing the output.

## Release checks

- Pending-result escalation cannot be closed through the ordinary follow-up path without receipt and reviewer information.
- Negative/historical clauses do not create positive tasks.
- Real actions after unrelated negative clauses remain suggested or visibly unresolved.
- Heading suppression does not suppress uppercase clinical instructions.
- All source quotes remain exact and condition words remain attached.
- Previously ambiguous timing stays unresolved unless a person confirms it.
- Initial frozen results, model settings, dataset hashes, and the rules-only comparator stay available beside any release regression results.
