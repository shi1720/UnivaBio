import { z } from "zod";
import { isISODate } from "./dates";
import type { ActionCommand, CareLoop, Episode } from "./types";
export const dateSchema = z
  .string()
  .refine(isISODate, "Use a valid calendar date (YYYY-MM-DD).");
const short = z.string().trim().min(1).max(160);
export const inputSchema = z
  .object({
    patientName: short.max(80),
    documentTitle: short,
    dischargeDate: dateSchema,
    sourceText: z
      .string()
      .trim()
      .min(20, "Add at least 20 characters of instructions.")
      .max(40000, "Keep the source under 40,000 characters."),
  })
  .strict();
const edit = {
  loopId: short,
  title: short,
  owner: z
    .string()
    .trim()
    .min(1, "Name the person tracking this follow-up.")
    .max(100),
  dueDate: dateSchema.nullable(),
  dueEnd: dateSchema.nullable(),
};
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("confirm"), ...edit }).strict(),
  z.object({ type: z.literal("update"), ...edit }).strict(),
  z
    .object({
      type: z.literal("status"),
      loopId: short,
      status: z.enum(["open", "waiting", "received"]),
      note: z.string().trim().min(3).max(1000),
    })
    .strict(),
  z
    .object({
      type: z.literal("close"),
      loopId: short,
      note: z
        .string()
        .trim()
        .min(
          10,
          "Add a short record of what happened (at least 10 characters).",
        )
        .max(1500),
      reviewedBy: z.string().trim().max(100),
      date: dateSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("dismiss"),
      loopId: short,
      note: z.string().trim().min(5).max(1000),
    })
    .strict(),
  z
    .object({
      type: z.literal("reopen"),
      loopId: short,
      note: z.string().trim().min(5).max(1000),
    })
    .strict(),
  z
    .object({
      type: z.literal("manual"),
      sentenceId: short,
      title: short,
      category: z.enum(["follow_up", "pending_result"]),
    })
    .strict(),
]);
export function applyCommand(
  original: Episode,
  raw: ActionCommand,
  actor: string,
  now = new Date().toISOString(),
): Episode {
  const command = commandSchema.parse(raw);
  const episode = structuredClone(original);
  const kind: string = command.type;
  let detail = "",
    actionId: string | null = null;
  if (command.type === "manual") {
    const sentence = episode.sentences.find((s) => s.id === command.sentenceId);
    if (!sentence) throw Error("The source sentence no longer exists.");
    if (episode.loops.length >= 100)
      throw Error("This care space already has 100 follow-ups.");
    const loop: CareLoop = {
      id: crypto.randomUUID(),
      title: command.title,
      category: command.category,
      sourceId: sentence.id,
      sourceQuote: sentence.text,
      sourceStart: sentence.start,
      sourceEnd: sentence.end,
      dateText: "Added by a person; confirm timing",
      dueDate: null,
      dueEnd: null,
      dateKind: "missing",
      documentedOwner: "",
      owner: "",
      status: "suggested",
      flags: ["Manually added from the source. Confirm the details."],
      questions: ["Who owns this follow-up, and when should it happen?"],
      closure: null,
    };
    episode.loops.push(loop);
    actionId = loop.id;
    detail = `Added a candidate from source sentence ${sentence.id}: ${command.title}`;
  } else {
    const loop = episode.loops.find((l) => l.id === command.loopId);
    if (!loop) throw Error("The follow-up no longer exists.");
    actionId = loop.id;
    if (command.type === "confirm" || command.type === "update") {
      if (command.type === "confirm" && loop.status !== "suggested")
        throw Error("This follow-up has already been reviewed.");
      if (
        command.type === "update" &&
        ["closed", "dismissed", "suggested"].includes(loop.status)
      )
        throw Error("Confirm or reopen this follow-up before editing.");
      if (command.dueDate && !command.dueEnd) command.dueEnd = command.dueDate;
      if (!command.dueDate && command.dueEnd)
        throw Error("Choose a start date before choosing an end date.");
      if (command.dueDate && command.dueEnd && command.dueEnd < command.dueDate)
        throw Error("The end date must be on or after the start date.");
      const previous = {
        title: loop.title,
        owner: loop.owner,
        dueDate: loop.dueDate,
        dueEnd: loop.dueEnd,
      };
      Object.assign(loop, {
        title: command.title,
        owner: command.owner,
        dueDate: command.dueDate,
        dueEnd: command.dueEnd,
      });
      if (command.type === "confirm") loop.status = "open";
      detail = `${command.type === "confirm" ? "Confirmed against source" : "Updated"}; tracking person: ${loop.owner}; date: ${loop.dueDate ?? "unresolved"}${loop.dueEnd && loop.dueEnd !== loop.dueDate ? " to " + loop.dueEnd : ""}. Previous details: ${JSON.stringify(previous)}`;
    } else if (command.type === "status") {
      if (["suggested", "closed", "dismissed"].includes(loop.status))
        throw Error("Confirm or reopen this follow-up first.");
      if (command.status === "received" && loop.category !== "pending_result")
        throw Error("Only a pending result can be marked received.");
      loop.status = command.status;
      detail = `${command.status === "received" ? "Result received; clinical review still required" : command.status === "waiting" ? "Waiting for a reply" : "Active again"}. ${command.note}`;
    } else if (command.type === "close") {
      if (
        ["suggested", "closed", "dismissed"].includes(loop.status) ||
        !loop.owner
      )
        throw Error(
          "Confirm the follow-up and its tracking person before closing it.",
        );
      if (
        loop.category === "pending_result" &&
        (loop.status !== "received" || command.reviewedBy.length < 2)
      )
        throw Error(
          "Record the result as received and name the clinician who reviewed it before closing.",
        );
      if (command.date < episode.dischargeDate)
        throw Error("Completion cannot be recorded before this discharge.");
      const latestLocalDay = new Date(Date.parse(now) + 14 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      if (command.date > latestLocalDay)
        throw Error("A completion date cannot be in the future.");
      loop.status = "closed";
      loop.closure = {
        note: command.note,
        reviewedBy: command.reviewedBy,
        date: command.date,
        reporter: actor,
      };
      detail = `Reported completed on ${command.date}. ${command.note}${command.reviewedBy ? " Reviewed with " + command.reviewedBy + "." : ""} This is a user-reported record, not independently verified.`;
    } else if (command.type === "dismiss") {
      if (loop.status !== "suggested")
        throw Error("Only an unconfirmed suggestion can be dismissed.");
      loop.status = "dismissed";
      detail = `Suggestion dismissed: ${command.note}`;
    } else if (command.type === "reopen") {
      if (loop.status !== "closed" && loop.status !== "dismissed")
        throw Error("This follow-up is already open.");
      const dismissed = loop.status === "dismissed";
      loop.status = dismissed ? "suggested" : "open";
      loop.closure = null;
      detail = `Reopened: ${command.note}`;
    }
  }
  if (episode.events.length >= 1000)
    throw Error(
      "This care space has reached its history limit. Export the record before creating a new care space.",
    );
  episode.events.push({
    id: crypto.randomUUID(),
    at: now,
    actor,
    actionId,
    kind,
    detail,
  });
  episode.version++;
  episode.updatedAt = now;
  if (new TextEncoder().encode(JSON.stringify(episode)).length > 900000)
    throw Error(
      "This care space is too large for another update. Export it and start a new care space.",
    );
  return episode;
}
