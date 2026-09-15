import { identity, json, failure, readJSON } from "../../../lib/server";
import { inputSchema } from "../../../lib/commands";
import { analyzeDocument } from "../../../lib/engine";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    await identity();
    const input = inputSchema.parse(await readJSON(request));
    return json({ episode: analyzeDocument(input) });
  } catch (e) {
    return failure(e);
  }
}
