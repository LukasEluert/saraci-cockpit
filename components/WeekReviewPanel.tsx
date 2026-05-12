"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { TASKS_LIST_SELECT } from "@/lib/taskSelect";
import { buildWeekReviewStats } from "@/lib/weekReviewStats";
import type { AkquiseLogRow, Task } from "@/lib/types";

type Props = {
  clock?: Date;
  showClose?: boolean;
  onClose?: () => void;
};

export function WeekReviewPanel({
  clock = new Date(),
  showClose,
  onClose,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [akquise, setAkquise] = useState<AkquiseLogRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const sb = getSupabase();
      const [tRes, aRes] = await Promise.all([
        sb.from("tasks").select(TASKS_LIST_SELECT),
        sb
          .from("akquise_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(120),
      ]);
      if (tRes.error) throw new Error(tRes.error.message);
      if (aRes.error) throw new Error(aRes.error.message);
      setTasks((tRes.data as Task[]) ?? []);
      setAkquise((aRes.data as AkquiseLogRow[]) ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = buildWeekReviewStats(tasks, akquise, clock);

  return (
    <div className="flex max-h-[min(90dvh,36rem)] flex-col overflow-hidden rounded-xl border border-[#333333] bg-[#111111]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#222222] px-4 py-3">
        <h2 className="font-mono text-[12px] uppercase tracking-wide text-neutral-200">
          Wochenrückblick
        </h2>
        {showClose && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-[#222222] hover:text-neutral-100"
            aria-label="Schließen"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {err ? (
          <p className="font-mono text-[12px] text-[#fca5a5]">{err}</p>
        ) : loading ? (
          <p className="font-mono text-[12px] text-neutral-500">Lade …</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatBox label="Erledigt KW" value={stats.erledigtWoche} />
              <StatBox label="Offen (jetzt)" value={stats.offenJetzt} />
              <StatBox label="Akquise KW" value={stats.akquiseWoche} />
              <StatBox label="Rate %" value={`${stats.ratePercent}%`} />
            </div>
            <p className="mt-4 rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 font-sans text-[14px] leading-relaxed text-neutral-300">
              {stats.motivation}
            </p>
            <h3 className="mt-4 font-mono text-[10px] uppercase tracking-wide text-neutral-500">
              Top 3 erledigt (diese Woche)
            </h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 font-sans text-[13px] text-neutral-200">
              {stats.top3Erledigt.length === 0 ? (
                <li className="text-neutral-500">—</li>
              ) : (
                stats.top3Erledigt.map((t) => (
                  <li key={t.id} className="break-words">
                    {t.text}
                  </li>
                ))
              )}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[#222222] bg-[#0a0a0a] px-2 py-2">
      <p className="font-mono text-[18px] tabular-nums text-neutral-100">
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[9px] uppercase leading-tight text-neutral-500">
        {label}
      </p>
    </div>
  );
}
