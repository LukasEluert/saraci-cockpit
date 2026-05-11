"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
  onImport: (json: string) => Promise<void>;
};

export function KiImportModal({ open, onClose, disabled, onImport }: Props) {
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setLocalError(null);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  async function handleSubmit() {
    setLocalError(null);
    setBusy(true);
    try {
      await onImport(draft);
      setDraft("");
      onClose();
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "Import fehlgeschlagen."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ki-import-title"
        className="flex max-h-[min(90dvh,36rem)] w-[90vw] max-w-lg flex-col overflow-hidden rounded-xl border border-[#333333] bg-[#111111] shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#222222] px-4 py-3">
          <h2
            id="ki-import-title"
            className="font-mono text-[12px] uppercase tracking-wide text-neutral-200"
          >
            KI-Import (Prioritäten)
          </h2>
          <p className="mt-2 font-sans text-[13px] leading-snug text-neutral-400">
            JSON von Claude einfügen. Pro Eintrag:{" "}
            <code className="rounded bg-[#0a0a0a] px-1 font-mono text-[11px] text-neutral-300">
              id
            </code>
            ,{" "}
            <code className="rounded bg-[#0a0a0a] px-1 font-mono text-[11px] text-neutral-300">
              deadline
            </code>
            , optional{" "}
            <code className="rounded bg-[#0a0a0a] px-1 font-mono text-[11px] text-neutral-300">
              prioritaet
            </code>{" "}
            (Ganzzahl; niedrig = wichtiger). Vorhandene Werte werden
            überschrieben.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy || disabled}
            rows={12}
            autoFocus
            spellCheck={false}
            placeholder={`[\n  { "id": "…", "deadline": "Heute", "prioritaet": 1 },\n  { "id": "…", "deadline": "Diese Woche", "prioritaet": 2 }\n]`}
            className="h-48 w-full resize-y rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-mono text-[12px] leading-relaxed text-neutral-100 placeholder:text-neutral-600 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
          />
          {localError ? (
            <p className="mt-2 font-mono text-[11px] text-[#fca5a5]">
              {localError}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#222222] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="tap-scale rounded-lg border border-[#333333] px-4 py-2 font-mono text-[12px] uppercase tracking-wide text-neutral-300 transition-colors hover:border-neutral-500 disabled:opacity-40"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || disabled || !draft.trim()}
            className="tap-scale rounded-lg border border-[#e63030]/60 bg-[#1a0a0a] px-4 py-2 font-mono text-[12px] uppercase tracking-wide text-neutral-100 transition-colors hover:border-[#e63030] hover:bg-[#220808] disabled:opacity-40"
          >
            {busy ? "Importieren …" : "Importieren"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
