# Verification record

**Release:** Firebase application with Looplight hybrid engine 1.2
**Date:** September 15, 2026
**Public app:** [looplight-care.web.app](https://looplight-care.web.app)

All fixtures and demonstrated records are synthetic. This record separates executed checks from their limits. It does not certify clinical effectiveness, regulatory compliance or safety for identifiable patient data.

## Current automated verification

| Check | Result | Scope |
|---|---:|---|
| Domain regressions | **31 passed** | Extraction, negation/conditions, supported dates and conflicts, source spans, command validation, receipt/review gates and exports |
| Snapshot/export regressions | **16 passed** | Strict input and saved snapshots, metadata, UTF-8 bounds, source partitions, Unicode spans, duplicate/history identifiers, dates, completion fields and export boundaries |
| Python/TypeScript model parity | **64 passed** | Score agreement, abstention, limits, Unicode, malformed-model handling and inference safeguards |
| Initial deployed Firebase run | **56/58 passed** | Actual generated accounts, owner CRUD/isolation, quotas and cleanup; the real 100-space cap passed, while two recovery checks failed |
| Deployed Firebase rerun after fixes | **57/57 passed** | Adapter/rules checks and cleanup; this smaller run did not repeat quota saturation |
| Local Firebase emulator integration | **58/58 passed** | Full suite including concurrency, stale deletion, actual 100-space saturation and cleanup |
| Full TypeScript check | **Passed** | Current repository source after test integration |
| Full final lint | **Passed** | Current app, builders and integrated test source |

The initial live failures were retained. A concurrent same-version update could surface a permission error instead of a recoverable conflict; the adapter now reads authoritative state once after that error and distinguishes an already-applied mutation, a newer record and an unchanged-version denial. Stale deletion preserves conflict typing for readable records. An owner can delete malformed JSON using its valid outer version metadata.

[Initial deployed report](../tests/firebase/reports/2026-09-15-live-initial.json) · [Deployed retest](../tests/firebase/reports/2026-09-15-live-retest.json) · [Emulator report](../tests/firebase/reports/2026-09-15-emulator.json)

These reports preserve source hashes and outcomes. Each integration run used generated synthetic accounts and fixtures, removed test records and Auth users, and allowed harmless zero-count metadata where rules deny deletion. Passwords, tokens and note contents are absent from retained reports. The parent ran deployed checks; a separate test author ran the local emulator suite.

### Reproduction and trust boundary

[Firebase test instructions](../tests/firebase/README.md) describe unit, emulator and deliberate deployed commands. The no-secret emulator job uses Node 22 and Java 21, stages the current rules in a disposable project and connects SDK clients only to loopback. It does not fall back to the deployed service. A local CI-equivalent pass does not imply that remote GitHub Actions ran.

The actual app adapter and independent SDK clients test account isolation, immutable saved source, shape/size limits, versions and quota transactions. Firestore rules do not parse the state JSON, attest clinical events or enforce client workflow transitions. Status and history are user reports. Same-session replay is tested; after a full refresh, the in-memory mutation-ID cache does not guarantee automatic replay recognition.

## Current hosted browser verification

The parent performed these checks against the Firebase application:

- A fresh signed-out in-app browser loads the public fictional demo without an account.
- Google sign-in works through the actual GUI. Saving the edited demo and a full-page reload restore the saved source, actions and edits. Email/password is independently exercised by integration tests.
- Returning-user navigation passed: signed-in saved space → Try the demo → About this demo → Open my saved spaces returned to the existing three-loop Anita PDF test record without creating a copy.
- Detail drafts remain after saving progress; progress drafts remain after saving details. Arrow Right and End select the linked follow-up tabs in the GUI.
- The inspected board and full-width drawer at **390 × 844** have no horizontal overflow. The board at **320 × 740** also passes, with document width exactly 320 pixels. These are inspected states, not a claim about every screen or device.
- Actual manual source-linked addition, confirmation, result receipt, reported clinician review and completion were recorded. Receipt alone leaves the pending result open.
- The conflicting-instructions challenge was analyzed twice consecutively on the same page. Both runs produced four suggestions, and the second form correctly repopulated its fictional sample.
- The final versioned PDF reader was exercised through the real file picker. The bundled PDF yielded **847 characters** and a saved Anita test plan with **three expected follow-ups**. This verifies the freshly hosted reader; it does not claim an across-deployment stale-tab test.

## Actual exports and print output

| Output | Observed result |
|---|---|
| JSON | The OS-downloaded file parsed and passed `validateEpisode`, retaining **21 source segments, three follow-ups and the original source text**. |
| Text brief | The OS-downloaded file contained **2,314 characters**, all three tasks and the final original-source text. |
| Calendar | The OS-downloaded ICS parsed with **one eligible event**, omitted patient names and excluded the closed result. It has no `VALARM`. |
| Browser PDF | `Page.printToPDF` of the actual open Anita PDF test brief produced **two pages** after the spacing fix. All three follow-ups, 18 unlinked source segments, final source text and footer were present. Both pages were rendered and visually inspected, with no clipping or orphaned footer. |

Calendar-client import, notification delivery and physical printer output were not tested. The verified results are actual downloaded files and browser-generated PDF output. The calendar file does not book an appointment or guarantee an alert. General accessibility and low-literacy task success have no user-study evidence.

## Completed narrated demonstration

The final video is **2 minutes 38.6 seconds, 1920 × 1080**. It uses actual browser interaction footage captured through the browser debugging interface, an AI-generated Cedar voice, **32 caption cues burned into the video**, and a separate SRT. It is an edited demonstration of real interactions. Narration is not a recording of Shivam's voice.

The earlier silent screenshot walkthrough is a preparation asset. It is not the final narrated demo. The [direct MP4](https://looplight-care.web.app/submission/looplight-narrated-demo.mp4) is published with the final artifact deployment. YouTube upload is pending explicit confirmation of the platform terms; no YouTube playback or Devpost embed is claimed yet.

## Document-level evaluation

The 20-document synthetic challenge contains 44 annotated actions. The author froze it before running the then-current engine, while having prior knowledge of an earlier engine. It is not blinded external or clinician-labeled validation.

- Engine 1.1: **32/38 correctly typed suggestions**, **32/44 gold actions**, 84.2% precision and 72.7% recall.
- Engine 1.2 on the same now-known regression cases: **33/34 correctly typed suggestions**, **33/44 gold actions**, 97.1% precision and 75.0% recall. Eleven actions remain for manual source review.
- All 44 gold snippets remain visible, and all 16 assigned dates match annotations. Source visibility does not guarantee that people notice omissions.
- Disabling ML leaves task outputs unchanged on these 20 documents. No incremental ML extraction benefit is established.
- The separate classifier result is 82% raw sentence-category accuracy on 50 synthetic examples, with 44 abstentions and six correct accepted predictions. It is not whole-document extraction accuracy or clinical validation.

[Retained initial experiment](../ml/pipeline-eval/REPORT.md) · [Release results](../ml/pipeline-eval/release-results.json) · [Classifier evaluation](../ml/EVALUATION.md) · [Security boundaries](SECURITY.md)

## Historical evidence

The earlier Sites/D1 build passed 32 local HTTP/API checks, migrations and its production build. Its browser checks covered the earlier authentication, import and source/closure paths. Those results are retained for reproducing that backend and are not added to Firebase totals. The original in-app-browser download observer limitation is historical; current OS-saved JSON, text and calendar files have now been inspected as described above.

The one-page project PDF and seven-slide deck were previously rendered and visually inspected. The complete code PDF is built from an explicit inventory with exact-byte hashes and attached source files. Regeneration from the final Firebase source is underway; do not treat an earlier code-PDF hash as the final snapshot.

## Remaining delivery work

1. Finish source-PDF, inventory and hash regeneration from the final source.
2. Obtain explicit YouTube terms confirmation, upload the completed narrated video, then verify hosted playback and embedding signed out.
3. Complete the Devpost CAPTCHA and truthful eligibility/account declarations, create the entry, verify its artifact access and submit. **No Devpost project entry has been created.**

Real patient use separately requires governed data handling, independent clinical/security review and user research. No outcome, paying-customer or compliance claim follows from these engineering checks.
