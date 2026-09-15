# Firebase regression tests

These tests exercise the actual Looplight snapshot, export, command and Firebase adapter modules. All fixture text is original and synthetic. They do not use real patient records.

## Local unit suite

Run from the repository root:

```sh
node --import tsx --test tests/firebase/unit.test.mts
```

The initial external suite passed 15 tests against the fixed snapshot implementation. The final local suite passed 16 tests after adding history-reference coverage. Coverage includes strict initial input, snapshot round-trip and metadata, malformed input and bounds, exact Unicode source spans, duplicate identifiers and history references, immutable/mutable partitions, UTF-8 limits, date/completion consistency, omitted-source brief content, calendar boundaries and command confirmation safeguards.

## Local Firebase emulators, with no live credentials

Install normal project dependencies and use Node 22 and Java 21. From the repository root:

```sh
npm run test:firebase:emulator
```

The wrapper stages exact copies of the current rules and indexes in a disposable local project, because Firebase restricts rules to the config project directory. It removes that temporary project after the run. The CLI sets `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST`. The runner requires both variables in emulator mode, permits only loopback addresses, and connects every Firebase SDK client to those services before performing account or database operations. It does not fall back to production if a local emulator is missing. The public project identifier matches the app's public config so Auth and Firestore use the same emulator namespace. No Firebase login, admin key, CI secret, or pre-existing account is needed.

The local CI-equivalent emulator run passed all 58 checks, including the actual 100-space boundary, and completed cleanup. The [retained emulator report](reports/2026-09-15-emulator.json) includes source hashes and safe concurrency diagnostics. A local pass does not imply that the remote GitHub Actions workflow has run.

## Explicit deployed integration run

Enable email/password sign-in and deploy the intended Firestore rules first. Then run deliberately:

```sh
node --import tsx tests/firebase/integration.mts --run-live --quota-cap
```

Without either `--run-live` or `--emulator`, the script prints usage and exits before Firebase client imports or network activity. The modes are mutually exclusive.

The runner creates exactly two unique email/password accounts using `example.invalid` addresses. It exercises the real `firebaseApi` adapter, an independent account-B SDK app, an unauthenticated SDK app, and another SDK app signed into account A. It checks:

- Anonymous denials and owner CRUD/list/reload.
- Duplicate imports, conflicting import IDs, same-page lost-success replay, stale versions and concurrent updates.
- Cross-account read, list, create, update, delete, metadata, and collection-group isolation. A network error never counts as a successful permission denial.
- Immutable source/display metadata, version increments, malformed outer fields, extra fields, size bounds and timestamps.
- Coupled quota transactions, standalone counter manipulation, wrong IDs/counts, multiple creates sharing a counter, and optional actual 100-space saturation.
- Demo-copy retention of edited loops/history and same-page deduplication.
- Safe rejection of a deliberately corrupted owner-controlled JSON fixture plus owner deletion using its valid outer metadata.
- Repeated deletion and sign-out with server reads.

`--quota-cap` creates up to 100 synthetic care spaces and verifies that the 101st create fails without changing the count. Omit the flag for a smaller run that still checks transaction coupling and invalid counter bounds.

## Cleanup and reports

Passwords remain in memory. The runner logs only fixed test labels, outcome/error codes and timing, never passwords, tokens or document content. Cleanup touches only its two newly generated account paths and matching synthetic fixtures. It recovers matching fixture IDs within those generated namespaces when a create response might have been lost. It checks the remaining count, deletes generated Auth users, signs out clients and closes Firestore instances. Zero-count user metadata may remain because the rules deny deleting it; this is explicitly allowed. Incomplete cleanup fails the run and reports only generated UID/fixture identifiers for operator follow-up.

Reports default to ignored `live-results-<run-id>.json` or `emulator-results-<run-id>.json` files beside the script. Set `LOOPLIGHT_TEST_REPORT` for another path. Reports record exact source hashes. Exit code 0 requires every test and cleanup check to pass.

Concurrency diagnostics log only fulfilled/rejected outcome types, numeric versions/event counts, fixed error categories and a source-unchanged boolean. They never log raw exception messages, payloads or note text. This separates a rule-level permission rejection from the intended application ConflictError when investigating a racing transaction.

Other environment variables:

- `LOOPLIGHT_CHECKOUT`: repository root when launching from another directory; defaults to the current directory.
- `LOOPLIGHT_EXPECT_PROJECT`: expected public project ID; defaults to `looplight-care`. A mismatch stops before account creation.

## CI plan

1. Keep lint, typecheck, existing unit/model tests and the production Vite build.
2. Add `node --import tsx --test tests/firebase/unit.test.mts` to the normal verification job. No credentials or network service is required.
3. Run Firebase integration in a dedicated local emulator job with Node 22, Java 21, `npm ci`, and `npm run test:firebase:emulator`. The emulator CLI obtains local runtime dependencies; application data remains local. Retain historical D1/HTTP coverage in its own job using `dev:sites`.
4. Run emulator integration on pull requests and pushes. Do not invoke `--run-live` automatically on forked pull requests or ordinary CI.
5. Upload test reports as CI artifacts on failure, after confirming the error-code-only logging remains intact. Never upload Auth credentials, database dumps, emulator state exports or SDK debug logs.
6. Perform a deliberate deployed smoke run after a rules or auth-provider release. That run uses generated users and cleanup, not stored credentials.

The committed workflow contains these checks. Equivalent steps:

```yaml
- name: Snapshot and export regressions
  run: node --import tsx --test tests/firebase/unit.test.mts
- uses: actions/setup-java@v4
  with:
    distribution: temurin
    java-version: "21"
- name: Firebase Auth and rules in local emulators
  run: npm run test:firebase:emulator
```

## Scope limits

Rules enforce account isolation, shape/size limits, immutable source metadata, versions and quota coupling. They do not parse JSON or certify clinical correctness; transitions are client-validated and statuses are user-reported. A malicious owner editing their own state is outside the clinical trust claims of this research tracker.

Replay deduplication is tested within the current adapter module lifetime. After a full refresh, the current in-memory mutation-ID cache can produce a safe conflict instead of automatic replay recognition. Independent SDK reload proves persisted records, not browser draft recovery.

No browser interaction, Google popup, visual layout, or genuine browser refresh is exercised here. Those remain separate end-to-end browser checks.

## Retained deployed sequence

The [initial deployed run](reports/2026-09-15-live-initial.json) passed 56 of 58 checks. It passed the real 100-space saturation test but exposed concurrent-update recovery and stale-delete error classification. After the adapter fixes, the [deployed rerun](reports/2026-09-15-live-retest.json) passed all 57 checks with cleanup. That rerun used the smaller default suite, so it did not repeat quota saturation. The subsequent local emulator suite passed all 58 checks including saturation. These are engineering checks on synthetic fixtures, not medical validation.
