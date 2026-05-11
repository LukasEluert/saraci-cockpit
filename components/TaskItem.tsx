"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Task, Wiederholung } from "@/lib/types";
import { bereichBadgeStyle, deadlineBadgeClass } from "@/lib/constants";
import { buildTaskIcs, sanitizeIcsFilename, taskHasCalendarDate } from "@/lib/ics";
import { downloadTextFile } from "@/lib/exportBackup";
import { getSupabase } from "@/lib/supabase";

type Props = {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onNotizSaved: (taskId: string, notiz: string | null) => void;
};

function notizPreview(notiz: string | null): string | null {
  if (!notiz?.trim()) return null;
  const t = notiz.trim();
  return t.length <= 60 ? t : `${t.slice(0, 57)}…`;
}

export function TaskItem({
  task,
  onToggle,
  onDelete,
  onNotizSaved,
}: Props) {
  const done = task.done;
  const bereichName = task.bereiche?.name?.trim() || "—";
  const farbe = task.bereiche?.farbe || "#525252";
  const [notizOpen, setNotizOpen] = useState(false);
  const [notizDraft, setNotizDraft] = useState(task.notiz ?? "");
  const [notizBusy, setNotizBusy] = useState(false);
  const skipBlurSave = useRef(false);

  useEffect(() => {
    setNotizDraft(task.notiz ?? "");
  }, [task.id, task.notiz]);

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

  return (
    <div
      className={[
        "group flex gap-3 rounded-lg border border-[#222222] bg-[#111111] px-3 py-3 transition-colors",
        done ? "opacity-50" : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
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
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={[
            "font-sans text-[15px] leading-snug text-neutral-100",
            done ? "line-through" : "",
          ].join(" ")}
        >
          {task.text}
        </p>
        {notizPreview(task.notiz) ? (
          <p className="mt-1 font-sans text-[12px] leading-snug text-neutral-500">
            {notizPreview(task.notiz)}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide"
            style={bereichBadgeStyle(farbe)}
          >
            {bereichName}
          </span>
          <span
            className={[
              "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide",
              deadlineBadgeClass(task.deadline),
            ].join(" ")}
          >
            {task.deadline?.trim() || "Kein Datum"}
          </span>
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
            className="mt-3 w-full resize-y rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 font-sans text-[13px] text-neutral-100 placeholder:text-neutral-600 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
          />
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 self-start">
        <div className="flex items-center gap-0.5">
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
            className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-[#1a1a1a] hover:text-[#e63030]"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <path d="M4 20h4l10.5-10.5a2 2 0 0 0-2.83-2.83L5 17.17V20z" />
              <path d="M13.5 6.5l4 4" />
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
              className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-[#1a1a1a] hover:text-[#e63030]"
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
          className="rounded px-2 py-1 font-mono text-[11px] text-neutral-500 transition-colors hover:bg-[#1a1a1a] hover:text-[#e63030]"
        >
          Löschen
        </button>
      </div>
    </div>
  );
}
