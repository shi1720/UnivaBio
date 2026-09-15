import { requireChatGPTUser } from "../chatgpt-auth";
import Looplight from "../looplight";
export const dynamic = "force-dynamic";
export default async function CareSpace() {
  const user = await requireChatGPTUser("/space");
  return (
    <Looplight
      mode="saved"
      user={{ displayName: user.displayName, email: user.email }}
    />
  );
}
