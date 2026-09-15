# Test Looplight

**App:** [looplight-care.web.app](https://looplight-care.web.app)
**Public code:** [source ZIP](https://looplight-care.web.app/submission/looplight-source.zip) and [code PDF](https://looplight-care.web.app/submission/looplight-code.pdf)
**Use:** fictional examples only. Looplight organizes documented instructions and records user reports. It does not interpret results or recommend treatment.

## Short judge route

| Step | Action | Expected behavior |
|---|---|---|
| 1 | Open the app while signed out. | The fictional Anita/Maya care board appears without an account. |
| 2 | Choose **Try the pending-result walkthrough**. | The blood-culture follow-up opens with its exact source, unspecified timing and questions for the care team. |
| 3 | Enter `Maya (daughter)` as tracking person, check the source-review box and choose **Confirm this follow-up**. | The suggestion becomes active. Leave uncertain timing blank. Naming Maya does not assign clinical responsibility. |
| 4 | In **Record progress**, enter `The care team told us that the result is available.` and choose **Record result received**. | Receipt is recorded. The follow-up remains open. |
| 5 | Enter `Dr. Lee (fictional)` as reviewer. Use `The care team discussed the result and confirmed the documented next step.` as the note, select today's date and check the reporting confirmation. Choose **Record completion**. | The record reports who reviewed it and what happened. It is a user report, not an independently verified clinical event. |
| 6 | Choose **Save this care space** and continue with Google or email/password. | The current source, actions and edits are copied into this account. |
| 7 | Refresh `/space`, then open **Visit brief**. | The saved plan returns. The brief contains follow-ups, questions and source content without a linked task. |

For a fresh extraction run, choose **Add discharge notes → Anita's discharge → Find the open loops**. That import starts three suggestions. The initial demo already includes a clearly fictional confirmed primary-care task.

Already signed in? The demo header's **Open my saved spaces** returns without making another copy. The care-space/account panel also offers **Save this care space** when you intend to save the current demo. Both actions are available there for a returning signed-out user.

## Show uncertainty and correction

1. Open **Evidence & AI → Try a challenge**. The Jordan example is prefilled; analysis waits for **Find the open loops**. Repeat the challenge later to verify it opens prefilled again.
2. Inspect the conflicting 7-day/14-day cardiology instructions. Their timing requires clarification instead of selecting a date silently.
3. Check that the conditional scan retains its condition. Completed or negated tests should not become new instructions.
4. Open **Source documents** and filter **No task proposed** or **Needs manual review**. Retained sentences remain readable. No proposed task does not by itself mean an action was missed.
5. Use **Add a missed follow-up** on an appropriate source sentence. The new suggestion retains that source and needs confirmation before tracking.
6. Compare the separate classifier and whole-document results in **Evidence & AI**. The improved document scores are known-case regression results. The rules-only comparator did not show an incremental ML extraction benefit on these 20 documents.

## Drafts, navigation and keyboard

- Type in an import or follow-up form, close it and reopen it in the same tab. The unfinished draft remains.
- Change a confirmed follow-up's title or tracking person without saving. Switch to **Record progress**, save a progress note, then close and reopen. The unfinished detail edit remains. Repeat in the opposite direction with an unfinished progress note and **Save details**.
- While a follow-up save is pending, its form controls, tab changes and **View context** are disabled.
- Focus a follow-up tab. Arrow Left/Right move and select with wrapping; Home/End select the first/last tab. Tab moves into the selected panel. Inactive panels are hidden.
- Cancel a sign-in popup and return to the demo. The current plan remains available to save again.
- Unsaved drafts use tab memory. Refreshing or closing the tab discards them. A successfully saved care space is durable; this is separate from unfinished form drafts.
- Sign out, including from another synchronized browser tab, before switching accounts on a shared device. Drafts from the previous signed-in account must not appear for the next account.

## Saved-space recovery and boundaries

Use only accounts authorized for this test and fictional records.

1. Save an edited demo, refresh, sign out and sign back in. Verify the same saved content returns.
2. Open the public demo while signed in, then choose **Open my saved spaces**. Returning should not create a demo copy or change the stored-space count.
3. Edit the same record in two windows. After one saves, attempt the stale change. Review the latest state and retained input before trying again.
4. In **Your saved care spaces**, a failed record load exposes refresh and a typed DELETE recovery form. Retry first. If deliberately removing a disposable unreadable test record, verify its name, type `DELETE` and submit. Deletion uses the listed metadata version; another active space should remain intact. A stale version requires refresh and a newly typed confirmation.
5. Export and explicitly delete a disposable test space. After acknowledgement it disappears; a later list-refresh failure is reported separately.
6. Use the integration suite for cross-account attempts, malformed fields, source replacement, invalid versions and quota transactions. The suite creates and removes its own synthetic accounts and fixtures.

Rules protect account paths and storage invariants. A custom authenticated owner can bypass client workflow checks within those rules. These tests do not certify clinical states, trusted event actors or a tamper-proof clinical audit.

## Files and exports

A fictional embedded-text PDF is available under `public/examples/`. Imports are limited to 5 MB, 20 PDF pages and 40,000 characters. Scans need text extraction elsewhere; Looplight has no OCR. Unreadable input should leave an existing draft available.

Use **Visit brief** for print/save, text and calendar files. Use the account panel for a full JSON export. Calendar entries omit patient and medical details and use the final day of each confirmed date window. Importing an event does not book an appointment or guarantee a notification.

Current checks used the real file picker to import the bundled PDF, extracted 847 characters and created a saved plan with three expected follow-ups. The OS-saved text brief was inspected and retained all three tasks and the final original-source text. The OS-saved calendar file parsed with one eligible event, omitted patient names, excluded the closed result and contained no explicit notification alarm. Calendar-client import and notification delivery have not been tested.

The actual OS-saved JSON export parsed and passed `validateEpisode`: 21 source segments, three follow-ups and the original source text were preserved. The saved text brief contained 2,314 characters.

After the print-spacing fix, browser `Page.printToPDF` output of the actual Anita PDF test space produced two pages. Both pages were rendered and visually inspected. All three follow-ups, 18 unlinked segments, final source text and footer were present, with no clipping or orphaned footer. Physical printer output has not been tested. These are separate checks from calendar-app import, which is also untested.

## Executed verification, September 15, 2026

| Check | Result |
|---|---:|
| Domain regression suite | 31 passed |
| Snapshot/export regression suite | 16 passed |
| Python/TypeScript model parity | 64 passed |
| Deployed Firebase rerun | 57/57 passed |
| Firebase emulator suite, including the actual 100-space cap | 58/58 passed |
| Full typecheck and full lint | Passed |

A fresh signed-out browser loaded the public demo without an account. The final versioned PDF reader extracted 847 characters through the real file picker. Two consecutive challenge runs on the same page each produced four suggestions, with the second form correctly repopulated.

The returning-user path was exercised from a signed-in saved space through Try the demo → About this demo → Open my saved spaces. It returned to the existing three-loop Anita PDF test record without making a copy.

Browser QA passed Google sign-in, an edited-demo save and full reload, detail/progress draft preservation, and Arrow Right/End tab interaction. The inspected mobile board and full-width drawer at 390 × 844 had no horizontal overflow. The board at 320 × 740 also passed, with document width equal to 320 pixels. Actual manual source addition, receipt remaining open, reported clinician closure and a calendar-file download click were recorded. These checks cover the inspected flows and viewport, not every device or assistive technology.

The initial live Firebase run passed 56/58 checks, including the actual cap, and exposed concurrent-update recovery and stale-delete error classification. The fixes passed a 57-check live rerun without saturation, then the complete 58-check emulator run. [Retained reports](../tests/firebase/reports/) preserve the sequence. The earlier 32 D1/API checks are historical and are not Firebase passes.

## Reproduce engineering checks

From the repository root, with Node 22.13+ and npm. The emulator suite also requires Java 21.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run test:firebase:unit
npm run test:model
npm run test:firebase:emulator
npm run evaluate
npm run evaluate:pipeline
npm run build
```

The emulator command connects all test clients to loopback and does not fall back to the deployed service. An explicitly authorized deployed run is documented separately in [Firebase test instructions](../tests/firebase/README.md). A local emulator pass does not imply that remote GitHub Actions has run.


## Recorded demonstration

The final narrated video is 2:38.6 at 1920 × 1080. It uses actual browser interaction footage, AI-generated Cedar narration, 32 burned-in caption cues and a separate SRT. The voice is not a recording of Shivam. The [direct MP4](https://looplight-care.web.app/submission/looplight-narrated-demo.mp4) is published with the final artifact deployment. The [public YouTube demo](https://www.youtube.com/watch?v=XM_fwwBZ4es) passed signed-out playback, including rendering of the uploaded English captions. [Looplight on Devpost](https://devpost.com/software/looplight) was submitted successfully on September 16, 2026 IST as submission 1184846. Its signed-out public page and embedded YouTube playback with English captions were verified. The final source PDF contains 535 pages and 278 exact attached files; the matching inventory and source ZIP are complete. All seven public artifacts matched their local hashes. No platform confirmation remains outstanding.
