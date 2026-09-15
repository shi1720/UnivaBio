import { z } from "zod";
import {
  identity,
  db,
  json,
  failure,
  readJSON,
  loadEpisode,
  ApiError,
} from "../../../../lib/server";
import { applyCommand, commandSchema } from "../../../../lib/commands";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const user = await identity(),
      { id } = await context.params;
    return json({ episode: await loadEpisode(id, user.userId) });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await identity(),
      { id } = await context.params;
    const input = z
      .object({ version: z.number().int().positive(), command: commandSchema })
      .strict()
      .parse(await readJSON(request));
    const current = await loadEpisode(id, user.userId);
    if (current.version !== input.version)
      throw new ApiError(
        409,
        "This care space changed in another window. Reload it before trying again.",
      );
    let updated;
    try {
      updated = applyCommand(current, input.command, user.displayName);
    } catch (e) {
      throw new ApiError(
        400,
        e instanceof Error ? e.message : "Check the action details.",
      );
    }
    const result = await db()
      .prepare(
        "UPDATE episodes SET state = ?, version = ?, updated_at = ? WHERE id = ? AND owner_id = ? AND version = ?",
      )
      .bind(
        JSON.stringify(updated),
        updated.version,
        updated.updatedAt,
        id,
        user.userId,
        input.version,
      )
      .run();
    if (result.meta.changes !== 1)
      throw new ApiError(
        409,
        "Another update arrived first. Reload this care space before trying again.",
      );
    return json({ episode: updated });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await identity(),
      { id } = await context.params;
    const input = z
      .object({
        confirmation: z.literal("DELETE"),
        version: z.number().int().positive(),
      })
      .strict()
      .parse(await readJSON(request));
    const result = await db()
      .prepare(
        "DELETE FROM episodes WHERE id = ? AND owner_id = ? AND version = ?",
      )
      .bind(id, user.userId, input.version)
      .run();
    if (result.meta.changes !== 1)
      throw new ApiError(
        409,
        "The care space changed or no longer exists. Reload before deleting.",
      );
    return json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
