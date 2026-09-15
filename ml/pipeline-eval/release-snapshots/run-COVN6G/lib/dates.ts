/** Date-only arithmetic in UTC: no local-time/DST shifts and no clinical deadline inference. */
export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function addDays(value: string, days: number): string {
  if (!isISODate(value) || !Number.isSafeInteger(days))
    throw new Error("Choose a valid discharge date and day interval.");
  const date = new Date(value + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + days);
  if (!Number.isFinite(date.getTime()))
    throw new Error("The computed date is outside the supported range.");
  const result = date.toISOString().slice(0, 10);
  if (!isISODate(result))
    throw new Error("The computed date is outside the supported range.");
  return result;
}
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function formatDate(value: string | null): string {
  return value && isISODate(value)
    ? new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(value + "T12:00:00Z"))
    : "Not specified";
}
export type ExtractedDate = {
  dateText: string;
  dueDate: string | null;
  dueEnd: string | null;
  dateKind: "exact" | "window" | "missing" | "ambiguous";
};
const numbers: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
};
const quantity = (x: string) => numbers[x.toLowerCase()] ?? Number(x);
const monthNames =
  "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
const monthNumbers: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
const numberWords =
  "\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen";
const missing = (): ExtractedDate => ({
  dateText: "Not specified in the source",
  dueDate: null,
  dueEnd: null,
  dateKind: "missing",
});
const ambiguous = (dateText: string): ExtractedDate => ({
  ...missing(),
  dateText,
  dateKind: "ambiguous",
});
type Candidate = { start: number; end: number; result: ExtractedDate };

/** Parse one instruction clause. Several date expressions remain unresolved. */
export function extractDate(text: string, baseDate: string): ExtractedDate {
  const candidates: Candidate[] = [];
  const overlaps = (start: number, end: number) =>
    candidates.some((c) => start < c.end && end > c.start);
  const add = (match: RegExpMatchArray, result: ExtractedDate) => {
    const start = match.index!,
      end = start + match[0].length;
    if (!overlaps(start, end)) candidates.push({ start, end, result });
  };
  for (const iso of text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) {
    add(
      iso,
      isISODate(iso[1])
        ? {
            ...missing(),
            dateText: iso[0],
            dueDate: iso[1],
            dueEnd: iso[1],
            dateKind: "exact",
          }
        : ambiguous(iso[0]),
    );
  }
  const monthFirst = new RegExp(
    `\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`,
    "gi",
  );
  const dayFirst = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})\\.?(?:,?\\s+(\\d{4}))?\\b`,
    "gi",
  );
  for (const [pattern, firstIsMonth] of [
    [monthFirst, true],
    [dayFirst, false],
  ] as const) {
    for (const match of text.matchAll(pattern)) {
      const month = firstIsMonth ? match[1] : match[2],
        day = Number(firstIsMonth ? match[2] : match[1]),
        year = match[3];
      if (!year) {
        add(match, ambiguous(match[0] + " (year not specified)"));
        continue;
      }
      const value = `${year}-${String(monthNumbers[month.slice(0, 3).toLowerCase()]).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      add(
        match,
        isISODate(value)
          ? {
              ...missing(),
              dateText: match[0],
              dueDate: value,
              dueEnd: value,
              dateKind: "exact",
            }
          : ambiguous(match[0]),
      );
    }
  }
  // Relative intervals precede numeric dates so 1-2 weeks is a range.
  const relative = new RegExp(
    `\\b(within|in|after)\\s*(${numberWords})(?:\\s*(?:[-–—]|to)\\s*(${numberWords}))?\\s*(business\\s+)?(days?|weeks?|months?|hours?)\\b`,
    "gi",
  );
  for (const rel of text.matchAll(relative)) {
    const suffix = text.slice(rel.index! + rel[0].length);
    const hasDifferentAnchor =
      /^\s+(?:of|after|from|following)\s+(?!discharge\b|leaving\s+(?:the\s+)?hospital\b)/i.test(
        suffix,
      ) ||
      /\b(?:post[- ]?operatively|post[- ]?op(?:erative)?|post[- ]?procedure|post[- ]?surgery|POD)\b/i.test(
        text,
      ) ||
      /\b(?:after|following|from|since)\s+(?:the\s+|your\s+)?(?:surgery|operation|procedure|admission|appointment|test|treatment|starting|finishing|receiving)\b/i.test(
        text,
      ) ||
      /\b(?:when|once|on)\s+(?:you\s+)?(?:start|finish|receive|starting|finishing|receiving)\b/i.test(
        text,
      );
    if (
      rel[1].toLowerCase() === "after" ||
      rel[4] ||
      /month|hour/i.test(rel[5]) ||
      hasDifferentAnchor ||
      !isISODate(baseDate)
    ) {
      add(rel, ambiguous(rel[0]));
      continue;
    }
    const a = quantity(rel[2]),
      b = rel[3] ? quantity(rel[3]) : a,
      m = /week/i.test(rel[5]) ? 7 : 1;
    if (
      !Number.isSafeInteger(a) ||
      !Number.isSafeInteger(b) ||
      a < 0 ||
      b < a ||
      b * m > 366
    ) {
      add(rel, ambiguous(rel[0]));
      continue;
    }
    try {
      const from =
          rel[1].toLowerCase() === "within"
            ? baseDate
            : addDays(baseDate, a * m),
        to = addDays(baseDate, b * m);
      add(rel, {
        ...missing(),
        dateText: rel[0],
        dueDate: from,
        dueEnd: to,
        dateKind: from === to ? "exact" : "window",
      });
    } catch {
      add(rel, ambiguous(rel[0]));
    }
  }
  for (const numeric of text.matchAll(
    /\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/g,
  )) {
    add(numeric, ambiguous(numeric[0] + " (confirm date format)"));
  }
  // A duration outside the supported relative grammar still specifies timing.
  const duration = new RegExp(
    `\\b(?:${numberWords})(?:\\s*(?:[-–—]|to)\\s*(?:${numberWords}))?\\s*(?:business\\s+)?(?:days?|weeks?|months?|hours?|years?)\\b`,
    "gi",
  );
  for (const match of text.matchAll(duration)) add(match, ambiguous(match[0]));
  // Unsupported timing is ambiguous, never falsely 'not specified'.
  for (const vague of text.matchAll(
    /\b(?:soon|today|tomorrow|next week|next month|next (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|as needed|as required|ASAP|at your next visit|daily|weekly|monthly|in\s+(?:\w+|\d+)\s+(?:days?|weeks?|months?|years?)|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))\b/gi,
  )) {
    add(vague, ambiguous(vague[0]));
  }
  candidates.sort((a, b) => a.start - b.start);
  if (candidates.length > 1)
    return ambiguous(
      candidates.map((c) => c.result.dateText).join(" / ") +
        " (multiple timing expressions; confirm which applies)",
    );
  return candidates[0]?.result ?? missing();
}
