# Looplight

## Tagline

Turn discharge instructions into a follow-up ledger with a source, a person, and a recorded ending.

## Short description

Looplight helps patients, caregivers, and care coordinators track unfinished care after hospital discharge. It suggests actions from document text, preserves the source, requires human review, and distinguishes a received result from a reported clinician review.

## Inspiration

A discharge document can contain work that is still unfinished: a pending test result, a repeat lab, or a referral that needs arranging. Families need to understand who is tracking each step and how they will know it has happened.

This is an established coordination problem. A 2005 study of 2,644 discharges at two academic hospitals found that 41% of patients had results return after discharge. That historical finding is not a current global prevalence estimate. The 2025 SAFER Guides still dedicate a guide to test-result reporting and follow-up.

We chose a small, inspectable part of this problem: carrying documented instructions from a discharge record into an accountable follow-up ledger.

## What it does

Looplight accepts pasted discharge text and text-based PDFs. Its classifier and explicit rules propose follow-up actions. Each suggestion retains its source sentence, and the review step lets the user inspect the entire document and correct missed or mistaken actions before confirming the plan.

Confirmed tasks keep the person tracking them and the original date wording. Missing information remains visible as a question for the care team. For a pending result, the ledger separates receipt from reported clinician review. Closure and the activity history represent what a user recorded, not independent verification of a clinical outcome.

The MVP includes account sign-in and saved plans, a printable conversation brief, calendar export, and structured JSON export. A fictional Anita/Maya example gives judges a repeatable demonstration without real patient records.

## How we built it

The hybrid-1.2 extraction pipeline combines a small trained text classifier with explicit parsing rules and mandatory human review. The model classifies sentences into five categories. Rules preserve source evidence and support structured task and date extraction. The complete sentence review is essential because a model can miss an instruction.

The hosted application uses a persistent database for signed-in plans. It saves extracted source text rather than retaining the original uploaded PDF. It does not require a paid model API to analyze documents. Login, server-side authorization, and export handling are part of the application architecture. The repository documents setup and the model's reproducible evaluation.

Looplight is Shivam Gupta's project, built with AI-assisted development. AI assistance supported research, implementation, testing, and submission preparation. The code and design remain available for a transparent walkthrough.

## Challenges we addressed

The most consequential design challenge was deciding what “done” should mean. A test result reaching a family does not show that a clinician reviewed it. Looplight records those steps separately.

Another challenge was uncertainty. A classifier's score does not establish clinical correctness, and vague date language cannot justify a fabricated deadline. We kept the supporting text visible and placed human confirmation between suggestions and the active plan.

Finally, a reliable demo had to work without paid model services. A small local classifier and explicit rules make the pipeline inspectable and keep the per-analysis model API fee at zero.

## What we can demonstrate

- A complete synthetic document-to-review-to-tracking workflow.
- Source-linked suggestions and review of sentences that did not become tasks.
- A named tracker, source date wording, and visible missing information.
- Separate result-received and user-reported clinician-review states.
- An activity history, saved account plans, and portable exports.
- A reproducible synthetic model evaluation with candid failure and abstention reporting.

The current five-category classifier scored 82% raw accuracy and 0.816 macro F1 on 50 separately authored synthetic challenge examples after training on 225 original synthetic examples. It abstained on 44 of those 50 examples at its configured threshold. These results measure a small synthetic classification task, not end-to-end extraction safety or clinical benefit.

## Commercial path

The first proposed buyer is a primary-care or transitions coordinator who already reconstructs discharge instructions and follows up with families. The current MVP supports one coordinator account; shared team workflows are future work. Patients and caregivers would use the plan free.

An initial pricing hypothesis is $149 per coordinator account per month for 100 care episodes, with $1 per extra episode. At an assumed loaded staff cost of $35 per hour, saving five minutes on each of 100 episodes would represent about $292 of staff time per month before review and implementation costs. This is illustrative arithmetic, not observed savings or validated willingness to pay.

The first experiment should measure preparation time, extraction omissions, correction burden, and follow-up completion under supervision. The model itself is not a demonstrated moat. A future advantage could come from consented, clinician-reviewed correction data and a workflow teams choose to keep using.

## What is next

Conduct staff interviews and a retrospective review using appropriately governed de-identified records. Then evaluate a supervised pilot with explicit review responsibilities and data protections. Measure whether the tool improves the coordination process before making health-outcome claims.

Looplight currently has no EHR integration, clinical validation, verified customer traction, or demonstrated reduction in readmissions. It does not prescribe treatment, interpret lab results, or determine whether someone is medically safe. It cannot recover instructions missing from the supplied document. The MVP is for synthetic demonstration until the necessary clinical and security review for patient use is complete.

## Links

- Repository: https://github.com/shi1720/UnivaBio
- App: https://looplight-shivam.sg127977958.chatgpt.site
- The application currently requires an access check before publication. Do not claim public judge access until tested from a signed-out browser.
- Attach the one-page PDF and code PDF supplied with the final submission package.
- Add Shivam's final viewable demo video URL after recording and upload.

## Research sources

- [Roy et al., 2005, Annals of Internal Medicine](https://pubmed.ncbi.nlm.nih.gov/16027454/)
- [2025 SAFER Guide: Test Results Reporting and Follow-Up](https://healthit.gov/resources/2025-safer-guide-test-results-reporting-and-follow-up/)
- [AHRQ RED Toolkit, postdischarge follow-up call](https://www.ahrq.gov/patient-safety/settings/hospital/red/toolkit/redtool5.html)
- [AHRQ summary of the systematic review of pending-result follow-up interventions](https://psnet.ahrq.gov/issue/interventions-improve-follow-laboratory-test-results-pending-discharge-systematic-review)

## Submission-owner note

Use the prose above after checking it against the final build. Confirm student eligibility and all Devpost declarations truthfully. The public schedule shows a deadline of October 7, 2026 at 9:15 am IST. Finish early. The code repository/code-PDF wording is ambiguous, so provide both.
