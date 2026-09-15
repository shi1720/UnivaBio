# Looplight: code walkthrough and judge Q&A

Prepared for Shivam Gupta. These are explanations to understand and rehearse, not a claim that every file has been personally authored without assistance. Use the concrete repository paths below during the walkthrough. The current deployment is the Firebase application; the older Sites/D1 source is retained for historical reproduction.

## A five-minute code walkthrough

### 0:00-0:40 - Start with the data contract

**Say:** “The key data structure is a follow-up task that retains the source sentence, date wording, and review state. A person tracking an action is distinct from a clinician accepting responsibility for treatment. That distinction affects the data model and the labels in the interface.”

**Show:** `lib/types.ts` for task/plan types, result states, source evidence and user-reported history fields; `lib/snapshot.ts` for saved-record validation. Trace one task from the fictional fixture through the app. Be able to point to what is stored versus derived for display.

### 0:40-1:35 - Trace document input through extraction

**Say:** “Text enters the extraction pipeline after input validation. A small classifier supplies a sentence category. Explicit rules add structured suggestions and preserve the supporting text. These are proposals until the user reviews and confirms them.”

**Show:** `lib/import-file.ts` for text-based PDF extraction; `lib/engine.ts` for input validation, sentence splitting, rule application and suggestions in hybrid-1.2; `ml/inference.ts` and `ml/model.json` for the classifier. Explain how unsupported or empty PDFs produce a useful error. The app supports embedded-text PDFs, not image OCR. The installed PDF.js module and worker are copied by `scripts/sync-pdfjs.mjs` to a matching package-versioned public path, so application-only deployments do not invalidate that reader URL.

**Know:** A classification score measures the model's output under its training assumptions. It is not clinical confidence. Rules also fail. Mandatory source review is a design response to those limitations, not proof that errors cannot occur.

### 1:35-2:25 - Explain the human review gate

**Say:** “If we only show extracted tasks, a user might never notice a missed sentence. The review screen exposes the whole source, including sentences that did not become tasks. The user can add or correct an action before it enters the plan.”

**Show:** `app/components/source-view.tsx`, `app/components/evidence-view.tsx` and `app/components/loop-detail.tsx` for whole-source review, manual corrections and confirmation; `lib/commands.ts` for the client confirmation guards. Demonstrate one test where negation or a completed action must not create an unconditional task.

### 2:25-3:15 - Explain dates and closure

**Say:** “The app carries forward date language from the document. An unclear phrase stays unresolved. For results, receipt and reported clinician review are different states. A user records the outcome and the history retains that report.”

**Show:** `lib/dates.ts` for date interpretation and unresolved wording, `lib/commands.ts` for result transitions/closure checks and event creation, and `lib/history.ts` for readable history. A named clinician in a user note is a report, not a verified identity or signed clinical attestation.

### 3:15-4:00 - Explain persistence and access

**Say:** “Firebase Auth identifies the account, and Firestore rules enforce ownership and storage constraints. The workflow checks run in the browser, so a completion entry is a user report, not a verified clinical audit. The anonymous demo uses fictional information. Saving it copies the current edits into the signed-in account. We store extracted text, not the original PDF.”

**Show:** `firebase/main.tsx` and `firebase/client.ts` for sign-in; `firebase/store.ts` for owner-path SDK transactions, retry identifiers and conflicts; `firebase/firestore.rules` for server-enforced ownership, immutable source metadata, versions and quota coupling. Demonstrate a saved plan surviving refresh. Analysis stays local; saved source text, plan and history go to Firestore. Unsaved drafts in `lib/drafts.ts` survive form close/reopen, but not page refresh or tab close. Signing in alone does not save the demo.

### 4:00-5:00 - Show evidence and limits

**Say:** “The model evaluation is reproducible. It uses 225 synthetic training examples and a separately authored set of 50 challenge examples. Raw five-category accuracy is 82%, macro F1 is 0.816, and the threshold abstains on 44 examples. The full system still needs clinician-reviewed document evaluation. These figures do not establish patient safety.”

**Show:** `ml/train.py`, `ml/data/`, `ml/model.json`, `ml/evaluation.json` and `ml/pipeline-eval/`. The 20-document initial evaluation is preserved separately from the release regression retest; this set did not show added extraction benefit from ML. Show a failure or abstention. Then run `npm test`, `npm run test:firebase:unit` and `npm run test:model`. Local emulator checks use `npm run test:firebase:emulator` with Java 21. Do not run the live-account suite without intentionally targeting a configured Firebase project.

## Questions judges may ask

### What is the AI doing?

The model classifies discharge sentences into five categories to help identify follow-up language. Rules then support structured extraction, while human review decides which proposed tasks enter the plan. The model does not diagnose, interpret results, or create treatment instructions.

### Could a rules-only system do this?

Rules handle explicit patterns well and are useful for dates and safety exclusions. A trained classifier could help recognize wording beyond a fixed phrase list; that benefit still needs to be measured here. The current synthetic end-to-end benchmark has not demonstrated an improvement over rules alone. Keep the classifier result separate from the pipeline report. A useful next evaluation is a blinded comparison of rules only, model plus rules, and manual review on clinician-annotated documents.

### Why does the model abstain so often?

The model has limited synthetic training data. The configured threshold defers 44 of 50 challenge examples rather than presenting every class prediction as reliable. Raw accuracy reports what the highest-scoring category would have been without that threshold. It must not be presented as the accuracy of autonomous clinical decisions. The review workflow remains necessary, including for accepted predictions.

### Why is 82% not enough to call this clinically validated?

Fifty synthetic sentences are a small, artificial test set. Real records contain formatting problems, unfamiliar language, incomplete documentation, and population differences. Sentence classification is also only one part of the pipeline. Clinical validation needs appropriately governed real-world evaluation, specialist annotation, omission analysis, usability testing, and monitoring.

### What prevents hallucinated instructions?

The product proposes tasks tied to source text and requires review before confirmation. It preserves uncertainty instead of generating a clinical deadline from vague wording. This architecture makes suggestions inspectable, but it cannot guarantee correctness or recover care obligations that never appear in the document.

### Which security checks run on the server?

Firestore rules enforce the signed-in account path, permitted outer fields, size bounds, immutable source/selected metadata, version increments and linked count changes with a 100-space cap. The rules do not parse the embedded JSON. Source-span validation, workflow transitions, reported clinician review and typed deletion confirmation run in the client. An owner using a custom client can bypass those workflow checks within the storage boundaries. History is user-reported, not tamper-proof clinical evidence.

### What if a save succeeds but the response is lost?

The current session reuses a mutation identifier for the same command. A retry can recognize the saved result without duplicating its history. A stale different command becomes a conflict and keeps the form available for review. These identifiers live in memory, so automatic replay recognition after a full refresh is not guaranteed. The user should inspect the latest saved state rather than assume a second action is required.

### What does “closed” mean?

It means the user recorded an outcome under the app's workflow. For result tasks, receipt is separate from reported clinician review. The history preserves the report. Closure is not a medical judgment or independent verification that the patient is safe.

### Who is the customer, and why would they pay?

The first proposed customer is a primary-care or transitions coordinator with an existing discharge follow-up workflow. The current MVP uses one coordinator account. Shared team workflows remain future work. The hypothesis is that assembling the plan and tracking unresolved actions takes staff time. A $149 monthly price for 100 episodes is a starting experiment. We need interviews and a supervised pilot to test willingness to pay and actual time saved.

### Is the economics story real?

The arithmetic is real, and the inputs are assumptions. Five minutes per episode at $35 per hour across 100 episodes is about $292 per month before review and implementation costs. No measured customer ROI exists yet. Hosting, support, security, and governance costs remain material even when the model API fee is zero.

### What about SeamlessMD, Memora/Commure, Eon, and care-management platforms?

Those companies already support related coordination and follow-up workflows. We do not claim that source grounding or caregiver support is unique. Looplight's proposed starting point is a small document-first ledger that a coordinator can try without EHR integration. We need customer research to learn whether that narrow workflow is useful enough to adopt.

### What is the moat?

There is no demonstrated moat today. A possible future advantage is a consented, clinician-reviewed correction dataset and a workflow with measured operational value. The classifier or a polished UI alone would be easy to copy.

### Does it integrate with hospitals or verify clinicians?

The MVP has no EHR integration or verified clinical attestation. A person named in a task or entered review note is not proof that a provider accepted responsibility. Those capabilities require a separate product and governance effort.

### Is patient information safe to upload?

The current submission is a synthetic-data MVP. Account authentication and persistence are implemented capabilities, not a claim of complete health-data compliance. Real patient deployment requires an appropriate security review, data agreements, retention policy, incident process, and clinical governance. The demonstration uses no real patient information.

### What would the first pilot measure?

Start with retrospective documents under approved data handling and clinician annotation. Measure missed obligations and misleading extra tasks at the document level, then compare staff preparation time and correction burden. In a supervised prospective pilot, measure ownership/date completeness and follow-up resolution. A small pilot cannot establish a causal reduction in readmissions.

### What did you personally build?

“Looplight is my project, developed with AI assistance across research, implementation, testing, and presentation. I am presenting the product and its implementation transparently. I can trace the code, explain the decisions, and show where the system succeeds and fails.”

Add specific personal changes only after you have actually made and understood them. Do not invent interviews, coding sessions, clinical experience, customer pilots, or earlier personal inspiration.

### What is the next hardest technical problem?

Measuring omissions on diverse real discharge documents. An attractive task list can hide missing instructions. The model needs clinician-reviewed evidence across formatting, language, and ambiguity, while the interface needs to help people review without overwhelming them.

## Exact demonstration controls

1. Choose **Add discharge notes**, then **Anita’s discharge**, then **Find the open loops**.
2. Open a follow-up under **Needs review** using **Check details**.
3. In **Who will keep track of this?**, name Maya and choose **Confirm this follow-up**.
4. Use **Record progress** and **Record result received**. Explain why clinician review remains separate.
5. Enter a fictional named clinician, a note, and the required confirmation, then choose **Record completion**. This remains a user report.
6. Use **Visit brief** for the printable view and **Calendar file** for the calendar reminder file. JSON export appears in the account. The calendar uses confirmed task windows and omits patient/condition names; it is not a booked appointment and includes no explicit notification alarm.

The current engineering record has **31 domain tests**, **16 snapshot/export tests**, **64 model-parity cases**, **57/57 deployed Firebase checks** and **58/58 local emulator checks** passing. The first live run's 56/58 result and two recovery failures are retained. Its 100-space cap check passed; the smaller live rerun omitted saturation, which the full emulator suite subsequently passed. The historical 32 D1/API checks are separate evidence for the earlier backend.

The release owner verified Google sign-in, edited-demo save/reload, real PDF selection yielding three follow-ups, source-linked manual addition, receipt before reported clinician closure and actual OS downloads. The exported JSON decoded as a valid snapshot with 21 source segments and three loops. Text/calendar contents were inspected. The release owner also passed the final PDF-import retest and the adjusted two-page print output. Use the final [QA record](../docs/QA.md) when recording; do not claim calendar-app import or physical printer testing.

## Rehearsal checklist

- Trace one task end to end without reading notes.
- Explain why a model score is not clinical confidence.
- Show an ambiguous date that stays unresolved.
- Show result receipt without closing reported clinician review.
- Explain Firestore account ownership/storage enforcement separately from client workflow checks and user-reported history.
- Run the documented tests and locate one meaningful edge-case assertion.
- Distinguish completed capabilities from a proposed clinical pilot.
- State pricing and staff-time figures as hypotheses.
- Use the final evaluation report if metrics change.

## Source context

Research and competitor links are in [Devpost copy](devpost-copy.md) and [research notes](../docs/RESEARCH.md). Architecture and exact commands are in [Architecture](../docs/ARCHITECTURE.md), [QA](../docs/QA.md) and the [README](../README.md). Rehearse against the released UI before recording; explain only personally understood implementation details.
