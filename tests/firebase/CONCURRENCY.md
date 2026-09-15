# Transaction race diagnosis

The first deployed run passed 56 checks and failed two assertions: concurrent same-version updates and the expected stale-delete error class. Cleanup succeeded, including the 100-space run and the deliberately malformed JSON fixture.

The initial report did not retain concurrent outcome categories, so it does not prove the exact SDK error. The diagnostic runner now records safe outcome/version metadata. The working hypothesis is that a stale transaction's next-version write is rejected by the version security rule before the SDK's ordinary conflict retry path can handle it. The installed Firebase SDK retries aborted and failed-precondition transaction errors; a permanent permission denial follows a different path.

Recommended conservative adapter behavior:

1. Preserve the existing version increment rule.
2. Catch a permission-denied error from the PATCH transaction before converting it to a friendly generic message.
3. Confirm the current Auth UID is still the UID captured for the request.
4. Read that exact record once from the server.
5. If lastMutationId matches this request's stable same-session ID, return the already committed record.
6. If the validated current version differs from the supplied version, return ConflictError with the latest record. The UI can preserve the person's draft for review.
7. If the version has not changed, or the independent read fails, retain the original permission error. Do not assume all permission errors are races, and do not automatically apply the command to a newer record.

For DELETE, a stale readable record should yield ConflictError with its latest decoded state. A corrupted record can be deleted using its valid outer version, without decoding its opaque state first. If a corrupted record has a stale version, a generic refresh-and-review error is appropriate because no valid latest Episode is available.

The runner's safe diagnostics show outcome types, numeric versions and fixed error categories. They must stay free of raw exception messages, source text, passwords and tokens.
