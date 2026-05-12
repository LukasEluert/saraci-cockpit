const STORAGE_KEY = "saraci-daily-briefing-shown";

export function todayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function wasDailyBriefingShownToday(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === todayYmdLocal();
  } catch {
    return true;
  }
}

export function markDailyBriefingShownToday(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, todayYmdLocal());
  } catch {
    /* ignore */
  }
}
