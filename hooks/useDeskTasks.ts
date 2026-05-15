"use client";

import { useCallback, useEffect, useState } from "react";
import type { AddTaskPayload } from "@/components/AddForm";
import { parseKiTaskImportJson } from "@/lib/kiTaskImport";
import { getSupabase } from "@/lib/supabase";
import { computeNextFälligkeit, todayYmd } from "@/lib/recurrence";
import { ensureDefaultBereiche } from "@/lib/seedBereiche";
import { TASKS_LIST_SELECT } from "@/lib/taskSelect";
import type { BereichRow, Task, Wiederholung } from "@/lib/types";

export type DeskSyncState = "ok" | "syncing" | "error";

export function useDeskTasks() {
  const [bereiche, setBereiche] = useState<BereichRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sync, setSync] = useState<DeskSyncState>("syncing");
  const [error, setError] = useState<string | null>(null);
  const [kiImportNotice, setKiImportNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!kiImportNotice) return;
    const id = window.setTimeout(() => setKiImportNotice(null), 5000);
    return () => window.clearTimeout(id);
  }, [kiImportNotice]);

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

  async function handleAdd(payload: AddTaskPayload) {
    await runWithSync(async () => {
      const sb = getSupabase();
      const now = new Date().toISOString();
      const row: Record<string, unknown> = {
        text: payload.text,
        bereich_id: payload.bereich_id,
        deadline: payload.deadline,
        prioritaet: null,
        kunde: payload.kunde,
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
          prioritaet: task.prioritaet ?? null,
          kunde: task.kunde?.trim() || null,
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

  async function handleDeleteAllDone(doneCount: number) {
    if (doneCount === 0) return;
    const ok = window.confirm(
      `Alle ${doneCount} erledigten Aufgaben unwiderruflich löschen?`
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

  function handleTaskUpdated(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function runKiImport(json: string) {
    const { ok: rows, error: parseErr } = parseKiTaskImportJson(json);
    if (parseErr) throw new Error(parseErr);
    if (rows.length === 0) throw new Error("Liste ist leer.");
    await runWithSync(async () => {
      const sb = getSupabase();
      const now = new Date().toISOString();
      let count = 0;
      for (const r of rows) {
        const { data, error: uErr } = await sb
          .from("tasks")
          .update({
            deadline: r.deadline,
            prioritaet: r.prioritaet,
            updated_at: now,
          })
          .eq("id", r.id)
          .select("id");
        if (uErr) throw new Error(uErr.message);
        if (data && data.length > 0) count += 1;
      }
      setTasks((prev) =>
        prev.map((t) => {
          const u = rows.find((row) => row.id === t.id);
          if (!u) return t;
          return {
            ...t,
            deadline: u.deadline,
            prioritaet: u.prioritaet,
            updated_at: now,
          };
        })
      );
      setKiImportNotice(`${count} Tasks aktualisiert`);
    });
  }

  const busy = sync === "syncing";

  return {
    bereiche,
    tasks,
    sync,
    error,
    kiImportNotice,
    busy,
    bootstrap,
    handleAdd,
    handleToggle,
    handleDelete,
    handleDeleteAllDone,
    handleNotizSaved,
    handleTaskUpdated,
    runKiImport,
  };
}
