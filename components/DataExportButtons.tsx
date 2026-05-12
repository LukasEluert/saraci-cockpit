"use client";

import { useState } from "react";
import {
  backupDateStamp,
  buildTasksCsv,
  buildTasksJsonExport,
  downloadTextFile,
  tasksToExportRows,
} from "@/lib/exportBackup";
import { getSupabase } from "@/lib/supabase";
import { TASKS_LIST_SELECT } from "@/lib/taskSelect";
import type { Task } from "@/lib/types";

async function fetchAllTasksFromSupabase(): Promise<Task[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tasks")
    .select(TASKS_LIST_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Task[]) ?? [];
}

const btnClass =
  "ui-btn-secondary tap-scale rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide disabled:opacity-40";

const iconBtnClass =
  "tap-scale flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-bg text-fg-muted transition-[border-color,background-color,color] duration-100 ease-out hover:border-border hover:bg-surface-hover hover:text-fg disabled:opacity-40";

type Props = {
  disabled?: boolean;
  variant?: "default" | "compact";
};

export function DataExportButtons({
  disabled = false,
  variant = "default",
}: Props) {
  const [busy, setBusy] = useState<"json" | "csv" | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function run(kind: "json" | "csv") {
    setLocalError(null);
    setBusy(kind);
    try {
      const tasks = await fetchAllTasksFromSupabase();
      const rows = tasksToExportRows(tasks);
      const stamp = backupDateStamp();
      if (kind === "json") {
        downloadTextFile(
          `saraci-backup-${stamp}.json`,
          buildTasksJsonExport(rows),
          "application/json;charset=utf-8"
        );
      } else {
        downloadTextFile(
          `saraci-backup-${stamp}.csv`,
          buildTasksCsv(rows),
          "text/csv;charset=utf-8"
        );
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Export fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  const blocked = disabled || busy !== null;

  if (variant === "compact") {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          title="JSON exportieren"
          aria-label="JSON exportieren"
          disabled={blocked}
          onClick={() => void run("json")}
          className={iconBtnClass}
        >
          <span className="font-mono text-[10px] font-semibold leading-none text-accent">
            {"{}"}
          </span>
        </button>
        <button
          type="button"
          title="CSV exportieren"
          aria-label="CSV exportieren"
          disabled={blocked}
          onClick={() => void run("csv")}
          className={iconBtnClass}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <path d="M14 3v4a1 1 0 0 0 1 1h4M5 21h14a2 2 0 0 0 2-2V8l-5-5H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" />
            <path d="M9 17h6M9 13h6M9 9h2" />
          </svg>
        </button>
        {localError ? (
          <span
            className="sr-only"
            role="status"
          >
            {localError}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex max-w-full flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={blocked}
          onClick={() => void run("json")}
          className={btnClass}
        >
          {busy === "json" ? "Lade …" : "Daten exportieren (JSON)"}
        </button>
        <button
          type="button"
          disabled={blocked}
          onClick={() => void run("csv")}
          className={btnClass}
        >
          {busy === "csv" ? "Lade …" : "Daten exportieren (CSV)"}
        </button>
      </div>
      {localError ? (
        <p className="max-w-[min(100%,18rem)] text-right font-mono text-[10px] text-accent">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
