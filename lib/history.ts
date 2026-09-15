/** Present older history entries without exposing their JSON serialization. */
export function readableHistory(detail: string): string {
  const marker = ". Previous details: ";
  const start = detail.indexOf(marker);
  if (start < 0) return detail;
  const raw = detail.slice(start + marker.length);
  if (!raw.startsWith("{")) return detail;
  try {
    const previous: unknown = JSON.parse(raw);
    if (!previous || typeof previous !== "object") return detail;
    const p = previous as Record<string, unknown>;
    if (typeof p.title !== "string" || typeof p.owner !== "string" ||
        !(p.dueDate === null || typeof p.dueDate === "string") ||
        !(p.dueEnd === null || typeof p.dueEnd === "string")) return detail;
    return `${detail.slice(0, start)}${marker}${p.title}; tracking person: ${p.owner || "unassigned"}; date: ${p.dueDate ?? "unresolved"}${p.dueEnd && p.dueEnd !== p.dueDate ? " to " + p.dueEnd : ""}.`;
  } catch { return detail; }
}
