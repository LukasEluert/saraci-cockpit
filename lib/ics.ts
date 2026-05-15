import type { Task } from "@/lib/types";
import { parseYmdLocal } from "@/lib/weekUtils";

function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function utcStamp(d: Date): string {
  return (
    d.getUTCFullYear() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    "T" +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0") +
    "Z"
  );
}

function eventDateForTask(task: Task, ref: Date): Date | null {
  if (task.nächste_fälligkeit) {
    const d = parseYmdLocal(task.nächste_fälligkeit);
    if (d) return d;
  }
  const dl = task.deadline?.trim() || "Kein Datum";
  if (dl === "Kein Datum") return null;
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const day = ref.getDate();
  if (dl === "Heute") return new Date(y, m, day);
  if (dl === "Diese Woche") {
    const monday = (() => {
      const x = new Date(ref);
      x.setHours(0, 0, 0, 0);
      const dow = x.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      x.setDate(x.getDate() + diff);
      return x;
    })();
    const sun = new Date(monday);
    sun.setDate(monday.getDate() + 6);
    return sun;
  }
  if (dl === "Diesen Monat") {
    return new Date(y, m + 1, 0);
  }
  return null;
}

export function taskHasCalendarDate(task: Task, ref = new Date()): boolean {
  return eventDateForTask(task, ref) !== null;
}

export function buildTaskIcs(task: Task, bereichName: string): string {
  const ref = new Date();
  const evDate = eventDateForTask(task, ref);
  if (!evDate) {
    throw new Error("Kein Kalenderdatum für diese Aufgabe.");
  }
  const dateStr = formatYmd(evDate);
  const uid = `${task.id}@saraci-cockpit`;
  const stamp = utcStamp(new Date());
  const summary = escapeIcsText(task.text.trim() || "Aufgabe");
  const desc = escapeIcsText(
    [
      `Bereich: ${bereichName}`,
      `Deadline: ${task.deadline || "—"}`,
      task.notiz?.trim() ? `Notiz: ${task.notiz.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\\n")
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Saraci Desk//DE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${desc}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

export function sanitizeIcsFilename(text: string): string {
  const base = text
    .trim()
    .slice(0, 60)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "aufgabe";
}
