import type { Task } from "@/lib/types";

export type TaskExportRow = Task & {
  bereich_name?: string;
  bereich_farbe?: string;
};

const CSV_COLUMNS = [
  "id",
  "text",
  "bereich_id",
  "bereich_name",
  "deadline",
  "done",
  "notiz",
  "wiederkehrend",
  "wiederholung",
  "nächste_fälligkeit",
  "created_at",
  "updated_at",
] as const;

export function backupDateStamp(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildTasksJsonExport(rows: TaskExportRow[]): string {
  const payload = {
    exported_at: new Date().toISOString(),
    tasks: rows,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function rowCell(row: TaskExportRow, key: (typeof CSV_COLUMNS)[number]): string {
  if (key === "bereich_name") {
    return escapeCsvCell(row.bereich_name ?? row.bereiche?.name ?? "");
  }
  const v = row[key as keyof TaskExportRow];
  if (typeof v === "boolean") return escapeCsvCell(v);
  if (typeof v === "number") return escapeCsvCell(v);
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return "";
  return escapeCsvCell(v);
}

export function buildTasksCsv(rows: TaskExportRow[]): string {
  const header = CSV_COLUMNS.map((c) => escapeCsvCell(c)).join(",");
  const lines = rows.map((row) =>
    CSV_COLUMNS.map((key) => rowCell(row, key)).join(",")
  );
  return `\ufeff${[header, ...lines].join("\r\n")}\r\n`;
}

export function downloadTextFile(
  filename: string,
  body: string,
  mime: string
): void {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function tasksToExportRows(tasks: Task[]): TaskExportRow[] {
  return tasks.map((t) => ({
    ...t,
    bereich_name: t.bereiche?.name ?? "",
    bereich_farbe: t.bereiche?.farbe ?? "",
  }));
}
