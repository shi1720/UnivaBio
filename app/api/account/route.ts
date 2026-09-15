import { identity, json, failure } from "../../../lib/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await identity();
    return json({ user: { displayName: user.displayName, email: user.email } });
  } catch (e) {
    return failure(e);
  }
}
