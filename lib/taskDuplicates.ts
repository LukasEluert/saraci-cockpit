import type { Task } from "@/lib/types";

/** Trim, lowercase, mehrfache Leerzeichen → eins. */
export function normalizeDuplicateText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

function areVerySimilarText(a: string, b: string): boolean {
  const na = normalizeDuplicateText(a);
  const nb = normalizeDuplicateText(b);
  if (na === nb) return true;
  if (na.length < 4 || nb.length < 4) return false;
  const d = levenshtein(na, nb);
  const maxL = Math.max(na.length, nb.length);
  if (d <= 2) return true;
  if (maxL >= 10 && d <= Math.max(3, Math.floor(0.12 * maxL))) return true;
  return false;
}

/**
 * Gruppen mit mindestens zwei Tasks (gleicher / sehr ähnlicher Text).
 */
export function findDuplicateTaskGroups(tasks: Task[]): Task[][] {
  const n = tasks.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(i: number): number {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    let cur = i;
    while (cur !== root) {
      const next = parent[cur];
      parent[cur] = root;
      cur = next;
    }
    return root;
  }
  function union(i: number, j: number) {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[rj] = ri;
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (areVerySimilarText(tasks[i].text, tasks[j].text)) union(i, j);
    }
  }
  const buckets = new Map<number, Task[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!buckets.has(r)) buckets.set(r, []);
    buckets.get(r)!.push(tasks[i]);
  }
  return [...buckets.values()]
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
