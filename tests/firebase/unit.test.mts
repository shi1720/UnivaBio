import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import type { Episode, CareLoop } from "../../lib/types";

const checkout = resolve(process.env.LOOPLIGHT_CHECKOUT || process.cwd());
const imp = (name: string) =>
  import(pathToFileURL(resolve(checkout, name)).href);
const { analyzeDocument } = (await imp(
  "lib/engine.ts",
)) as typeof import("../../lib/engine");
const { inputSchema, commandSchema, applyCommand, dateSchema } = (await imp(
  "lib/commands.ts",
)) as typeof import("../../lib/commands");
const { encodeEpisode, decodeEpisode, validateEpisode } = (await imp(
  "lib/snapshot.ts",
)) as typeof import("../../lib/snapshot");
const { briefText, calendarText } = (await imp(
  "lib/exports.ts",
)) as typeof import("../../lib/exports");

const input = {
  patientName: "Synthetic unit fixture",
  documentTitle: "Original synthetic notes",
  dischargeDate: "2026-09-01",
  sourceText:
    "FICTIONAL EXAMPLE\nFollow up with your primary care clinician in seven days. A fresh ferritin measurement should be obtained six weeks from discharge. The report is pending. Context: naïve café 🧩.",
};
const fixture = () => analyzeDocument(input, randomUUID());
function record(e = fixture()) {
  return {
    ...encodeEpisode(e),
    updatedAt: { toDate: () => new Date(e.updatedAt) },
    lastMutationId: e.id,
  };
}
function confirmed() {
  const e = fixture(),
    l = e.loops.find((l: CareLoop) => l.category === "follow_up");
  assert.ok(l, "fixture needs a detected follow-up");
  return applyCommand(
    e,
    {
      type: "confirm",
      loopId: l.id,
      title: l.title,
      owner: "Synthetic tracker",
      dueDate: "2026-09-08",
      dueEnd: "2026-09-08",
    },
    "Synthetic tester",
    "2026-09-15T12:00:00Z",
  );
}

test("initial schema trims display fields, rejects unexpected fields and respects text bounds", () => {
  const parsed = inputSchema.parse({
    ...input,
    patientName: "  Synthetic unit fixture  ",
    documentTitle: " Notes ",
  });
  assert.equal(parsed.patientName, input.patientName);
  assert.equal(parsed.documentTitle, "Notes");
  for (const bad of [
    { ...input, patientName: " " },
    { ...input, patientName: "x".repeat(81) },
    { ...input, sourceText: "x".repeat(19) },
    { ...input, sourceText: "x".repeat(40001) },
    { ...input, dischargeDate: "2026-02-30" },
    { ...input, ownerId: "invented" },
  ])
    assert.equal(inputSchema.safeParse(bad).success, false);
  assert.equal(
    inputSchema.safeParse({ ...input, sourceText: "x".repeat(40000) }).success,
    true,
  );
});

test("encoded snapshot round-trips immutable source and mutable command state exactly", () => {
  const e = confirmed(),
    saved = record(e),
    decoded = decodeEpisode(saved, e.id);
  assert.deepEqual(decoded, e);
  const source = JSON.parse(saved.source),
    state = JSON.parse(saved.state);
  assert.equal(source.sourceText, e.sourceText);
  assert.equal("sourceText" in state, false);
  assert.equal("loops" in source, false);
  assert.equal(state.loops[0].owner, e.loops[0].owner);
  for (const s of decoded.sentences)
    assert.equal(decoded.sourceText.slice(s.start, s.end), s.text);
});

test("decoder rejects mismatched outer identifiers, versions and immutable metadata", () => {
  const e = fixture(),
    saved = record(e);
  assert.throws(() => decodeEpisode(saved, randomUUID()));
  for (const [key, value] of Object.entries({
    version: 999,
    patientName: "other",
    documentTitle: "other",
    createdAt: "2020-01-01T00:00:00.000Z",
  }))
    assert.throws(() => decodeEpisode({ ...saved, [key]: value }, e.id), key);
});

test("decoder rejects malformed, oversized and non-object serialized input before accepting it", () => {
  const e = fixture(),
    saved = record(e);
  for (const source of [
    null,
    2,
    [],
    "{broken",
    "null",
    "false",
    "[]",
    "x".repeat(900001),
  ])
    assert.throws(() => decodeEpisode({ ...saved, source }, e.id));
  for (const state of [null, [], "{broken", "null", "true", "[]"])
    assert.throws(() => decodeEpisode({ ...saved, state }, e.id));
});

test("snapshot rejects forged source text and loop spans, including Unicode offset mistakes", () => {
  for (const mutate of [
    (e: Episode) => {
      e.sentences[0].text += " forged";
    },
    (e: Episode) => {
      e.sentences[0].start += 1;
    },
    (e: Episode) => {
      e.sentences[0].end = e.sourceText.length + 1;
    },
    (e: Episode) => {
      e.loops[0].sourceQuote = "Invented quotation";
    },
    (e: Episode) => {
      e.loops[0].sourceStart += 1;
    },
    (e: Episode) => {
      e.loops[0].sourceEnd = e.sourceText.length + 1;
    },
    (e: Episode) => {
      e.loops[0].sourceId = "nonexistent-source";
    },
  ]) {
    const e = fixture();
    mutate(e);
    assert.throws(() => validateEpisode(e));
  }
});

test("snapshot rejects duplicate sentence and loop identifiers and excessive array sizes", () => {
  let e = fixture();
  e.sentences.push({ ...e.sentences[0] });
  assert.throws(() => validateEpisode(e));
  e = fixture();
  e.loops.push({ ...e.loops[0] });
  assert.throws(() => validateEpisode(e));
  e = fixture();
  e.loops = Array.from({ length: 101 }, (_, i) => ({
    ...e.loops[0],
    id: `l-${i}`,
  }));
  assert.throws(() => validateEpisode(e));
  e = fixture();
  e.events = Array.from({ length: 1001 }, (_, i) => ({
    ...e.events[0],
    id: `e-${i}`,
  }));
  assert.throws(() => validateEpisode(e));
});

test("snapshot history has unique event IDs and references only retained loop IDs", () => {
  let e = fixture();
  e.events.push({ ...e.events[0] });
  assert.throws(() => validateEpisode(e));
  e = fixture();
  e.events[0].actionId = "missing-loop";
  assert.throws(() => validateEpisode(e));
});

test("snapshot rejects reverse date windows and unsupported completed records", () => {
  let e = confirmed();
  e.loops[0].dueEnd = "2026-09-01";
  assert.throws(() => validateEpisode(e));
  e = confirmed();
  e.loops[0].status = "closed";
  assert.throws(() => validateEpisode(e));
  e = confirmed();
  const pending = e.loops.find(
    (l: CareLoop) => l.category === "pending_result",
  );
  assert.ok(pending);
  pending.status = "closed";
  pending.owner = "Synthetic tracker";
  pending.closure = {
    note: "Synthetic reported completion",
    reviewedBy: "",
    date: "2026-09-08",
    reporter: "Synthetic tester",
  };
  assert.throws(() => validateEpisode(e));
});

test("snapshot rejects mutable/immutable field relocation or collision at the decoding boundary", () => {
  const e = fixture(),
    saved = record(e);
  // A decoder must validate the two partitions before merging them; merged validation alone loses conflicting fields.
  const source = JSON.parse(saved.source),
    state = JSON.parse(saved.state);
  assert.throws(() =>
    decodeEpisode(
      {
        ...saved,
        state: JSON.stringify({
          ...state,
          sourceText: "Contradictory mutable source text",
        }),
      },
      e.id,
    ),
  );
  assert.throws(() =>
    decodeEpisode(
      { ...saved, source: JSON.stringify({ ...source, loops: state.loops }) },
      e.id,
    ),
  );
  assert.throws(() =>
    decodeEpisode({ ...saved, source: "{}", state: JSON.stringify(e) }, e.id),
  );
});

test("snapshot rejects an unmatched start date that would silently disappear from calendar export", () => {
  const e = confirmed();
  e.loops[0].dueEnd = null;
  assert.throws(() => validateEpisode(e));
});

test("snapshot rejects stale closure payloads on active loops that briefs otherwise print as completed", () => {
  const e = confirmed();
  e.loops[0].closure = {
    note: "Synthetic stale completion",
    reviewedBy: "Synthetic team",
    date: "2026-09-08",
    reporter: "Synthetic tester",
  };
  assert.throws(() => validateEpisode(e));
});

test("snapshot size guard counts UTF-8 bytes so accepted snapshots fit the storage envelope", () => {
  const e = fixture();
  e.events = Array.from({ length: 70 }, (_, i) => ({
    id: `large-${i}`,
    at: "2026-09-15T12:00:00.000Z",
    actor: "Synthetic tester",
    actionId: null,
    kind: "synthetic-audit",
    detail: "é".repeat(10000),
  }));
  assert.ok(JSON.stringify(e).length < 880000);
  assert.ok(Buffer.byteLength(JSON.stringify(e), "utf8") > 1000000);
  assert.throws(() => validateEpisode(e));
});

test("text brief carries the exact omitted-action fixture into its source-review section", () => {
  const e = fixture(),
    quote =
      "A fresh ferritin measurement should be obtained six weeks from discharge.";
  assert.ok(e.sourceText.includes(quote));
  assert.equal(
    e.loops.some((l: CareLoop) => l.sourceQuote.includes(quote)),
    false,
    "fixture still needs to exercise an unproposed segment",
  );
  const brief = briefText(e);
  assert.ok(brief.includes("SOURCE CONTENT WITHOUT A LINKED FOLLOW-UP"));
  assert.ok(brief.includes(quote));
  assert.ok(brief.includes("may still contain important next steps"));
});

test("calendar export preserves UTC leap/year boundaries and excludes unconfirmed/closed loops", () => {
  const e = confirmed(),
    l = e.loops[0];
  l.dueDate = l.dueEnd = "2028-02-29";
  let cal = calendarText(e);
  assert.ok(cal.text.includes("DTSTART;VALUE=DATE:20280229"));
  assert.ok(cal.text.includes("DTEND;VALUE=DATE:20280301"));
  l.dueDate = l.dueEnd = "2026-12-31";
  cal = calendarText(e);
  assert.ok(cal.text.includes("DTEND;VALUE=DATE:20270101"));
  assert.equal(cal.count, 1);
  assert.equal(cal.text.includes(e.patientName), false);
  l.status = "closed";
  assert.equal(calendarText(e).count, 0);
});

test("maximum accepted calendar date can be exported without an unhandled range error", () => {
  const date = "9999-12-31";
  if (!dateSchema.safeParse(date).success) return; // Restricting accepted dates is a valid boundary fix.
  const e = confirmed();
  e.loops[0].dueDate = e.loops[0].dueEnd = date;
  assert.doesNotThrow(() => calendarText(e));
});

test("command validation still requires source confirmation and pending-result receipt/review", () => {
  const e = fixture(),
    pending = e.loops.find((l: CareLoop) => l.category === "pending_result");
  assert.ok(pending);
  assert.throws(() =>
    applyCommand(
      e,
      {
        type: "status",
        loopId: pending.id,
        status: "received",
        note: "Synthetic receipt",
      },
      "Synthetic tester",
    ),
  );
  assert.equal(
    commandSchema.safeParse({
      type: "status",
      loopId: pending.id,
      status: "received",
      note: "x".repeat(1001),
    }).success,
    false,
  );
});
