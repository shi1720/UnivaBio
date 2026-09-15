# Looplight — submission handoff

**Participant:** Shivam Gupta · **Event:** UnivaBio 2026

**Deadline:** October 7, 2026, 9:15 a.m. India Standard Time (03:45 UTC).

## Ready in this package

- Working responsive application with a fictional no-login demo and account-scoped saved care spaces.
- One-page project description: `looplight-one-page.pdf`.
- Editable seven-slide pitch: `looplight-pitch.pptx`, plus its PDF.
- Verbatim narration and live-demo shot list: `demo-script.md`.
- Submission form text: `devpost-copy.md`.
- Code walkthrough and judge questions: `code-walkthrough-and-judge-qa.md`.
- Full authored-code PDF and exact source in the repository.
- Captioned silent screenshot walkthrough and recording guide; this is a preparation asset, not a completed spoken live-demo submission.

## Participant steps before submission

1. **Confirm eligibility truthfully.** Verify your student status, age and any event participation/AI-disclosure requirements against the current rules. These personal declarations have not been made for you.
2. **Enable judge access.** The Site starts owner-private. Approve making the fictional demo public, then check its URL while signed out. Saved care-space APIs must continue to require sign-in and ownership. The GitHub repository also remains private unless you choose to change its visibility; use the code PDF when the submission permits it, or grant the required access.
3. **Rehearse the code walkthrough.** Understand the source-span extraction, model limits, confirmation gates and ownership checks. Do not claim personal work you have not reviewed or performed. Credit the project to Shivam Gupta and disclose AI assistance honestly.
4. **Record your voice and the live interaction.** Read the script verbatim if useful. The silent screenshot walkthrough can support narration, but showing the actual import → source review → result receipt → reported clinical review interaction gives judges stronger implementation evidence. Confirm the event's latest duration and hosting requirements.
5. **Upload an accessible demo video.** Obtain the final video URL (for example an unlisted YouTube/Vimeo video). Test playback without your account.
6. **Submit the form and attachments.** Paste the prepared copy, add the demo and repository links, attach the one-page PDF and code PDF as supported, verify all fields, and submit through your hackathon account. No final entry or legally binding declaration has been submitted automatically.

## Claims to keep exact

- All showcased people and notes are fictional. No real patient records were used.
- Classifier accuracy is 41/50 on synthetic sentences. With its fixed conservative gates it accepts only 6/50; that is 12% coverage.
- Classifier metrics are separate from document extraction metrics. Read the full pipeline evaluation and its failures before quoting results.
- Completion and clinical review are **user-reported**, not independently verified.
- One coordinator/account per saved space; names do not send invitations or transfer clinical responsibility.
- Pricing and staff-time savings are hypotheses. No clinical outcome, real-world accuracy, customer, regulatory approval or compliance certification is claimed.

## Final review changes

An independent AI-agent critique scored the prepared project 40/50 on its internal scale; this is not an official score or competition prediction. See `docs/JUDGE-REVIEW.md`. The final release reconciles the engine version to 1.2 in submission copy, clarifies that demo edits do not transfer into a saved space, uses “Review reported” in the compact result-progress label, and provides repository-relative evaluation commands. The initial 1.1 experiment remains intact.
