# Security and data handling

## Intended scope

Looplight is a research MVP for fictional or appropriately de-identified notes. It is not clinically validated or ready for identifiable patient records. No regulatory clearance, HIPAA compliance, security certification or external penetration test is claimed.

The Firebase version has a public fictional demo and account-scoped saved spaces. Authentication and access controls do not turn user-entered medical information into verified clinical evidence.

## Server-enforced Firebase controls

The checked-in Firestore rules require an authenticated UID matching `users/{uid}` for reads and writes. Other collection paths are denied. Episode lists are restricted to the owner's collection.

Rules enforce allowed outer record fields and types, bounded source/state strings, stable original `source` and selected metadata after creation, version increments on updates, server write timestamps and a maximum count of 100 stored care spaces. Episode create/delete writes must be paired with the matching account-count change in a transaction or batch satisfying the rules.

The deployed rules were exercised by the two-account integration suite described below. The public Firebase web configuration is an application identifier, not an admin credential. A service-account key is neither needed nor included in the client. Authorization depends on Auth and Firestore rules, not on hiding the Firebase configuration.

## Client-side checks and their limits

The app validates input and commands, exact source spans, unique identifiers, dates, snapshots, completion fields and source consistency. Through the normal interface, a pending result must be received before it can be reported complete, with a named reviewer and note. Retry identifiers and transactions reduce accidental duplicate writes; version conflicts preserve unfinished form inputs for review.

**These domain checks execute in the browser.** Firestore stores `source` and `state` as JSON strings and does not parse their contents. An authenticated owner using a custom client can submit mutable state that bypasses UI transition checks while meeting the outer rules. The app may reject malformed snapshots on read, but the rules do not independently establish semantic correctness.

Consequently:

- History and completion are editable user reports, not a tamper-proof clinical audit log.
- A named reviewer does not prove that a clinician reviewed a result, accepted responsibility or signed anything.
- A displayed event actor or event time is not a trusted server attestation. Firestore's outer server timestamp proves a storage write time only.
- Typed deletion confirmation and stale-version deletion checks are client protections, not independent rule requirements.
- Original source immutability applies after creation. The initial document is user-supplied and can be false.

The same account can export or delete its records. There is no staff role system, caregiver invitation or independent verifier.

## Data flow and device storage

PDF.js extracts embedded text on the device with eval support disabled. The browser module and matching worker are copied from the lockfile-installed official package to versioned, same-origin public paths; document bytes are not sent to a third-party PDF service. Reader-load failures retain the current form input and do not trigger an automatic reload. Original PDF bytes are not uploaded or retained. The classifier and rules run locally for both demo and signed-in analysis. Document text is never sent to an external model service.

When a care space is saved, extracted source text, patient display name, plan and user-reported history are transmitted to Firebase and stored under the signed-in account. This is not a wholly offline product. Firebase Auth processes account data and credentials. The database is configured in `asia-south1`; do not infer that authentication or all hosting/service data shares that region.

The Firestore record cache and unsaved form drafts use memory. Drafts survive closing/reopening forms in the running tab. Refreshing or closing the tab loses them, and the app's sign-out action clears the draft store. Firebase Auth can persist a sign-in session separately. Do not describe this as “nothing is stored on the device.” Downloads, browser behavior and provider-side retention are separate concerns.

**Save this care space** explicitly saves a copy of the current demo and its edits. Until that save succeeds, the anonymous plan is not a durable account record. Existing fictional events remain fictional after copying.

## Other implemented protections

- React renders document text as text. Source text does not execute HTML, commands or model tools.
- The model has no network or tool access. Prompt-like instructions inside a document are inert content.
- Input/file limits and snapshot bounds reduce accidental oversized operations. The per-account space count is a storage bound, not comprehensive abuse prevention or a service-wide rate limit.
- Hosting configuration adds `nosniff`, a referrer policy, frame denial and camera/microphone/geolocation restrictions.
- No application analytics, advertising SDK or automated outbound messaging is included in the reviewed source.
- Calendar reminders omit patient/condition names. Full JSON, text and printable briefs contain the included record and should be handled accordingly.

## Verification status

On September 15, 2026, the deployed Auth/Firestore rerun passed **57/57 checks** and the local emulator suite passed **58/58**. The full emulator run includes the actual 100-space cap. Both exercised the real app adapter plus independent SDK clients: anonymous denial, two-account read/list/create/update/delete isolation, source immutability, outer fields and size bounds, version guards, quota coupling, reload, conflict/replay handling, deletion and generated-fixture cleanup. Reports retain the tested source hashes, results and cleanup outcomes without passwords, tokens or document contents. [Sanitized reports](../tests/firebase/reports/) · [Reproduction instructions](../tests/firebase/README.md)

The first deployed run passed 56/58, including its actual cap test, and exposed concurrent-error and stale-delete recovery defects. Those failures remain recorded. The adapter was repaired before the 57-check rerun; that smaller live rerun did not repeat cap saturation. The 58-check emulator run did. Same-session replay is tested; the in-memory mutation-ID cache does not promise replay recognition after a full refresh.

Additional checks passed **31 domain tests**, **16 snapshot/export tests** and **64 model-parity cases**. The release owner verified actual Google sign-in, edited-demo save/reload, PDF import, source review and downloads through the browser. The downloaded JSON decoded with 21 source segments and three loops. Browser draft preservation is limited to the running tab. The release owner also passed the final PDF-import retest and adjusted two-page print output. See the [QA record](QA.md) for exact coverage and remaining limits.

A production dependency audit (`npm audit --omit=dev --json`) reported zero known vulnerabilities at the time of this review. Repository text screening found no private-key, service-account, access-token or recognized secret-key patterns; the one Firebase browser-key pattern was the expected public client configuration. Pattern screening and dependency advisories are limited checks, not a security certification.

The earlier release passed 32 real local D1/API checks for its Sites backend. That suite tested a different authentication and storage boundary. Its passes do not establish Firebase Auth security, Firestore isolation, rule correctness or current deployment behavior. Historical results remain in the dated QA record.

These passing Firebase tests do not certify the provider, the user's device or every attack path. No external security audit has been performed.

## Operational limits

Connectivity and Firebase service quotas affect saved spaces. The app presents retryable errors and keeps current form inputs in memory, but does not guarantee offline operation, uninterrupted availability or clinical escalation. Live-record deletion does not assert immediate removal from infrastructure logs/backups or exported files. Account deletion and provider retention are not implemented as a comprehensive in-app privacy workflow.

Before identifiable patient use, define the intended use and jurisdiction, obtain qualified clinical/security/privacy review and suitable provider agreements, validate on independently reviewed records, test access and recovery, and establish monitoring, abuse controls, retention, incident response and accessibility procedures. A free-tier deployment is not evidence that these requirements are met.

## Reporting a vulnerability

Use a private repository security advisory or contact the repository owner privately. Do not include patient records, passwords, tokens or exploit data containing personal information in public issues.
