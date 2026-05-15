"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddForm } from "@/components/AddForm";
import { DailyBriefingBanner } from "@/components/DailyBriefingBanner";
import { DeskPageHeader } from "@/components/DeskPageHeader";
import { TaskItem } from "@/components/TaskItem";
import { WeekReviewModal } from "@/components/WeekReviewModal";
import { DEADLINE_ORDER } from "@/lib/constants";
import {
  isOpenDueToday,
  isOpenOverdue,
  isOpenRelevantThisWeek,
  weekBounds,
} from "@/lib/dashboardMetrics";
import { wasDailyBriefingShownToday } from "@/lib/briefingStorage";
import { useDeskTasks } from "@/hooks/useDeskTasks";
import {
  isoWeekKey,
  isFridayLocal,
  markWeekReviewShownForKey,
  wasWeekReviewShownForKey,
} from "@/lib/weekReviewStorage";
import type { Task } from "@/lib/types";

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

function formatDatumLong(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function prioritySortKey(p: number | null | undefined): number {
  if (p === null || p === undefined) return 1_000_000_000;
  return p;
}

function sortOpenTasks(list: Task[]): Task[] {
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

export default function HeutePage() {
  const {
    bereiche,
    tasks,
    sync,
    error,
    busy,
    handleAdd,
    handleToggle,
    handleDelete,
    handleNotizSaved,
    handleTaskUpdated,
  } = useDeskTasks();

  const [dateTick, setDateTick] = useState(0);
  const [showDailyBriefing, setShowDailyBriefing] = useState(false);
  const [briefingFaellig, setBriefingFaellig] = useState(0);
  const [briefingUeber, setBriefingUeber] = useState(0);
  const [weekReviewOpen, setWeekReviewOpen] = useState(false);
  const weekFridayAutoRef = useRef(false);

  const clock = useMemo(() => new Date(), [dateTick]);

  useEffect(() => {
    const id = window.setInterval(() => setDateTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (wasDailyBriefingShownToday()) {
      setShowDailyBriefing(false);
      return;
    }
    if (sync !== "ok") return;
    const open = tasks.filter((t) => !t.done);
    setBriefingFaellig(open.filter((t) => isOpenDueToday(t, clock)).length);
    setBriefingUeber(open.filter((t) => isOpenOverdue(t, clock)).length);
    setShowDailyBriefing(true);
  }, [sync, tasks, clock]);

  useEffect(() => {
    if (sync !== "ok") return;
    const now = new Date();
    if (!isFridayLocal(now)) {
      weekFridayAutoRef.current = false;
      return;
    }
    const key = isoWeekKey(now);
    if (wasWeekReviewShownForKey(key)) return;
    if (weekFridayAutoRef.current) return;
    weekFridayAutoRef.current = true;
    setWeekReviewOpen(true);
  }, [sync, dateTick]);

  const datumMobile = useMemo(
    () => formatDatumMobileHeader(new Date()),
    [dateTick]
  );
  const datumLong = useMemo(() => formatDatumLong(new Date()), [dateTick]);

  const sortedOpenTasks = useMemo(
    () => sortOpenTasks(tasks.filter((t) => !t.done)),
    [tasks]
  );

  const { start: weekStart, end: weekEnd } = useMemo(
    () => weekBounds(clock),
    [clock]
  );

  const stats = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    const ueber = open.filter((t) => isOpenOverdue(t, clock)).length;
    const heute = open.filter((t) => isOpenDueToday(t, clock)).length;
    const woche = open.filter((t) =>
      isOpenRelevantThisWeek(t, weekStart, weekEnd)
    ).length;
    return { offen: open.length, ueber, heute, woche };
  }, [tasks, clock, weekStart, weekEnd]);

  const jetztDran = useMemo(() => {
    const focus = sortedOpenTasks.filter(
      (t) => isOpenOverdue(t, clock) || isOpenDueToday(t, clock)
    );
    const set = new Map<string, Task>();
    for (const t of focus) set.set(t.id, t);
    return [...set.values()].sort((a, b) => {
      const oa = isOpenOverdue(a, clock) ? 0 : 1;
      const ob = isOpenOverdue(b, clock) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      const da = a.nächste_fälligkeit || "";
      const db = b.nächste_fälligkeit || "";
      return da.localeCompare(db);
    });
  }, [sortedOpenTasks, clock]);

  const spaeterWoche = useMemo(() => {
    return sortedOpenTasks.filter(
      (t) =>
        isOpenRelevantThisWeek(t, weekStart, weekEnd) &&
        !isOpenOverdue(t, clock) &&
        !isOpenDueToday(t, clock)
    );
  }, [sortedOpenTasks, weekStart, weekEnd, clock]);

  const handleWeekReviewClose = useCallback(() => {
    markWeekReviewShownForKey(isoWeekKey(new Date()));
    setWeekReviewOpen(false);
  }, []);

  return (
    <div className="flex min-h-0 w-full max-w-full flex-col overflow-x-hidden">
      <DeskPageHeader sync={sync} datumMobile={datumMobile} busy={busy} />

      <div className="flex min-h-0 flex-col overflow-x-hidden px-[max(0.75rem,env(safe-area-inset-left))] pb-[calc(76px+env(safe-area-inset-bottom,0px))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-3 max-md:flex-none md:flex-1 md:min-h-0 md:px-[max(1rem,env(safe-area-inset-left))] md:pb-8 md:pr-[max(1rem,env(safe-area-inset-right))] md:pt-4">
        <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-4 md:max-w-lg md:gap-6">
          <header className="min-w-0 shrink-0">
            <h1 className="font-sans text-xl font-medium tracking-tight text-fg md:text-2xl">
              Heute
            </h1>
            <p className="mt-1 font-mono text-[12px] text-fg-muted md:text-[13px]">
              {datumLong}
            </p>
            <p className="mt-2 font-sans text-sm leading-snug text-fg-subtle">
              Dein Tagesfokus: zuerst Überfälliges und Heute-Fälliges — der Rest
              der Woche darunter.
            </p>
          </header>

          {error ? (
            <p className="shrink-0 rounded-md border border-accent/30 bg-accent-dim px-3 py-2 font-mono text-[12px] text-accent">
              {error}
            </p>
          ) : null}

          {showDailyBriefing ? (
            <DailyBriefingBanner
              faelligHeute={briefingFaellig}
              ueberfaellig={briefingUeber}
              hideAkquise
              onConsumed={() => setShowDailyBriefing(false)}
            />
          ) : null}

          <section className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            <div className="ui-stat-card min-w-0">
              <p className="ui-stat-value">{stats.offen}</p>
              <p className="ui-stat-label">Offen</p>
            </div>
            <div className="ui-stat-card min-w-0">
              <p className="ui-stat-value text-accent">{stats.ueber}</p>
              <p className="ui-stat-label">Überfällig</p>
            </div>
            <div className="ui-stat-card min-w-0">
              <p className="ui-stat-value text-accent">{stats.heute}</p>
              <p className="ui-stat-label">Heute fällig</p>
            </div>
            <div className="ui-stat-card min-w-0">
              <p className="ui-stat-value text-amber">{stats.woche}</p>
              <p className="ui-stat-label">Diese Woche</p>
            </div>
          </section>

          <div className="shrink-0">
            <AddForm bereiche={bereiche} disabled={busy} onAdd={handleAdd} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <h2 className="ui-label-upper">Jetzt dran</h2>
            <Link
              href="/aufgaben"
              className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-accent transition-colors hover:text-fg"
            >
              Alle Aufgaben →
            </Link>
          </div>

          <div className="flex min-w-0 flex-col divide-y divide-[#1a1a1a]">
            {jetztDran.length === 0 ? (
              <p className="rounded-md border border-dashed border-border-subtle bg-surface/50 px-3 py-6 text-center font-sans text-sm text-fg-muted">
                Nichts Überfälliges oder für heute — Ruhe oder nacharbeiten auf{" "}
                <Link href="/aufgaben" className="text-accent underline-offset-2 hover:underline">
                  Aufgaben
                </Link>
                .
              </p>
            ) : (
              jetztDran.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  bereiche={bereiche}
                  disabled={busy}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onNotizSaved={handleNotizSaved}
                  onTaskUpdated={handleTaskUpdated}
                />
              ))
            )}
          </div>

          {spaeterWoche.length > 0 ? (
            <>
              <h2 className="ui-label-upper mt-2">Später diese Woche</h2>
              <div className="flex min-w-0 flex-col divide-y divide-[#1a1a1a]">
                {spaeterWoche.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    bereiche={bereiche}
                    disabled={busy}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onNotizSaved={handleNotizSaved}
                    onTaskUpdated={handleTaskUpdated}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <WeekReviewModal open={weekReviewOpen} onClose={handleWeekReviewClose} />
    </div>
  );
}
