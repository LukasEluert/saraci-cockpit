"use client";

import { useMemo } from "react";
import { DeskPageHeader } from "@/components/DeskPageHeader";
import { isOpenDueToday, isOpenOverdue } from "@/lib/dashboardMetrics";
import { markDailyBriefingShownToday } from "@/lib/briefingStorage";
import { useDeskTasks } from "@/hooks/useDeskTasks";

function formatDatumMobileHeader(d: Date): string {
  const parts = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(d);
  const v = (t: "weekday" | "day" | "month") =>
    parts.find((p) => p.type === t)?.value?.trim() ?? "";
  let wd = v("weekday");
  if (wd && !wd.endsWith(".")) wd = `${wd}.`;
  return `${wd} ${v("day")}.${v("month")}`;
}

export default function BriefingPage() {
  const { tasks, sync, error, busy } = useDeskTasks();
  const datumMobile = useMemo(() => formatDatumMobileHeader(new Date()), []);

  const counts = useMemo(() => {
    const clock = new Date();
    const open = tasks.filter((t) => !t.done);
    return {
      faelligHeute: open.filter((t) => isOpenDueToday(t, clock)).length,
      ueberfaellig: open.filter((t) => isOpenOverdue(t, clock)).length,
    };
  }, [tasks]);

  return (
    <div className="flex min-h-0 w-full max-w-full flex-col overflow-x-hidden">
      <DeskPageHeader sync={sync} datumMobile={datumMobile} busy={busy} />

      <div className="flex flex-col px-[max(0.75rem,env(safe-area-inset-left))] pb-[calc(76px+env(safe-area-inset-bottom,0px))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-4 md:px-[max(1rem,env(safe-area-inset-left))] md:pb-8 md:pr-[max(1rem,env(safe-area-inset-right))]">
        <div className="mx-auto w-full max-w-lg space-y-6">
          <header>
            <h1 className="font-sans text-xl font-medium tracking-tight text-fg md:text-2xl">
              Briefing
            </h1>
            <p className="mt-2 font-sans text-sm leading-relaxed text-fg-muted">
              Kurzer Überblick über deine offenen Aufgaben — ohne Abhängigkeit
              von anderen Saraci-Modulen.
            </p>
          </header>

          {error ? (
            <p className="rounded-md border border-accent/30 bg-accent-dim px-3 py-2 font-mono text-[12px] text-accent">
              {error}
            </p>
          ) : null}

          <section className="rounded-lg border border-accent/20 bg-surface p-4 shadow-[var(--stat-inset)]">
            <p className="font-mono text-[12px] leading-relaxed text-fg md:text-[13px]">
              <span className="text-accent">Stand:</span>{" "}
              {counts.faelligHeute}{" "}
              {counts.faelligHeute === 1 ? "Task" : "Tasks"} mit Fokus Heute ·{" "}
              {counts.ueberfaellig} überfällig
            </p>
            <button
              type="button"
              onClick={() => {
                markDailyBriefingShownToday();
              }}
              className="ui-btn-secondary tap-scale mt-4 rounded-md px-4 py-2 font-mono text-[11px] uppercase tracking-wide"
            >
              Heute nicht mehr automatisch einblenden
            </button>
            <p className="mt-2 font-sans text-xs text-fg-subtle">
              Entspricht dem „Briefing geschlossen“ auf der{" "}
              <span className="text-fg-muted">Heute</span>-Seite und gilt nur für
              heute.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
