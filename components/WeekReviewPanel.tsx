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
    <div className="ui-modal-panel flex max-h-[min(90dvh,40rem)] flex-col overflow-hidden p-0">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-6 py-5">
        <div>
          <h2 className="font-sans text-lg font-medium tracking-tight text-fg">
            Wochenrückblick
          </h2>
          <p className="mt-1 font-mono text-[11px] text-fg-subtle">
            Diese Kalenderwoche
          </p>
        </div>
        {showClose && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors duration-100 ease-out hover:bg-surface-hover hover:text-fg"
            aria-label="Schließen"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {err ? (
          <p className="font-mono text-[12px] text-accent">{err}</p>
        ) : loading ? (
          <p className="font-mono text-[12px] text-fg-muted">Lade …</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatBlock label="Erledigt KW" value={stats.erledigtWoche} />
              <StatBlock label="Offen (jetzt)" value={stats.offenJetzt} />
              <StatBlock label="Akquise KW" value={stats.akquiseWoche} />
              <StatBlock label="Rate %" value={`${stats.ratePercent}%`} />
            </div>
            <p className="mt-8 border-t border-border-subtle pt-6 font-sans text-base italic leading-relaxed text-fg-muted">
              {stats.motivation}
            </p>
            <h3 className="mt-8 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-fg-subtle">
              Top 3 erledigt (diese Woche)
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 font-sans text-sm text-fg">
              {stats.top3Erledigt.length === 0 ? (
                <li className="text-fg-muted">—</li>
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

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface px-3 py-4 shadow-[var(--stat-inset)]">
      <p className="font-mono text-[clamp(1.75rem,5vmin,2.75rem)] font-light tabular-nums leading-none text-fg">
        {value}
      </p>
      <p className="mt-2 font-mono text-[10px] font-medium uppercase leading-tight tracking-[0.06em] text-fg-subtle">
        {label}
      </p>
    </div>
  );
}
