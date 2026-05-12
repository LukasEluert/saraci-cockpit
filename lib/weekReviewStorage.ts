const STORAGE_KEY = "saraci-week-review-shown-kw";

/** ISO-Jahr und Kalenderwoche, z. B. 2026-W19 */
export function isoWeekKey(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

export function wasWeekReviewShownForKey(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === key;
  } catch {
    return true;
  }
}

export function markWeekReviewShownForKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* ignore */
  }
}

/** Freitag in lokaler Zeit (getDay: 0=So … 5=Fr) */
export function isFridayLocal(d: Date): boolean {
  return d.getDay() === 5;
}
