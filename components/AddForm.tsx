"use client";

import { useState } from "react";
import {
  BEREICHE,
  DEADLINES,
  type Bereich,
  type Deadline,
} from "@/lib/constants";

type Props = {
  disabled?: boolean;
  onAdd: (payload: { text: string; bereich: Bereich; deadline: Deadline }) => void;
};

export function AddForm({ disabled, onAdd }: Props) {
  const [text, setText] = useState("");
  const [bereich, setBereich] = useState<Bereich>("Akquise");
  const [deadline, setDeadline] = useState<Deadline>("Kein Datum");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onAdd({ text: t, bereich, deadline });
    setText("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-[#222222] bg-[#111111] p-4"
    >
      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
          Aufgabe
        </span>
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Was steht an?"
          disabled={disabled}
          className="mt-2 w-full resize-none rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-[15px] text-neutral-100 placeholder:text-neutral-600 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
        />
      </label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Bereich
          </span>
          <select
            value={bereich}
            onChange={(e) => setBereich(e.target.value as Bereich)}
            disabled={disabled}
            className="mt-2 w-full appearance-none rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2.5 font-sans text-[14px] text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
          >
            {BEREICHE.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Deadline
          </span>
          <select
            value={deadline}
            onChange={(e) => setDeadline(e.target.value as Deadline)}
            disabled={disabled}
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
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="rounded-lg bg-[#e63030] px-4 py-2.5 font-mono text-[12px] uppercase tracking-wide text-white transition-colors hover:bg-[#c92828] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hinzufügen
        </button>
      </div>
    </form>
  );
}
