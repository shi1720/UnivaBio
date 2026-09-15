import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, database } from "./client";
import { inputSchema, commandSchema, applyCommand } from "../lib/commands";
import { analyzeDocument } from "../lib/engine";
import { encodeEpisode, decodeEpisode, validateEpisode } from "../lib/snapshot";
import type { Episode } from "../lib/types";
import type { ApiClient } from "../app/looplight";
import { z } from "zod";

export class ConflictError extends Error {
  constructor(public latest: Episode) {
    super(
      "This care space changed in another window. The latest saved version is now shown. Your unfinished edits were kept; check them before saving again.",
    );
  }
}
function userId() {
  const user = auth.currentUser;
  if (!user) throw Error("Sign in to open your saved care spaces.");
  return user.uid;
}
const mutations = new Map<string, string>();
function mutationId(fingerprint: string) {
  let id = mutations.get(fingerprint);
  if (!id) {
    id = crypto.randomUUID();
    mutations.set(fingerprint, id);
  }
  if (mutations.size > 200) mutations.delete(mutations.keys().next().value!);
  return id;
}
function friendly(error: unknown): Error {
  if (error instanceof FirebaseError) {
    if (
      [
        "unavailable",
        "deadline-exceeded",
        "aborted",
        "network-request-failed",
      ].some((code) => error.code.includes(code))
    )
      return Error(
        "Connection interrupted. Your input is still here. Reconnect and retry; the app will check whether the previous save completed.",
      );
    if (error.code.includes("permission-denied"))
      return Error(
        "This care space could not be accessed. Check that you are signed into its account, then retry.",
      );
    if (error.code.includes("resource-exhausted"))
      return Error(
        "The service has reached its current usage limit. Your input is still here; please try again later.",
      );
  }
  return error instanceof Error
    ? error
    : Error("The change could not be saved. Your input is still here.");
}
async function create(e: Episode) {
  const uid = userId();
  const ref = doc(database, "users", uid, "episodes", e.id),
    meta = doc(database, "users", uid);
  const encoded = encodeEpisode(e);
  return runTransaction(database, async (tx) => {
    const [existing, account] = await Promise.all([tx.get(ref), tx.get(meta)]);
    if (existing.exists()) {
      const previous = decodeEpisode(existing.data(), e.id);
      if (
        previous.patientName !== e.patientName ||
        previous.documentTitle !== e.documentTitle ||
        previous.sourceText !== e.sourceText ||
        previous.dischargeDate !== e.dischargeDate
      )
        throw Error(
          "This import identifier was already used for different notes. Reopen the import form and try again.",
        );
      return previous;
    }
    const count = account.exists() ? (account.data().count as number) : 0;
    if (!Number.isInteger(count) || count >= 100)
      throw Error(
        "You have reached 100 care spaces. Export and delete an older space before creating another.",
      );
    tx.set(ref, {
      ...encoded,
      updatedAt: serverTimestamp(),
      lastMutationId: e.id,
    });
    tx.set(meta, {
      count: count + 1,
      updatedAt: serverTimestamp(),
      mutationId: e.id,
      mutationKind: "create",
    });
    return e;
  });
}
export async function saveDemoCopy(original: Episode): Promise<Episode> {
  const uid = userId();
  const id = mutationId(`${uid}:copy:${original.id}:${original.version}`);
  const now = new Date().toISOString();
  const e = validateEpisode({
    ...structuredClone(original),
    id,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  try {
    return await create(e);
  } catch (e) {
    throw friendly(e);
  }
}
export const firebaseApi: ApiClient = async <T>(
  url: string,
  options?: RequestInit,
): Promise<T> => {
  try {
    const uid = userId();
    const path = url.split("?")[0];
    const method = options?.method ?? "GET";
    const payload: unknown = options?.body
      ? JSON.parse(String(options.body))
      : undefined;
    let result: unknown;
    if (path === "/api/account" && method === "GET") {
      result = {
        user: {
          displayName: auth.currentUser?.displayName || "Your account",
          email: auth.currentUser?.email ?? "",
        },
      };
    } else if (path === "/api/episodes" && method === "GET") {
      const records = await getDocsFromServer(
        query(
          collection(database, "users", uid, "episodes"),
          orderBy("updatedAt", "desc"),
          limit(100),
        ),
      );
      result = {
        episodes: records.docs.map((item) => ({
          id: item.id,
          patientName: item.data().patientName,
          documentTitle: item.data().documentTitle,
          version: item.data().version,
          updatedAt: item.data().updatedAt.toDate().toISOString(),
        })),
      };
    } else if (path === "/api/episodes" && method === "POST") {
      const input = inputSchema.parse(payload);
      const id = z
        .string()
        .uuid()
        .parse(new Headers(options?.headers).get("Idempotency-Key"));
      result = { episode: await create(analyzeDocument(input, id)) };
    } else {
      const match = /^\/api\/episodes\/([^/]+)$/.exec(path);
      if (!match) throw Error("This action is not supported.");
      const id = z.string().uuid().parse(decodeURIComponent(match[1]));
      const ref = doc(database, "users", uid, "episodes", id);
      if (method === "GET") {
        const snapshot = await getDocFromServer(ref);
        if (!snapshot.exists()) throw Error("This care space was not found.");
        result = { episode: decodeEpisode(snapshot.data(), id) };
      } else if (method === "PATCH") {
        const input = z
          .object({
            version: z.number().int().positive(),
            command: commandSchema,
          })
          .strict()
          .parse(payload);
        const requestId = mutationId(`${uid}:${id}:${JSON.stringify(input)}`);
        const actor = (
          auth.currentUser?.displayName ||
          "Account holder"
        ).slice(0, 200);
        result = {
          episode: await runTransaction(database, async (tx) => {
            const snapshot = await tx.get(ref);
            if (!snapshot.exists())
              throw Error("This care space was not found.");
            const current = decodeEpisode(snapshot.data(), id);
            if (snapshot.data().lastMutationId === requestId) return current;
            if (current.version !== input.version)
              throw new ConflictError(current);
            const next = applyCommand(current, input.command, actor);
            const encoded = encodeEpisode(next);
            if (encoded.source !== snapshot.data().source)
              throw Error(
                "The original source cannot be changed. Start a new care space for revised notes.",
              );
            tx.update(ref, {
              state: encoded.state,
              version: next.version,
              updatedAt: serverTimestamp(),
              lastMutationId: requestId,
            });
            return next;
          }).catch(async (error: unknown) => {
            // A racing version rule may reject a commit before the SDK can
            // retry its transaction. Read authoritative state once, without
            // resubmitting the user's now-stale command.
            if (!(error instanceof FirebaseError) ||
                !error.code.includes("permission-denied") ||
                auth.currentUser?.uid !== uid) throw error;
            let snapshot;
            try { snapshot = await getDocFromServer(ref); }
            catch { throw error; }
            if (!snapshot.exists() || auth.currentUser?.uid !== uid) throw error;
            const latest = decodeEpisode(snapshot.data(), id);
            if (snapshot.data().lastMutationId === requestId) return latest;
            if (latest.version !== input.version) throw new ConflictError(latest);
            throw error;
          }),
        };
      } else if (method === "DELETE") {
        const input = z
          .object({
            confirmation: z.literal("DELETE"),
            version: z.number().int().positive(),
          })
          .strict()
          .parse(payload);
        const meta = doc(database, "users", uid);
        await runTransaction(database, async (tx) => {
          const [snapshot, account] = await Promise.all([
            tx.get(ref),
            tx.get(meta),
          ]);
          if (!snapshot.exists()) return; // A repeated delete is already complete.
          // Owner deletion must also recover a record whose JSON is unreadable.
          // The rule-validated outer version still protects against stale deletes.
          if (snapshot.data().version !== input.version) {
            let latest: Episode;
            try { latest = decodeEpisode(snapshot.data(), id); }
            catch { throw Error("This care space changed. Refresh your saved spaces and check the latest version before deleting."); }
            throw new ConflictError(latest);
          }
          if (!account.exists() || account.data().count < 1)
            throw Error("The care-space count is inconsistent. Please retry.");
          tx.delete(ref);
          tx.update(meta, {
            count: account.data().count - 1,
            updatedAt: serverTimestamp(),
            mutationId: id,
            mutationKind: "delete",
          });
        });
        result = { deleted: true };
      } else throw Error("This action is not supported.");
    }
    if (auth.currentUser?.uid !== uid)
      throw Error("Your account changed. Open the care space again.");
    return result as T;
  } catch (error) {
    throw friendly(error);
  }
};
