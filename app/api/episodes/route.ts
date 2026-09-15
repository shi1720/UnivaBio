import { z } from "zod";
import {
  identity,
  db,
  json,
  failure,
  readJSON,
  ApiError,
} from "../../../lib/server";
import { inputSchema } from "../../../lib/commands";
import { analyzeDocument } from "../../../lib/engine";
import type { Episode } from "../../../lib/types";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await identity();
    const result = await db()
      .prepare(
        "SELECT id, patient_name AS patientName, document_title AS documentTitle, updated_at AS updatedAt FROM episodes WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 100",
      )
      .bind(user.userId)
      .all();
    return json({ episodes: result.results });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await identity(),
      input = inputSchema.parse(await readJSON(request));
    const id = z
      .string()
      .uuid("The import request identifier is missing or invalid.")
      .parse(request.headers.get("Idempotency-Key"));
    const previous = await db()
      .prepare("SELECT state FROM episodes WHERE id = ? AND owner_id = ?")
      .bind(id, user.userId)
      .first<{ state: string }>();
    function existing(state: string) {
      const episode = JSON.parse(state) as Episode;
      if (
        episode.patientName !== input.patientName ||
        episode.documentTitle !== input.documentTitle ||
        episode.dischargeDate !== input.dischargeDate ||
        episode.sourceText !== input.sourceText.replace(/\r\n?/g, "\n")
      )
        throw new ApiError(
          409,
          "This import identifier was already used for different notes. Reopen the import form and try again.",
        );
      return json({ episode, replayed: true });
    }
    if (previous) return existing(previous.state);
    const episode = analyzeDocument(input, id);
    const result = await db()
      .prepare(
        "INSERT INTO episodes (id, owner_id, patient_name, document_title, state, version, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM episodes WHERE owner_id = ?) < 100 ON CONFLICT(id) DO NOTHING",
      )
      .bind(
        episode.id,
        user.userId,
        episode.patientName,
        episode.documentTitle,
        JSON.stringify(episode),
        episode.version,
        episode.createdAt,
        episode.updatedAt,
        user.userId,
      )
      .run();
    if (result.meta.changes === 0) {
      const replay = await db()
        .prepare("SELECT state FROM episodes WHERE id = ? AND owner_id = ?")
        .bind(id, user.userId)
        .first<{ state: string }>();
      if (replay) return existing(replay.state);
      throw new ApiError(
        409,
        "You have reached the limit of 100 care spaces. Export and remove an older space first.",
      );
    }
    return json({ episode }, 201);
  } catch (e) {
    return failure(e);
  }
}
