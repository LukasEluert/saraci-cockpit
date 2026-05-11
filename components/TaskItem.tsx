"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BereichRow, Task, Wiederholung } from "@/lib/types";
import {
  DEADLINES,
  bereichBadgeStyle,
  deadlineBadgeClass,
  type Deadline,
} from "@/lib/constants";
import { buildTaskIcs, sanitizeIcsFilename, taskHasCalendarDate } from "@/lib/ics";
import { downloadTextFile } from "@/lib/exportBackup";
import { getSupabase } from "@/lib/supabase";

type Props = {
  task: Task;
  bereiche: BereichRow[];
  disabled?: boolean;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onNotizSaved: (taskId: string, notiz: string | null) => void;
  onTaskUpdated: (task: Task) => void;
};

function notizPreview(notiz: string | null): string | null {
  if (!notiz?.trim()) return null;
  const t = notiz.trim();
  return t.length <= 60 ? t : `${t.slice(0, 57)}…`;
}

function normalizeDeadline(value: string): Deadline {
  const v = value?.trim() || "";
  return (DEADLINES as readonly string[]).includes(v)
    ? (v as Deadline)
    : "Kein Datum";
}

function taskWithBereichJoin(t: Task, bereiche: BereichRow[]): Task {
  const b = bereiche.find((x) => x.id === t.bereich_id);
  return {
    ...t,
    bereiche: b ? { name: b.name, farbe: b.farbe } : null,
  };
}

export function TaskItem({
  task,
  bereiche,
  disabled = false,
  onToggle,
  onDelete,
  onNotizSaved,
  onTaskUpdated,
}: Props) {
  const done = task.done;
  const bereichName = task.bereiche?.name?.trim() || "—";
  const farbe = task.bereiche?.farbe || "#525252";
  const [notizOpen, setNotizOpen] = useState(false);
  const [notizDraft, setNotizDraft] = useState(task.notiz ?? "");
  const [notizBusy, setNotizBusy] = useState(false);
  const skipBlurSave = useRef(false);

  const [editOpen, setEditOpen] = useState(false);
  const [textDraft, setTextDraft] = useState(task.text);
  const [bereichIdDraft, setBereichIdDraft] = useState(task.bereich_id);
  const [deadlineDraft, setDeadlineDraft] = useState<Deadline>(
    normalizeDeadline(task.deadline)
  );
  const [editBusy, setEditBusy] = useState(false);

  useEffect(() => {
    setNotizDraft(task.notiz ?? "");
  }, [task.id, task.notiz]);

  useEffect(() => {
    if (!editOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setEditOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editOpen]);

  const persistNotiz = useCallback(async () => {
    const trimmed = notizDraft.trim() || null;
    if (trimmed === (task.notiz?.trim() || null)) {
      return;
    }
    setNotizBusy(true);
    try {
      const sb = getSupabase();
      const now = new Date().toISOString();
      const { error } = await sb
        .from("tasks")
        .update({ notiz: trimmed, updated_at: now })
        .eq("id", task.id);
      if (error) throw new Error(error.message);
      onNotizSaved(task.id, trimmed);
    } catch {
      setNotizDraft(task.notiz ?? "");
    } finally {
      setNotizBusy(false);
    }
  }, [notizDraft, onNotizSaved, task.id, task.notiz]);

  async function handleNotizBlur() {
    if (skipBlurSave.current) {
      skipBlurSave.current = false;
      return;
    }
    await persistNotiz();
    setNotizOpen(false);
  }

  function openEditModal() {
    setTextDraft(task.text);
    setBereichIdDraft(task.bereich_id);
    setDeadlineDraft(normalizeDeadline(task.deadline));
    setEditOpen(true);
  }

  function cancelEdit() {
    setEditOpen(false);
  }

  async function saveEdit() {
    const trimmed = textDraft.trim();
    if (!trimmed || !bereichIdDraft) return;
    setEditBusy(true);
    try {
      const sb = getSupabase();
      const now = new Date().toISOString();
      const { error } = await sb
        .from("tasks")
        .update({
          text: trimmed,
          bereich_id: bereichIdDraft,
          deadline: deadlineDraft,
          updated_at: now,
        })
        .eq("id", task.id);
      if (error) throw new Error(error.message);
      const base: Task = {
        ...task,
        text: trimmed,
        bereich_id: bereichIdDraft,
        deadline: deadlineDraft,
        updated_at: now,
      };
      onTaskUpdated(taskWithBereichJoin(base, bereiche));
      setEditOpen(false);
    } catch {
      setTextDraft(task.text);
      setBereichIdDraft(task.bereich_id);
      setDeadlineDraft(normalizeDeadline(task.deadline));
    } finally {
      setEditBusy(false);
    }
  }

  function handleIcsDownload() {
    try {
      const body = buildTaskIcs(task, bereichName);
      const name = sanitizeIcsFilename(task.text);
      downloadTextFile(`${name}.ics`, body, "text/calendar;charset=utf-8");
    } catch {
      /* ignore */
    }
  }

  const showCal = taskHasCalendarDate(task);
  const wieder = task.wiederkehrend && task.wiederholung;

  const leftAccent: import("react").CSSProperties = {
    borderLeftWidth: 3,
    borderLeftColor: farbe,
    borderTopLeftRadius: "0.5rem",
    borderBottomLeftRadius: "0.5rem",
  };

  const modalBereichSelectChildren = (
    <>
      {bereichIdDraft &&
      !bereiche.some((b) => b.id === bereichIdDraft) ? (
        <option value={bereichIdDraft}>
          {task.bereiche?.name?.trim() || "Bereich (nicht in Liste)"}
        </option>
      ) : null}
      {bereiche.length === 0 ? (
        <option value="">Keine Bereiche</option>
      ) : (
        bereiche.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))
      )}
    </>
  );

  const canSaveEdit =
    textDraft.trim().length > 0 &&
    bereichIdDraft.length > 0 &&
    (bereiche.some((b) => b.id === bereichIdDraft) ||
      bereichIdDraft === task.bereich_id);

  return (
    <div
      className={[
        "group flex max-w-full gap-2 rounded-lg border border-[#222222] bg-[#111111] py-2 pl-2 pr-2 transition-colors md:gap-3 md:px-3 md:py-3",
        done ? "opacity-50" : "",
      ].join(" ")}
      style={leftAccent}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
        className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-lg border border-transparent hover:border-[#404040]"
      >
        <span
          className={[
            "flex h-5 w-5 items-center justify-center rounded border transition-colors",
            done
              ? "border-[#e63030] bg-[#e63030] text-white"
              : "border-[#404040] bg-transparent hover:border-[#737373]",
          ].join(" ")}
        >
          {done ? (
            <svg
              className="h-3 w-3"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M2 6L5 9L10 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
      </button>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p
          className={[
            "break-words font-sans text-[15px] leading-snug text-neutral-100",
            done ? "line-through" : "",
          ].join(" ")}
        >
          {task.text}
        </p>
        {notizPreview(task.notiz) ? (
          <p className="mt-1 break-words font-sans text-[12px] leading-snug text-neutral-500">
            {notizPreview(task.notiz)}
          </p>
        ) : null}
        <div className="mt-2 flex max-w-full flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={() => {
              skipBlurSave.current = true;
            }}
            onClick={() => {
              skipBlurSave.current = false;
              openEditModal();
            }}
            className="tap-scale inline-flex max-w-full cursor-pointer items-center rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
            style={bereichBadgeStyle(farbe)}
            aria-label="Bereich ändern"
          >
            <span className="truncate">{bereichName}</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onMouseDown={() => {
              skipBlurSave.current = true;
            }}
            onClick={() => {
              skipBlurSave.current = false;
              openEditModal();
            }}
            className={[
              "tap-scale inline-flex cursor-pointer items-center rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40",
              deadlineBadgeClass(task.deadline),
            ].join(" ")}
            aria-label="Deadline ändern"
          >
            {task.deadline?.trim() || "Kein Datum"}
          </button>
          {wieder ? (
            <span className="inline-flex items-center rounded border border-[#404040] bg-[#0a0a0a] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-neutral-400">
              {(task.wiederholung as Wiederholung) ?? ""}
            </span>
          ) : null}
        </div>
        {notizOpen ? (
          <textarea
            value={notizDraft}
            onChange={(e) => setNotizDraft(e.target.value)}
            onBlur={() => void handleNotizBlur()}
            disabled={notizBusy}
            rows={3}
            autoFocus
            placeholder="Notiz …"
            className="mt-3 w-full max-w-full resize-y rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 font-sans text-[13px] text-neutral-100 placeholder:text-neutral-600 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
          />
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 self-start">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={() => {
              skipBlurSave.current = true;
            }}
            onClick={() => {
              skipBlurSave.current = false;
              openEditModal();
            }}
            aria-label="Aufgabe bearbeiten"
            className="tap-scale flex h-11 w-11 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-[#1a1a1a] hover:text-[#e63030] disabled:opacity-40"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          <button
            type="button"
            onMouseDown={() => {
              skipBlurSave.current = true;
            }}
            onClick={() => {
              setNotizOpen((o) => !o);
              skipBlurSave.current = false;
            }}
            aria-label="Notiz bearbeiten"
            className="tap-scale flex h-11 w-11 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-[#1a1a1a] hover:text-[#e63030]"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          {showCal ? (
            <button
              type="button"
              onMouseDown={() => {
                skipBlurSave.current = true;
              }}
              onClick={() => {
                skipBlurSave.current = false;
                handleIcsDownload();
              }}
              aria-label="Kalender exportieren"
              className="tap-scale flex h-11 w-11 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-[#1a1a1a] hover:text-[#e63030]"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDelete(task)}
          className="tap-scale flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2 font-mono text-[11px] text-neutral-500 transition-colors hover:bg-[#1a1a1a] hover:text-[#e63030]"
        >
          Löschen
        </button>
      </div>

      {editOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) cancelEdit();
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`task-edit-title-${task.id}`}
                className="flex max-h-[min(90dvh,32rem)] w-[90vw] max-w-md flex-col overflow-hidden rounded-xl border border-[#333333] bg-[#111111] shadow-xl"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="border-b border-[#222222] px-4 py-3">
                  <h2
                    id={`task-edit-title-${task.id}`}
                    className="font-mono text-[12px] uppercase tracking-wide text-neutral-200"
                  >
                    Aufgabe bearbeiten
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <label className="block">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
                      Text
                    </span>
                    <textarea
                      value={textDraft}
                      onChange={(e) => setTextDraft(e.target.value)}
                      disabled={editBusy}
                      rows={3}
                      autoFocus
                      className="mt-2 w-full resize-y rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-[15px] text-neutral-100 placeholder:text-neutral-600 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
                      Bereich
                    </span>
                    <select
                      value={bereichIdDraft}
                      onChange={(e) => setBereichIdDraft(e.target.value)}
                      disabled={editBusy || bereiche.length === 0}
                      className="mt-2 w-full appearance-none rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2.5 font-sans text-[14px] text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
                    >
                      {modalBereichSelectChildren}
                    </select>
                  </label>
                  <label className="mt-4 block">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
                      Deadline
                    </span>
                    <select
                      value={deadlineDraft}
                      onChange={(e) =>
                        setDeadlineDraft(e.target.value as Deadline)
                      }
                      disabled={editBusy}
                      className="mt-2 w-full appearance-none rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2.5 font-sans text-[14px] text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
                    >
                      {DEADLINES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#222222] px-4 py-3">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={editBusy}
                    className="tap-scale rounded-lg border border-[#333333] px-4 py-2 font-mono text-[12px] uppercase tracking-wide text-neutral-300 transition-colors hover:border-neutral-500 disabled:opacity-40"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveEdit()}
                    disabled={editBusy || !canSaveEdit}
                    className="tap-scale rounded-lg border border-[#e63030]/60 bg-[#1a0a0a] px-4 py-2 font-mono text-[12px] uppercase tracking-wide text-neutral-100 transition-colors hover:border-[#e63030] hover:bg-[#220808] disabled:opacity-40"
                  >
                    {editBusy ? "Speichern …" : "Speichern"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
