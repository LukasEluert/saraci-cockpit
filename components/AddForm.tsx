"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEADLINES,
  WIEDERHOLUNGEN,
  type Deadline,
} from "@/lib/constants";
import { parseVoiceTaskText } from "@/lib/speechTaskParse";
import {
  getSpeechRecognitionCtor,
  type SpeechRecognitionLike,
} from "@/lib/speechRecognition";
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
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechListening, setSpeechListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

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

  function startVoiceInput() {
    if (disabled) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    const rec = new Ctor();
    rec.lang = "de-DE";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (ev) => {
      const raw = Array.from(ev.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (!raw) return;
      const parsed = parseVoiceTaskText(raw, bereiche);
      setText((prev) => {
        const base = prev.trim();
        const add = parsed.text;
        if (!base) return add;
        if (!add) return base;
        return `${base} ${add}`.trim();
      });
      if (parsed.deadline) setDeadline(parsed.deadline);
      if (parsed.bereichId) setBereichId(parsed.bereichId);
    };
    rec.onerror = () => {
      setSpeechListening(false);
      recognitionRef.current = null;
    };
    rec.onend = () => {
      setSpeechListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = rec;
    setSpeechListening(true);
    try {
      rec.start();
    } catch {
      setSpeechListening(false);
      recognitionRef.current = null;
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-full rounded-xl border border-[#222222] bg-[#111111] p-3 md:p-4"
    >
      <label className="block max-w-full">
        <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
          Aufgabe
        </span>
        <div className="mt-2 flex max-w-full gap-2">
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Was steht an?"
            disabled={disabled}
            className="min-h-[4.5rem] min-w-0 flex-1 resize-none rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-[15px] text-neutral-100 placeholder:text-neutral-600 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
          />
          {speechSupported ? (
            <button
              type="button"
              title="Spracheingabe"
              aria-label="Spracheingabe starten"
              disabled={disabled || speechListening}
              onClick={() => startVoiceInput()}
              className={[
                "tap-scale flex h-[4.5rem] w-12 shrink-0 flex-col items-center justify-center rounded-lg border text-neutral-400 transition-colors",
                speechListening
                  ? "animate-pulse border-[#e63030] bg-[#1a0a0a] text-[#e63030]"
                  : "border-[#222222] bg-[#0a0a0a] hover:border-[#404040] hover:text-neutral-200",
                disabled ? "opacity-40" : "",
              ].join(" ")}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden
              >
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v3M8 21h8" />
              </svg>
            </button>
          ) : null}
        </div>
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
