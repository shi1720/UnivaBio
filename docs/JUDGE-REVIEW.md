# Looplight: final simulated rubric and startup review

**Review date:** September 15, 2026  
**Reviewer role:** independent AI-agent critique within the build team  
**Scope:** release candidate hybrid engine 1.2, repository source and reports, application screenshots, and prepared submission artifacts. This is a simulated critique, not an official judge assessment, independent clinical evaluation, or prediction of a competition result.

## Overall assessment

Looplight now presents a coherent, working research MVP: extract suggestions from a discharge document, inspect their exact source, assign a tracking person, record receipt, then separately record reported clinician review and completion. The strongest demonstration is that receiving a result does not close the follow-up. The best differentiator is this inspectable workflow and its handling of missing information; neither the category nor the small classifier is a demonstrated moat.

The project is materially stronger than the first review. The starter README has been replaced; setup, architecture, security boundaries, business assumptions and verification are documented. The pitch contains an actual product screenshot. A malformed title was repaired. Document-level extraction failures are published, fixes have regression evidence, and the absence of measured ML extraction lift is disclosed. The buyer is now one coordinator, consistent with the single-account MVP.

## Rubric scores

Scores use the requested 0–10 scale. The event describes five criteria worth five points each, so the equivalent total is half this total. Scores assess the prepared product and materials; unresolved submission access is recorded once as a readiness gate below.

| Criterion | Score | Evidence and remaining constraint |
|---|---:|---|
| Idea & Innovation | **6.5 / 10** | The pending-result story is specific and understandable. Source, uncertainty, tracker and reported resolution form a credible narrow workflow. SeamlessMD, Memora/Commure, Eon and Welkin overlap with care navigation and follow-up. No verified competitor feature absence, proprietary data asset or customer preference establishes uniqueness. |
| Implementation | **8.5 / 10** | Real local PDF/text import, exact spans, conservative date handling, human confirmation, receipt/review gates, persistence, owner-scoped D1 APIs, idempotent imports and versioned writes are implemented. QA records 31 domain tests, 32 actual local D1/API checks, 64 model-parity cases, lint/type/build passes and repeatable migrations. Hosted authentication and OS-level download/print completion are not yet verified. |
| Health Impact & Rigor | **8 / 10** | Historical research is qualified correctly; real-world benefit is not claimed. Initial extraction failures and a rules-only comparison are retained, and regression improvement is labeled honestly. There are no clinical records, clinician annotations, prospective users or outcome measurements. Source visibility helps review but does not prove that people will catch omissions. |
| Design & Usability | **8.5 / 10** | Actual desktop and mobile captures show readable hierarchy, focused source review, visible unknowns and a clear distinction between receipt and completion. Mobile layouts and recovery from an unreadable PDF were exercised. Accessibility and low-literacy task success have no user-study evidence. Two small labels can still better match the product's actual saved-space and reported-review semantics. |
| Presentation | **8.5 / 10** | The fictional Anita/Maya narrative, one-page PDF, seven-slide deck, verbatim script, code walkthrough and candid judge Q&A tell a consistent story. Actual UI appears in the deck. The silent screenshot walkthrough is accurately described as a recording aid. A few final version/copy details need reconciliation before the narrated submission is assembled. |
| **Total** | **40 / 50** | **Equivalent: 20 / 25. An informed simulated review, not a likely official score.** |

## What the measurements actually support

- The sentence classifier was trained on 225 synthetic examples and evaluated on 50 separately worded synthetic examples: 82% raw five-category accuracy, 0.816 macro F1, 44 abstentions and six accepted predictions. Six correct accepted predictions do not establish robust real-world performance.
- The original 20-document, 44-action challenge measured engine 1.1 at 32 correct of 38 suggestions: **84.2% precision and 72.7% recall**. The author froze current outputs before inference but had prior knowledge of an earlier engine; this was not blinded external validation.
- Engine 1.2 reaches 33 correct of 34 suggestions: **97.1% precision and 75.0% recall on the same now-seen regression fixtures**. Eleven gold actions still require manual source review. This is evidence of repairs to known cases, not a new generalization result.
- All returned source spans and the 16 assigned dates match this annotation set. That does not mean every dated action was found or every future date is safe.
- Disabling ML leaves task outputs unchanged on the 20 documents. **There is no measured incremental ML extraction benefit on this set.** The honest description is a rules-led workflow with local ML suggestions.

## Commercial assessment

The single-coordinator starting customer fits the current product better than a team-care platform promise. A coordinator already doing this work is a plausible buyer to interview, while patients and caregivers benefit through the plan and brief. The document-first entry point avoids making an EHR integration a prerequisite for a synthetic or governed retrospective pilot.

The proposed $149/month for 100 episodes is a testable offer, not validated pricing. At an assumed $35/hour loaded labor cost, five minutes saved per episode produces $291.67/month in gross time value; breakeven against the subscription alone is 2.55 minutes per episode. Review, onboarding, secure operations and support can erase that margin. Zero external model API fees are useful but do not establish attractive total unit economics.

No customer interviews, paid commitments, measured time savings or demonstrated defensibility exist yet. The strongest next commercial experiment is the already documented paired workflow study and supervised single-coordinator pilot. Do not add features to obscure those uncertainties.

## Prioritized final actions

### Submission readiness gates

1. **Make judge access work and test it signed out.** The hosted deployment remains owner-private pending approval. Verify the fictional demo is reachable by a judge, and verify the hosted saved-account path with the intended authentication. An inaccessible URL must not be submitted as a usable prototype. This unresolved gate is not separately deducted in every rubric category.
2. **Finish the narrated interaction video and its viewable link.** The supplied 1920 × 1080 silent screenshot walkthrough is a useful 188.7-second recording aid, not a continuous live interaction capture. Use the verbatim script with real click footage for import, confirmation and receipt/review/closure; verify final playback and embedding while signed out. Check print/save and calendar-file import in the recording browser because the build environment could not observe OS save completion.
3. **Finish packaging the frozen code and artifacts.** Include the code PDF plus repository, check final hashes, and deliver one final deck/video version. Confirm student eligibility and account declarations truthfully; these cannot be inferred from the repository.

### Small, concrete consistency fixes

- `submission/devpost-copy.md` still names **hybrid-1.1** in its build section. Match the final release name, **1.2**, while retaining 1.1 as the initial experiment version.
- The script says “Signing in saves the plan to the account.” The current demo and saved space are separate. Prefer “In a signed-in care space, plans are saved to the account,” and show an actually saved plan. Clarify the same boundary beside “Sign in & save” if the UI copy is changed later.
- `ml/pipeline-eval/REPORT.md` and its report template still give an external absolute-path placeholder. The root `npm run evaluate:pipeline` command is easier to reproduce; align documentation to the checked-in path without changing retained measurement JSON.
- `app/components/loop-detail.tsx` uses “Clinician reviewed” for a user-entered report. Nearby caveats are clear, but “Review reported” would carry the limitation directly into the compact state label.

These are review findings at the time of inspection. Subsequent fixes should be listed in the release checklist rather than silently changing this review into a claim that they were already verified.

## Claims to preserve through the demo

Say “suggestion,” “source review,” “user-reported completion,” “synthetic evaluation,” and “pricing hypothesis.” Keep classifier metrics separate from pipeline extraction metrics; keep the original experiment separate from regression repair. Do not claim clinical validation, reduced readmissions, an accepted clinician handoff, multi-user sharing, customer traction, or a proven AI advantage. Accurate limits strengthen the actual engineering story.

## Evidence inspected

- `README.md`; `docs/QA.md`; `docs/BUSINESS.md`; `docs/SECURITY.md`; `docs/RESEARCH.md`.
- Application and library source, local API/domain tests, and source-review/closure flows.
- `ml/README.md`; `ml/EVALUATION.md`; `ml/pipeline-eval/README.md`; retained initial and release reports/results; rules-only snapshots.
- Actual UI captures under `docs/images/` and `/tmp/looplight-qa/`.
- One-page PDF, pitch PDF/deck, script, Devpost copy, judge Q&A, screenshot-walkthrough manifest and recording guide under `/tmp/univabio-submission/output/` and their checked-in submission copies.

Automated-check counts in this review are attributed to the final QA record and retained reports; this review did not rerun every suite. It independently inspected source and artifacts and spot-checked the repaired title behavior. No patient, customer or real judge participated in this simulated review.
