# Looplight: code walkthrough and judge Q&A

Prepared for Shivam Gupta. These are explanations to understand and rehearse, not a claim that every file has been personally authored without assistance. Exact repository paths belong in the final README and architecture map. Use those links during the walkthrough.

## A five-minute code walkthrough

### 0:00-0:40 - Start with the data contract

**Say:** “The key data structure is a follow-up task that retains the source sentence, date wording, and review state. A person tracking an action is distinct from a clinician accepting responsibility for treatment. That distinction affects the data model and the labels in the interface.”

**Show:** The task/plan types, result states, source evidence fields, and audit/history fields. Trace one task from the fictional fixture through the app. Be able to point to what is stored versus derived for display.

### 0:40-1:35 - Trace document input through extraction

**Say:** “Text enters the extraction pipeline after input validation. A small classifier supplies a sentence category. Explicit rules add structured suggestions and preserve the supporting text. These are proposals until the user reviews and confirms them.”

**Show:** Input validation, text-based PDF extraction, sentence splitting, model inference, rule application, and suggestion construction in engine hybrid-1.2. Explain how unsupported or empty PDFs produce a useful error. Do not claim image OCR if the app only supports text PDFs.

**Know:** A classification score measures the model's output under its training assumptions. It is not clinical confidence. Rules also fail. Mandatory source review is a design response to those limitations, not proof that errors cannot occur.

### 1:35-2:25 - Explain the human review gate

**Say:** “If we only show extracted tasks, a user might never notice a missed sentence. The review screen exposes the whole source, including sentences that did not become tasks. The user can add or correct an action before it enters the plan.”

**Show:** The review state, rejected/accepted suggestions, manual corrections, source text display, and the condition that permits confirmation. Demonstrate one test where negation or a completed action must not create an unconditional task.

### 2:25-3:15 - Explain dates and closure

**Say:** “The app carries forward date language from the document. An unclear phrase stays unresolved. For results, receipt and reported clinician review are different states. A user records the outcome and the history retains that report.”

**Show:** Date interpretation and unknown-date handling, the result state transitions, the closure guard, and activity creation. A named clinician in a user note is a report, not a verified identity or signed clinical attestation.

### 3:15-4:00 - Explain persistence and access

**Say:** “The saved plan belongs to the signed-in account. Server-side authorization must enforce ownership for reads and changes. The anonymous demo uses fictional information. We retain extracted source text rather than storing the original PDF.”

**Show:** Authentication integration, plan storage, owner checks, deletion, and where the browser sends data. Demonstrate a refresh retaining the plan. Explain which processing stays local and which confirmed plan data reaches the server using the final implementation, rather than assuming the whole system is offline.

### 4:00-5:00 - Show evidence and limits

**Say:** “The model evaluation is reproducible. It uses 225 synthetic training examples and a separately authored set of 50 challenge examples. Raw five-category accuracy is 82%, macro F1 is 0.816, and the threshold abstains on 44 examples. The full system still needs clinician-reviewed document evaluation. These figures do not establish patient safety.”

**Show:** Training script, dataset files, model artifact, evaluation output, meaningful pipeline tests, and the exact commands in the README. Show a failure or an abstention, not only an easy success.

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
6. Use **Visit brief** for the printable view and **Calendar file** for the calendar reminder. JSON export appears in the account.

These labels come from the implemented build. Browser/API QA remains the release owner's responsibility. Twenty-six engine/command tests had passed at the time of this update. Present the final test summary from the repository if that count changes.

## Rehearsal checklist

- Trace one task end to end without reading notes.
- Explain why a model score is not clinical confidence.
- Show an ambiguous date that stays unresolved.
- Show result receipt without closing reported clinician review.
- Explain account ownership and identify server-side enforcement.
- Run the documented tests and locate one meaningful edge-case assertion.
- Distinguish completed capabilities from a proposed clinical pilot.
- State pricing and staff-time figures as hypotheses.
- Use the final evaluation report if metrics change.

## Source context

Research and competitor source links are in `devpost-copy.md` and the main repository research notes. This walkthrough uses the architecture provided during the build. The final submission owner must reconcile UI names and repository paths against the released code before recording.
