import type { Wiederholung } from "@/lib/types";

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeNextFälligkeit(
  current: string,
  wiederholung: Wiederholung
): string {
  const base = parseYmd(current);
  const next = new Date(base);
  if (wiederholung === "täglich") {
    next.setDate(next.getDate() + 1);
  } else if (wiederholung === "wöchentlich") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return formatYmd(next);
}

export function todayYmd(): string {
  return formatYmd(new Date());
}
