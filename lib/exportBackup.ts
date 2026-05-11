import type { Task } from "@/lib/types";

const CSV_COLUMNS = [
  "id",
  "text",
  "bereich",
  "deadline",
  "done",
  "created_at",
  "updated_at",
] as const;

export function backupDateStamp(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function escapeCsvCell(value: string | number | boolean): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildTasksJsonExport(tasks: Task[]): string {
  const payload = {
    exported_at: new Date().toISOString(),
    tasks,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function buildTasksCsv(tasks: Task[]): string {
  const header = CSV_COLUMNS.map((c) => escapeCsvCell(c)).join(",");
  const lines = tasks.map((row) =>
    CSV_COLUMNS.map((key) => escapeCsvCell(row[key])).join(",")
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
