"use client";

import { useCallback, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { TASKS_LIST_SELECT } from "@/lib/taskSelect";
import { findDuplicateTaskGroups } from "@/lib/taskDuplicates";
import type { Task } from "@/lib/types";

export function DuplicateTasksPanel() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [groups, setGroups] = useState<Task[][] | null>(null);
  /** Pro Gruppe: Task-IDs die gelöscht werden sollen */
  const [toDeleteByGroup, setToDeleteByGroup] = useState<Set<string>[]>([]);

  const scan = useCallback(async () => {
    setBusy(true);
    setErr(null);
    setGroups(null);
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("tasks")
        .select(TASKS_LIST_SELECT)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      const tasks = (data as Task[]) ?? [];
      const g = findDuplicateTaskGroups(tasks);
      setGroups(g);
      setToDeleteByGroup(g.map(() => new Set<string>()));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Laden fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }, []);

  function toggleDeleteMark(groupIndex: number, taskId: string, checked: boolean) {
    setToDeleteByGroup((prev) => {
      const next = prev.map((s, i) => {
        if (i !== groupIndex) return s;
        const copy = new Set(s);
        if (checked) copy.add(taskId);
        else copy.delete(taskId);
        return copy;
      });
      return next;
    });
  }

  const canPurge = useMemo(() => {
    if (!groups || groups.length === 0) return false;
    for (let gi = 0; gi < groups.length; gi++) {
      const list = groups[gi];
      const del = toDeleteByGroup[gi];
      if (!del || del.size === 0) return false;
      if (del.size >= list.length) return false;
    }
    return true;
  }, [groups, toDeleteByGroup]);

  async function purgeMarked() {
    if (!groups || !canPurge) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      for (let gi = 0; gi < groups.length; gi++) {
        const list = groups[gi];
        const del = toDeleteByGroup[gi];
        for (const t of list) {
          if (!del.has(t.id)) continue;
          const { error: dErr } = await sb.from("tasks").delete().eq("id", t.id);
          if (dErr) throw new Error(dErr.message);
        }
      }
      setGroups(null);
      setToDeleteByGroup([]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#222222] bg-[#111111] p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
        Task-Duplikate
      </h2>
      <p className="mt-2 font-sans text-[13px] leading-relaxed text-neutral-400">
        Gleicher Aufgabentext (ohne Groß-/Kleinschreibung, getrimmt). Pro Gruppe
        die überzähligen Einträge zum Löschen markieren — mindestens eine
        Aufgabe pro Gruppe muss stehen bleiben.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void scan()}
          className="rounded-lg border border-[#333333] bg-[#0a0a0a] px-4 py-2 font-mono text-[12px] uppercase tracking-wide text-neutral-200 transition-colors hover:border-[#e63030] hover:text-white disabled:opacity-40"
        >
          {busy && !groups ? "Prüfe …" : "Duplikate prüfen"}
        </button>
        {groups !== null && groups.length > 0 ? (
          <button
            type="button"
            disabled={busy || !canPurge}
            onClick={() => void purgeMarked()}
            className="rounded-lg bg-[#e63030] px-4 py-2 font-mono text-[12px] uppercase tracking-wide text-white transition-colors hover:bg-[#c92828] disabled:opacity-40"
          >
            Markierte löschen
          </button>
        ) : null}
      </div>
      {err ? (
        <p className="mt-3 font-mono text-[12px] text-[#fca5a5]">{err}</p>
      ) : null}
      {groups === null ? null : groups.length === 0 ? (
        <p className="mt-4 font-sans text-sm text-neutral-500">
          Keine Duplikat-Gruppen gefunden.
        </p>
      ) : (
        <ul className="mt-4 space-y-6">
          {groups.map((list, gi) => {
            const del = toDeleteByGroup[gi] ?? new Set();
            return (
              <li
                key={`${list.map((t) => t.id).join("-")}`}
                className="rounded-lg border border-[#333333] bg-[#0a0a0a] p-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-wide text-neutral-500">
                  Gruppe {gi + 1} · {list.length} Einträge
                </p>
                <ul className="mt-2 space-y-2">
                  {list.map((t) => {
                    const marked = del.has(t.id);
                    return (
                      <li
                        key={t.id}
                        className="flex gap-3 rounded-md border border-[#222222] bg-[#111111] px-2 py-2"
                      >
                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                          <input
                            type="checkbox"
                            checked={marked}
                            disabled={busy}
                            onChange={(e) =>
                              toggleDeleteMark(gi, t.id, e.target.checked)
                            }
                            className="mt-1 h-4 w-4 shrink-0 rounded border-[#404040] bg-[#0a0a0a] text-[#e63030] focus:ring-[#e63030]"
                          />
                          <span className="min-w-0">
                            <span className="block font-sans text-[14px] text-neutral-100">
                              {t.text}
                            </span>
                            <span className="mt-0.5 block font-mono text-[10px] text-neutral-500">
                              {marked ? (
                                <span className="text-[#fca5a5]">wird gelöscht</span>
                              ) : (
                                <span className="text-[#86efac]">bleibt</span>
                              )}{" "}
                              · {t.deadline?.trim() || "Kein Datum"} ·{" "}
                              {t.bereiche?.name ?? "—"} ·{" "}
                              <span className="select-all">{t.id}</span>
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
