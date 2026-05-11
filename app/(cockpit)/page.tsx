"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddForm, type AddTaskPayload } from "@/components/AddForm";
import { DataExportButtons } from "@/components/DataExportButtons";
import { LogoutButton } from "@/components/LogoutButton";
import { SaraciLogo } from "@/components/SaraciLogo";
import { TaskItem } from "@/components/TaskItem";
import { DEADLINE_ORDER } from "@/lib/constants";
import { buildLeitfadenExport } from "@/lib/exportGuide";
import { getSupabase } from "@/lib/supabase";
import { computeNextFälligkeit, todayYmd } from "@/lib/recurrence";
import { ensureDefaultBereiche } from "@/lib/seedBereiche";
import { TASKS_LIST_SELECT } from "@/lib/taskSelect";
import type { BereichRow, Task, Wiederholung } from "@/lib/types";

type SyncState = "ok" | "syncing" | "error";

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

function sortOpenTasks(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    const ra = DEADLINE_ORDER[a.deadline || ""] ?? 99;
    const rb = DEADLINE_ORDER[b.deadline || ""] ?? 99;
    if (ra !== rb) return ra - rb;
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });
}

function SyncDot({
  status,
  compact,
}: {
  status: SyncState;
  compact?: boolean;
}) {
  const color =
    status === "ok"
      ? "bg-[#22c55e]"
      : status === "syncing"
        ? "bg-[#eab308]"
        : "bg-[#e63030]";
  const label =
    status === "ok"
      ? "Verbunden"
      : status === "syncing"
        ? "Sync …"
        : "Fehler";

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={label}
    >
      <span
        className={[
          "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
          color,
          status === "syncing" ? "animate-pulse" : "",
        ].join(" ")}
        aria-hidden
      />
      {compact ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
          {label}
        </span>
      )}
    </span>
  );
}

export default function Home() {
  const [bereiche, setBereiche] = useState<BereichRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sync, setSync] = useState<SyncState>("syncing");
  const [error, setError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState(false);
  const [dateTick, setDateTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setDateTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const datumMobile = useMemo(
    () => formatDatumMobileHeader(new Date()),
    [dateTick]
  );

  const runWithSync = useCallback(async (fn: () => Promise<void>) => {
    setSync("syncing");
    setError(null);
    try {
      await fn();
      setSync("ok");
    } catch (e) {
      setSync("error");
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(msg);
      throw e;
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setSync("syncing");
    setError(null);
    try {
      const sb = getSupabase();
      await ensureDefaultBereiche(sb);
      const { data: b, error: bErr } = await sb
        .from("bereiche")
        .select("*")
        .order("name");
      if (bErr) throw new Error(bErr.message);
      setBereiche((b as BereichRow[]) ?? []);
      const { data: t, error: tErr } = await sb
        .from("tasks")
        .select(TASKS_LIST_SELECT)
        .order("created_at", { ascending: false });
      if (tErr) throw new Error(tErr.message);
      setTasks((t as Task[]) ?? []);
      setSync("ok");
    } catch (e) {
      setSync("error");
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      setError(msg);
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void bootstrap();
    });
  }, [bootstrap]);

  const openTasks = useMemo(
    () => sortOpenTasks(tasks.filter((t) => !t.done)),
    [tasks]
  );
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

  const stats = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    const heute = open.filter(
      (t) => (t.deadline?.trim() || "") === "Heute"
    ).length;
    const woche = open.filter((t) => {
      const d = t.deadline?.trim() || "";
      return d === "Heute" || d === "Diese Woche";
    }).length;
    return { offen: open.length, heute, woche };
  }, [tasks]);

  async function handleAdd(payload: AddTaskPayload) {
    await runWithSync(async () => {
      const sb = getSupabase();
      const now = new Date().toISOString();
      const row: Record<string, unknown> = {
        text: payload.text,
        bereich_id: payload.bereich_id,
        deadline: payload.deadline,
        done: false,
        notiz: null,
        wiederkehrend: payload.wiederkehrend,
        wiederholung: payload.wiederkehrend ? payload.wiederholung : null,
        nächste_fälligkeit: payload.wiederkehrend ? todayYmd() : null,
        created_at: now,
        updated_at: now,
      };
      const { data, error: insErr } = await sb
        .from("tasks")
        .insert(row)
        .select(TASKS_LIST_SELECT)
        .single();
      if (insErr) throw new Error(insErr.message);
      setTasks((prev) => [data as Task, ...prev]);
    });
  }

  async function handleToggle(task: Task) {
    const next = !task.done;
    const w = (task.wiederholung ?? null) as Wiederholung | null;

    if (next && task.wiederkehrend && w) {
      await runWithSync(async () => {
        const sb = getSupabase();
        const now = new Date().toISOString();
        const { error: uErr } = await sb
          .from("tasks")
          .update({ done: true, updated_at: now })
          .eq("id", task.id);
        if (uErr) throw new Error(uErr.message);
        const base = task.nächste_fälligkeit || todayYmd();
        const nextDue = computeNextFälligkeit(base, w);
        const insertRow: Record<string, unknown> = {
          text: task.text,
          bereich_id: task.bereich_id,
          deadline: task.deadline,
          done: false,
          notiz: null,
          wiederkehrend: true,
          wiederholung: w,
          nächste_fälligkeit: nextDue,
          created_at: now,
          updated_at: now,
        };
        const { data: created, error: cErr } = await sb
          .from("tasks")
          .insert(insertRow)
          .select(TASKS_LIST_SELECT)
          .single();
        if (cErr) throw new Error(cErr.message);
        setTasks((prev) => {
          const marked = prev.map((t) =>
            t.id === task.id ? { ...t, done: true, updated_at: now } : t
          );
          return [created as Task, ...marked];
        });
      });
      return;
    }

    await runWithSync(async () => {
      const sb = getSupabase();
      const now = new Date().toISOString();
      const { error: uErr } = await sb
        .from("tasks")
        .update({ done: next, updated_at: now })
        .eq("id", task.id);
      if (uErr) throw new Error(uErr.message);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, done: next, updated_at: now } : t
        )
      );
    });
  }

  async function handleDelete(task: Task) {
    await runWithSync(async () => {
      const sb = getSupabase();
      const { error: dErr } = await sb.from("tasks").delete().eq("id", task.id);
      if (dErr) throw new Error(dErr.message);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    });
  }

  async function handleDeleteAllDone() {
    if (doneTasks.length === 0) return;
    const ok = window.confirm(
      `Alle ${doneTasks.length} erledigten Aufgaben unwiderruflich löschen?`
    );
    if (!ok) return;
    await runWithSync(async () => {
      const sb = getSupabase();
      const { error: dErr } = await sb.from("tasks").delete().eq("done", true);
      if (dErr) throw new Error(dErr.message);
      setTasks((prev) => prev.filter((t) => !t.done));
    });
  }

  function handleNotizSaved(taskId: string, notiz: string | null) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, notiz, updated_at: new Date().toISOString() } : t
      )
    );
  }

  async function handleExportCopy() {
    const body = buildLeitfadenExport({ tasks });
    try {
      await navigator.clipboard.writeText(body);
      setCopyNotice(true);
      window.setTimeout(() => setCopyNotice(false), 2000);
    } catch {
      setError("Zwischenablage nicht verfügbar.");
      setSync("error");
    }
  }

  const busy = sync === "syncing";

  return (
    <div className="flex min-h-0 w-full max-w-full flex-col overflow-x-hidden">
      <header className="shrink-0 bg-[#0a0a0a]">
        <div className="border-b border-[#222222] pt-[env(safe-area-inset-top)] md:hidden">
          <div className="flex h-14 max-w-full items-center gap-1.5 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
            <SaraciLogo
              height={28}
              priority
              className="max-h-[28px] shrink-0 object-contain"
            />
            <h1 className="min-w-0 flex-1 truncate font-mono text-[10px] font-semibold uppercase leading-tight tracking-wide text-neutral-100">
              Saraci Cockpit
            </h1>
            <div className="flex shrink-0 items-center gap-1">
              <SyncDot status={sync} compact />
              <time
                dateTime={new Date().toISOString()}
                className="whitespace-nowrap font-mono text-[10px] tabular-nums text-neutral-400"
              >
                {datumMobile}
              </time>
              <LogoutButton variant="compact" />
            </div>
          </div>
        </div>

        <div className="hidden max-w-full flex-col gap-3 px-[max(1rem,env(safe-area-inset-left))] pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] md:flex">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-sans text-xl font-medium tracking-tight text-neutral-100">
                Saraci Cockpit
              </h1>
              <p className="mt-1 font-mono text-[11px] text-neutral-500">
                Aufgaben · Supabase
              </p>
            </div>
            <div className="flex max-w-full shrink-0 flex-col items-end gap-3">
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                <LogoutButton />
                <SyncDot status={sync} />
              </div>
              <DataExportButtons disabled={busy} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-col overflow-x-hidden px-[max(0.75rem,env(safe-area-inset-left))] pb-4 pr-[max(0.75rem,env(safe-area-inset-right))] pt-3 max-md:flex-none md:flex-1 md:min-h-0 md:px-[max(1rem,env(safe-area-inset-left))] md:pb-8 md:pr-[max(1rem,env(safe-area-inset-right))] md:pt-0">
        <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-4 md:max-w-lg md:gap-8">
          {error ? (
            <p className="shrink-0 rounded-lg border border-[#e63030]/40 bg-[#1a0a0a] px-3 py-2 font-mono text-[12px] text-[#fca5a5]">
              {error}
            </p>
          ) : null}

          <section className="grid w-full max-w-full shrink-0 grid-cols-3 gap-2 md:gap-3">
            <div className="min-w-0 rounded-xl border border-[#222222] bg-[#111111] px-2 py-3 md:px-3 md:py-4">
              <p className="font-mono text-[9px] uppercase leading-tight tracking-wide text-neutral-500 md:text-[10px]">
                Offen
              </p>
              <p className="mt-1 font-mono text-[18px] font-normal tabular-nums leading-none text-neutral-100 md:text-3xl">
                {stats.offen}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-[#222222] bg-[#111111] px-2 py-3 md:px-3 md:py-4">
              <p className="font-mono text-[9px] uppercase leading-tight tracking-wide text-neutral-500 md:text-[10px]">
                Heute fällig
              </p>
              <p className="mt-1 font-mono text-[18px] font-normal tabular-nums leading-none text-[#f87171] md:text-3xl">
                {stats.heute}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-[#222222] bg-[#111111] px-2 py-3 md:px-3 md:py-4">
              <p className="font-mono text-[9px] uppercase leading-tight tracking-wide text-neutral-500 md:text-[10px]">
                Diese Woche
              </p>
              <p className="mt-1 font-mono text-[18px] font-normal tabular-nums leading-none text-[#fcd34d] md:text-3xl">
                {stats.woche}
              </p>
            </div>
          </section>

          <div className="shrink-0">
            <AddForm bereiche={bereiche} disabled={busy} onAdd={handleAdd} />
          </div>

          <div className="flex min-w-0 flex-col overflow-x-hidden max-md:pb-2">
            <section className="min-w-0 shrink-0">
              <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
                Offen
              </h2>
              <div className="mt-3 flex min-w-0 flex-col gap-2">
                {openTasks.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#333333] px-3 py-6 text-center font-sans text-sm text-neutral-500">
                    Nichts Offenes — gute Arbeit.
                  </p>
                ) : (
                  openTasks.map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onNotizSaved={handleNotizSaved}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="mt-4 min-w-0 shrink-0">
            <details className="group rounded-xl border border-[#222222] bg-[#111111]">
              <summary className="tap-scale cursor-pointer list-none px-4 py-3 font-mono text-[12px] uppercase tracking-wide text-neutral-400 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  <span>
                    Erledigt
                    <span className="ml-2 text-neutral-600">
                      ({doneTasks.length})
                    </span>
                  </span>
                  <span className="text-neutral-600 transition-transform duration-150 group-open:rotate-180">
                    ⌄
                  </span>
                </span>
              </summary>
              <div className="border-t border-[#222222] px-3 pb-3 pt-3">
                {doneTasks.length === 0 ? (
                  <p className="py-4 text-center font-sans text-sm text-neutral-500">
                    Noch keine erledigten Aufgaben.
                  </p>
                ) : (
                  <>
                    <div className="mb-4 flex justify-end">
                      <button
                        type="button"
                        onClick={handleDeleteAllDone}
                        disabled={busy}
                        className="tap-scale rounded-lg border border-[#333333] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-neutral-400 transition-colors hover:border-[#e63030] hover:text-[#e63030] disabled:opacity-40"
                      >
                        Alle erledigten löschen
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {doneTasks.map((t) => (
                        <TaskItem
                          key={t.id}
                          task={t}
                          onToggle={handleToggle}
                          onDelete={handleDelete}
                          onNotizSaved={handleNotizSaved}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </details>
            </section>

            <section className="mt-4 min-w-0 shrink-0 rounded-xl border border-[#333333] bg-[#141414] p-4 max-md:mb-2">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-wide text-neutral-200">
              Export für Leitfaden
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-neutral-300">
              Kopiert strukturierten Text für z. B. Claude (Markdown-Abschnitte,
              Bereiche, Checkboxen).
            </p>
            <button
              type="button"
              onClick={handleExportCopy}
              disabled={busy}
              className="tap-scale mt-4 w-full max-h-11 rounded-lg border border-[#e63030]/50 bg-[#1a1a1a] px-4 py-2.5 font-mono text-[12px] uppercase tracking-wide text-neutral-100 transition-colors hover:border-[#e63030] hover:bg-[#222222] hover:text-white disabled:opacity-40"
            >
              {copyNotice ? "In Zwischenablage kopiert" : "Text kopieren"}
            </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
