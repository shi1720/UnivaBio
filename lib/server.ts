import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../app/chatgpt-auth";
import type { Episode } from "./types";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function db(): D1Database {
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding)
    throw new ApiError(
      503,
      "Saved care spaces are temporarily unavailable. Your unsaved input is still here.",
    );
  return binding;
}
export async function identity() {
  const user = await getChatGPTUser();
  if (!user) throw new ApiError(401, "Sign in to use your saved care space.");
  return user;
}
export async function readJSON(request: Request): Promise<unknown> {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site")
    throw new ApiError(403, "Use Looplight directly to make this change.");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new ApiError(403, "The request origin could not be verified.");
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Send this request as JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "The request is empty.");
  let size = 0,
    text = "";
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 180000) {
      await reader.cancel();
      throw new ApiError(
        413,
        "The document is too large. Keep it under 40,000 characters.",
      );
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "The request could not be read.");
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    },
  });
}
export function failure(error: unknown) {
  if (error instanceof ApiError)
    return json({ error: error.message }, error.status);
  if (error && typeof error === "object" && "issues" in error)
    return json(
      {
        error:
          (error as { issues: { message: string }[] }).issues[0]?.message ??
          "Check the form values.",
      },
      400,
    );
  // No document, identity, or stack logging. Operational logs should contain only a coarse failure code.
  console.error("Looplight request failed: storage_or_internal_error");
  return json(
    {
      error:
        "We could not save that change. Your input has been kept. Please retry.",
    },
    503,
  );
}
export async function loadEpisode(id: string, ownerId: string) {
  const record = await db()
    .prepare(
      "SELECT state, version FROM episodes WHERE id = ? AND owner_id = ?",
    )
    .bind(id, ownerId)
    .first<{ state: string; version: number }>();
  if (!record) throw new ApiError(404, "This care space was not found.");
  return JSON.parse(record.state) as Episode;
}
