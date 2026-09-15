# Security and data handling

## Current posture

This is a functional research MVP for fictional/de-identified records. It has production-oriented engineering controls but is **not approved for production medical data**. No HIPAA certification, regulatory clearance, clinical validation, third-party penetration test or security certification is claimed.

## Implemented controls

- Data APIs require server-side identity from the trusted Sites dispatcher.
- Every read/update/delete selects by record ID **and** owner ID; account lists are scoped by owner.
- SQL uses prepared parameters. The client cannot replace the authoritative record or forge an event actor.
- JSON inputs are schema-validated with unknown fields rejected; streaming body, source, event and record sizes are bounded.
- Mutations reject cross-site requests and mismatched Origin headers; require JSON content type.
- Imports are idempotent; updates/deletions require the current version to prevent lost changes.
- Responses containing records use `Cache-Control: private, no-store` and `nosniff`.
- React renders document text as text; no `dangerouslySetInnerHTML`, remote HTML, or document code execution.
- Model inference has no network, secret access or code-execution tool. Prompt-like document text is inert and visible for manual review.
- PDF.js runs locally with eval support disabled. Raw PDFs are not retained; only extracted text is saved when creating a signed-in space.
- No analytics SDK, advertising integration, outbound messaging, or external model API.
- Server error logging uses a coarse error identifier; no record content, identity or stack is deliberately logged.
- Account-scoped JSON export and explicit deletion are available. Infrastructure backup retention may differ from live-record deletion.

## Verification

See QA.md and the runnable API suite. Real local D1 checks cover anonymous access, forged local headers, another-owner reads/updates/deletes/listing, idempotency, concurrent writes, same-origin enforcement, input limits, injection and deletion.

These tests do not prove security of the hosting provider, browser, authentication provider, or all possible attack paths. Deployment audience and authentication must also be checked at the hosted origin.

## Trust boundaries and risks

1. **Trusted gateway:** the production Worker assumes the Sites dispatcher authenticates and sanitizes identity headers. Direct public Worker exposure would invalidate this assumption.
2. **Model omissions:** unknown or mixed instructions and the full original document remain available. No extraction system can discover instructions absent from the provided record.
3. **False reassurance:** statuses say “reported complete”; no verified clinical outcome is implied. The app does not monitor deterioration or provide triage.
4. **User-entered clinical review:** a named reviewer is still a user assertion. There is no clinician signature or EHR confirmation.
5. **Data minimization:** use a nickname, fictional or de-identified notes. Exported JSON/text/PDF files contain the included record; users must store/share them appropriately. Calendar files deliberately omit patient and condition names.
6. **Availability:** error states retain unsaved form inputs. Idempotent imports and version checks avoid duplicate records/lost updates on retries. There is no offline synchronization or automated clinical escalation.
7. **Single account:** entering another person’s name does not invite that person or create access. Team authorization is not implemented.

## Before identifiable health-data deployment

Define the intended use and jurisdiction; obtain a qualified security/privacy and clinical review; confirm appropriate provider agreements and data-region/retention arrangements; validate on independently labeled records; perform accessibility/user studies and a penetration test; add operational rate limiting, monitoring and incident response; plan backups and restore exercises; determine any applicable medical-software obligations. No assumption that a free hosting tier satisfies these needs.

## Reporting a vulnerability

Use a private repository security advisory or contact the repository owner privately. Do not post patient data, account secrets, or an exploit containing identifiable records in a public issue. No real patient data is present in the supplied fixtures.
