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
      className="w-full max-w-full rounded-lg border border-border-subtle bg-surface p-3 shadow-[var(--stat-inset)] transition-[border-color,background-color] duration-100 ease-out hover:border-border md:p-4"
    >
      <label className="block max-w-full">
        <span className="ui-label-upper">Aufgabe</span>
        <div className="mt-2 flex max-w-full gap-2">
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Was steht an?"
            disabled={disabled}
            className="ui-textarea min-h-[4.5rem] min-w-0 flex-1 resize-none font-sans text-sm disabled:opacity-50"
          />
          {speechSupported ? (
            <button
              type="button"
              title="Spracheingabe"
              aria-label="Spracheingabe starten"
              disabled={disabled || speechListening}
              onClick={() => startVoiceInput()}
              className={[
                "tap-scale flex h-[4.5rem] w-12 shrink-0 flex-col items-center justify-center rounded-md border text-fg-muted transition-[border-color,background-color,color] duration-100 ease-out",
                speechListening
                  ? "animate-pulse border-accent/50 bg-accent-dim text-accent"
                  : "border-border bg-bg hover:border-border hover:bg-surface-hover hover:text-fg",
                disabled ? "opacity-40" : "",
              ].join(" ")}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
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
        <span className="ui-label-upper">Kunde (optional)</span>
        <input
          type="text"
          value={kunde}
          onChange={(e) => setKunde(e.target.value)}
          placeholder="z. B. Firma"
          disabled={disabled}
          className="ui-input mt-2 w-full max-w-full font-sans disabled:opacity-50"
        />
      </label>

      <div className="mt-4 grid w-full max-w-full grid-cols-2 gap-2">
        <label className="block min-w-0 max-w-full">
          <span className="ui-label-upper">Bereich</span>
          <select
            value={bereichId}
            onChange={(e) => setBereichId(e.target.value)}
            disabled={disabled || bereiche.length === 0}
            className="ui-select mt-2 w-full max-w-full min-w-0 appearance-none font-sans text-sm disabled:opacity-50"
          >
            {bereichOptions}
          </select>
        </label>
        <label className="block min-w-0 max-w-full">
          <span className="ui-label-upper">Deadline</span>
          <select
            value={deadline}
            onChange={(e) => setDeadline(e.target.value as Deadline)}
            disabled={disabled}
            className="ui-select mt-2 w-full max-w-full min-w-0 appearance-none font-sans text-sm disabled:opacity-50"
          >
            {DEADLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 max-w-full rounded-md border border-border-subtle bg-bg px-3 py-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={wiederkehrend}
            onChange={(e) => setWiederkehrend(e.target.checked)}
            disabled={disabled}
            className="tap-scale h-4 w-4 shrink-0 rounded border-border bg-surface text-accent focus:ring-2 focus:ring-accent/30"
          />
          <span className="ui-label-upper text-fg-muted">Wiederkehrend</span>
        </label>
        {wiederkehrend ? (
          <label className="mt-3 block max-w-full">
            <span className="ui-label-upper">Intervall</span>
            <select
              value={wiederholung}
              onChange={(e) =>
                setWiederholung(e.target.value as Wiederholung)
              }
              disabled={disabled}
              className="ui-select mt-1.5 w-full max-w-full appearance-none font-sans text-sm disabled:opacity-50"
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
          className="ui-btn-primary tap-scale w-full rounded-md px-4 py-3 font-mono text-[12px] uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hinzufügen
        </button>
      </div>
    </form>
  );
}
