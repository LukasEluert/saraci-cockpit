"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  akquiseOpenContacts,
  akquiseWeekRows,
  bereichName,
  isAkquiseResponseStatus,
  isDoneThisWeek,
  isDoneToday,
  isOpenDueThisWeekLabel,
  isOpenDueToday,
  isOpenOverdue,
  isOpenRelevantThisWeek,
  normalizeProjekt,
  weekBounds,
} from "@/lib/dashboardMetrics";
import { getSupabase } from "@/lib/supabase";
import { TASKS_LIST_SELECT } from "@/lib/taskSelect";
import type { AkquiseLogRow, ProjektRow, Task } from "@/lib/types";

/** iOS: DM Mono kann Ziffern falsch rendern — KPI-Zahlen mit System-Monospace. */
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
    <div className="flex min-h-0 flex-col items-center justify-center rounded-lg border border-[#222222] bg-[#111111] px-1 py-2 text-center">
      <p
        className={`text-[clamp(1.4rem,4.5vmin,2.75rem)] leading-none tracking-tight text-neutral-100 ${kpiValueFontClass}`}
      >
        {display}
      </p>
      <p className="mt-1 max-w-full truncate px-0.5 font-mono text-[clamp(0.55rem,1.1vmin,0.7rem)] uppercase leading-tight tracking-wide text-neutral-500">
        {label}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [clock, setClock] = useState(() => new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [akquise, setAkquise] = useState<AkquiseLogRow[]>([]);
  const [projekte, setProjekte] = useState<ProjektRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const sb = getSupabase();
      const [tRes, aRes, pRes] = await Promise.all([
        sb
          .from("tasks")
          .select(TASKS_LIST_SELECT)
          .order("updated_at", { ascending: false }),
        sb
          .from("akquise_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(80),
        sb.from("projekte").select("*").order("updated_at", { ascending: false }),
      ]);
      if (tRes.error) throw new Error(tRes.error.message);
      if (aRes.error) throw new Error(aRes.error.message);
      if (pRes.error) throw new Error(pRes.error.message);
      setTasks((tRes.data as Task[]) ?? []);
      setAkquise((aRes.data as AkquiseLogRow[]) ?? []);
      setProjekte(
        ((pRes.data as Record<string, unknown>[]) ?? []).map(normalizeProjekt)
      );
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

  const { start: weekStart, end: weekEnd } = useMemo(
    () => weekBounds(clock),
    [clock]
  );

  const taskKpis = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    const offenGesamt = open.length;
    const heuteFaellig = open.filter((t) => isOpenDueToday(t, clock)).length;
    const wocheFaellig = open.filter((t) => isOpenDueThisWeekLabel(t)).length;
    const heuteErledigt = tasks.filter((t) => isDoneToday(t, clock)).length;
    const erledigtWoche = tasks.filter((t) =>
      isDoneThisWeek(t, weekStart, weekEnd)
    );
    const offenWoche = tasks.filter((t) =>
      isOpenRelevantThisWeek(t, weekStart, weekEnd)
    );
    const rate = Math.round(
      (100 * erledigtWoche.length) /
        Math.max(1, erledigtWoche.length + offenWoche.length)
    );
    return {
      offenGesamt,
      heuteFaellig,
      wocheFaellig,
      heuteErledigt,
      rate,
    };
  }, [tasks, clock, weekStart, weekEnd]);

  const akquiseKpis = useMemo(() => {
    const weekRows = akquiseWeekRows(akquise, weekStart, weekEnd);
    const total = weekRows.length;
    const responded = weekRows.filter((r) =>
      isAkquiseResponseStatus(r.status)
    ).length;
    const rate = total > 0 ? Math.round((100 * responded) / total) : 0;
    const openContacts = akquiseOpenContacts(akquise);
    const last5 = akquise.slice(0, 5);
    return { total, rate, openContacts, last5 };
  }, [akquise, weekStart, weekEnd]);

  const projektKpis = useMemo(() => {
    const inArbeit = projekte.filter((p) => p.status === "In Arbeit").length;
    const aktiv = projekte
      .filter((p) => p.status !== "Abgeschlossen")
      .slice(0, 8);
    return { inArbeit, aktiv };
  }, [projekte]);

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
    return list.slice(0, 14);
  }, [tasks, clock]);

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
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#222222] bg-[#111111] px-[max(0.25rem,env(safe-area-inset-left))] py-1 pr-[max(0.25rem,env(safe-area-inset-right))]">
        <div className="min-w-0">
          <h1 className="truncate font-sans text-[clamp(0.85rem,2vmin,1.1rem)] font-semibold tracking-tight">
            Saraci Dashboard
          </h1>
          <p className="truncate font-mono text-[clamp(0.55rem,1vmin,0.65rem)] text-neutral-500">
            Monitoring · Auto 60s
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`text-[clamp(0.75rem,1.8vmin,1rem)] text-[#e63030] ${kpiValueFontClass}`}
          >
            {timeStr}
          </p>
          <p className="max-w-[14rem] truncate font-mono text-[clamp(0.55rem,1vmin,0.65rem)] text-neutral-400">
            {dateStr}
          </p>
        </div>
      </header>

      {err ? (
        <p className="shrink-0 border-b border-[#e63030]/40 bg-[#1a0a0a] px-1 py-0.5 font-mono text-[clamp(0.6rem,1.2vmin,0.75rem)] text-[#fca5a5]">
          {err}
        </p>
      ) : null}

      <div className="p-0 max-md:w-full md:min-h-0 md:flex-[2] md:overflow-hidden">
        <div className="grid grid-cols-2 gap-px max-md:auto-rows-fr md:h-full md:min-h-0 md:grid-cols-4">
          <Kpi value={loading ? "—" : taskKpis.offenGesamt} label="Offen gesamt" />
          <Kpi value={loading ? "—" : taskKpis.heuteFaellig} label="Heute fällig" />
          <Kpi
            value={loading ? "—" : taskKpis.wocheFaellig}
            label="Diese Woche fällig"
          />
          <Kpi
            value={loading ? "—" : taskKpis.heuteErledigt}
            label="Heute erledigt"
          />
          <Kpi value={loading ? "—" : `${taskKpis.rate}%`} label="Erledigt-Rate Woche" />
          <Kpi value={loading ? "—" : akquiseKpis.total} label="Akquise diese Woche" />
          <Kpi value={loading ? "—" : `${akquiseKpis.rate}%`} label="Akquise Antwortrate" />
          <Kpi value={loading ? "—" : akquiseKpis.openContacts} label="Offene Kontakte" />
          <Kpi value={loading ? "—" : projektKpis.inArbeit} label="Projekte in Arbeit" />
        </div>
      </div>

      <section className="border-t border-[#222222] px-0 py-0 max-md:w-full md:flex md:min-h-0 md:flex-[1.1] md:flex-col md:overflow-hidden">
        <h2 className="shrink-0 px-1 font-mono text-[clamp(0.55rem,1vmin,0.7rem)] uppercase tracking-wide text-neutral-500">
          Offen heute &amp; überfällig
        </h2>
        <ul className="mt-0.5 space-y-0.5 px-1 max-md:max-h-none max-md:overflow-visible md:min-h-0 md:flex-1 md:overflow-hidden">
          {heuteListe.length === 0 ? (
            <li className="font-sans text-[clamp(0.65rem,1.2vmin,0.8rem)] text-neutral-500">
              Keine Einträge.
            </li>
          ) : (
            heuteListe.map((t) => (
              <li
                key={t.id}
                className="flex min-h-0 items-baseline gap-2 truncate font-sans text-[clamp(0.65rem,1.2vmin,0.82rem)] leading-tight text-neutral-300"
              >
                <span
                  className={
                    isOpenOverdue(t, clock)
                      ? "shrink-0 font-mono text-[#e63030]"
                      : "shrink-0 font-mono text-neutral-500"
                  }
                >
                  {isOpenOverdue(t, clock) ? "überfällig" : "heute"}
                </span>
                <span className="min-w-0 truncate">
                  <span className="font-mono text-neutral-500">
                    {bereichName(t) || "—"}
                  </span>{" "}
                  · {t.text}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-px border-t border-[#222222] p-0 max-md:w-full md:min-h-0 md:flex-[1.8] md:overflow-hidden">
        <section className="border-r border-[#222222] bg-[#111111] px-1 py-1 max-md:min-h-0 md:flex md:min-h-0 md:flex-col md:overflow-hidden">
          <h2 className="shrink-0 font-mono text-[clamp(0.55rem,1vmin,0.7rem)] uppercase tracking-wide text-neutral-500">
            Letzte Akquise
          </h2>
          <ul className="mt-1 space-y-1 max-md:overflow-visible md:min-h-0 md:flex-1 md:overflow-hidden">
            {akquiseKpis.last5.length === 0 ? (
              <li className="text-[clamp(0.6rem,1.1vmin,0.75rem)] text-neutral-500">
                —
              </li>
            ) : (
              akquiseKpis.last5.map((r) => (
                <li
                  key={r.id}
                  className="border-b border-[#222222] pb-1 last:border-0"
                >
                  <p className="truncate font-sans text-[clamp(0.65rem,1.2vmin,0.8rem)] text-neutral-200">
                    {r.firma}
                  </p>
                  <p className="truncate font-mono text-[clamp(0.55rem,1vmin,0.65rem)] text-neutral-500">
                    {r.kanal} · {r.status}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="bg-[#111111] px-1 py-1 max-md:min-h-0 md:flex md:min-h-0 md:flex-col md:overflow-hidden md:px-1.5">
          <h2 className="shrink-0 font-mono text-[clamp(0.55rem,1vmin,0.7rem)] uppercase tracking-wide text-neutral-500">
            Aktive Projekte
          </h2>
          <ul className="mt-1 space-y-1 max-md:overflow-visible md:min-h-0 md:flex-1 md:overflow-hidden">
            {projektKpis.aktiv.length === 0 ? (
              <li className="text-[clamp(0.6rem,1.1vmin,0.75rem)] text-neutral-500">
                —
              </li>
            ) : (
              projektKpis.aktiv.map((p) => (
                <li
                  key={p.id}
                  className="flex min-h-0 items-center justify-between gap-1 border-b border-[#222222] pb-1 last:border-0"
                >
                  <span className="min-w-0 truncate font-sans text-[clamp(0.65rem,1.2vmin,0.8rem)] text-neutral-200">
                    {p.kunde}
                  </span>
                  <span className="shrink-0 rounded border border-[#333333] px-1 py-0.5 font-mono text-[clamp(0.5rem,0.9vmin,0.6rem)] uppercase text-neutral-400">
                    {p.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
