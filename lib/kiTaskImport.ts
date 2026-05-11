import { DEADLINES, type Deadline } from "@/lib/constants";

export type KiImportRow = {
  id: string;
  deadline: Deadline;
  prioritaet: number | null;
};

export function parseKiTaskImportJson(raw: string): {
  ok: KiImportRow[];
  error: string | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: [], error: "Kein gültiges JSON." };
  }
  if (!Array.isArray(parsed)) {
    return { ok: [], error: "Das JSON muss ein Array sein." };
  }
  const rows: KiImportRow[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || typeof item !== "object") {
      return { ok: [], error: `Eintrag ${i + 1}: kein Objekt.` };
    }
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    if (!id) {
      return { ok: [], error: `Eintrag ${i + 1}: fehlende oder ungültige id.` };
    }
    const deadlineRaw =
      typeof o.deadline === "string" ? o.deadline.trim() : "";
    if (!(DEADLINES as readonly string[]).includes(deadlineRaw)) {
      return {
        ok: [],
        error: `Eintrag ${i + 1}: ungültige deadline "${deadlineRaw}". Erlaubt: ${DEADLINES.join(", ")}.`,
      };
    }
    const deadline = deadlineRaw as Deadline;
    let prioritaet: number | null = null;
    if (
      "prioritaet" in o &&
      o.prioritaet !== null &&
      o.prioritaet !== undefined
    ) {
      if (
        typeof o.prioritaet !== "number" ||
        !Number.isFinite(o.prioritaet) ||
        !Number.isInteger(o.prioritaet)
      ) {
        return {
          ok: [],
          error: `Eintrag ${i + 1}: prioritaet muss eine Ganzzahl sein oder fehlen.`,
        };
      }
      prioritaet = o.prioritaet;
    }
    rows.push({ id, deadline, prioritaet });
  }
  return { ok: rows, error: null };
}
