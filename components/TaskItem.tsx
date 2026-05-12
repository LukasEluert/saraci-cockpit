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

function prioritaetTagStyle(p: number): import("react").CSSProperties {
  if (p >= 1 && p <= 3) {
    return {
      borderColor: "#e63030",
      color: "#e63030",
      backgroundColor: "rgba(230,48,48,0.12)",
    };
  }
  if (p >= 4 && p <= 7) {
    return {
      borderColor: "#d4a030",
      color: "#d4a030",
      backgroundColor: "rgba(212,160,48,0.12)",
    };
  }
  return {
    borderColor: "#555555",
    color: "#555555",
    backgroundColor: "rgba(38,38,38,0.45)",
  };
}

function formatKurzAktualisiert(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(d);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((x) => x.type === type)?.value?.trim() ?? "";
  let wd = pick("weekday");
  if (wd && !wd.endsWith(".")) wd = `${wd}.`;
  const day = pick("day");
  const month = pick("month");
  return `↻ ${wd} ${day}.${month}`;
}

function taskWurdeGeaendert(task: Task): boolean {
  const u = task.updated_at?.trim();
  const c = task.created_at?.trim();
  if (!u) return false;
  if (!c) return true;
  return u !== c;
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
  const [kundeDraft, setKundeDraft] = useState(task.kunde ?? "");
  const [editBusy, setEditBusy] = useState(false);

  useEffect(() => {
    setNotizDraft(task.notiz ?? "");
  }, [task.id, task.notiz]);

  useEffect(() => {
    setKundeDraft(task.kunde ?? "");
  }, [task.id, task.kunde]);

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
    setKundeDraft(task.kunde ?? "");
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
      const kundeVal = kundeDraft.trim() || null;
      const { error } = await sb
        .from("tasks")
        .update({
          text: trimmed,
          bereich_id: bereichIdDraft,
          deadline: deadlineDraft,
          kunde: kundeVal,
          updated_at: now,
        })
        .eq("id", task.id);
      if (error) throw new Error(error.message);
      const base: Task = {
        ...task,
        text: trimmed,
        bereich_id: bereichIdDraft,
        deadline: deadlineDraft,
        kunde: kundeVal,
        updated_at: now,
      };
      onTaskUpdated(taskWithBereichJoin(base, bereiche));
      setEditOpen(false);
    } catch {
      setTextDraft(task.text);
      setBereichIdDraft(task.bereich_id);
      setDeadlineDraft(normalizeDeadline(task.deadline));
      setKundeDraft(task.kunde ?? "");
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

  const pr = task.prioritaet;
  const showPrioritaet =
    pr !== null && pr !== undefined && typeof pr === "number" && Number.isFinite(pr);
  const pNum = showPrioritaet ? Math.round(pr) : 0;

  const aktualisiertText =
    taskWurdeGeaendert(task) ? formatKurzAktualisiert(task.updated_at) : "";
  const showAktualisiert = aktualisiertText.length > 0;

  const showKunde = Boolean(task.kunde?.trim());

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

  const [swipeLayout, setSwipeLayout] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [swipeAnimating, setSwipeAnimating] = useState(false);
  const [deleteFlash, setDeleteFlash] = useState(false);
  const swipeWrapRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeDxRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setSwipeLayout(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const SWIPE_COMMIT = 80;

  function resetSwipePosition() {
    setSwipeAnimating(true);
    setSwipeX(0);
    swipeDxRef.current = 0;
    window.setTimeout(() => setSwipeAnimating(false), 220);
  }

  function runSwipeComplete() {
    const w = swipeWrapRef.current?.offsetWidth ?? 320;
    setSwipeAnimating(true);
    setSwipeX(w);
    window.setTimeout(() => {
      onToggle(task);
      setSwipeX(0);
      setSwipeAnimating(false);
    }, 200);
  }

  function runSwipeDelete() {
    const w = swipeWrapRef.current?.offsetWidth ?? 320;
    setDeleteFlash(true);
    setSwipeAnimating(true);
    setSwipeX(-w);
    window.setTimeout(() => {
      onDelete(task);
      setSwipeX(0);
      setSwipeAnimating(false);
      setDeleteFlash(false);
    }, 200);
  }

  const rowClass = [
    "group/task relative flex w-full max-w-full items-start gap-3 py-3 pl-0.5 pr-0 transition-opacity duration-300 ease-out md:pr-1",
    done ? "opacity-50" : "",
  ].join(" ");

  const swipeActive = swipeLayout && !disabled && !done;
  const progressRight = swipeActive ? Math.min(1, Math.max(0, swipeX / SWIPE_COMMIT)) : 0;
  const progressLeft = swipeActive ? Math.min(1, Math.max(0, -swipeX / SWIPE_COMMIT)) : 0;

  const swipeTransformStyle: import("react").CSSProperties = swipeActive
    ? {
        transform: `translateX(${swipeX}px)`,
        transition: swipeAnimating ? "transform 0.2s ease-out" : "none",
        touchAction: "pan-y",
      }
    : {};

  function onSwipeTouchStart(e: React.TouchEvent) {
    if (!swipeActive) return;
    const t = e.changedTouches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    swipeDxRef.current = 0;
  }

  function onSwipeTouchMove(e: React.TouchEvent) {
    if (!swipeActive || !touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      swipeDxRef.current = dx;
      setSwipeX(dx);
    }
  }

  function onSwipeTouchEnd() {
    if (!swipeActive) return;
    touchStartRef.current = null;
    const dx = swipeDxRef.current;
    if (dx >= SWIPE_COMMIT) {
      runSwipeComplete();
      return;
    }
    if (dx <= -SWIPE_COMMIT) {
      runSwipeDelete();
      return;
    }
    resetSwipePosition();
  }

  const innerCard = (
    <>
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
        className="tap-scale flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-md border border-transparent hover:border-border md:h-10 md:w-10"
      >
        <span
          className={[
            "flex h-4 w-4 items-center justify-center rounded border transition-[border-color,background-color,color] duration-100 ease-out",
            done
              ? "border-accent bg-accent text-white"
              : "border-border bg-transparent hover:border-fg-muted",
          ].join(" ")}
        >
          {done ? (
            <svg
              className="h-2.5 w-2.5"
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

      <div className="relative min-w-0 flex-1 pr-1 md:pr-11">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className="mt-[0.42rem] shrink-0 rounded-full"
            style={{
              width: 2,
              height: 2,
              backgroundColor: farbe,
            }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p
              className={[
                "break-words font-sans text-sm leading-snug text-fg transition-[opacity,text-decoration-color] duration-300 ease-out",
                done ? "line-through" : "",
              ].join(" ")}
            >
              {task.text}
            </p>

            <div
              className={[
                "mt-1 flex max-w-full flex-wrap items-center gap-1.5 transition-opacity duration-[120ms]",
                "pointer-events-none opacity-0",
                "group-hover/task:pointer-events-auto group-hover/task:opacity-100",
                "max-md:pointer-events-auto max-md:opacity-100",
              ].join(" ")}
            >
              {notizPreview(task.notiz) ? (
                <span className="max-w-full break-words font-sans text-[11px] leading-snug text-fg-muted">
                  {notizPreview(task.notiz)}
                </span>
              ) : null}
              {showKunde ? (
                <span className="ui-tag max-w-full gap-1 font-sans normal-case tracking-normal">
                  <svg
                    className="h-3 w-3 shrink-0 text-fg-muted"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="truncate">{(task.kunde ?? "").trim()}</span>
                </span>
              ) : null}
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
                  "tap-scale ui-tag pointer-events-auto cursor-pointer font-mono transition-opacity duration-100 hover:opacity-90 disabled:pointer-events-none disabled:opacity-40",
                  deadlineBadgeClass(task.deadline),
                ].join(" ")}
                aria-label="Deadline ändern"
              >
                {task.deadline?.trim() || "Kein Datum"}
              </button>
              {showPrioritaet ? (
                <span
                  className="ui-tag inline-flex font-mono"
                  style={prioritaetTagStyle(pNum)}
                >
                  P{pNum}
                </span>
              ) : null}
              {wieder ? (
                <span className="ui-tag inline-flex font-mono text-fg-muted">
                  {(task.wiederholung as Wiederholung) ?? ""}
                </span>
              ) : null}
              {showAktualisiert ? (
                <span
                  className="ui-tag inline-flex font-mono tracking-wide text-fg-muted"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-tertiary)",
                    backgroundColor: "var(--surface-hover)",
                  }}
                >
                  {aktualisiertText}
                </span>
              ) : null}
            </div>

            <div className="mt-1.5">
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
                className="tap-scale ui-tag max-w-full cursor-pointer font-mono normal-case tracking-wide transition-opacity duration-100 hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                style={bereichBadgeStyle(farbe)}
                aria-label="Bereich ändern"
              >
                <span className="truncate">{bereichName}</span>
              </button>
            </div>
          </div>
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
            className="ui-textarea mt-3 w-full max-w-full resize-y text-sm disabled:opacity-50"
          />
        ) : null}

        <div
          className={[
            "absolute right-0 top-2 z-[1] flex items-center gap-0.5",
            "md:pointer-events-none md:opacity-0 md:transition-opacity md:duration-[120ms]",
            "md:group-hover/task:pointer-events-auto md:group-hover/task:opacity-100",
            "md:group-focus-within/task:pointer-events-auto md:group-focus-within/task:opacity-100",
          ].join(" ")}
        >
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
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-[background-color,color] duration-100 ease-out hover:bg-surface-hover hover:text-accent disabled:opacity-40"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
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
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-[background-color,color] duration-100 ease-out hover:bg-surface-hover hover:text-accent"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
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
              className="tap-scale flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-[background-color,color] duration-100 ease-out hover:bg-surface-hover hover:text-accent"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(task)}
            aria-label="Löschen"
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-[background-color,color] duration-100 ease-out hover:bg-surface-hover hover:text-accent"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14ZM10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  const editModal =
    editOpen && typeof document !== "undefined"
      ? createPortal(
            <div
              className="ui-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) cancelEdit();
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`task-edit-title-${task.id}`}
                className="ui-animate-modal ui-modal-panel flex max-h-[min(90dvh,32rem)] w-[90vw] max-w-md flex-col overflow-hidden p-0"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="border-b border-border-subtle px-5 py-4">
                  <h2
                    id={`task-edit-title-${task.id}`}
                    className="font-sans text-base font-medium tracking-tight text-fg"
                  >
                    Aufgabe bearbeiten
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <label className="block">
                    <span className="ui-label-upper">Text</span>
                    <textarea
                      value={textDraft}
                      onChange={(e) => setTextDraft(e.target.value)}
                      disabled={editBusy}
                      rows={3}
                      autoFocus
                      className="ui-textarea mt-2 w-full resize-y text-sm disabled:opacity-50"
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="ui-label-upper">Kunde (optional)</span>
                    <input
                      type="text"
                      value={kundeDraft}
                      onChange={(e) => setKundeDraft(e.target.value)}
                      disabled={editBusy}
                      placeholder="z. B. Firma"
                      className="ui-input mt-2 w-full font-sans disabled:opacity-50"
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="ui-label-upper">Bereich</span>
                    <select
                      value={bereichIdDraft}
                      onChange={(e) => setBereichIdDraft(e.target.value)}
                      disabled={editBusy || bereiche.length === 0}
                      className="ui-select mt-2 w-full appearance-none font-sans text-sm disabled:opacity-50"
                    >
                      {modalBereichSelectChildren}
                    </select>
                  </label>
                  <label className="mt-4 block">
                    <span className="ui-label-upper">Deadline</span>
                    <select
                      value={deadlineDraft}
                      onChange={(e) =>
                        setDeadlineDraft(e.target.value as Deadline)
                      }
                      disabled={editBusy}
                      className="ui-select mt-2 w-full appearance-none font-sans text-sm disabled:opacity-50"
                    >
                      {DEADLINES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border-subtle px-5 py-4">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={editBusy}
                    className="ui-btn-secondary tap-scale rounded-md px-4 py-2 font-mono text-[12px] uppercase tracking-wide disabled:opacity-40"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveEdit()}
                    disabled={editBusy || !canSaveEdit}
                    className="ui-btn-primary tap-scale rounded-md px-4 py-2 font-mono text-[12px] uppercase tracking-wide disabled:opacity-40"
                  >
                    {editBusy ? "Speichern …" : "Speichern"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
      : null;

  return (
    <>
      {swipeActive ? (
        <div
          ref={swipeWrapRef}
          className="relative max-w-full overflow-hidden"
          style={{ touchAction: "pan-y" }}
          onTouchStart={onSwipeTouchStart}
          onTouchMove={onSwipeTouchMove}
          onTouchEnd={onSwipeTouchEnd}
          onTouchCancel={onSwipeTouchEnd}
        >
          <div
            className="pointer-events-none absolute inset-0 z-0 flex"
            aria-hidden
          >
            <div
              className="flex flex-1 items-center justify-start bg-[#166534] pl-3 text-lg text-white md:pl-4 md:text-xl"
              style={{ opacity: progressRight }}
            >
              ✓
            </div>
            <div
              className="flex flex-1 items-center justify-end bg-[#991b1b] pr-3 text-lg text-white md:pr-4 md:text-xl"
              style={{ opacity: progressLeft }}
            >
              ×
            </div>
          </div>
          <div className="relative z-10">
            <div className={rowClass} style={swipeTransformStyle}>
              {innerCard}
            </div>
          </div>
          {deleteFlash ? (
            <div
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/50 font-mono text-[11px] uppercase tracking-wide text-white"
              role="status"
            >
              Löschen …
            </div>
          ) : null}
        </div>
      ) : (
        <div className={rowClass}>{innerCard}</div>
      )}
      {editModal}
    </>
  );
}
