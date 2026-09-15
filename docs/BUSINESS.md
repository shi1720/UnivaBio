# Commercial hypothesis and pilot plan

## Starting customer

The proposed first buyer is one coordinator at an independent primary-care practice or community transitions service, handling roughly 100 discharges per month. Their existing work includes reconstructing next steps, contacting families and recording what happened. The proposed value is less preparation and follow-up work, with a clear source-linked brief for the family.

The MVP supports one account per saved care space. Naming a caregiver or clinician does not invite them. Shared staff queues, role-based access, EHR integration, billing/payments, clinical alerts and automatic messages are future work.

## Why this entry point

A pending result is a recognizable unfinished step. A document-first tool can demonstrate source review and reported resolution before an EHR integration is available. Initial research can use fictional or governed de-identified notes. A patient-data pilot needs appropriate clinical and data-handling review first.

Care navigation is crowded. SeamlessMD, Memora/Commure, Eon and Welkin overlap. Source-linked uncertainty and a narrow coordinator workflow are positioning hypotheses. No competitor feature absence, unique IP, customer preference or clinical-data moat has been established. See [Research](RESEARCH.md).

## Price and cost assumptions

| Assumption | Test scenario | What must be measured |
|---|---:|---|
| Proposed price | $149 per coordinator account/month for 100 episodes | Buyer, budget and willingness to pay |
| Loaded staff cost | $35/hour | Customer-specific labor cost |
| Time saved | 5 minutes per episode | Preparation plus review, correction and follow-up time |
| Gross time value | 100 × 5 / 60 × $35 = $291.67/month | Savings after error review and onboarding |
| Subscription-only break-even | 2.55 minutes per episode | Capacity value versus cash savings |
| External model API fee | 0 | Current bundled classifier and local rules |

These are assumptions and arithmetic, not observed ROI or paid traction. A possible $1 additional-episode price is a later pricing experiment, not implemented billing. The current app caps stored care spaces at 100 per account; that storage limit is distinct from a proposed monthly usage allowance.

The current demo uses Firebase Hosting, Firebase Auth and Firestore on the project's free tier, with the database configured in `asia-south1`. No claim is made that an arbitrary volume of use is free or that the free tier establishes sustainable gross margin. Quota limits can affect availability. Real production costs include hosting/storage, secure operations, independent validation, accessibility, support, agreements, monitoring and integration work. No future fixed provider price is assumed here.

## Six-week validation sequence, planned

1. Interview five coordinators and five caregivers about recent handoffs, existing tools, time spent and missing details. Use consent and appropriate de-identification; do not lead with the product.
2. Have two qualified reviewers label governed de-identified notes, adjudicate disagreements and preserve a held-back evaluation split. The existing synthetic set cannot establish clinical extraction performance.
3. Run paired, counterbalanced usability tasks with ordinary notes and Looplight. Measure preparation time, missed actions, false additions, correction burden and accessibility barriers.
4. Start a supervised single-coordinator pilot only after clinical and data-handling review. Keep ordinary clinical follow-up processes in place.
5. Offer a paid pilot after evidence of value. Record declined offers and objections as well as positive responses.
6. Continue only if the workflow saves useful time without unacceptable omissions or review burden and a buyer commits. Re-scope if it adds work or creates false reassurance.

## Measures

- Action-level precision/recall, exact source spans, unsupported dates and harmful false additions.
- Minutes to prepare and verify a plan, corrections per episode and unresolved questions.
- Recorded tracking person, time to first action, reported follow-through and reopened tasks.
- Screen-reader task success, text enlargement, phone usability and comprehension.

Completion is a user report, not a verified clinical outcome. Small pilots cannot establish causal effects on readmission, morbidity or mortality. The model's current document-level ablation shows no measured additional extraction benefit; an AI-advantage claim needs new evidence.

## Defensibility and existing workflow

A consented, clinician-reviewed correction dataset and adoption within a measured workflow could become useful assets. They do not exist today. The model itself is easy to reproduce.

CMS Transitional Care Management recognizes patient/caregiver contact and follow-up work. This supports the existence of an established coordination activity; it does not make this software reimbursable or sufficient for billing. [CMS booklet](https://www.cms.gov/files/document/mln908628-transitional-care-management-services.pdf)
