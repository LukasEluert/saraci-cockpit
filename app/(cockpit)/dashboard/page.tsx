"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  bereichName,
  isDoneThisWeek,
  isOpenDueToday,
  isOpenOverdue,
  isOpenRelevantThisWeek,
  weekBounds,
} from "@/lib/dashboardMetrics";
import { DEADLINE_ORDER } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import { TASKS_LIST_SELECT } from "@/lib/taskSelect";
import type { Task } from "@/lib/types";

function Kpi({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  const display =
    typeof value === "number"
      ? Number.isFinite(value)
        ? String(value)
        : "—"
      : value;
  return (
    <div className="ui-stat-card flex min-h-0 flex-col justify-center">
      <p className="ui-dashboard-kpi-value font-mono font-light leading-none tracking-tight text-fg">
        {display}
      </p>
      <p className="ui-dashboard-kpi-label mt-2 font-mono text-[10px] font-medium uppercase leading-tight tracking-[0.06em] text-fg-subtle">
        {label}
      </p>
    </div>
  );
}

function prioritySortKey(p: number | null | undefined): number {
  if (p === null || p === undefined) return 1_000_000_000;
  return p;
}

function sortTopOpenTasks(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    const pa = prioritySortKey(a.prioritaet);
    const pb = prioritySortKey(b.prioritaet);
    if (pa !== pb) return pa - pb;
    const ra = DEADLINE_ORDER[a.deadline || ""] ?? 99;
    const rb = DEADLINE_ORDER[b.deadline || ""] ?? 99;
    if (ra !== rb) return ra - rb;
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });
}

export default function DashboardPage() {
  const [clock, setClock] = useState(() => new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("tasks")
        .select(TASKS_LIST_SELECT)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      setTasks((data as Task[]) ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { start: weekStart, end: weekEnd } = useMemo(
    () => weekBounds(clock),
    [clock]
  );

  const metrics = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    const offen = open.length;
    const heuteFaellig = open.filter((t) => isOpenDueToday(t, clock)).length;
    const ueberfaellig = open.filter((t) => isOpenOverdue(t, clock)).length;
    const dieseWocheOffen = open.filter((t) =>
      isOpenRelevantThisWeek(t, weekStart, weekEnd)
    ).length;
    const erledigtWoche = tasks.filter((t) =>
      isDoneThisWeek(t, weekStart, weekEnd)
    );
    const offenRelevant = open.filter((t) =>
      isOpenRelevantThisWeek(t, weekStart, weekEnd)
    );
    const wochenfortschritt = Math.round(
      (100 * erledigtWoche.length) /
        Math.max(1, erledigtWoche.length + offenRelevant.length)
    );
    const topPrio = sortTopOpenTasks(open).slice(0, 12);
    return {
      offen,
      heuteFaellig,
      ueberfaellig,
      dieseWocheOffen,
      erledigtWocheCount: erledigtWoche.length,
      wochenfortschritt,
      topPrio,
    };
  }, [tasks, clock, weekStart, weekEnd]);

  const dateStr = clock.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = clock.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="cockpit-dashboard--tv flex w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-bg text-fg max-md:min-h-0 md:h-full md:min-h-0 md:flex-1 md:flex-col md:overflow-hidden">
      <header className="flex min-h-[52px] shrink-0 items-center justify-between gap-2 border-b border-border-subtle bg-bg-elevated px-[max(0.5rem,env(safe-area-inset-left))] py-2 pr-[max(0.5rem,env(safe-area-inset-right))]">
        <div className="min-w-0">
          <h1 className="truncate font-sans text-lg font-medium tracking-tight md:text-xl">
            Dashboard
          </h1>
          <p className="truncate font-mono text-[10px] text-fg-muted md:text-[11px]">
            Persönliche Aufgaben
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-light tabular-nums tracking-tight text-accent md:text-base">
            {timeStr}
          </p>
          <p className="max-w-[14rem] truncate font-mono text-[10px] text-fg-subtle">
            {dateStr}
          </p>
        </div>
      </header>

      {err ? (
        <p className="shrink-0 border-b border-accent/30 bg-accent-dim px-3 py-2 font-mono text-[12px] text-accent">
          {err}
        </p>
      ) : null}

      <div className="ui-dashboard-grid flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:gap-8 md:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          <Kpi value={loading ? "—" : metrics.offen} label="Offen" />
          <Kpi value={loading ? "—" : metrics.heuteFaellig} label="Heute fällig" />
          <Kpi value={loading ? "—" : metrics.ueberfaellig} label="Überfällig" />
          <Kpi value={loading ? "—" : metrics.dieseWocheOffen} label="Diese Woche" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
          <Kpi
            value={loading ? "—" : metrics.erledigtWocheCount}
            label="Erledigt diese Woche"
          />
          <div className="ui-stat-card flex min-h-0 flex-col justify-center gap-3">
            <p className="ui-dashboard-kpi-value font-mono font-light leading-none tracking-tight text-fg">
              {loading ? "—" : `${metrics.wochenfortschritt}%`}
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{
                  width: loading ? "0%" : `${metrics.wochenfortschritt}%`,
                }}
              />
            </div>
            <p className="ui-dashboard-kpi-label font-mono text-[10px] font-medium uppercase leading-tight tracking-[0.06em] text-fg-subtle">
              Wochenfortschritt (Kalenderwoche)
            </p>
          </div>
        </div>

        <section className="ui-dashboard-section ui-dashboard-divider rounded-lg border border-border-subtle bg-surface p-4 shadow-[var(--stat-inset)] md:p-5">
          <h2 className="ui-label-upper text-fg-muted">Top-Prioritäten</h2>
          <ul className="mt-4 space-y-3">
            {metrics.topPrio.length === 0 ? (
              <li className="font-sans text-sm text-fg-muted">
                Keine offenen Aufgaben.
              </li>
            ) : (
              metrics.topPrio.map((t) => (
                <li
                  key={t.id}
                  className="flex min-h-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border-subtle pb-3 font-sans text-sm leading-snug text-fg-muted last:border-0 last:pb-0"
                >
                  <span className="shrink-0 font-mono text-[11px] font-light text-accent">
                    P{t.prioritaet ?? "—"}
                  </span>
                  <span className="min-w-0 flex-1 text-fg">
                    <span className="font-mono text-fg-muted">
                      {bereichName(t) || "—"}
                    </span>
                    {t.kunde?.trim() ? (
                      <span className="font-mono text-fg-subtle">
                        {" "}
                        · {t.kunde.trim()}
                      </span>
                    ) : null}
                    <span className="text-fg"> · {t.text}</span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="ui-dashboard-section rounded-lg border border-border-subtle bg-surface p-4 shadow-[var(--stat-inset)] md:p-5">
          <h2 className="ui-label-upper text-fg-muted">Heute + Überfällig</h2>
          <ul className="mt-4 space-y-3">
            {(() => {
              const open = tasks.filter((t) => !t.done);
              const set = new Map<string, Task>();
              for (const t of open) {
                if (isOpenOverdue(t, clock) || isOpenDueToday(t, clock)) {
                  set.set(t.id, t);
                }
              }
              const list = [...set.values()].sort((a, b) => {
                const oa = isOpenOverdue(a, clock) ? 0 : 1;
                const ob = isOpenOverdue(b, clock) ? 0 : 1;
                if (oa !== ob) return oa - ob;
                const da = a.nächste_fälligkeit || "";
                const db = b.nächste_fälligkeit || "";
                return da.localeCompare(db);
              });
              const shown = list.slice(0, 24);
              return shown.length === 0 ? (
                <li className="font-sans text-sm text-fg-muted">Keine Einträge.</li>
              ) : (
                shown.map((t) => (
                  <li
                    key={t.id}
                    className="flex min-h-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border-subtle pb-3 font-sans text-sm leading-snug text-fg-muted last:border-0 last:pb-0"
                  >
                    <span
                      className={
                        isOpenOverdue(t, clock)
                          ? "shrink-0 font-mono text-[11px] font-light text-accent"
                          : "shrink-0 font-mono text-[11px] font-light text-fg-subtle"
                      }
                    >
                      {isOpenOverdue(t, clock) ? "überfällig" : "heute"}
                    </span>
                    <span className="min-w-0 flex-1 text-fg">
                      <span className="font-mono text-fg-muted">
                        {bereichName(t) || "—"}
                      </span>
                      {t.kunde?.trim() ? (
                        <span className="font-mono text-fg-subtle">
                          {" "}
                          · {t.kunde.trim()}
                        </span>
                      ) : null}
                      <span className="text-fg"> · {t.text}</span>
                    </span>
                  </li>
                ))
              );
            })()}
          </ul>
        </section>
      </div>
    </div>
  );
}
