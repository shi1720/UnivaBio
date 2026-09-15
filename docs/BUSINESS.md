# Commercial hypothesis and pilot plan

## Starting customer

An independent primary-care practice or community transitions service with one coordinator handling roughly 100 discharges each month. Their existing job includes reconstructing follow-ups, contacting families and documenting what happened. The immediate use case is preparation and follow-through for the coordinator, with a printable brief for the family.

The MVP is single-account. It does not yet support a shared staff queue, role-based invitations, EHR integration, billing, payments, clinical alerts or automated messages. Those must not appear in a sales/demo promise.

## Why choose this wedge

A pending result is a recognizable loose end. The product can demonstrate the complete source-to-resolution workflow without pretending to read an EHR. The pilot can begin with fictional or properly de-identified historical notes under local governance, without automating clinical decisions.

Care navigation is a crowded category: SeamlessMD, Memora/Commure, Eon and Welkin overlap. Source-linked uncertainty and a narrow document-first pilot are positioning hypotheses. No verified competitor feature absence or unique intellectual property is claimed. See RESEARCH.md for primary competitor links.

## Price and cost assumptions

| Assumption | Scenario | What must be measured |
|---|---:|---|
| Monthly price | $149 for 100 episodes | Willingness to pay; decision-maker and budget |
| Additional episodes | $1 each | Usage pattern and marginal support |
| Loaded coordinator cost | $35/hour | Customer-specific labor cost |
| Time saved | 5 minutes per episode | Median preparation + review + follow-up time |
| Gross time value | 100 × 5 / 60 × $35 = $291.67/month | Whether savings survive error review and onboarding |
| Gross time-value / price | 1.96× | This is not ROI until full costs are measured |
| Breakeven time saving | $149 / $35 × 60 / 100 = 2.55 minutes/episode | Staff may value capacity differently from cash savings |
| External model API calls | 0 | Holds for current local classifier |

Hosting, database storage, secure operations, audit retention, clinician evaluation, customer support, accessibility and integration work are not free in a production service. A free-tier prototype is not a validated gross-margin model. Sites hosting is currently account-provided; no fixed third-party production hosting price is asserted here.

## Six-week validation sequence (planned, not completed)

1. **Problem interviews:** five care coordinators and five caregivers; ask them to reconstruct a recent de-identified handoff, with consent. Record existing tools, missing details, time spent and failure costs. Do not lead with the product.
2. **Independent reference set:** two appropriately qualified reviewers label consented/de-identified notes, with adjudication and an institution-separated evaluation split. Do not retrain on the final evaluation set.
3. **Usability study:** participants perform paired tasks with ordinary notes and Looplight. Counterbalance order. Observe completion, errors, confidence, accessibility barriers and correction burden.
4. **Supervised pilot:** only after data-handling and clinical-governance review. Start with one coordinator and a limited cohort. Keep usual clinical follow-up processes in place.
5. **Commercial test:** present a paid pilot offer after evidence of value. Record declined offers and reasons, not just positive feedback.
6. **Decision:** continue if users save meaningful time without unacceptable omission/correction burden and at least one buyer commits. Re-scope or stop if the workflow adds work or creates false reassurance.

## Measures and guardrails

- Primary engineering measure: **action-level precision and recall**, including source-span correctness and harmful false additions. Classifier accuracy alone is insufficient.
- Review measures: omitted actions, corrections per episode, unresolved owner/timing questions, source review completion.
- Workflow measures: minutes to prepare a plan, time to first action, proportion with recorded ownership, reported follow-through and reopened tasks.
- Accessibility: screen-reader task success, text enlargement, low-literacy wording, phone usability.
- Small pilots cannot establish causal effects on readmission, morbidity or mortality. These are not current product claims.

## What could become a moat

A consented, clinician-reviewed correction dataset; reliable interoperability of source/action/outcome records; and integration into a measured coordination workflow. Today the actual assets are a reproducible model, an inspectable pipeline, working software and documentation. The model alone is easy to reproduce.

## Existing funded workflow signal

CMS Transitional Care Management includes patient/caregiver contact and follow-up requirements. This is evidence that coordination is an established activity, not a guarantee that this software is reimbursable or sufficient for billing. [CMS booklet](https://www.cms.gov/files/document/mln908628-transitional-care-management-services.pdf)
