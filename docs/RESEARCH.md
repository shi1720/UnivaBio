# UnivaBio product research — 15 September 2026

## Recommendation

Build a **source-grounded unfinished-care ledger**: turn a patient's discharge document into a small set of explicit follow-up obligations, give each obligation an owner and due-date interpretation, and keep it open until there is recorded evidence of what happened. Start with pending tests, repeat labs, and referrals. The story is: **“Discharged does not mean done.”**

This is an administrative coordination product. It carries forward documented clinician instructions; it does not invent new testing, interpret results, prescribe, or decide whether a patient is safe. The strongest visible innovation is a reviewable chain from **source sentence → confirmed action → accountable person → recorded resolution**, including the ability to say “the document does not specify this.”

The broad market is crowded. Avoid claiming to be the first AI discharge companion. Distinguish the MVP through its deliberately small, portable, upload-first workflow and unusually inspectable extraction / closure process. That is a product positioning hypothesis, not a demonstrated unique moat.

## Verified evidence suitable for a pitch

1. **A concrete historical measurement:** Roy et al.'s 2005 study covered 2,644 patients discharged from hospitalist services at two academic hospitals in 2004. Of these patients, 41% had test results return after discharge; 9.4% of the returned results were potentially actionable. The authors could not determine whether clinician unawareness caused adverse outcomes. Use the year and study context whenever quoting the percentage. It is not a current global prevalence estimate. [Original research abstract, Annals of Internal Medicine / PubMed](https://pubmed.ncbi.nlm.nih.gov/16027454/).
2. **Current relevance without stale headline statistics:** the 2025 ASTP/ONC SAFER Guides include a dedicated Test Results Reporting and Follow-Up guide. Their purpose is safer electronic communication and management of results. This verifies that follow-up remains an active patient-safety design concern. It does not certify this product or guarantee legal compliance. [Official SAFER Guides](https://healthit.gov/clinical-quality-and-safety/safer-guides), [guide resource, updated April 2026](https://healthit.gov/resources/2025-safer-guide-test-results-reporting-and-follow-up/).
3. **Operational model:** AHRQ's RED toolkit describes postdischarge contact that reviews appointments, laboratory tests, patient misunderstandings, and caregiver concerns. It recommends a clinical staff follow-up call 2–3 days after discharge within that program. This supports the proposed staff workflow; our app cannot replace that clinical contact. [AHRQ RED Tool 5](https://www.ahrq.gov/patient-safety/settings/hospital/red/toolkit/redtool5.html).
4. **Evidence limitation:** a 2018 systematic review found that some electronic and educational interventions can improve documentation and awareness of pending results, while additional research is needed on effects on processes and outcomes. We can claim to support a workflow worth testing, not to reduce readmissions already. [AHRQ review summary](https://psnet.ahrq.gov/issue/interventions-improve-follow-laboratory-test-results-pending-discharge-systematic-review).
5. **Buyer context:** CMS Transitional Care Management includes patient/caregiver contact within two business days and a face-to-face encounter within 7 or 14 days depending on the service. This confirms an existing funded coordination workflow in the US. Software use alone does not satisfy billing requirements; do not imply guaranteed reimbursement. [CMS TCM booklet](https://www.cms.gov/files/document/mln908628-transitional-care-management-services.pdf), [current CMS care-management page](https://www.cms.gov/medicare/payment/fee-schedules/physician/care-management).

Recommended pitch wording: “A classic two-hospital study found that 41% of discharged patients still had results pending. And the 2025 federal SAFER guidance still treats test-result follow-up as a dedicated safety problem. We built an accountable handoff from the document to the person taking the next step.”

## Competition: real overlap, honest positioning

| Product | Verified overlap | Proposed MVP position |
|---|---|---|
| SeamlessMD | Digital care plans, reminders, to-do lists, symptom monitoring; caregiver access; 2026 conversational AI grounded in approved care-team content. | Do not use caregiver access or grounded AI as a “nobody else does this” claim. Focus on uploaded-document obligations, missing/contradictory details, source spans, and evidence-backed resolution across care settings. |
| Memora Health, now part of Commure | AI care navigation, patient check-ins, care coordination, education, follow-up automation. | A narrow artifact-centered workflow that can be piloted from discharge PDFs without enterprise integration is the accessibility wedge; enterprise features and outcomes are not claimed. |
| Eon | AI identifies incidental radiology findings, generates guideline-based follow-up, and tracks patients longitudinally with EHR integrations. | Include only instructions explicitly in a discharge document; support mixed pending labs/referrals/repeat tests instead of autonomous incidental-finding clinical management. |
| Welkin Health | Care-management CRM, tasks, handoffs, communications, configurable plans and automation. | Ship one sharply defined workflow quickly, with provenance and review at the center, rather than requiring care program configuration. |

Primary competitor sources: [SeamlessMD platform](https://www.seamless.md/), [Seamless Answers announcement](https://www.seamless.md/blog/seamlessmd-launches-seamless-answers-clinician-approved-conversational-ai-that-supports-patients-around-the-clock), [SeamlessMD caregiver documentation](https://help.seamless.md/article/37-5-caregivers), [Memora current homepage](https://www.memorahealth.com/), [Memora transitions workflow](https://www.memorahealth.com/news/why-digital-health-is-key-for-conquering-transitions-of-care), [Eon platform](https://www.eonhealth.com/platform), [Eon scope and FAQ](https://www.eonhealth.com/), [Welkin features](https://welkinhealth.com/).

No negative feature claim about a competitor has been verified through access to their software. Their public pages support the listed overlap; they do not prove absence of our proposed features.

## Two narrower alternatives considered

**AKI follow-up navigator:** Acute kidney injury has a specific postdischarge gap. NICE says adults should receive a clinical review within three months, sooner at higher risk; discharge plans should identify timing and responsibility. This gives a focused initial clinic pilot and measurable process outcome. However, correctly individualizing monitoring requires clinical risk assessment, and adding guideline-driven deadlines to an MVP would invite clinical validation obligations. Better treated as a future deployment cohort of the unfinished-care ledger. [NICE QS76 statement 6](https://www.nice.org.uk/guidance/QS76/chapter/quality-statement-6-clinical-review-after-hospital-discharge).

**Penicillin-allergy evaluation navigator:** A memorable antimicrobial-stewardship story: CDC notes that approximately 10% of the US population reports penicillin allergy while less than 1% is truly allergic. A history packet and referral organizer could help. But an engaging end-to-end demo risks implying that software can remove an allergy label or recommend a challenge; actual assessment requires clinician evaluation and appropriate supervised testing. It has a less immediately complete autonomous MVP story. [CDC clinical features](https://www.cdc.gov/antibiotic-use/hcp/clinical-signs/), [CDC population statistic poster](https://cdc.gov/antibiotic-use/media/pdfs/Penicillin-Allergy-Poster-508.pdf).

Neither is clearly stronger for this hackathon than the document-to-closure workflow.

## Commercial viability: explicit hypotheses to validate

**Initial buyer:** an independent primary-care group or community transition-of-care team handling 100–500 discharges per month. Staff already reconstruct next steps and contact families; sell reduced preparation/chasing time and a dependable worklist. Patients and caregivers use the plan free. Hospital-wide procurement is a later step, not an assumed first sale.

**Pilot:** 30 days of retrospective synthetic/de-identified document review with staff; then a supervised pilot subject to data handling and clinical governance. Record minutes to prepare a plan, extraction omissions, corrections, actions with owner/due date, follow-up completion, and time to resolution. Treat readmissions as exploratory and unsuitable for a tiny pilot's main causal claim.

**Pricing assumption:** $149/month per small team including 100 active care episodes, with $1 per extra episode. This is an experiment, not researched willingness to pay. At an assumed loaded staff cost of $35/hour, saving five minutes across 100 episodes corresponds to $292/month in staff time before implementation and review costs. Software does not automatically produce those savings; measure them.

**Delivery economics:** deterministic local extraction can have zero per-request API fee. If using a model API, record actual token usage and vendor prices at deployment rather than asserting a cost today. Early costs include hosting, database, secure file storage, monitoring, support, security work, model validation, and integrations. Free tiers are fine for a synthetic demo; they are not a complete production-health-data budget.

**Defensibility hypothesis:** a consented, clinician-reviewed correction dataset; interoperable source/action/closure records; operational embedding with measurable saved time. The model alone is not a moat. Avoid claiming a proprietary clinical dataset, clinical validation, paying customers, or insurer partnerships before they exist.

## Demo story: 2–3 minutes

Use a visibly labeled synthetic family. “Meera is home. Her daughter sees six pages. The appointment is obvious. The culture result, repeat lab, and unassigned referral are not.”

1. Open a synthetic discharge document. Extract its three or four follow-up obligations.
2. Click one action: its exact supporting sentence highlights in the source. Show the raw date language and derived date. Document says “review in 1–2 weeks”? Display a window; document says “soon”? Ask for confirmation, do not invent a date.
3. Reveal a task lacking an owner / phone number. The app flags the missing information and generates a question the family can ask the care team. It must not claim it knows which provider accepted responsibility.
4. User confirms/edit actions; confirmed actions enter a simple timeline. Assign one to the caregiver and retain a log.
5. Advance through a prepared demo result / completion flow. Upload or type an outcome receipt, record who reported it, and close the task. A received lab result alone does not mean clinically reviewed. Record separate states when needed.
6. Show the staff view: open, waiting for information, overdue, and resolved obligations. End with measured extraction test results and a candid “synthetic-data prototype; clinical pilot next.”

Closing line: “Our goal is simple: every next step has a source, a person, and a recorded ending.”

## Implementation / safety details that strengthen rigor

- The extraction system cannot recover pending tests never documented in supplied records. State this as a material limitation.
- Maintain original text, source span/page, extraction engine/version, raw date phrase, and any user correction. Distinguish model suggestions from human-confirmed data.
- “No follow-up required,” completed/past tests, conditional tests, conflicting dates, absent discharge date, relative deadlines, duplicated instructions, malicious instructions inside a document, large/unsupported/empty files, and timezone boundaries make meaningful tests.
- Do not label a raw heuristic/model probability “clinical confidence.” Prefer “Needs review: date unspecified” and concrete reasons.
- User-entered reports and self-marked completion are not verified clinical outcomes. A lab result needs a separate clinician-review status where relevant.
- Surface deadlines as administrative reminders, without clinically prioritizing based on unvalidated diagnoses or lab values.
- Store no real patient data in public fixtures, screenshots, telemetry, AI prompts, or repo history. A functional authenticated prototype still needs security and clinical deployment review before production patient use.
