## Inspiration

Anita is home from hospital. Her daughter Maya has the discharge notes, a pending blood culture, a repeat blood test and a follow-up visit to arrange. The document describes the next steps. Someone still has to follow them through.

Anita and Maya are fictional. The coordination problem is documented: a 2005 study of 2,644 discharges at two academic hospitals found that 41% of patients had results return after discharge. That is a historical, setting-specific finding, not a current global rate. [Original study](https://pubmed.ncbi.nlm.nih.gov/16027454/)

Looplight focuses on one practical question: who is tracking each unfinished step, and what happened next?

## What it does

Looplight turns discharge text or a text-based PDF into reviewable follow-up suggestions. Each suggestion keeps the exact source sentence. Missing owners, unclear timing and conflicting dates remain visible. Users can correct a suggestion, dismiss it or recover an action the system missed by reviewing the full note.

The defining moment comes when a result arrives: **the follow-up stays open**. Looplight records receipt separately from reported clinician review. A named tracking person, dated completion report and history show what the user recorded.

The MVP includes Google/email sign-in, saved care spaces, a printable visit brief, calendar reminders and JSON export. Save the current demo and its edits to your account, then return to the saved plan later. The fictional example lets judges explore the workflow without entering patient data. Looplight organizes documented instructions; clinical decisions remain with the care team.

## How we built it

React, TypeScript and Vite power the Firebase-hosted interface. A small, reproducible logistic-regression model classifies sentences using word and word-pair features. Explicit rules preserve source spans, handle known action language and interpret supported date expressions. The model can abstain, and every suggestion requires human confirmation.

PDF text is read locally. Original PDF files are not retained. Model inference uses bundled weights without an external AI service or paid model API. Firebase Auth identifies the account. Firestore rules enforce account paths, an immutable saved source and storage/version bounds. Detailed workflow checks run in the browser, so status and history remain user reports rather than a trusted clinical audit log.

Looplight is Shivam Gupta's project, built with AI-assisted research, development, testing and documentation. The repository includes the source, synthetic data, training scripts, evaluation failures and setup instructions for a transparent code walkthrough.

## Challenges we ran into

Defining “done” was as important as extracting a task. A pending result needs both receipt and reported review, so the completion flow records them separately.

Document language also resists simple automation. “No further tests,” a completed scan, a conditional instruction and contradictory appointment dates need different treatment. A separate document challenge exposed false additions and missed actions. Those failures informed repairs, and the original results remain published.

## Accomplishments that we're proud of

We built the complete document-to-review-to-follow-through workflow, including persistent spaces, correction paths and portable outputs.

Verification passed 31 domain tests, 16 saved-record and export tests, 64 Python/TypeScript model-parity cases, 57 live Firebase checks and 58 emulator checks. All three GitHub CI jobs passed. Earlier database tests are not counted as Firebase evidence. The classifier reached 82% raw category accuracy on 50 synthetic examples and abstained on 44.

A separate 20-document challenge contained 44 gold actions. Initial extraction precision was 84.2%, with 72.7% recall. After repairs, the same known regression cases reached 97.1% precision and 75.0% recall. These are small synthetic engineering measurements, not clinical validation.

## What we learned

Source visibility and recovery from mistakes belong in the main workflow. A polished task list can still omit an important instruction.

We also tested the model's contribution. Disabling it produced the same task outputs on the 20-document challenge. No additional extraction benefit from ML was measured there. The current product is a rules-led workflow with local ML suggestions, and stronger claims need new evidence.

## What's next for Looplight

The first proposed buyer is one primary-care or transitions coordinator already reconstructing follow-ups from discharge notes. We would test $149 per month for 100 episodes. Saving five minutes per episode at an assumed $35 hourly staff cost represents about $292 in gross monthly time value, before review, onboarding and support. Neither savings nor willingness to pay has been validated.

Next come interviews, independently reviewed de-identified records and a supervised pilot measuring preparation time, omissions and correction burden. Shared team workflows and EHR integrations are future work. There are no customer, clinical-outcome or reduced-readmission claims today.

The goal is simple: every next step has a source, a person and a recorded ending.
