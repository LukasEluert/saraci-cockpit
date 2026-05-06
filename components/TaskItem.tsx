"use client";

import type { Task } from "@/lib/types";
import { bereichBadgeClass, deadlineBadgeClass } from "@/lib/constants";

type Props = {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskItem({ task, onToggle, onDelete }: Props) {
  const done = task.done;
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
        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className={[
              "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide",
              bereichBadgeClass(task.bereich),
            ].join(" ")}
          >
            {task.bereich?.trim() || "Sonstiges"}
          </span>
          <span
            className={[
              "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide",
              deadlineBadgeClass(task.deadline),
            ].join(" ")}
          >
            {task.deadline?.trim() || "Kein Datum"}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(task)}
        className="shrink-0 self-start rounded px-2 py-1 font-mono text-[11px] text-neutral-500 transition-colors hover:bg-[#1a1a1a] hover:text-[#e63030]"
      >
        Löschen
      </button>
    </div>
  );
}
