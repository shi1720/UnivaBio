import { addDays, formatDate } from "./dates";
import type { Episode } from "./types";
const icsEscape = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
export function calendarText(episode: Episode): {
  text: string;
  count: number;
} {
  const loops = episode.loops.filter(
    (l) => l.dueEnd && !["suggested", "dismissed", "closed"].includes(l.status),
  );
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Looplight//Care Follow-ups//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const loop of loops) {
    const date = loop.dueEnd!;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsEscape(episode.id + "-" + loop.id)}@looplight.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`,
      ...(date === "9999-12-31"
        ? ["DURATION:P1D"]
        : [`DTEND;VALUE=DATE:${addDays(date, 1).replace(/-/g, "")}`]),
      "SUMMARY:Follow-up reminder",
      `DESCRIPTION:${icsEscape("Open Looplight to check the follow-up details. This reminder uses the confirmed final day of the source window; it is not a booked appointment.")}`,
      "STATUS:TENTATIVE",
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return { text: lines.join("\r\n") + "\r\n", count: loops.length };
}
export function briefText(e: Episode): string {
  return [
    `LOOPLIGHT · CARE HANDOFF BRIEF`,
    `Patient: ${e.patientName}`,
    `Discharged: ${formatDate(e.dischargeDate)}`,
    `Source: ${e.documentTitle}`,
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "Organizes existing instructions. This is a patient/caregiver record, not a verified clinical record.",
    "",
    ...e.loops
      .filter((l) => l.status !== "dismissed")
      .flatMap((l, i) => [
        `${i + 1}. ${l.title}`,
        `Status: ${{ suggested: "Not yet confirmed", open: "Ready to follow through", waiting: "Waiting for a reply", received: "Result received; review next", closed: "Reported complete", dismissed: "Dismissed" }[l.status]} | Tracking person: ${l.owner || "Not assigned"}`,
        `Date: ${l.dueDate ? formatDate(l.dueDate) + (l.dueEnd !== l.dueDate ? " to " + formatDate(l.dueEnd) : "") : "Needs confirmation"} | Source says: ${l.dateText}`,
        `Source: "${l.sourceQuote}"`,
        ...l.questions.map((q) => "Ask: " + q),
        ...(l.closure
          ? [
              `Reported completion: ${l.closure.note}`,
              `Reported by: ${l.closure.reporter}; reviewed with: ${l.closure.reviewedBy || "Not specified"}; date: ${l.closure.date}`,
            ]
          : []),
        "",
      ]),
    "SOURCE CONTENT WITHOUT A LINKED FOLLOW-UP",
    "These original instructions were not converted into tracked tasks. They may still contain important next steps. Review them with the care team.",
    ...e.sentences
      .filter((s) => !e.loops.some((l) => l.sourceId === s.id))
      .map((s) => `[${s.id.toUpperCase()}] ${s.text}`),
    "",
    "LIMITS",
    "Only the supplied document is analyzed. Missing instructions cannot be recovered. Confirm medical decisions and uncertain instructions with the care team.",
  ].join("\n");
}
export function downloadText(
  text: string,
  filename: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give browsers time to consume the Blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
