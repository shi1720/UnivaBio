import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Episode, CareLoop } from "../../lib/types";
import type { Auth } from "firebase/auth";
import type { Firestore, FieldValue } from "firebase/firestore";

// This runner intentionally does nothing to Firebase unless --run-live or --emulator is supplied.
// Credentials stay in process memory. Logs contain test labels and error codes only.
const args = new Set(process.argv.slice(2));
const emulator = args.has("--emulator");
if (emulator && args.has("--run-live"))
  throw Error("Choose either local emulators or a live run, never both.");
if (!args.has("--run-live") && !emulator) {
  console.log(
    "Inert Firebase integration runner. Use --emulator for local-only Firebase services, or --run-live for deployed-rule tests with two generated accounts. Optional --quota-cap tests the 100-space boundary.",
  );
  process.exit(0);
}
const checkout = resolve(process.env.LOOPLIGHT_CHECKOUT || process.cwd());
const outDir = dirname(fileURLToPath(import.meta.url));
const runId = randomUUID();
const output =
  process.env.LOOPLIGHT_TEST_REPORT ||
  resolve(outDir, `${emulator ? "emulator" : "live"}-results-${runId}.json`);
function localEndpoint(value: string | undefined, name: string) {
  if (!value)
    throw Error(`Set ${name} explicitly for local emulator execution.`);
  const match = /^(127\.0\.0\.1|localhost):(\d{2,5})$/.exec(value);
  if (!match || Number(match[2]) > 65535)
    throw Error(`${name} must name localhost or 127.0.0.1 with a valid port.`);
  return {
    host: match[1],
    port: Number(match[2]),
    url: `http://${match[1]}:${match[2]}`,
  };
}
const authEndpoint = emulator
  ? localEndpoint(
      process.env.FIREBASE_AUTH_EMULATOR_HOST,
      "FIREBASE_AUTH_EMULATOR_HOST",
    )
  : null;
const firestoreEndpoint = emulator
  ? localEndpoint(
      process.env.FIRESTORE_EMULATOR_HOST,
      "FIRESTORE_EMULATOR_HOST",
    )
  : null;
const imp = (name: string) =>
  import(pathToFileURL(resolve(checkout, name)).href);
const config = JSON.parse(
  readFileSync(resolve(checkout, "firebase/config.json"), "utf8"),
);
if (
  config.projectId !==
  (process.env.LOOPLIGHT_EXPECT_PROJECT || "looplight-care")
)
  throw Error(
    "Project mismatch. Set LOOPLIGHT_EXPECT_PROJECT deliberately for a different deployment.",
  );

const appSDK = await import("firebase/app");
const authSDK = await import("firebase/auth");
const fs = await import("firebase/firestore");
appSDK.setLogLevel("silent");
fs.setLogLevel("silent");
const { auth, database, firebaseApp } = (await imp(
  "firebase/client.ts",
)) as typeof import("../../firebase/client");
function connectLocal(auth: Auth, db: Firestore) {
  if (!emulator) return;
  authSDK.connectAuthEmulator(auth, authEndpoint!.url, {
    disableWarnings: true,
  });
  fs.connectFirestoreEmulator(
    db,
    firestoreEndpoint!.host,
    firestoreEndpoint!.port,
  );
}
connectLocal(auth, database);
const { firebaseApi, saveDemoCopy, ConflictError } = (await imp(
  "firebase/store.ts",
)) as typeof import("../../firebase/store");
const { analyzeDocument } = (await imp(
  "lib/engine.ts",
)) as typeof import("../../lib/engine");
const { encodeEpisode, decodeEpisode } = (await imp(
  "lib/snapshot.ts",
)) as typeof import("../../lib/snapshot");
const { applyCommand } = (await imp(
  "lib/commands.ts",
)) as typeof import("../../lib/commands");

function independent(name: string) {
  const app = appSDK.initializeApp(config, `looplight-audit-${runId}-${name}`);
  const auth = authSDK.getAuth(app);
  const db = fs.initializeFirestore(app, { localCache: fs.memoryLocalCache() });
  connectLocal(auth, db);
  return { app, auth, db };
}
const secondary = independent("b"),
  anonymous = independent("anonymous"),
  reload = independent("reload-a");
const accounts = [
  {
    key: "A",
    auth,
    db: database,
    uid: "",
    signupAttempted: false,
    email: `looplight-e2e-${runId}-a@example.invalid`,
    password: `A!7${Buffer.from(randomBytes(24)).toString("base64url")}`,
    ids: new Set<string>(),
  },
  {
    key: "B",
    auth: secondary.auth,
    db: secondary.db,
    uid: "",
    signupAttempted: false,
    email: `looplight-e2e-${runId}-b@example.invalid`,
    password: `B!7${Buffer.from(randomBytes(24)).toString("base64url")}`,
    ids: new Set<string>(),
  },
];
const A = accounts[0],
  B = accounts[1];
const results: { name: string; status: string; code?: string; ms: number }[] =
  [];
const cleanup: {
  account: string;
  status: string;
  code?: string;
  remainingFixtures?: string[];
  uid?: string;
}[] = [];
const observations: string[] = [];
const diagnostics: Record<string, unknown>[] = [];
let fatal = false;
function code(error: unknown) {
  if (error && typeof error === "object" && "code" in error)
    return String(error.code).slice(0, 90);
  return error instanceof Error ? error.name : "unknown-error";
}
function log(item: { name: string; status: string; code?: string }) {
  console.log(JSON.stringify(item));
}
function safeErrorMetadata(error: unknown) {
  const isConflict = error instanceof ConflictError;
  const latest = isConflict
    ? (error as { latest: { version: number } }).latest
    : undefined;
  const message = error instanceof Error ? error.message : "";
  const category = isConflict
    ? "conflict"
    : /could not be accessed|signed into its account/i.test(message)
      ? "friendly-permission"
      : /Connection interrupted|reconnect and retry/i.test(message)
        ? "friendly-network"
        : /account changed/i.test(message)
          ? "account-changed"
          : /not found|no longer exists/i.test(message)
            ? "not-found"
            : "other";
  return {
    code: code(error),
    errorName: error instanceof Error ? error.name : "unknown",
    category,
    isConflict,
    ...(latest ? { latestVersion: latest.version } : {}),
  };
}
async function test<T>(
  name: string,
  fn: () => Promise<T> | T,
  required = false,
): Promise<T | undefined> {
  const start = Date.now();
  try {
    const value = await fn();
    const row = { name, status: "pass", ms: Date.now() - start };
    results.push(row);
    log(row);
    return value;
  } catch (e) {
    const row = { name, status: "fail", code: code(e), ms: Date.now() - start };
    results.push(row);
    log(row);
    if (required) throw e;
    return undefined;
  }
}
async function denied(fn: () => Promise<unknown>) {
  let rejected = false;
  try {
    await fn();
  } catch (e) {
    rejected = true;
    assert.equal(
      code(e),
      "permission-denied",
      "Expected an actual deployed-rules permission denial, not a network or validation failure",
    );
  }
  assert.ok(rejected, "Forbidden operation unexpectedly succeeded");
}
async function rejected(
  fn: () => Promise<unknown>,
  predicate?: (e: unknown) => boolean,
) {
  let error: unknown;
  try {
    await fn();
  } catch (e) {
    error = e;
  }
  assert.ok(error, "Operation unexpectedly succeeded");
  if (predicate) assert.ok(predicate(error), "Unexpected rejection type");
}
const source =
  "FICTIONAL TEST RECORD. Follow up with the clinic in seven days. The sample report is pending. This is a synthetic account-isolation fixture.";
const input = {
  patientName: "Synthetic test record",
  documentTitle: "Automated synthetic fixture",
  dischargeDate: "2026-09-01",
  sourceText: source,
};
const endpoint = (id: string) => `/api/episodes/${id}`;
const episodeRef = (db: Firestore, uid: string, id: string) =>
  fs.doc(db, "users", uid, "episodes", id);
const metaRef = (db: Firestore, uid: string) => fs.doc(db, "users", uid);
const api = <T = unknown,>(url: string, options?: RequestInit) =>
  firebaseApi(url, options) as Promise<T>;
const post = (id: string, value = input) =>
  api<{ episode: Episode }>("/api/episodes", {
    method: "POST",
    headers: { "Idempotency-Key": id },
    body: JSON.stringify(value),
  });
const patch = (id: string, version: number, command: unknown) =>
  api<{ episode: Episode }>(endpoint(id), {
    method: "PATCH",
    body: JSON.stringify({ version, command }),
  });
const remove = (id: string, version: number) =>
  api<{ deleted: boolean }>(endpoint(id), {
    method: "DELETE",
    body: JSON.stringify({ confirmation: "DELETE", version }),
  });
async function count(account = A) {
  const s = await fs.getDocFromServer(metaRef(account.db, account.uid));
  return s.exists() ? s.data().count : 0;
}
function ownedId(account = A) {
  const id = randomUUID();
  account.ids.add(id);
  return id;
}
function encoded(id: string) {
  return {
    ...encodeEpisode(analyzeDocument(input, id)),
    updatedAt: fs.serverTimestamp(),
    lastMutationId: id,
  };
}
async function ownRawCreate(
  account: typeof A,
  id: string,
  mutate?: (value: ReturnType<typeof encoded>) => Record<string, unknown>,
  metaMutation?: (value: {
    count: number;
    updatedAt: FieldValue;
    mutationId: string;
    mutationKind: string;
  }) => Record<string, unknown>,
) {
  const n = await count(account),
    batch = fs.writeBatch(account.db);
  const record = encoded(id);
  batch.set(
    episodeRef(account.db, account.uid, id),
    mutate ? mutate(record) : record,
  );
  const meta = {
    count: n + 1,
    updatedAt: fs.serverTimestamp(),
    mutationId: id,
    mutationKind: "create",
  };
  batch.set(
    metaRef(account.db, account.uid),
    metaMutation ? metaMutation(meta) : meta,
  );
  await batch.commit();
}
async function rawDelete(account: typeof A, id: string) {
  const ref = episodeRef(account.db, account.uid, id),
    meta = metaRef(account.db, account.uid);
  await fs.runTransaction(account.db, async (tx) => {
    const [record, accountDoc] = await Promise.all([tx.get(ref), tx.get(meta)]);
    if (!record.exists()) return;
    assert.ok(
      accountDoc.exists(),
      "Cleanup cannot find generated account counter",
    );
    const n = accountDoc.data().count;
    assert.ok(
      Number.isInteger(n) && n > 0,
      "Cleanup found inconsistent generated account counter",
    );
    tx.delete(ref);
    tx.update(meta, {
      count: n - 1,
      updatedAt: fs.serverTimestamp(),
      mutationId: id,
      mutationKind: "delete",
    });
  });
}
async function updateRaw(
  db: Firestore,
  uid: string,
  id: string,
  changes: Record<string, unknown>,
) {
  const ref = episodeRef(db, uid, id);
  const current = await fs.getDocFromServer(episodeRef(database, A.uid, id));
  assert.ok(current.exists());
  await fs.updateDoc(ref, {
    version: current.data().version + 1,
    updatedAt: fs.serverTimestamp(),
    lastMutationId: randomUUID(),
    ...changes,
  });
}

try {
  await auth.authStateReady();
  assert.equal(
    auth.currentUser,
    null,
    "This runner must not use an existing signed-in identity",
  );
  await test(
    "Unauthenticated adapter refuses account operations",
    () => rejected(() => api("/api/episodes")),
    true,
  );
  await test("Unauthenticated SDK cannot read or list another path", async () => {
    const uid = `absent-${randomUUID()}`;
    await denied(() =>
      fs.getDocFromServer(episodeRef(anonymous.db, uid, randomUUID())),
    );
    await denied(() =>
      fs.getDocsFromServer(
        fs.collection(anonymous.db, "users", uid, "episodes"),
      ),
    );
  });
  for (const account of accounts) {
    await test(
      `Create generated Auth account ${account.key}`,
      async () => {
        account.signupAttempted = true;
        const c = await authSDK.createUserWithEmailAndPassword(
          account.auth,
          account.email,
          account.password,
        );
        account.uid = c.user.uid;
        assert.ok(account.uid);
      },
      true,
    );
  }
  await test(
    "Fresh account has an empty owner-scoped list",
    async () => {
      const r = await api<{ episodes: { id: string }[] }>("/api/episodes");
      assert.equal(r.episodes.length, 0);
      assert.equal(await count(), 0);
    },
    true,
  );

  const id = ownedId();
  let current!: Episode;
  await test(
    "Adapter creates a source-linked care space and increments quota atomically",
    async () => {
      const result = await post(id);
      current = result.episode;
      assert.equal(current.id, id);
      assert.equal(current.version, 1);
      assert.equal(current.sourceText, source);
      assert.equal(await count(), 1);
      const stored = await fs.getDocFromServer(episodeRef(database, A.uid, id));
      assert.deepEqual(decodeEpisode(stored.data()!, id), current);
    },
    true,
  );
  const bId = ownedId(B);
  await test(
    "Independent SDK creates and reads its own account fixture",
    async () => {
      await ownRawCreate(B, bId);
      const r = await fs.getDocFromServer(episodeRef(B.db, B.uid, bId));
      assert.equal(decodeEpisode(r.data()!, bId).sourceText, source);
      assert.equal(await count(B), 1);
    },
    true,
  );
  await test("Import replay uses the same record and does not increment quota", async () => {
    const r = await post(id);
    assert.equal(r.episode.version, current.version);
    assert.equal(await count(), 1);
    const list = await api<{ episodes: { id: string }[] }>("/api/episodes");
    assert.deepEqual(
      list.episodes.map((e: { id: string }) => e.id),
      [id],
    );
  });
  await test("Same import ID cannot be reused for different notes", async () => {
    await rejected(() =>
      post(id, { ...input, sourceText: source + " Different input." }),
    );
    assert.equal(
      (await api<{ episode: Episode }>(endpoint(id))).episode.sourceText,
      source,
    );
    assert.equal(await count(), 1);
  });
  const follow = current.loops.find(
    (l: CareLoop) => l.category === "follow_up",
  );
  assert.ok(follow, "Synthetic fixture needs an extracted follow-up");
  const confirm = {
    type: "confirm" as const,
    loopId: follow.id,
    title: follow.title,
    owner: "Synthetic tracker",
    dueDate: "2026-09-08",
    dueEnd: "2026-09-08",
  };
  await test(
    "Adapter update persists user-confirmed command and immutable source",
    async () => {
      current = (await patch(id, 1, confirm)).episode;
      assert.equal(current.version, 2);
      assert.equal(
        current.loops.find((l: CareLoop) => l.id === follow.id)!.status,
        "open",
      );
      assert.equal(current.sourceText, source);
    },
    true,
  );
  await test("Lost-success replay returns committed command without duplicate history", async () => {
    const eventCount = current.events.length;
    const replay = (await patch(id, 1, confirm)).episode;
    assert.equal(replay.version, 2);
    assert.equal(replay.events.length, eventCount);
  });
  await test("Different stale-version command reports ConflictError with latest record", async () => {
    await rejected(
      () =>
        patch(id, 1, {
          ...confirm,
          type: "update",
          title: "Synthetic revised follow-up",
        }),
      (e: unknown) => e instanceof ConflictError && e.latest.version === 2,
    );
  });
  await test(
    "Fresh SDK sign-in reloads the same server record across client instances",
    async () => {
      await authSDK.signInWithEmailAndPassword(
        reload.auth,
        A.email,
        A.password,
      );
      const stored = await fs.getDocFromServer(
        episodeRef(reload.db, A.uid, id),
      );
      assert.deepEqual(decodeEpisode(stored.data()!, id), current);
    },
    true,
  );
  await test("Independent tab transaction advances state and adapter detects stale version", async () => {
    const ref = episodeRef(reload.db, A.uid, id),
      old = current.version;
    await fs.runTransaction(reload.db, async (tx) => {
      const s = await tx.get(ref),
        previous = decodeEpisode(s.data()!, id);
      const next = applyCommand(
        previous,
        {
          type: "status",
          loopId: follow.id,
          status: "waiting",
          note: "Synthetic independent-client update",
        },
        "Synthetic tester",
      );
      tx.update(ref, {
        state: encodeEpisode(next).state,
        version: next.version,
        updatedAt: fs.serverTimestamp(),
        lastMutationId: randomUUID(),
      });
    });
    await rejected(
      () => patch(id, old, { ...confirm, type: "update" }),
      (e: unknown) =>
        e instanceof ConflictError && e.latest.version === old + 1,
    );
    current = (await api<{ episode: Episode }>(endpoint(id))).episode;
  });
  await test("Concurrent same-version commands yield one commit and one conflict", async () => {
    const version = current.version;
    const outcomes = await Promise.allSettled([
      patch(id, version, {
        ...confirm,
        type: "update",
        title: "Synthetic concurrent edit one",
      }),
      patch(id, version, {
        ...confirm,
        type: "update",
        title: "Synthetic concurrent edit two",
      }),
    ]);
    const after = (await api<{ episode: Episode }>(endpoint(id))).episode;
    const detail = {
      name: "concurrent-same-version-outcomes",
      requestedVersion: version,
      outcomes: outcomes.map((outcome) =>
        outcome.status === "fulfilled"
          ? {
              status: "fulfilled",
              version: outcome.value.episode.version,
              eventCount: outcome.value.episode.events.length,
            }
          : { status: "rejected", ...safeErrorMetadata(outcome.reason) },
      ),
      storedVersionAfter: after.version,
      storedEventCountAfter: after.events.length,
      sourceUnchanged: after.sourceText === source,
    };
    diagnostics.push(detail);
    console.log(JSON.stringify({ diagnostic: detail }));
    assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
    const failed = outcomes.find((r) => r.status === "rejected");
    assert.ok(
      failed &&
        failed.status === "rejected" &&
        failed.reason instanceof ConflictError,
    );
    current = after;
    assert.equal(current.version, version + 1);
  });

  await test("Signed-in account B cannot read account A episode", () =>
    denied(() => fs.getDocFromServer(episodeRef(B.db, A.uid, id))));
  await test("Signed-in account B cannot list account A episodes", () =>
    denied(() =>
      fs.getDocsFromServer(fs.collection(B.db, "users", A.uid, "episodes")),
    ));
  await test("Signed-in account B cannot read account A quota metadata", () =>
    denied(() => fs.getDocFromServer(metaRef(B.db, A.uid))));
  await test("Signed-in account B cannot update account A episode", () =>
    denied(() => updateRaw(B.db, A.uid, id, {})));
  await test("Signed-in account B cannot delete account A using a correctly coupled quota batch", async () => {
    const n = await count(),
      batch = fs.writeBatch(B.db);
    batch.delete(episodeRef(B.db, A.uid, id));
    batch.update(metaRef(B.db, A.uid), {
      count: n - 1,
      updatedAt: fs.serverTimestamp(),
      mutationId: id,
      mutationKind: "delete",
    });
    await denied(() => batch.commit());
  });
  await test("Signed-in account B cannot create an episode under account A", async () => {
    const foreign = ownedId(),
      n = await count(),
      batch = fs.writeBatch(B.db);
    batch.set(episodeRef(B.db, A.uid, foreign), encoded(foreign));
    batch.set(metaRef(B.db, A.uid), {
      count: n + 1,
      updatedAt: fs.serverTimestamp(),
      mutationId: foreign,
      mutationKind: "create",
    });
    await denied(() => batch.commit());
  });
  await test("Global users and episode collection-group queries are denied", async () => {
    await denied(() => fs.getDocsFromServer(fs.collection(B.db, "users")));
    await denied(() =>
      fs.getDocsFromServer(fs.collectionGroup(B.db, "episodes")),
    );
  });
  await test("Unauthenticated SDK cannot update or delete existing records", async () => {
    await denied(() => updateRaw(anonymous.db, A.uid, id, {}));
    const n = await count(),
      batch = fs.writeBatch(anonymous.db);
    batch.delete(episodeRef(anonymous.db, A.uid, id));
    batch.update(metaRef(anonymous.db, A.uid), {
      count: n - 1,
      updatedAt: fs.serverTimestamp(),
      mutationId: id,
      mutationKind: "delete",
    });
    await denied(() => batch.commit());
  });

  const guard = ownedId();
  await test("Create isolated rule-boundary fixture", () => post(guard), true);
  for (const [field, change] of [
    ["source", { source: "Altered synthetic source serialization".repeat(2) }],
    ["patientName", { patientName: "Different synthetic display name" }],
    ["documentTitle", { documentTitle: "Different synthetic title" }],
    ["createdAt", { createdAt: "2020-01-01T00:00:00.000Z" }],
  ] as const)
    await test(`Rules preserve immutable ${field}`, () =>
      denied(() => updateRaw(database, A.uid, guard, change)));
  await test("Rules preserve discharge date and sentence provenance inside immutable source", async () => {
    const s = await fs.getDocFromServer(episodeRef(database, A.uid, guard)),
      original = JSON.parse(s.data()!.source);
    await denied(() =>
      updateRaw(database, A.uid, guard, {
        source: JSON.stringify({ ...original, dischargeDate: "2026-09-02" }),
      }),
    );
    await denied(() =>
      updateRaw(database, A.uid, guard, {
        source: JSON.stringify({ ...original, sentences: [] }),
      }),
    );
  });
  for (const version of [1, 3, 1.5, 1002])
    await test(`Rules reject invalid next version ${version}`, () =>
      denied(() => updateRaw(database, A.uid, guard, { version })));
  for (const [name, changes] of [
    ["non-string state", { state: { malformed: true } }],
    ["missing-size state", { state: "" }],
    ["oversized state", { state: "x".repeat(900001) }],
    ["unexpected field", { unexpected: "synthetic" }],
    ["empty mutation identifier", { lastMutationId: "" }],
    [
      "client timestamp",
      { updatedAt: fs.Timestamp.fromDate(new Date("2000-01-01T00:00:00Z")) },
    ],
  ] as const)
    await test(`Rules reject ${name}`, () =>
      denied(() => updateRaw(database, A.uid, guard, changes)));
  await test("Adapter rejects malformed command and surplus trust fields before writing", async () => {
    const before = (await api<{ episode: Episode }>(endpoint(guard))).episode
      .version;
    await rejected(() =>
      patch(guard, before, {
        type: "close",
        loopId: "invented",
        note: "Synthetic invalid command",
        date: "2026-09-01",
        reviewedBy: "",
        verified: true,
      }),
    );
    assert.equal(
      (await api<{ episode: Episode }>(endpoint(guard))).episode.version,
      before,
    );
  });

  await test("Episode creation without matching quota transaction is denied", async () => {
    const extra = ownedId();
    await denied(() =>
      fs.setDoc(episodeRef(database, A.uid, extra), encoded(extra)),
    );
  });
  await test("Episode deletion without matching quota transaction is denied", () =>
    denied(() => fs.deleteDoc(episodeRef(database, A.uid, guard))));
  await test("Standalone quota increment cannot invent an episode", async () => {
    const n = await count();
    await denied(() =>
      fs.updateDoc(metaRef(database, A.uid), {
        count: n + 1,
        updatedAt: fs.serverTimestamp(),
        mutationId: randomUUID(),
        mutationKind: "create",
      }),
    );
  });
  await test("Standalone quota decrement cannot hide an existing episode", async () => {
    const n = await count();
    await denied(() =>
      fs.updateDoc(metaRef(database, A.uid), {
        count: n - 1,
        updatedAt: fs.serverTimestamp(),
        mutationId: guard,
        mutationKind: "delete",
      }),
    );
  });
  await test("Quota increment must match the exact created episode identifier", async () => {
    const extra = ownedId();
    await denied(() =>
      ownRawCreate(A, extra, undefined, (meta) => ({
        ...meta,
        mutationId: randomUUID(),
      })),
    );
  });
  await test("Quota increments by one for a single created episode", async () => {
    const extra = ownedId();
    await denied(() =>
      ownRawCreate(A, extra, undefined, (meta) => ({
        ...meta,
        count: meta.count + 1,
      })),
    );
  });
  await test("Two creates cannot share one quota increment", async () => {
    const one = ownedId(),
      two = ownedId(),
      n = await count(),
      batch = fs.writeBatch(database);
    batch.set(episodeRef(database, A.uid, one), encoded(one));
    batch.set(episodeRef(database, A.uid, two), encoded(two));
    batch.set(metaRef(database, A.uid), {
      count: n + 1,
      updatedAt: fs.serverTimestamp(),
      mutationId: one,
      mutationKind: "create",
    });
    await denied(() => batch.commit());
  });
  await test("Quota count outside its upper bound is denied", async () => {
    const extra = ownedId();
    await denied(() =>
      ownRawCreate(A, extra, undefined, (meta) => ({ ...meta, count: 101 })),
    );
  });
  await test("Malformed record cannot be bootstrapped through a valid quota transaction", async () => {
    const extra = ownedId();
    await denied(() =>
      ownRawCreate(A, extra, (value) => ({ ...value, source: 9 })),
    );
  });
  await test("Oversized source cannot be bootstrapped through a valid quota transaction", async () => {
    const extra = ownedId();
    await denied(() =>
      ownRawCreate(A, extra, (value) => ({
        ...value,
        source: "x".repeat(900001),
      })),
    );
  });

  await test("Demo copy preserves edited loops and history while becoming a new private record", async () => {
    const original = analyzeDocument(input, `demo-${runId}`);
    const l = original.loops.find((l: CareLoop) => l.category === "follow_up");
    assert.ok(l);
    const edited = applyCommand(
      original,
      { ...confirm, loopId: l.id, title: "Synthetic edited demo" },
      "Synthetic demo actor",
    );
    const n = await count(),
      copy = await saveDemoCopy(edited);
    A.ids.add(copy.id);
    assert.notEqual(copy.id, edited.id);
    assert.equal(copy.version, 1);
    assert.deepEqual(copy.loops, edited.loops);
    assert.deepEqual(copy.events, edited.events);
    const duplicate = await saveDemoCopy(edited);
    A.ids.add(duplicate.id);
    assert.equal(duplicate.id, copy.id);
    assert.equal(await count(), n + 1);
    const loaded = (await api<{ episode: Episode }>(endpoint(copy.id))).episode;
    assert.deepEqual(loaded.loops, edited.loops);
  });

  const corrupt = ownedId();
  await test(
    "Create isolated malformed-storage recovery fixture",
    () => post(corrupt),
    true,
  );
  await test("Opaque mutable JSON is user-owned data; decoder rejects corrupted serialization", async () => {
    await updateRaw(database, A.uid, corrupt, {
      state: "This deliberately is not valid JSON.",
    });
    await rejected(() => api(endpoint(corrupt)));
    observations.push(
      "Rules enforce ownership, metadata, size and version. They do not parse mutable JSON or attest clinical state. Decoder rejected an owner-corrupted record.",
    );
  });
  await test("Owner can delete a malformed record using its valid outer version and recover quota", async () => {
    const s = await fs.getDocFromServer(episodeRef(database, A.uid, corrupt)),
      n = await count();
    await remove(corrupt, s.data()!.version);
    assert.equal(
      (
        await fs.getDocFromServer(episodeRef(database, A.uid, corrupt))
      ).exists(),
      false,
    );
    assert.equal(await count(), n - 1);
  });

  if (args.has("--quota-cap")) {
    await test("Actual 100-space quota rejects the 101st create without changing count", async () => {
      while ((await count()) < 100) await post(ownedId());
      const extra = ownedId();
      await rejected(() => post(extra));
      assert.equal(await count(), 100);
      assert.equal(
        (
          await fs.getDocFromServer(episodeRef(database, A.uid, extra))
        ).exists(),
        false,
      );
    });
  } else
    observations.push(
      "Default run tests quota transaction coupling and invalid bounds; it does not create 100 spaces. Use --quota-cap for actual saturation.",
    );

  await test("Stale delete refuses to remove a newer record", async () => {
    let outcome: unknown;
    try {
      await remove(id, 1);
    } catch (error) {
      outcome = error;
    }
    const detail = {
      name: "stale-delete-outcome",
      requestedVersion: 1,
      ...(outcome
        ? safeErrorMetadata(outcome)
        : { category: "unexpected-success" }),
    };
    diagnostics.push(detail);
    console.log(JSON.stringify({ diagnostic: detail }));
    assert.ok(outcome instanceof ConflictError);
    assert.equal(
      (await fs.getDocFromServer(episodeRef(database, A.uid, id))).exists(),
      true,
    );
  });
  await test("Valid delete and repeated delete are idempotent with one quota decrement", async () => {
    const version = (await api<{ episode: Episode }>(endpoint(id))).episode
        .version,
      n = await count();
    await remove(id, version);
    await remove(id, version);
    assert.equal(await count(), n - 1);
    assert.equal(
      (await fs.getDocFromServer(episodeRef(database, A.uid, id))).exists(),
      false,
    );
  });
  await test("Sign-out blocks adapter access and server reads despite prior memory cache", async () => {
    await authSDK.signOut(auth);
    assert.equal(auth.currentUser, null);
    await rejected(() => api("/api/episodes"));
    await denied(() => fs.getDocFromServer(episodeRef(database, A.uid, guard)));
  });
} catch (e) {
  fatal = true;
  log({
    name: "Remaining integration steps aborted after prerequisite failure",
    status: "fail",
    code: code(e),
  });
} finally {
  // Cleanup only the two accounts generated here and the IDs tracked here.
  // Never enumerate or delete pre-existing accounts or records. Enumeration below is
  // limited to our freshly created UIDs, and only recovers this fixture's metadata.
  await authSDK.signOut(reload.auth).catch(() => {});
  for (const account of accounts) {
    if (!account.uid) {
      if (!account.signupAttempted) continue;
      // A sign-up response could be lost after the backend created this exact
      // generated identity. Try only its in-memory credentials before concluding.
      try {
        const recovered = await authSDK.signInWithEmailAndPassword(
          account.auth,
          account.email,
          account.password,
        );
        account.uid = recovered.user.uid;
      } catch (e) {
        if (
          [
            "auth/invalid-credential",
            "auth/user-not-found",
            "auth/operation-not-allowed",
            "auth/admin-restricted-operation",
          ].includes(code(e))
        )
          cleanup.push({
            account: account.key,
            status: "no-generated-account-recovered",
          });
        else
          cleanup.push({
            account: account.key,
            status: "cleanup-error",
            code: code(e),
          });
        continue;
      }
    }
    let clean = true;
    const remaining: string[] = [];
    try {
      if (account.auth.currentUser?.uid !== account.uid)
        await authSDK.signInWithEmailAndPassword(
          account.auth,
          account.email,
          account.password,
        );
      // If a demo-copy response was lost after commit, its generated ID may not have
      // reached the runner. Recover only matching fixtures in this generated account.
      const ownFixtures = await fs.getDocsFromServer(
        fs.collection(account.db, "users", account.uid, "episodes"),
      );
      for (const item of ownFixtures.docs)
        if (
          item.data().patientName === input.patientName &&
          item.data().documentTitle === input.documentTitle
        )
          account.ids.add(item.id);
      for (const id of account.ids) {
        try {
          await rawDelete(account, id);
        } catch {
          clean = false;
          remaining.push(id);
        }
      }
      if ((await count(account)) !== 0) clean = false;
      const row = {
        account: account.key,
        status: clean
          ? "fixtures-removed-zero-meta-retained"
          : "fixture-cleanup-incomplete",
        ...(clean ? {} : { uid: account.uid, remainingFixtures: remaining }),
      };
      cleanup.push(row);
      // A harmless zero-count metadata document may remain because deletion is denied by the rules.
      await authSDK.signInWithEmailAndPassword(
        account.auth,
        account.email,
        account.password,
      );
      assert.equal(account.auth.currentUser?.uid, account.uid);
      await authSDK.deleteUser(account.auth.currentUser!);
      cleanup.push({
        account: account.key,
        status: "generated-auth-user-deleted",
      });
    } catch (e) {
      cleanup.push({
        account: account.key,
        status: "cleanup-error",
        code: code(e),
        uid: account.uid,
        remainingFixtures: [...account.ids],
      });
    }
  }
  for (const client of [
    { app: firebaseApp, auth, db: database },
    secondary,
    anonymous,
    reload,
  ]) {
    await authSDK.signOut(client.auth).catch(() => {});
    await fs.terminate(client.db).catch(() => {});
    await appSDK.deleteApp(client.app).catch(() => {});
  }
  const hashes = Object.fromEntries(
    [
      "firebase/store.ts",
      "firebase/client.ts",
      "firebase/firestore.rules",
      "lib/snapshot.ts",
      "lib/commands.ts",
      "lib/exports.ts",
    ].map((name) => [
      name,
      createHash("sha256")
        .update(readFileSync(resolve(checkout, name)))
        .digest("hex"),
    ]),
  );
  const failed = results.filter((r) => r.status === "fail").length;
  const cleanupFailed = cleanup.some((r) =>
    ["cleanup-error", "fixture-cleanup-incomplete"].includes(r.status),
  );
  writeFileSync(
    output,
    JSON.stringify(
      {
        runId,
        checkedAt: new Date().toISOString(),
        projectId: config.projectId,
        environment: emulator ? "local-emulators" : "deployed-firebase",
        scope:
          "Firebase Auth and Firestore plus the app adapter. No browser interaction. User-reported transitions are client-validated, not clinical assertions enforced by rules.",
        passed: results.length - failed,
        failed,
        fatal,
        cleanupFailed,
        tests: results,
        diagnostics,
        cleanup,
        observations,
        hashes,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      summary: {
        passed: results.length - failed,
        failed,
        fatal,
        cleanupFailed,
      },
      report: output,
    }),
  );
  process.exitCode = failed || fatal || cleanupFailed ? 1 : 0;
}
