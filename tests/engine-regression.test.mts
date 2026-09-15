import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDocument, splitSentences } from "../lib/engine";
import { addDays, extractDate, isISODate } from "../lib/dates";
const base = "2026-09-15";
const analyze = (sourceText: string) =>
  analyzeDocument({
    patientName: "Synthetic fixture",
    documentTitle: "Engineering regression fixture",
    dischargeDate: base,
    sourceText,
  });

test("hyphens, en dashes, word ranges and within windows preserve relative timing", () => {
  for (const range of ["1-2", "1–2", "1 to 2"]) {
    const date = extractDate(`Repeat blood count in ${range} weeks.`, base);
    assert.equal(date.dueDate, "2026-09-22");
    assert.equal(date.dueEnd, "2026-09-29");
    assert.equal(date.dateKind, "window");
  }
  const within = extractDate("Repeat within 1-2 weeks.", base);
  assert.equal(within.dueEnd, "2026-09-29");
  assert.equal(within.dateKind, "window");
});
test("named dates in either order parse without timezone or date rollover", () => {
  for (const text of [
    "Review on 12 October 2026.",
    "Review on October 12, 2026.",
  ])
    assert.equal(extractDate(text, base).dueDate, "2026-10-12");
  for (const text of [
    "Review on 31 February 2026.",
    "Review on February 31, 2026.",
    "Review on 12 October.",
  ])
    assert.equal(extractDate(text, base).dateKind, "ambiguous");
  assert.equal(
    extractDate("Review on 2026-02-29.", base).dateKind,
    "ambiguous",
  );
  assert.equal(
    extractDate("Review on 2028-02-29.", base).dueDate,
    "2028-02-29",
  );
});
test("multiple dates, alternative dates, and historical date plus interval stay ambiguous", () => {
  for (const text of [
    "Review on October 12, 2026 or October 19, 2026.",
    "Repeat between 2026-10-01 and 2026-10-14.",
    "Your prior review was September 1, 2026; repeat in 2 weeks.",
    "Repeat in 7 days and review in 21 days.",
  ]) {
    const date = extractDate(text, base);
    assert.equal(date.dateKind, "ambiguous", text);
    assert.equal(date.dueDate, null, text);
  }
});
test("open-ended after, event anchors and unsupported units never become exact deadlines", () => {
  for (const text of [
    "Book review after 7 days.",
    "Repeat within 14 days after surgery.",
    "Repeat in 7 days postoperatively.",
    "Following surgery, repeat in 7 days.",
    "When you start treatment, repeat in 7 days.",
    "Repeat in 7 days from today.",
    "Repeat in 7 business days.",
    "Repeat in 2 months.",
    "Repeat in 48 hours.",
    "Repeat in twenty days.",
    "Repeat 7 days from discharge.",
    "Repeat blood test weekly.",
  ]) {
    const date = extractDate(text, base);
    assert.equal(date.dateKind, "ambiguous", text);
    assert.equal(date.dueDate, null, text);
  }
  assert.equal(
    extractDate("Repeat in 7 days after discharge.", base).dueDate,
    "2026-09-22",
  );
  assert.equal(extractDate("Review tomorrow.", base).dateKind, "ambiguous");
});
test("date arithmetic protects invalid bases and year overflow", () => {
  assert.equal(isISODate("2026-02-30"), false);
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.throws(() => addDays("9999-12-31", 1));
  assert.equal(
    extractDate("Repeat in 7 days.", "9999-12-31").dateKind,
    "ambiguous",
  );
  assert.equal(
    extractDate("Repeat in 7 days.", "not-a-date").dateKind,
    "ambiguous",
  );
});
test("pending result wording stays in the result category", () => {
  for (const text of [
    "The biopsy report is still awaited.",
    "The culture has yet to be reported.",
    "The thyroid result is unavailable at discharge.",
  ]) {
    const ep = analyze(text);
    assert.equal(ep.loops.length, 1, text);
    assert.equal(ep.loops[0].category, "pending_result", text);
    assert.ok(
      ep.loops[0].questions.some((q) => q.includes("review the result")),
    );
  }
});
test("clear semicolon and and action boundaries keep separate source-anchored loops", () => {
  for (const text of [
    "Continue warfarin; repeat the INR test in 3 days.",
    "Do not repeat the scan; arrange a blood count in one week.",
    "Your previous review was on September 1, 2026; repeat the test in 2 weeks.",
  ]) {
    const ep = analyze(text);
    assert.equal(ep.loops.length, 1, text);
    assert.equal(ep.loops[0].sourceQuote.includes(";"), false);
    assert.notEqual(ep.loops[0].dueDate, null, text);
    assert.equal(
      text.slice(ep.loops[0].sourceStart, ep.loops[0].sourceEnd),
      ep.loops[0].sourceQuote,
    );
  }
  const mixed = analyze(
    "Repeat INR in 3 days and recheck creatinine in 7 days.",
  );
  assert.equal(mixed.loops.length, 2);
  assert.equal(mixed.loops[0].dueDate, "2026-09-18");
  assert.equal(mixed.loops[1].dueDate, "2026-09-22");
});
test("a condition must not become detached from later actions", () => {
  const text =
    "If symptoms persist, book a clinic appointment in 7 days and repeat the blood test in 14 days.";
  const ep = analyze(text);
  assert.equal(ep.sentences.length, 1);
  assert.equal(ep.loops.length, 0);
  assert.equal(ep.sentences[0].category, "unknown");
  assert.match(ep.sentences[0].reason, /Mixed instructions; review manually/);
});
test("coordinated negation must not turn the second verb into a positive task", () => {
  const text =
    "Do not book the scan and repeat the test without calling the clinician.";
  const ep = analyze(text);
  assert.equal(ep.sentences.length, 1);
  assert.equal(ep.loops.length, 0);
  assert.equal(ep.sentences[0].category, "unknown");
  assert.match(ep.sentences[0].reason, /Mixed instructions; review manually/);
});
test("unsplittable mixed safety, medication and negation instructions are visibly unresolved", () => {
  for (const text of [
    "Seek emergency care if chest pain occurs; book a cardiology review in 7 days.",
    "No further follow-up is needed for the wound, but repeat the blood count in 7 days.",
    "Use the tablets as directed, with a follow-up appointment in 7 days.",
  ]) {
    const ep = analyze(text);
    assert.equal(ep.loops.length, 0, text);
    assert.equal(ep.sentences[0].category, "unknown", text);
    assert.match(ep.sentences[0].reason, /Mixed instructions; review manually/);
  }
});
test("negative and historical statements do not become new tasks", () => {
  for (const text of [
    "There are no outstanding tests.",
    "The patient attended the cardiology appointment yesterday.",
    "The follow-up appointment took place last week.",
    "Your repeat blood test has already been done.",
    "The scan was completed yesterday.",
  ]) {
    const ep = analyze(text);
    assert.equal(ep.loops.length, 0, text);
    assert.equal(ep.sentences[0].category, "context", text);
  }
});
test("routine clinic wording and incidental emergency-number values remain reviewable", () => {
  for (const text of [
    "Return to clinic on 12 October 2026.",
    "Please see Dr. Smith in 7 days.",
    "Repeat marker number 112 in 7 days.",
  ])
    assert.equal(analyze(text).loops.length, 1, text);
  const emergency = analyze("Call 112 for emergency help.");
  assert.equal(emergency.loops.length, 0);
  assert.equal(emergency.sentences[0].category, "safety");
});
test("documented clinician names never absorb a lowercase timing preposition", () => {
  assert.equal(
    analyze("Please see Dr. Smith in 7 days.").loops[0].documentedOwner,
    "Dr. Smith",
  );
  assert.equal(
    analyze("Please see Dr. Mary Smith in 7 days.").loops[0].documentedOwner,
    "Dr. Mary Smith",
  );
});
test("all three conflicting instructions are flagged, independent of comparison order", () => {
  const ep = analyze(
    "Repeat blood count in 7 days. Repeat blood count in 14 days. Repeat blood count in 21 days.",
  );
  assert.equal(ep.loops.length, 3);
  for (const loop of ep.loops) {
    assert.equal(loop.dateKind, "ambiguous");
    assert.equal(loop.dueDate, null);
    assert.ok(loop.flags.some((f) => f.includes("conflicting timing")));
  }
});
test("proposal cap preserves every remaining source span with visible explanation", () => {
  const text = Array.from(
    { length: 120 },
    (_, i) => `Repeat marker number ${i} in 7 days.`,
  ).join("\n");
  const ep = analyze(text);
  assert.equal(ep.loops.length, 100);
  assert.equal(ep.sentences.length, 120);
  assert.equal(
    ep.sentences.filter((s) => s.reason.includes("100-proposal limit")).length,
    20,
  );
  for (const sentence of ep.sentences)
    assert.equal(text.slice(sentence.start, sentence.end), sentence.text);
  assert.throws(() => analyze("x".repeat(40001)), /40,000/);
});
test("Unicode, decimals and abbreviations preserve exact source spans", () => {
  const text =
    "🧬 Notes\nPlease see Dr. Smith in 7 days; repeat the test in 14 days. Value 3.5 was normal.";
  const parts = splitSentences(text);
  for (const part of parts)
    assert.equal(text.slice(part.start, part.end), part.text);
  assert.ok(parts.some((p) => p.text === "Please see Dr. Smith in 7 days"));
  assert.ok(parts.some((p) => p.text === "Value 3.5 was normal."));
});

test("document headings and example labels do not become follow-ups", () => {
  const ep = analyze(
    "FICTIONAL EXAMPLE - REVIEW CHALLENGE\nFollow-up instructions\nPending tests:\nA thyroid test result is pending.",
  );
  assert.equal(ep.loops.length, 1);
  assert.equal(ep.loops[0].title, "Check the thyroid test result");
  assert.equal(analyze("REPEAT A BLOOD COUNT IN 2 WEEKS.").loops.length, 1);
});

test("model-only pending proposals retain readable original wording", () => {
  const text =
    "The result is not known yet, so confirm which clinician will follow it through.";
  const ep = analyze(text);
  assert.equal(ep.loops.length, 1);
  assert.equal(ep.loops[0].category, "pending_result");
  assert.equal(ep.loops[0].title, text);
});

test("clause-local negative care frames suppress tasks without hiding positive clauses", () => {
  for (const text of [
    "No specialist review is needed for the old shoulder injury.",
    "No sample from this admission remains pending.",
    "No imaging review is required after the completed appointment.",
    "None of the specimens are awaiting a report.",
    "There are no laboratory reports left to chase.",
  ])
    assert.equal(analyze(text).loops.length, 0, text);
  assert.equal(
    analyze("No headache was reported; check the pending culture.").loops[0]
      ?.category,
    "pending_result",
  );
  const mixed = analyze(
    "No scan is required, but the histology is still pending.",
  );
  assert.ok(
    mixed.loops.some((l) => l.category === "pending_result") ||
      mixed.sentences.some((s) => s.category === "unknown"),
  );
});

test("missing report escalation keeps result workflow and unresolved conditional timing", () => {
  for (const text of [
    "If the laboratory report has not arrived, contact the clinic after 8 days.",
    "If the report is still not back, call the diagnostics office.",
    "The requested pathology findings have not reached the practice.",
  ]) {
    const result = analyze(text);
    assert.equal(result.loops[0]?.category, "pending_result", text);
    assert.equal(result.loops[0].dueDate, null, text);
    assert.equal(result.loops[0].sourceQuote, text);
  }
  assert.equal(
    analyze("The report has arrived and has been reviewed.").loops.length,
    0,
  );
});

test("section labels are not tasks and uppercase directives stay available", () => {
  for (const text of [
    "CONDITIONAL FOLLOW-UP",
    "FOLLOW-UP AND WARNING SIGNS",
    "RESULT TRACKING AND AFTERCARE",
    "Your next appointments",
    "Pending reports:",
  ])
    assert.equal(analyze(text).loops.length, 0, text);
  assert.equal(analyze("REPEAT THE BLOOD TEST IN 10 DAYS").loops.length, 1);
});
