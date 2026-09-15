# UnivaBio public rules verification

Checked: 15 September 2026. Read the public overview, rules, schedule, resources, updates, discussion board, gallery, and Devpost video-upload documentation. No accounts were created and no submission or external message was sent. Authenticated submission fields were not inspected.

## Dates

The [official schedule](https://univabio.devpost.com/details/dates) gives these times:

| Event | Displayed EDT time | India time (Asia/Kolkata) |
|---|---|---|
| Submissions open | August 7, 2026, 12:00 am | August 7, 2026, 9:30 am |
| Submission deadline | October 6, 2026, 11:45 pm | **October 7, 2026, 9:15 am** |
| Judging starts | October 7, 2026, 9:00 am | October 7, 2026, 6:30 pm |
| Judging ends | October 14, 2026, 11:45 pm | October 15, 2026, 9:15 am |
| Winners announced | October 15, 2026, 9:00 am | October 15, 2026, 6:30 pm |

**Published discrepancy:** the [rules page](https://univabio.devpost.com/rules) instead says August 7 at 12 am CST through October 7 at 12 am CST. That does not match the timezone/times on the submission schedule and deadline header. Operational recommendation: use the earlier, explicit Devpost submission deadline—October 7 at 9:15 am IST—and finish well before it. Do not present the prose CST time as a reliable extension.

## Verified requirements and unknowns

| Topic | What is actually public | Source |
|---|---|---|
| Eligibility | Students aged 13+; companies/professional organizations excluded; geographic participation subject to standard exceptions. Specific excluded territories are not enumerated in the reviewed event rules. Shivam's student status is unverified. | [Overview](https://univabio.devpost.com/) and [rules](https://univabio.devpost.com/rules) |
| Team size | Solo or team participation is described; no numerical maximum found. | [Overview](https://univabio.devpost.com/) |
| Product | Interactive website/app/coding prototype demonstrating a healthcare-and-technology solution. | [Overview](https://univabio.devpost.com/) |
| Video | Explain purpose, show features and actual user interactions. No event-specific duration limit, aspect ratio, narration, or language rule found. | [Overview](https://univabio.devpost.com/) |
| One-page document | A single-page PDF describing purpose and key features. | [Overview](https://univabio.devpost.com/) |
| Code delivery | Heading is “Github Repository / Code PDF”; explanatory text asks for a PDF containing developed code. The slash leaves alternatives ambiguous. Deliver both repository and code PDF to cover both readings. | [Overview](https://univabio.devpost.com/) |
| Code access / licensing | No mandatory open-source license, explicit public-repository requirement, judge-access instructions, dependency rules, or IP-transfer terms found on these event pages. Public accessible repo plus license/third-party notices are project choices, not verified event mandates. | [Rules](https://univabio.devpost.com/rules), [resources](https://univabio.devpost.com/resources) |
| Originality | Rules ask for a novel creation addressing an issue. No explicit prohibition on pre-existing code, mandatory post-start commit cutoff, or reuse/disclosure formula found. Preserve build history and disclose reused dependencies. | [Rules](https://univabio.devpost.com/rules) |
| AI assistance | Encouraged. Participants are expected to understand and explain the implementation, including a code walkthrough. No required AI-disclosure field or wording appears on public event pages. Prepare a truthful assistance statement voluntarily; do not invent personal coding contributions. | [Overview](https://univabio.devpost.com/) |
| Judging | Five equally weighted categories, five points each: innovation, implementation, health impact/rigor, design/usability, presentation. Total 25. | [Rules](https://univabio.devpost.com/rules) |

## Video hosting: platform requirement, not a separate UnivaBio rule

[Devpost's current upload instructions](https://help.devpost.com/article/85-uploading-a-demo-video), updated May 27, 2026, support **YouTube, Vimeo, or Youku** in the video-demo-link field. The video needs viewing permissions allowing judges to play it; a private/inaccessible video is unsuitable. Other hosts trigger a validation error in that field according to the help page.

Recommended execution: produce an approximately 2:45–3:00 narrated screencast, upload to YouTube with viewable/embed-capable settings, and check playback from a signed-out window. Three minutes is our editorial choice; no UnivaBio limit has been verified. The [Devpost best-practices page](https://help.devpost.com/article/84-video-making-best-practices) favors showing actual app behavior and preparing a script.

## Examples and resources

No example-project links were provided by the user or found on the event's [resources page](https://univabio.devpost.com/resources). Its links are GitHub, VS Code, CodeHS, and Code.org; its inspiration advice is to solve a real everyday health problem for someone. The [gallery](https://univabio.devpost.com/project-gallery) is not published. The [discussion board](https://univabio.devpost.com/forum_topics) has no topics; the [updates page](https://univabio.devpost.com/updates) has no public announcements. Do not claim to have reviewed UnivaBio example entries or previous winners.

## Practical submission preparation

Prepare the interactive app, signed-out judge demo, full source repository, code PDF, one-page PDF, video file/script, and a short code walkthrough. Keep all claims aligned with actual measured behavior. Before submitting, Shivam must supply truthful eligibility/account declarations and confirm the final form's requirements; those declarations cannot be inferred from the repository or name. This does not prevent continued implementation and packaging.

## Audit of the earlier product recommendation

1. **Historical rate needs its full qualifier.** The 41% figure is from a 2005 publication covering 2,644 hospitalist discharges at two academic hospitals during 2004. It is not a present-day national/global percentage. Also, 9.4% uses **returned results**, not all discharged patients, as its denominator. The original recommendation correctly included these limitations; preserve them when making a shorter slide. [Original study abstract](https://pubmed.ncbi.nlm.nih.gov/16027454/).
2. **“2025 SAFER” is the guide edition name.** Some PDF footers say August 2024. The official website calls the series the 2025 guides and describes their focus on result follow-up. This establishes a safety topic, not product endorsement, compliance, or outcome benefit. [Official guide collection](https://healthit.gov/clinical-quality-and-safety/safer-guides).
3. **Competition is stronger than a generic-assistant pitch suggests.** SeamlessMD already documents caregiver support and care-team-grounded AI; Eon documents longitudinal follow-up; Memora documents coordination and automation. The recommendation's feature-overlap statements are supported by vendor sites. Absence of equivalent provenance/closure features was **not** established; avoid an exclusivity claim.
4. **Economic figures are illustrative assumptions.** $149 pricing, five minutes saved, and $35/hour have not been validated through customer research. The arithmetic is approximately $292/month for 100 episodes; it is not observed ROI. CMS establishes an existing TCM service category, not guaranteed reimbursement for our app. [CMS TCM booklet](https://www.cms.gov/files/document/mln908628-transitional-care-management-services.pdf).
5. **Potential health impact remains hypothetical.** Better document extraction does not by itself establish fewer readmissions or earlier diagnoses. The review cited in the recommendation explicitly limits certainty about process/outcome effects. [AHRQ systematic-review summary](https://psnet.ahrq.gov/issue/interventions-improve-follow-laboratory-test-results-pending-discharge-systematic-review).
6. **Minor CDC wording pitfall in the rejected alternative:** the current clinical-features page's first bullet could be read as “under 1% of allergy-labeled patients.” The supported statistic is under 1% of the **US population**, versus approximately 10% reporting allergy. The recommendation uses the population denominator and links the clearer [CDC poster](https://cdc.gov/antibiotic-use/media/pdfs/Penicillin-Allergy-Poster-508.pdf).

No material false claim found in the earlier recommendation. The main risk is dropping its qualifiers when compressing it into marketing copy.
