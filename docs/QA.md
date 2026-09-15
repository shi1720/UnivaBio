# Verification record

Release candidate: **Looplight hybrid engine 1.2**, September 15, 2026.
All application fixtures and demonstration records are synthetic.

## Automated verification completed locally

| Check | Result | Practical coverage |
|---|---|---|
| TypeScript | Passed | Strict source type checking |
| ESLint | Passed | Current app, libraries, tests and supported source; historical experiment snapshots remain unchanged |
| Domain regression suite | **31 tests passed** | Dates/windows/conflicts; exact source spans; negation, history, conditions, headings, missing-result escalation; command validation; state transitions; receipt/review closure gates; export filtering |
| HTTP + D1 integration | **32 checks passed** | Actual local D1 and running server; authentication, identity spoofing rejection, owner isolation, persistence, idempotency, stale/parallel edits, CSRF, input bounds, source retention, injection, explicit deletion |
| Python/TypeScript model parity | **64 cases passed** | Score agreement within 1e-12; abstention, Unicode, limits, malformed model, immutability, inert injection |
| Production build | Passed | Worker, RSC/SSR, browser bundle, static PDF worker and generated D1 migration |
| Local migrations | Passed | Fresh database application and idempotent rerun |
| Production dependency audit | **0 reported vulnerabilities** | `npm audit --omit=dev` at verification time; this is not a security certification |

The repository contains a GitHub Actions workflow for repeatable checks. A local pass does not imply that a remote Actions run or hosted authentication flow has been verified.

## Browser behavior exercised

- Desktop care board and source drawer at 1440 × 1000; mobile board/drawer at 390 × 844. Mobile document width equals viewport width, with no horizontal overflow in the inspected states.
- Local sign-in, new saved care space, and reload showing the same three extracted follow-ups from actual local D1.
- Import by pasted text, built-in examples, and an actual text-based PDF. The PDF produced the expected three follow-ups.
- A PDF with no readable text shows a recoverable error and preserves the existing 639-character draft.
- The challenge example produces four suggestions, keeps conditional wording, and clears conflicting dates with visible clarification questions.
- Open an exact source quote, name a tracker, confirm the source, record receipt, and record named clinician review with a completion report. Receiving a result alone leaves it open.
- Recover an omitted action from its original sentence. The manual action retains the source and requires fresh confirmation.
- Inspect actual model output and model gates in Evidence & AI. Displayed gates are read from the model configuration.
- View the printable visit brief and exercise calendar/text export controls. Calendar construction and privacy exclusions also have domain tests.
- Feature-detected WebMCP reads current visible care state and opens the import form; invalid input is rejected. It cannot silently confirm or close a follow-up.

### Browser verification limits

The Codex in-app browser does not expose printing through its developer interface, and its download-event observer timed out. Therefore actual OS-level print/save completion and downloaded-file persistence are **not claimed as verified** in this environment. The brief renders visibly, browser-standard download controls are implemented, and export content/filtering is tested. Check print/save and calendar import in the browser used for the final recording. No calendar appointment is automatically booked.

During live development, Vite hot reload briefly produced duplicate-renderer/hook warnings after dependency and navigation changes. The app recovered on reload; production build passes. Do not treat hot-reload recovery as evidence about a deployed session.

## Document-level evaluation

The original 20-document synthetic challenge was frozen before the then-current engine was run. Engine 1.1 reached **32/38 correctly typed suggestions**, **32/44 gold actions**: 84.2% precision, 72.7% recall. Its negatives, headings and result-escalation errors informed general repairs.

Engine 1.2 reaches **33/34 correctly typed suggestions**, **33/44 gold actions** on those same now-known fixtures: 97.1% precision, 75.0% recall. This is release regression evidence, not fresh generalization. Eleven actions remain source-review work. The remaining strict false positive is a disclosed annotation-boundary case: a separate clarification item versus commentary attached to two conflicting actions.

All 44 gold snippets remain source-visible, and all 16 assigned dates are annotation-supported. Visibility does not guarantee human detection. Disabling ML produces identical task outputs on this set; no incremental ML extraction benefit is established. The trained classifier's separate 82% sentence-category accuracy must not be presented as whole-document extraction accuracy.

See [retained initial experiment](../ml/pipeline-eval/REPORT.md), [release results](../ml/pipeline-eval/release-results.json), [classifier report](../ml/EVALUATION.md), and [security boundaries](SECURITY.md).

## Artifact verification

The one-page project PDF and seven-slide deck were rendered and visually inspected, including the actual product screenshot. The complete authored-code PDF is generated from an explicit source inventory with exact-byte hashes and attached source files. The silent video is a labeled screenshot walkthrough, with captions; it is not presented as a continuous live screen recording.

## Remaining external proof

Before final submission: confirm judge access while signed out, complete the participant's recorded demonstration, and check current event requirements and eligibility. Real patient use additionally needs clinical validation, appropriate privacy/security arrangements and user research. No clinical safety, outcome, commercial traction or regulatory-compliance claim follows from these engineering checks.
