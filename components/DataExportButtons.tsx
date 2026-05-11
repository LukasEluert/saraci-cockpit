"use client";

import { useState } from "react";
import {
  backupDateStamp,
  buildTasksCsv,
  buildTasksJsonExport,
  downloadTextFile,
} from "@/lib/exportBackup";
import { getSupabase } from "@/lib/supabase";
import type { Task } from "@/lib/types";

async function fetchAllTasksFromSupabase(): Promise<Task[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Task[]) ?? [];
}

const btnClass =
  "rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-neutral-200 transition-colors hover:border-[#e63030] hover:text-white disabled:opacity-40";

type Props = {
  disabled?: boolean;
};

export function DataExportButtons({ disabled = false }: Props) {
  const [busy, setBusy] = useState<"json" | "csv" | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function run(kind: "json" | "csv") {
    setLocalError(null);
    setBusy(kind);
    try {
      const tasks = await fetchAllTasksFromSupabase();
      const stamp = backupDateStamp();
      if (kind === "json") {
        downloadTextFile(
          `saraci-backup-${stamp}.json`,
          buildTasksJsonExport(tasks),
          "application/json;charset=utf-8"
        );
      } else {
        downloadTextFile(
          `saraci-backup-${stamp}.csv`,
          buildTasksCsv(tasks),
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

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
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
        <p className="max-w-[min(100%,18rem)] text-right font-mono text-[10px] text-[#fca5a5]">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
