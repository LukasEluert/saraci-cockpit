"use client";

import { useEffect, useMemo, useState } from "react";
import { AddForm } from "@/components/AddForm";
import { DeskPageHeader } from "@/components/DeskPageHeader";
import { TaskItem } from "@/components/TaskItem";
import { DEADLINE_ORDER } from "@/lib/constants";
import { useDeskTasks } from "@/hooks/useDeskTasks";
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

export default function AufgabenPage() {
  const [dateTick, setDateTick] = useState(0);
  const [openListFilter, setOpenListFilter] = useState<"all" | "heute">("all");
  const [kundeFilter, setKundeFilter] = useState("");

  const {
    bereiche,
    tasks,
    sync,
    error,
    busy,
    handleAdd,
    handleToggle,
    handleDelete,
    handleDeleteAllDone,
    handleNotizSaved,
    handleTaskUpdated,
  } = useDeskTasks();

  useEffect(() => {
    const id = window.setInterval(() => setDateTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const datumMobile = useMemo(
    () => formatDatumMobileHeader(new Date()),
    [dateTick]
  );

  const kundeOptions = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) {
      const k = t.kunde?.trim();
      if (k) s.add(k);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "de"));
  }, [tasks]);

  const sortedOpenTasks = useMemo(
    () => sortOpenTasks(tasks.filter((t) => !t.done)),
    [tasks]
  );
  const openByKunde = useMemo(() => {
    if (!kundeFilter) return sortedOpenTasks;
    return sortedOpenTasks.filter(
      (t) => (t.kunde?.trim() || "") === kundeFilter
    );
  }, [sortedOpenTasks, kundeFilter]);
  const openTasks = useMemo(() => {
    if (openListFilter === "heute") {
      return openByKunde.filter((t) => (t.deadline?.trim() || "") === "Heute");
    }
    return openByKunde;
  }, [openByKunde, openListFilter]);

  const doneTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.done)
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
        ),
    [tasks]
  );

  return (
    <div className="flex min-h-0 w-full max-w-full flex-col overflow-x-hidden">
      <DeskPageHeader sync={sync} datumMobile={datumMobile} busy={busy} />

      <div className="flex min-h-0 flex-col overflow-x-hidden px-[max(0.75rem,env(safe-area-inset-left))] pb-[calc(76px+env(safe-area-inset-bottom,0px))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-3 max-md:flex-none md:flex-1 md:min-h-0 md:px-[max(1rem,env(safe-area-inset-left))] md:pb-8 md:pr-[max(1rem,env(safe-area-inset-right))] md:pt-4">
        <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-4 md:max-w-lg md:gap-8">
          <header>
            <h1 className="font-sans text-xl font-medium tracking-tight text-fg md:text-2xl">
              Aufgaben
            </h1>
            <p className="mt-1 font-mono text-[11px] text-fg-muted">
              Alle offenen und erledigten Tasks · Filter · Liste
            </p>
          </header>

          {error ? (
            <p className="shrink-0 rounded-md border border-accent/30 bg-accent-dim px-3 py-2 font-mono text-[12px] text-accent">
              {error}
            </p>
          ) : null}

          <div className="shrink-0">
            <AddForm bereiche={bereiche} disabled={busy} onAdd={handleAdd} />
          </div>

          <section className="min-w-0 shrink-0">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h2 className="ui-label-upper">Offen</h2>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <label className="flex min-w-0 max-w-full items-center gap-2">
                  <span className="ui-label-upper shrink-0">Kunde</span>
                  <select
                    value={kundeFilter}
                    onChange={(e) => setKundeFilter(e.target.value)}
                    disabled={busy}
                    className="ui-select max-w-[12rem] min-w-0 flex-1 font-sans text-[13px] disabled:opacity-40 sm:max-w-[14rem]"
                    aria-label="Nach Kunde filtern"
                  >
                    <option value="">Alle Kunden</option>
                    {kundeOptions.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
                <div
                  className="flex shrink-0 rounded-md border border-border bg-bg p-0.5"
                  role="group"
                  aria-label="Liste filtern"
                >
                  <button
                    type="button"
                    onClick={() => setOpenListFilter("all")}
                    aria-pressed={openListFilter === "all"}
                    className={[
                      "tap-scale rounded px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-[background-color,color] duration-150 ease-out",
                      openListFilter === "all"
                        ? "bg-surface-hover text-fg"
                        : "text-fg-muted hover:text-fg",
                    ].join(" ")}
                  >
                    Alle
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenListFilter("heute")}
                    aria-pressed={openListFilter === "heute"}
                    className={[
                      "tap-scale rounded px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-[background-color,color] duration-150 ease-out",
                      openListFilter === "heute"
                        ? "bg-accent-dim text-accent"
                        : "text-fg-muted hover:text-fg",
                    ].join(" ")}
                  >
                    Heute
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 flex min-w-0 flex-col divide-y divide-[#1a1a1a]">
              {openTasks.length === 0 ? (
                <p className="rounded-md border border-dashed border-border-subtle bg-surface/50 px-3 py-6 text-center font-sans text-sm text-fg-muted">
                  {openListFilter === "heute" && openByKunde.length > 0
                    ? "Keine offenen Tasks mit Deadline „Heute“."
                    : kundeFilter &&
                        sortedOpenTasks.length > 0 &&
                        openByKunde.length === 0
                      ? `Keine offenen Tasks für „${kundeFilter}“.`
                      : "Nichts Offenes — gute Arbeit."}
                </p>
              ) : (
                openTasks.map((t) => (
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
          </section>

          <section className="mt-4 min-w-0 shrink-0">
            <details className="group rounded-lg border border-border-subtle bg-surface transition-[border-color,background-color] duration-100 ease-out hover:border-border hover:bg-surface-hover">
              <summary className="tap-scale cursor-pointer list-none px-4 py-3 font-mono text-[12px] uppercase tracking-wide text-fg-muted transition-colors duration-150 ease-out hover:text-fg [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  <span>
                    Erledigt
                    <span className="ml-2 text-fg-subtle">
                      ({doneTasks.length})
                    </span>
                  </span>
                  <span className="text-fg-subtle transition-transform duration-150 ease-out group-open:rotate-180">
                    ⌄
                  </span>
                </span>
              </summary>
              <div className="border-t border-border-subtle px-3 pb-3 pt-3">
                {doneTasks.length === 0 ? (
                  <p className="py-4 text-center font-sans text-sm text-fg-muted">
                    Noch keine erledigten Aufgaben.
                  </p>
                ) : (
                  <>
                    <div className="mb-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleDeleteAllDone(doneTasks.length)}
                        disabled={busy}
                        className="ui-btn-secondary tap-scale rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide disabled:opacity-40"
                      >
                        Alle erledigten löschen
                      </button>
                    </div>
                    <div className="flex flex-col divide-y divide-[#1a1a1a]">
                      {doneTasks.map((t) => (
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
                )}
              </div>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
