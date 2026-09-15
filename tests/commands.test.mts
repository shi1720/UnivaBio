import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeDocument } from "../lib/engine";
import { applyCommand, inputSchema } from "../lib/commands";
import { calendarText, briefText } from "../lib/exports";
const now = "2026-09-15T20:00:00Z";
function sample(text = "The biopsy report is still awaited.") {
  return analyzeDocument(
    {
      patientName: "Test patient",
      documentTitle: "Synthetic fixture",
      sourceText: text,
      dischargeDate: "2026-09-10",
    },
    "test-episode",
  );
}
function confirmed(text?: string) {
  const e = sample(text);
  return applyCommand(
    e,
    {
      type: "confirm",
      loopId: e.loops[0].id,
      title: e.loops[0].title,
      owner: "Test caregiver",
      dueDate: null,
      dueEnd: null,
    },
    "Test user",
    now,
  );
}
test("result receipt and named clinical review are required to close a pending result", () => {
  let e = confirmed();
  const id = e.loops[0].id;
  const close = {
    type: "close" as const,
    loopId: id,
    note: "Discussed the result with the test clinician.",
    reviewedBy: "Dr Example",
    date: "2026-09-15",
  };
  assert.throws(() => applyCommand(e, close, "Test user", now), /received/);
  e = applyCommand(
    e,
    {
      type: "status",
      loopId: id,
      status: "received",
      note: "The report was received.",
    },
    "Test user",
    now,
  );
  assert.throws(
    () => applyCommand(e, { ...close, reviewedBy: "" }, "Test user", now),
    /clinician/,
  );
  e = applyCommand(e, close, "Test user", now);
  assert.equal(e.loops[0].status, "closed");
  assert.equal(e.loops[0].closure?.reporter, "Test user");
  assert.match(e.events.at(-1)!.detail, /not independently verified/);
});
test("suggestions cannot be progressed or closed without human confirmation", () => {
  const e = sample();
  const id = e.loops[0].id;
  assert.throws(
    () =>
      applyCommand(
        e,
        {
          type: "status",
          loopId: id,
          status: "received",
          note: "Available now",
        },
        "Test",
        now,
      ),
    /Confirm/,
  );
  assert.throws(
    () =>
      applyCommand(
        e,
        {
          type: "close",
          loopId: id,
          note: "A user reported the result discussed",
          reviewedBy: "Dr Example",
          date: "2026-09-15",
        },
        "Test",
        now,
      ),
    /Confirm/,
  );
  assert.throws(() =>
    applyCommand(
      e,
      {
        type: "confirm",
        loopId: id,
        title: "Follow up",
        owner: "",
        dueDate: null,
        dueEnd: null,
      },
      "Test",
      now,
    ),
  );
});
test("follow-up completion keeps source unchanged and records corrections", () => {
  const original = sample("Arrange a clinic review in 7 days.");
  const source = original.sourceText;
  let e = applyCommand(
    original,
    {
      type: "confirm",
      loopId: original.loops[0].id,
      title: "Clinic review",
      owner: "Maya",
      dueDate: "2026-09-18",
      dueEnd: "2026-09-20",
    },
    "Test",
    now,
  );
  assert.equal(original.loops[0].status, "suggested");
  assert.equal(e.version, 2);
  assert.equal(e.sourceText, source);
  assert.match(e.events[1].detail, /Previous details/);
  e = applyCommand(
    e,
    {
      type: "close",
      loopId: e.loops[0].id,
      note: "Attended and discussed the care plan.",
      reviewedBy: "",
      date: "2026-09-15",
    },
    "Test",
    now,
  );
  assert.equal(e.loops[0].status, "closed");
  e = applyCommand(
    e,
    {
      type: "reopen",
      loopId: e.loops[0].id,
      note: "Still need the follow-up letter.",
    },
    "Test",
    now,
  );
  assert.equal(e.loops[0].status, "open");
  assert.equal(e.loops[0].closure, null);
  assert.equal(e.events.length, 4);
});
test("completion dates respect discharge, future bounds and local dates", () => {
  const e = confirmed("Arrange a clinic review in 7 days.");
  const c = {
    type: "close" as const,
    loopId: e.loops[0].id,
    note: "Attended the clinic visit and discussed next steps.",
    reviewedBy: "",
    date: "2026-09-09",
  };
  assert.throws(() => applyCommand(e, c, "Test", now), /before/);
  assert.throws(
    () => applyCommand(e, { ...c, date: "2026-09-18" }, "Test", now),
    /future/,
  );
  assert.doesNotThrow(() =>
    applyCommand(
      e,
      { ...c, date: "2026-09-16" },
      "Test",
      "2026-09-15T20:00:00Z",
    ),
  );
});
test("invalid transitions, fabricated fields and unknown IDs are rejected", () => {
  const e = confirmed("Repeat a blood count in 7 days.");
  const id = e.loops[0].id;
  assert.throws(
    () =>
      applyCommand(
        e,
        {
          type: "status",
          loopId: id,
          status: "received",
          note: "Report received",
        },
        "Test",
        now,
      ),
    /Only a pending/,
  );
  assert.throws(
    () =>
      applyCommand(
        e,
        { type: "dismiss", loopId: id, note: "not needed now" },
        "Test",
        now,
      ),
    /unconfirmed/,
  );
  assert.throws(
    () =>
      applyCommand(
        e,
        {
          type: "status",
          loopId: "foreign-id",
          status: "open",
          note: "Updated this",
        },
        "Test",
        now,
      ),
    /no longer exists/,
  );
  assert.throws(() =>
    applyCommand(
      e,
      {
        type: "status",
        loopId: id,
        status: "open",
        note: "Updated this",
        owner: "Override",
      } as never,
      "Test",
      now,
    ),
  );
});
test("invalid date windows rejected and source timing remains attributable", () => {
  const e = sample("Repeat a blood count in 2 weeks.");
  const c = {
    type: "confirm" as const,
    loopId: e.loops[0].id,
    title: "Repeat blood count",
    owner: "Test",
    dueDate: "2026-09-20",
    dueEnd: "2026-09-15",
  };
  assert.throws(() => applyCommand(e, c, "Test", now), /end date/);
  assert.throws(
    () => applyCommand(e, { ...c, dueDate: null }, "Test", now),
    /start date/,
  );
  const next = applyCommand(e, { ...c, dueEnd: null }, "Test", now);
  assert.equal(next.loops[0].dueEnd, "2026-09-20");
  assert.equal(next.loops[0].dateText, "in 2 weeks");
});
test("dismissal is reversible and cannot erase the source or history", () => {
  let e = sample();
  const id = e.loops[0].id;
  e = applyCommand(
    e,
    {
      type: "dismiss",
      loopId: id,
      note: "Checked with the care team: not a new task.",
    },
    "Test",
    now,
  );
  assert.equal(e.loops[0].status, "dismissed");
  e = applyCommand(
    e,
    { type: "reopen", loopId: id, note: "Need another look at the source." },
    "Test",
    now,
  );
  assert.equal(e.loops[0].status, "suggested");
  assert.equal(e.events.length, 3);
});
test("manual missed follow-ups require real source spans and fresh confirmation", () => {
  let e = sample("A pathology specimen was sent for additional processing.");
  const s = e.sentences[0];
  e = applyCommand(
    e,
    {
      type: "manual",
      sentenceId: s.id,
      title: "Ask about pathology processing",
      category: "pending_result",
    },
    "Test",
    now,
  );
  const l = e.loops.at(-1)!;
  assert.equal(l.status, "suggested");
  assert.equal(l.sourceQuote, s.text);
  assert.equal(l.dueDate, null);
  assert.equal(e.sourceText.slice(l.sourceStart, l.sourceEnd), s.text);
  assert.throws(() =>
    applyCommand(
      e,
      {
        type: "manual",
        sentenceId: "fake",
        title: "Ask about result",
        category: "pending_result",
      },
      "Test",
      now,
    ),
  );
});
test("calendar excludes unconfirmed and closed tasks and does not leak patient names", () => {
  let e = sample("Arrange a follow-up in 7 days.");
  assert.equal(calendarText(e).count, 0);
  const l = e.loops[0];
  e = applyCommand(
    e,
    {
      type: "confirm",
      loopId: l.id,
      title: "Visit for secret condition",
      owner: "Private person",
      dueDate: "2026-09-17",
      dueEnd: "2026-09-18",
    },
    "Test",
    now,
  );
  const result = calendarText(e);
  assert.equal(result.count, 1);
  assert.match(result.text, /DTSTART;VALUE=DATE:20260918/);
  assert.match(result.text, /DTEND;VALUE=DATE:20260919/);
  assert.doesNotMatch(
    result.text,
    /Test patient|secret condition|Private person/,
  );
  assert.match(briefText(e), /patient\/caregiver record/);
  assert.match(briefText(e), /Arrange a follow-up in 7 days/);
});
test("input validation rejects large, empty, malformed and surplus fields", () => {
  const input = {
    patientName: "Test",
    documentTitle: "Test",
    dischargeDate: "2026-09-10",
    sourceText: "Arrange a follow-up in 7 days.",
  };
  assert.equal(inputSchema.safeParse(input).success, true);
  for (const patch of [
    { sourceText: "x".repeat(40001) },
    { sourceText: "    " },
    { dischargeDate: "2026-02-30" },
    { ownerId: "forged" },
  ])
    assert.equal(inputSchema.safeParse({ ...input, ...patch }).success, false);
});
