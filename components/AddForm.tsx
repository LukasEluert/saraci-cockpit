"use client";

import { useEffect, useState } from "react";
import {
  DEADLINES,
  WIEDERHOLUNGEN,
  type Deadline,
} from "@/lib/constants";
import type { BereichRow, Wiederholung } from "@/lib/types";

export type AddTaskPayload = {
  text: string;
  bereich_id: string;
  deadline: Deadline;
  kunde: string | null;
  wiederkehrend: boolean;
  wiederholung: Wiederholung | null;
};

type Props = {
  bereiche: BereichRow[];
  disabled?: boolean;
  onAdd: (payload: AddTaskPayload) => void;
};

export function AddForm({ bereiche, disabled, onAdd }: Props) {
  const [text, setText] = useState("");
  const [bereichId, setBereichId] = useState("");
  const [deadline, setDeadline] = useState<Deadline>("Kein Datum");
  const [kunde, setKunde] = useState("");
  const [wiederkehrend, setWiederkehrend] = useState(false);
  const [wiederholung, setWiederholung] = useState<Wiederholung>("wöchentlich");

  useEffect(() => {
    if (!bereichId && bereiche.length > 0) {
      setBereichId(bereiche[0].id);
    }
    if (
      bereichId &&
      bereiche.length > 0 &&
      !bereiche.some((b) => b.id === bereichId)
    ) {
      setBereichId(bereiche[0].id);
    }
  }, [bereiche, bereichId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !bereichId) return;
    onAdd({
      text: t,
      bereich_id: bereichId,
      deadline,
      kunde: kunde.trim() || null,
      wiederkehrend,
      wiederholung: wiederkehrend ? wiederholung : null,
    });
    setText("");
    setKunde("");
    setWiederkehrend(false);
    setWiederholung("wöchentlich");
  }

  const bereichOptions =
    bereiche.length === 0 ? (
      <option value="">Keine Bereiche</option>
    ) : (
      bereiche.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-full rounded-xl border border-[#222222] bg-[#111111] p-3 md:p-4"
    >
      <label className="block max-w-full">
        <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
          Aufgabe
        </span>
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Was steht an?"
          disabled={disabled}
          className="mt-2 w-full max-w-full resize-none rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-[15px] text-neutral-100 placeholder:text-neutral-600 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
        />
      </label>

      <label className="mt-4 block max-w-full">
        <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
          Kunde (optional)
        </span>
        <input
          type="text"
          value={kunde}
          onChange={(e) => setKunde(e.target.value)}
          placeholder="z. B. Firma"
          disabled={disabled}
          className="mt-2 w-full max-w-full rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-[14px] text-neutral-100 placeholder:text-neutral-600 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
        />
      </label>

      <div className="mt-4 grid w-full max-w-full grid-cols-2 gap-2">
        <label className="block min-w-0 max-w-full">
          <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Bereich
          </span>
          <select
            value={bereichId}
            onChange={(e) => setBereichId(e.target.value)}
            disabled={disabled || bereiche.length === 0}
            className="mt-2 w-full max-w-full min-w-0 appearance-none rounded-lg border border-[#222222] bg-[#0a0a0a] px-2 py-2.5 font-sans text-[13px] text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50 md:px-3 md:text-[14px]"
          >
            {bereichOptions}
          </select>
        </label>
        <label className="block min-w-0 max-w-full">
          <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Deadline
          </span>
          <select
            value={deadline}
            onChange={(e) => setDeadline(e.target.value as Deadline)}
            disabled={disabled}
            className="mt-2 w-full max-w-full min-w-0 appearance-none rounded-lg border border-[#222222] bg-[#0a0a0a] px-2 py-2.5 font-sans text-[13px] text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50 md:px-3 md:text-[14px]"
          >
            {DEADLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 max-w-full rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={wiederkehrend}
            onChange={(e) => setWiederkehrend(e.target.checked)}
            disabled={disabled}
            className="tap-scale h-4 w-4 shrink-0 rounded border-[#404040] bg-[#111111] text-[#e63030] focus:ring-[#e63030]"
          />
          <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-400">
            Wiederkehrend
          </span>
        </label>
        {wiederkehrend ? (
          <label className="mt-3 block max-w-full">
            <span className="font-mono text-[10px] uppercase tracking-wide text-neutral-500">
              Intervall
            </span>
            <select
              value={wiederholung}
              onChange={(e) =>
                setWiederholung(e.target.value as Wiederholung)
              }
              disabled={disabled}
              className="mt-1.5 w-full max-w-full appearance-none rounded-lg border border-[#222222] bg-[#111111] px-3 py-2 font-sans text-[14px] text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
            >
              {WIEDERHOLUNGEN.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="mt-4 w-full max-w-full">
        <button
          type="submit"
          disabled={disabled || !text.trim() || !bereichId}
          className="tap-scale w-full rounded-lg bg-[#e63030] px-4 py-3 font-mono text-[12px] uppercase tracking-wide text-white transition-colors hover:bg-[#c92828] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hinzufügen
        </button>
      </div>
    </form>
  );
}
