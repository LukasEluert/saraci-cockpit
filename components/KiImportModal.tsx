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
      className="ui-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ki-import-title"
        className="ui-animate-modal ui-modal-panel flex max-h-[min(90dvh,36rem)] w-[90vw] max-w-lg flex-col overflow-hidden p-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border-subtle px-5 py-4">
          <h2
            id="ki-import-title"
            className="font-sans text-base font-medium tracking-tight text-fg"
          >
            KI-Import (Prioritäten)
          </h2>
          <p className="mt-2 font-sans text-[13px] leading-snug text-fg-muted">
            JSON von Claude einfügen. Pro Eintrag:{" "}
            <code className="rounded bg-bg px-1 font-mono text-[11px] text-fg-muted">
              id
            </code>
            ,{" "}
            <code className="rounded bg-bg px-1 font-mono text-[11px] text-fg-muted">
              deadline
            </code>
            , optional{" "}
            <code className="rounded bg-bg px-1 font-mono text-[11px] text-fg-muted">
              prioritaet
            </code>{" "}
            (Ganzzahl; niedrig = wichtiger). Vorhandene Werte werden
            überschrieben.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy || disabled}
            rows={12}
            autoFocus
            spellCheck={false}
            placeholder={`[\n  { "id": "…", "deadline": "Heute", "prioritaet": 1 },\n  { "id": "…", "deadline": "Diese Woche", "prioritaet": 2 }\n]`}
            className="ui-textarea h-48 w-full resize-y font-mono text-[12px] leading-relaxed disabled:opacity-50"
          />
          {localError ? (
            <p className="mt-2 font-mono text-[11px] text-accent">{localError}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border-subtle px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="ui-btn-secondary tap-scale rounded-md px-4 py-2 font-mono text-[12px] uppercase tracking-wide disabled:opacity-40"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || disabled || !draft.trim()}
            className="ui-btn-primary tap-scale rounded-md px-4 py-2 font-mono text-[12px] uppercase tracking-wide disabled:opacity-40"
          >
            {busy ? "Importieren …" : "Importieren"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
