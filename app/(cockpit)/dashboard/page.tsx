"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  akquiseOpenContacts,
  akquiseWeekRows,
  bereichName,
  isDoneThisWeek,
  isDoneToday,
  isOpenDueToday,
  isOpenOverdue,
  isOpenRelevantThisWeek,
  weekBounds,
} from "@/lib/dashboardMetrics";
import { getSupabase } from "@/lib/supabase";
import { TASKS_LIST_SELECT } from "@/lib/taskSelect";
import { parseMonitorsUpTotal } from "@/lib/uptimeMonitors";
import type { AkquiseLogRow, Task } from "@/lib/types";

const kpiValueFontClass =
  "font-normal tabular-nums [font-family:ui-monospace,'SF_Mono',SFMono-Regular,Menlo,Monaco,Consolas,monospace] [font-variant-numeric:lining-nums]";

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
    <div className="flex min-h-0 flex-col justify-center rounded-lg border border-[#222222] bg-[#111111] px-2 py-3 md:px-3 md:py-4">
      <p
        className={`text-[clamp(1.25rem,4vmin,2.25rem)] leading-none tracking-tight text-neutral-100 ${kpiValueFontClass}`}
      >
        {display}
      </p>
      <p className="mt-1.5 font-mono text-[9px] uppercase leading-tight tracking-wide text-neutral-500 md:text-[10px]">
        {label}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [clock, setClock] = useState(() => new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [akquise, setAkquise] = useState<AkquiseLogRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [webOnline, setWebOnline] = useState<{ up: number; total: number } | null>(
    null
  );

  const load = useCallback(async () => {
    setErr(null);
    try {
      const sb = getSupabase();
      const [tRes, aRes] = await Promise.all([
        sb
          .from("tasks")
          .select(TASKS_LIST_SELECT)
          .order("updated_at", { ascending: false }),
        sb
          .from("akquise_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(80),
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
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadWebsites() {
      try {
        const res = await fetch("/api/monitors", { cache: "no-store" });
        if (!res.ok) return;
        const raw: unknown = await res.json();
        if (cancelled) return;
        const parsed = parseMonitorsUpTotal(raw);
        setWebOnline(parsed);
      } catch {
        if (!cancelled) setWebOnline(null);
      }
    }
    void loadWebsites();
    const id = window.setInterval(() => void loadWebsites(), 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const { start: weekStart, end: weekEnd } = useMemo(
    () => weekBounds(clock),
    [clock]
  );

  const row1 = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    const offenHeute = open.filter((t) => isOpenDueToday(t, clock)).length;
    const offenWoche = open.filter((t) =>
      isOpenRelevantThisWeek(t, weekStart, weekEnd)
    ).length;
    const erledigtHeute = tasks.filter((t) => isDoneToday(t, clock)).length;
    const erledigtWoche = tasks.filter((t) =>
      isDoneThisWeek(t, weekStart, weekEnd)
    );
    const offenWocheSet = open.filter((t) =>
      isOpenRelevantThisWeek(t, weekStart, weekEnd)
    );
    const rate = Math.round(
      (100 * erledigtWoche.length) /
        Math.max(1, erledigtWoche.length + offenWocheSet.length)
    );
    return { offenHeute, offenWoche, erledigtHeute, rate };
  }, [tasks, clock, weekStart, weekEnd]);

  const row2 = useMemo(() => {
    const weekRows = akquiseWeekRows(akquise, weekStart, weekEnd);
    const openContacts = akquiseOpenContacts(akquise);
    return {
      akquiseWoche: weekRows.length,
      openContacts,
    };
  }, [akquise, weekStart, weekEnd]);

  const heuteListe = useMemo(() => {
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
    return list.slice(0, 20);
  }, [tasks, clock]);

  const lastAkquise = useMemo(() => akquise.slice(0, 5), [akquise]);

  const dateStr = clock.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = clock.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-[#0a0a0a] text-neutral-100 max-md:min-h-0 md:h-full md:min-h-0 md:flex-1 md:flex-col md:overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#222222] bg-[#111111] px-[max(0.5rem,env(safe-area-inset-left))] py-2 pr-[max(0.5rem,env(safe-area-inset-right))]">
        <div className="min-w-0">
          <h1 className="truncate font-sans text-lg font-semibold tracking-tight md:text-xl">
            Dashboard
          </h1>
          <p className="truncate font-mono text-[10px] text-neutral-500 md:text-[11px]">
            Tasks · Akquise · Websites
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`text-sm text-[#e63030] md:text-base ${kpiValueFontClass}`}
          >
            {timeStr}
          </p>
          <p className="max-w-[14rem] truncate font-mono text-[10px] text-neutral-400">
            {dateStr}
          </p>
        </div>
      </header>

      {err ? (
        <p className="shrink-0 border-b border-[#e63030]/40 bg-[#1a0a0a] px-3 py-2 font-mono text-[12px] text-[#fca5a5]">
          {err}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 md:p-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          <Kpi
            value={loading ? "—" : row1.offenHeute}
            label="Heute fällig"
          />
          <Kpi
            value={loading ? "—" : row1.offenWoche}
            label="Diese Woche"
          />
          <Kpi
            value={loading ? "—" : row1.erledigtHeute}
            label="Erledigt heute"
          />
          <Kpi
            value={loading ? "—" : `${row1.rate}%`}
            label="Rate %"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:gap-3">
          <Kpi
            value={loading ? "—" : row2.akquiseWoche}
            label="Akquisen diese Woche"
          />
          <Kpi
            value={loading ? "—" : row2.openContacts}
            label="Offene Kontakte"
          />
          <Kpi
            value={
              loading || !webOnline
                ? "—"
                : `${webOnline.up}/${webOnline.total}`
            }
            label="Websites online"
          />
        </div>

        <section className="rounded-xl border border-[#222222] bg-[#111111] p-3 md:p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Heute + Überfällig
          </h2>
          <ul className="mt-3 space-y-2">
            {heuteListe.length === 0 ? (
              <li className="font-sans text-sm text-neutral-500">
                Keine Einträge.
              </li>
            ) : (
              heuteListe.map((t) => (
                <li
                  key={t.id}
                  className="flex min-h-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-[#222222] pb-2 font-sans text-sm leading-snug text-neutral-300 last:border-0 last:pb-0"
                >
                  <span
                    className={
                      isOpenOverdue(t, clock)
                        ? "shrink-0 font-mono text-[11px] text-[#e63030]"
                        : "shrink-0 font-mono text-[11px] text-neutral-500"
                    }
                  >
                    {isOpenOverdue(t, clock) ? "überfällig" : "heute"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-mono text-neutral-500">
                      {bereichName(t) || "—"}
                    </span>
                    {t.kunde?.trim() ? (
                      <span className="font-mono text-neutral-600">
                        {" "}
                        · {t.kunde.trim()}
                      </span>
                    ) : null}
                    <span className="text-neutral-200"> · {t.text}</span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-[#222222] bg-[#111111] p-3 md:p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Letzte Akquisen
          </h2>
          <ul className="mt-3 space-y-3">
            {lastAkquise.length === 0 ? (
              <li className="text-sm text-neutral-500">—</li>
            ) : (
              lastAkquise.map((r) => (
                <li
                  key={r.id}
                  className="border-b border-[#222222] pb-3 last:border-0 last:pb-0"
                >
                  <p className="font-sans text-sm font-medium text-neutral-200">
                    {r.firma}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-neutral-500">
                    {r.kanal} · {r.status}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
