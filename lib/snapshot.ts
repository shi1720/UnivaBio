import { z } from "zod";
import { dateSchema } from "./commands";
import type { Episode } from "./types";
const text = (limit: number) => z.string().max(limit);
const id = z.string().min(1).max(160);
const moment = z.string().datetime();
const sentenceSchema = z
  .object({
    id,
    text: text(40000),
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
    category: z.enum([
      "follow_up",
      "pending_result",
      "medication",
      "safety",
      "context",
      "unknown",
    ]),
    suggested: z.boolean(),
    reason: text(2000),
    modelScore: z.number().finite().min(0).max(1),
  })
  .strict();
const loopSchema = z
  .object({
    id,
    title: z.string().min(1).max(160),
    category: z.enum(["follow_up", "pending_result"]),
    sourceId: id,
    sourceQuote: text(40000),
    sourceStart: z.number().int().nonnegative(),
    sourceEnd: z.number().int().nonnegative(),
    dateText: text(40000),
    dueDate: dateSchema.nullable(),
    dueEnd: dateSchema.nullable(),
    dateKind: z.enum(["exact", "window", "missing", "ambiguous"]),
    documentedOwner: text(1000),
    owner: text(100),
    status: z.enum([
      "suggested",
      "open",
      "waiting",
      "received",
      "closed",
      "dismissed",
    ]),
    flags: z.array(text(2000)).max(30),
    questions: z.array(text(2000)).max(30),
    closure: z
      .object({
        note: text(1500),
        reviewedBy: text(100),
        date: dateSchema,
        reporter: text(200),
      })
      .strict()
      .nullable(),
  })
  .strict();
export const episodeSchema = z
  .object({
    id,
    patientName: z.string().min(1).max(80),
    documentTitle: z.string().min(1).max(160),
    dischargeDate: dateSchema,
    sourceText: z.string().min(20).max(40000),
    sentences: z.array(sentenceSchema).max(10000),
    loops: z.array(loopSchema).max(100),
    events: z
      .array(
        z
          .object({
            id,
            at: moment,
            actor: text(200),
            actionId: id.nullable(),
            kind: text(80),
            detail: text(10000),
          })
          .strict(),
      )
      .max(1000),
    version: z.number().int().positive().max(1001),
    createdAt: moment,
    updatedAt: moment,
    engine: text(80),
  })
  .strict();
export function validateEpisode(value: unknown): Episode {
  const e = episodeSchema.parse(value);
  if (new TextEncoder().encode(JSON.stringify(e)).length > 880000)
    throw Error(
      "This care space is too large to save. Export it and start a new one.",
    );
  if (
    new Set(e.sentences.map((s) => s.id)).size !== e.sentences.length ||
    new Set(e.loops.map((l) => l.id)).size !== e.loops.length
  )
    throw Error("This care space contains duplicate identifiers.");
  if (
    new Set(e.events.map((event) => event.id)).size !== e.events.length ||
    e.events.some(
      (event) =>
        event.actionId !== null &&
        !e.loops.some((loop) => loop.id === event.actionId),
    )
  )
    throw Error("The saved history contains invalid action references.");
  for (const s of e.sentences) {
    if (
      s.end <= s.start ||
      s.end > e.sourceText.length ||
      e.sourceText.slice(s.start, s.end) !== s.text
    )
      throw Error("A source segment does not match the original notes.");
  }
  for (const l of e.loops) {
    const s = e.sentences.find((s) => s.id === l.sourceId);
    if (
      !s ||
      l.sourceStart < s.start ||
      l.sourceEnd > s.end ||
      l.sourceEnd <= l.sourceStart ||
      e.sourceText.slice(l.sourceStart, l.sourceEnd) !== l.sourceQuote
    )
      throw Error("A follow-up does not match its original source.");
    if (
      (!l.dueDate && l.dueEnd) ||
      (l.dueDate && !l.dueEnd) ||
      (l.dueDate && l.dueEnd && l.dueEnd < l.dueDate)
    )
      throw Error("A saved date range is invalid.");
    if (l.status !== "closed" && l.closure)
      throw Error(
        "An open follow-up cannot contain an active completion record.",
      );
    if (
      l.status === "closed" &&
      (!l.closure ||
        !l.owner ||
        (l.category === "pending_result" && l.closure.reviewedBy.length < 2))
    )
      throw Error("A reported completion is missing its supporting details.");
  }
  return e;
}
export function encodeEpisode(value: Episode) {
  const e = validateEpisode(value);
  const {
    patientName,
    documentTitle,
    dischargeDate,
    sourceText,
    sentences,
    engine,
    ...mutable
  } = e;
  return {
    source: JSON.stringify({
      patientName,
      documentTitle,
      dischargeDate,
      sourceText,
      sentences,
      engine,
    }),
    state: JSON.stringify(mutable),
    version: e.version,
    patientName,
    documentTitle,
    createdAt: e.createdAt,
  };
}
function parseStored<T extends z.ZodTypeAny>(schema: T, text: string): z.infer<T> {
  try { return schema.parse(JSON.parse(text)); }
  catch {
    throw Error("This saved care space contains unreadable data. Refresh your saved spaces, or use the removal option shown beside a record that cannot open.");
  }
}
export function decodeEpisode(
  record: Record<string, unknown>,
  expectedId: string,
): Episode {
  if (
    typeof record.source !== "string" ||
    typeof record.state !== "string" ||
    new TextEncoder().encode(record.source + record.state).length > 900000
  )
    throw Error("The saved care space could not be read safely.");
  const immutableFields = {
    patientName: true,
    documentTitle: true,
    dischargeDate: true,
    sourceText: true,
    sentences: true,
    engine: true,
  } as const;
  const source = parseStored(episodeSchema.pick(immutableFields), record.source);
  const state = parseStored(episodeSchema.omit(immutableFields), record.state);
  if (
    !source ||
    typeof source !== "object" ||
    !state ||
    typeof state !== "object"
  )
    throw Error("The saved care space is not valid.");
  const e = validateEpisode({ ...state, ...source });
  if (
    e.id !== expectedId ||
    e.version !== record.version ||
    e.patientName !== record.patientName ||
    e.documentTitle !== record.documentTitle ||
    e.createdAt !== record.createdAt
  )
    throw Error("The saved care-space metadata is inconsistent.");
  return e;
}
