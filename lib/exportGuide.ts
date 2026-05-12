import type { Task } from "./types";
import { DEADLINE_ORDER } from "./constants";

const LEITFADEN_KI_SYSTEM_PROMPT = `---
Du bist mein Saraci-Design Business-Assistent.
Analysiere meine offenen Aufgaben und gib mir ein priorisiertes
JSON zurück — nichts anderes, kein erklärender Text.

Format exakt so:
[
  { "id": "uuid", "deadline": "Heute", "prioritaet": 1 },
  { "id": "uuid", "deadline": "Diese Woche", "prioritaet": 2 }
]

Regeln:
- Fokus auf Umsatz und Kundengewinnung zuerst
- Deadlines nur: Heute, Diese Woche, Diesen Monat, Kein Datum
- Jede Task bekommt eine eindeutige Prioritätsnummer
- Keine Erklärungen, nur das JSON Array
---
`;

function deadlineRank(d: string): number {
  return DEADLINE_ORDER[d] ?? 99;
}

function bereichLabel(t: Task): string {
  return t.bereiche?.name?.trim() || "Sonstiges";
}

function sortOpenTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ra = deadlineRank(a.deadline || "");
    const rb = deadlineRank(b.deadline || "");
    if (ra !== rb) return ra - rb;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function groupByBereich(tasks: Task[]): Map<string, Task[]> {
  const m = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = bereichLabel(t);
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(t);
  }
  return m;
}

export function buildLeitfadenExport(params: { tasks: Task[] }): string {
  const now = new Date();
  const header = [
    "# Aufgaben-Leitfaden",
    "",
    `Erstellt: ${now.toISOString()}`,
    "",
    "Dieser Text ist für einen strukturierten Überblick (z. B. in Claude) gedacht.",
    "",
  ].join("\n");

  const open = sortOpenTasks(params.tasks.filter((t) => !t.done));
  const done = [...params.tasks.filter((t) => t.done)].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const lines: string[] = [LEITFADEN_KI_SYSTEM_PROMPT.trimEnd(), "", header];

  lines.push("## Offene Aufgaben");
  lines.push("");
  if (open.length === 0) {
    lines.push("_Keine offenen Aufgaben._");
    lines.push("");
  } else {
    const grouped = groupByBereich(open);
    const bereichOrder = Array.from(grouped.keys()).sort((a, b) =>
      a.localeCompare(b, "de")
    );
    for (const bereich of bereichOrder) {
      const list = grouped.get(bereich)!;
      lines.push(`### Bereich: ${bereich}`);
      lines.push("");
      for (const t of sortOpenTasks(list)) {
        const dl =
          t.deadline?.trim() && t.deadline !== "Kein Datum"
            ? ` — Fokus: ${t.deadline}`
            : "";
        const ku = t.kunde?.trim();
        const kPart = ku ? ` — Kunde: ${ku}` : "";
        lines.push(`- [ ] ${t.text} [id:${t.id}]${dl}${kPart}`);
      }
      lines.push("");
    }
  }

  lines.push("## Erledigte Aufgaben");
  lines.push("");
  if (done.length === 0) {
    lines.push("_Noch nichts erledigt._");
    lines.push("");
  } else {
    for (const t of done) {
      const b = bereichLabel(t);
      const ku = t.kunde?.trim();
      const kPart = ku ? ` — Kunde: ${ku}` : "";
      lines.push(`- [x] (${b}) ${t.text} [id:${t.id}]${kPart}`);
    }
    lines.push("");
  }

  lines.push("## Kurz-Check");
  lines.push("");
  lines.push(
    "- Welche offenen Punkte sind blockiert?",
    "- Was muss diese Woche sicher noch passieren?",
    "- Was kann delegiert oder verschoben werden?",
    ""
  );

  return lines.join("\n").trimEnd() + "\n";
}
