import type { AkquiseLogRow, AkquiseStatus, ProjektRow, Task } from "@/lib/types";
import {
  endOfWeekSunday,
  isTimestampInRange,
  isYmdInWeek,
  parseYmdLocal,
  startOfWeekMonday,
} from "@/lib/weekUtils";

export function bereichName(t: Task): string {
  return t.bereiche?.name?.trim() || "";
}

export function isOpenRelevantThisWeek(
  t: Task,
  weekStart: Date,
  weekEnd: Date
): boolean {
  if (t.done) return false;
  const dl = t.deadline?.trim() || "";
  if (dl === "Heute" || dl === "Diese Woche") return true;
  if (
    t.nächste_fälligkeit &&
    isYmdInWeek(t.nächste_fälligkeit, weekStart, weekEnd)
  ) {
    return true;
  }
  return false;
}

export function isDoneThisWeek(
  t: Task,
  weekStart: Date,
  weekEnd: Date
): boolean {
  return t.done && isTimestampInRange(t.updated_at, weekStart, weekEnd);
}

export function todayYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfTodayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isDoneToday(t: Task, d: Date): boolean {
  if (!t.done) return false;
  const u = new Date(t.updated_at);
  return (
    u.getFullYear() === d.getFullYear() &&
    u.getMonth() === d.getMonth() &&
    u.getDate() === d.getDate()
  );
}

export function isOpenDueToday(t: Task, d: Date): boolean {
  if (t.done) return false;
  if ((t.deadline?.trim() || "") === "Heute") return true;
  const ymd = todayYmdLocal(d);
  if (t.nächste_fälligkeit === ymd) return true;
  return false;
}

export function isOpenOverdue(t: Task, d: Date): boolean {
  if (t.done) return false;
  if (!t.nächste_fälligkeit) return false;
  const p = parseYmdLocal(t.nächste_fälligkeit);
  if (!p) return false;
  return p.getTime() < startOfTodayLocal(d).getTime();
}

export function isOpenDueThisWeekLabel(t: Task): boolean {
  if (t.done) return false;
  return (t.deadline?.trim() || "") === "Diese Woche";
}

export function weekBounds(d: Date) {
  return {
    start: startOfWeekMonday(d),
    end: endOfWeekSunday(d),
  };
}

const OPEN_AKQUISE: AkquiseStatus[] = [
  "Gesendet",
  "Antwort erhalten",
  "Termin vereinbart",
  "In Verhandlung",
];

export function isAkquiseResponseStatus(s: AkquiseStatus): boolean {
  return (
    s === "Antwort erhalten" ||
    s === "Termin vereinbart" ||
    s === "In Verhandlung"
  );
}

export function akquiseWeekRows(rows: AkquiseLogRow[], weekStart: Date, weekEnd: Date) {
  return rows.filter((r) => {
    const d = new Date(r.datum + "T12:00:00");
    return d.getTime() >= weekStart.getTime() && d.getTime() <= weekEnd.getTime();
  });
}

export function akquiseOpenContacts(rows: AkquiseLogRow[]): number {
  return rows.filter((r) => OPEN_AKQUISE.includes(r.status)).length;
}

export function parseBetrag(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function normalizeProjekt(r: Record<string, unknown>): ProjektRow {
  return {
    id: String(r.id),
    kunde: String(r.kunde ?? ""),
    betrag: parseBetrag(r.betrag),
    status: r.status as ProjektRow["status"],
    notiz: r.notiz != null ? String(r.notiz) : null,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}
