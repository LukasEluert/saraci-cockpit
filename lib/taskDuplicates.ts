import type { Task } from "@/lib/types";

/** Trim, lowercase, mehrfache Leerzeichen → eins. */
export function normalizeDuplicateText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Gruppen mit mindestens zwei Tasks mit identischem Text (case-insensitive, trim).
 */
export function findDuplicateTaskGroups(tasks: Task[]): Task[][] {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const k = normalizeDuplicateText(t.text);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return [...map.values()]
    .filter((g) => g.length > 1)
    .map((g) =>
      [...g].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    )
    .sort((a, b) =>
      normalizeDuplicateText(a[0].text).localeCompare(
        normalizeDuplicateText(b[0].text),
        "de"
      )
    );
}
