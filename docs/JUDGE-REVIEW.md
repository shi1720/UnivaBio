# Looplight: final simulated judge review

**Date:** September 15, 2026
**Reviewer:** a separate AI agent within the build team
**Scope:** current Firebase MVP, repository evidence, final UI source and the browser results reported by the parent agent. This is a simulated critique, not external judge feedback, clinical evaluation or a prediction of the competition result. The reviewer did not run a separate browser session for this final review.

## Assessment

Looplight delivers a coherent research MVP around a clear question: after a result arrives, who makes sure someone reviews it? A person can inspect the discharge sentence, correct a suggestion, name a tracker, record receipt, then record reported review and completion. An edited demo can be saved through Google sign-in and restored after a full reload. The working product supports the story.

The strongest contribution is the source-linked workflow and its explicit uncertainty. The small classifier is technically reproducible, but the current document evaluation establishes no additional extraction benefit from ML. Care coordination has substantial competition. The current differentiation is a narrow, inspectable experience rather than proven feature exclusivity or defensible data.

## Official five-criterion scale

Each criterion is scored out of five. Scores reflect the inspected MVP and evidence, with video hosting and final submission recorded once as a readiness item below.

| Criterion | Score | Concrete basis and remaining limit |
|---|---:|---|
| Idea & Innovation | **3.5 / 5** | Pending results make the problem relatable. Exact source, missing details, tracking person and receipt/review separation form a focused solution. Existing care-navigation vendors overlap; there is no validated competitor gap, proprietary dataset or buyer preference. |
| Implementation | **4.5 / 5** | Working import, local inference, exact spans, client workflow validation, Google/email Auth and Firestore persistence are integrated. Tests passed 31 domain cases, 16 snapshot/export cases, 64 parity cases, 57 live Firebase checks and 58 emulator checks including the actual cap. Real Google sign-in and edited-demo reload passed. Real EHR integration and multi-user coordination are outside the MVP. |
| Health Impact & Rigor | **3.5 / 5** | Historical motivation is qualified, source omissions remain visible, initial failures are retained and regression improvement is identified accurately. The app distinguishes receipt from reported review. Evidence is synthetic, with no clinician-labeled held-back notes, patient study, measured correction burden or outcomes. |
| Design & Usability | **4.5 / 5** | The main task has a clear sequence. Saved-space navigation and error recovery exist, unrelated drafts survive progress/details saves, and linked tabs support keyboard navigation. GUI checks cover draft preservation, Arrow Right/End and a 390 × 844 board/full-width drawer without overflow. Broader accessibility and low-literacy task success remain unmeasured. |
| Presentation | **4.0 / 5** | The fictional Anita/Maya story, project documents, code walkthrough and actual recorded source/receipt/closure interactions show a concrete product. The completed 2:38.6 video uses actual interaction footage, disclosed AI narration and captions. Hosted video/Devpost publication and final source-PDF regeneration are pending. |
| **Total** | **20.0 / 25** | **An internal simulated assessment, not an expected official score.** |

## What has been verified

The [Firebase reports](../tests/firebase/reports/) retain an initial live run at 56/58, a repaired live rerun at 57/57, and a full emulator run at 58/58. The initial run included the actual 100-space cap and exposed two recovery problems. The smaller live rerun did not repeat saturation; the emulator run did. Source hashes and cleanup outcomes are retained. Failures have not been rewritten as first-pass success.

A fresh signed-out browser loaded the public demo without an account. The final versioned PDF reader passed a real file-picker check, and two consecutive challenge runs each produced four suggestions with correct sample repopulation.

Returning to existing saved work through Try the demo → About this demo → Open my saved spaces was verified without creating a copy.

Parent-reported current GUI checks passed Google sign-in, saving an edited demo, full-page reload, detail/progress draft preservation and Arrow Right/End tab behavior. The inspected mobile board and drawer fit 390 × 844; the board also fit 320 × 740 with a measured 320-pixel document width. Actual source-linked manual addition, receipt that leaves a result open, reported clinician closure and a calendar-file download click were recorded. Subsequent browser checks selected the bundled PDF through the real file chooser, extracted 847 characters and saved three expected follow-ups. OS-saved text and calendar files were inspected. The text brief retained all tasks and final original-source text; the calendar parsed with one eligible event, omitted patient names and excluded the closed result. It contains no explicit notification alarm. The OS-saved JSON parsed and passed `validateEpisode` with 21 source segments, three follow-ups and preserved source text. The text brief contained 2,314 characters. After the print-spacing fix, browser `Page.printToPDF` produced two pages retaining all three follow-ups, 18 unlinked segments, final source text and footer. Both pages were visually inspected without clipping or an orphaned footer. Calendar-app import and physical printer output remain unverified.

Firebase rules enforce owner paths, immutable saved source, outer record shape/size, version increments and quota coupling. They do not parse the state JSON or attest that clinical transitions occurred. The owner can supply user-reported state within those boundaries. This is an appropriate documented trust boundary for the prototype, not a verified clinical audit.

The prior 32 D1/API checks are historical. They are not counted as Firebase evidence, and the old private-hosting/authentication concerns do not describe the clean public Firebase application.

## What the AI measurements support

- The classifier uses 225 synthetic training examples and 50 separately worded synthetic challenge examples. Raw topic accuracy is 82% and macro F1 is 0.816. It abstains on 44/50 examples; six predictions are accepted and all six are correct. This is small synthetic sentence-classification evidence.
- The 20-document challenge contains 44 annotated actions. Its author froze the documents before running the then-current engine, but had prior knowledge of an earlier engine. It is not blinded external or clinician-labeled validation.
- Initial engine 1.1 produced 32 correct of 38 suggestions, finding 32/44 gold actions: 84.2% precision and 72.7% recall.
- Engine 1.2 produced 33 correct of 34 suggestions and found 33/44 gold actions: 97.1% precision and 75.0% recall on the same now-known regression cases. Eleven actions remain for manual source review. This is repair evidence, not fresh generalization.
- All 44 gold snippets remain visible, and all 16 assigned dates and returned spans match the annotation set. Visibility does not show that a person will notice a missing task.
- Disabling ML leaves task outputs unchanged on these 20 documents. No incremental ML extraction benefit is established. A stronger AI claim needs a fresh held-back comparison.

## Commercial assessment

One coordinator at a primary-care practice or transitions service is a plausible initial buyer. The proposed offer is **$149/month for 100 episodes**, not implemented billing or validated pricing. The current 100-stored-space limit is a separate storage constraint.

At an assumed $35/hour staff cost, five minutes saved per episode is $291.67/month of gross time value at 100 episodes. Review, onboarding, support and secure operation can absorb that value. There are no measured savings, paying customers or demonstrated unit economics. Local inference avoids external model fees, but does not make the entire service free to operate at scale.

SeamlessMD, Memora/Commure, Eon and Welkin address overlapping workflows. A useful next test is paired workflow research with coordinators, including correction time and missed actions, followed by a governed pilot and a real willingness-to-pay test. Additional features do not resolve the current evidence gap.

## Remaining release work

1. Publish the completed 2:38.6, 1920 × 1080 narrated video after explicit YouTube terms confirmation, then check signed-out hosted playback and embedding. It uses actual browser interaction footage, AI-generated Cedar narration, 32 burned-in cues and a separate SRT. The voice is not a recording of Shivam.
2. Complete final source-PDF, inventory and hash regeneration, which is underway. Preserve the original hashes in the test evidence.
3. Complete the Devpost CAPTCHA, truthful eligibility/account declarations and final submission/access checks. No project entry has been created.

These are packaging and access checks for the shipped engineering MVP. Real patient use separately requires governed data handling, independent clinical and security review, and usability evidence. The project has no real-world clinical effectiveness, broad accessibility, customer traction or regulatory-compliance validation.

## Evidence used

- [README](../README.md), [testing guide](../submission/testing-instructions.md), [Firebase test instructions](../tests/firebase/README.md), retained integration reports and the current QA record.
- Firebase adapter/rules; source, import, follow-up, account and saved-space UI; snapshot and draft code.
- [Model card](../ml/README.md), [classifier evaluation](../ml/EVALUATION.md), [initial pipeline report](../ml/pipeline-eval/REPORT.md) and [release results](../ml/pipeline-eval/release-results.json).
- [Business plan](BUSINESS.md), [research](RESEARCH.md), [security boundaries](SECURITY.md), prepared submission documents and parent-reported current browser checks.

No patient, customer, clinician reviewer or official judge supplied feedback for this simulated assessment. Credit remains Shivam Gupta as project creator and submitting participant, with AI-assisted development disclosed.
