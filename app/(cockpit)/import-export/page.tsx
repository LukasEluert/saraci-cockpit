"use client";

import { useEffect, useMemo, useState } from "react";
import { DataExportButtons } from "@/components/DataExportButtons";
import { DeskPageHeader } from "@/components/DeskPageHeader";
import { KiImportModal } from "@/components/KiImportModal";
import { buildLeitfadenExport } from "@/lib/exportGuide";
import { useDeskTasks } from "@/hooks/useDeskTasks";

function formatDatumMobileHeader(d: Date): string {
  const parts = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(d);
  const v = (t: "weekday" | "day" | "month") =>
    parts.find((p) => p.type === t)?.value?.trim() ?? "";
  let wd = v("weekday");
  if (wd && !wd.endsWith(".")) wd = `${wd}.`;
  return `${wd} ${v("day")}.${v("month")}`;
}

export default function ImportExportPage() {
  const [dateTick, setDateTick] = useState(0);
  const [copyNotice, setCopyNotice] = useState(false);
  const [clipErr, setClipErr] = useState<string | null>(null);
  const [kiImportOpen, setKiImportOpen] = useState(false);

  const { tasks, sync, error, busy, kiImportNotice, runKiImport } =
    useDeskTasks();

  useEffect(() => {
    const id = window.setInterval(() => setDateTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const datumMobile = useMemo(
    () => formatDatumMobileHeader(new Date()),
    [dateTick]
  );

  async function handleExportCopy() {
    const body = buildLeitfadenExport({ tasks });
    setClipErr(null);
    try {
      await navigator.clipboard.writeText(body);
      setCopyNotice(true);
      window.setTimeout(() => setCopyNotice(false), 2000);
    } catch {
      setClipErr("Zwischenablage nicht verfügbar.");
    }
  }

  return (
    <div className="flex min-h-0 w-full max-w-full flex-col overflow-x-hidden">
      <DeskPageHeader sync={sync} datumMobile={datumMobile} busy={busy} />

      <div className="flex flex-col px-[max(0.75rem,env(safe-area-inset-left))] pb-[calc(76px+env(safe-area-inset-bottom,0px))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-4 md:px-[max(1rem,env(safe-area-inset-left))] md:pb-8 md:pr-[max(1rem,env(safe-area-inset-right))]">
        <div className="mx-auto w-full max-w-lg space-y-8">
          <header>
            <h1 className="font-sans text-xl font-medium tracking-tight text-fg md:text-2xl">
              Import / Export
            </h1>
            <p className="mt-2 font-sans text-sm leading-relaxed text-fg-muted">
              Backups und Leitfaden-Text für externe Tools — ohne zusätzliche
              Funktionen im Desk.
            </p>
          </header>

          {error ? (
            <p className="rounded-md border border-accent/30 bg-accent-dim px-3 py-2 font-mono text-[12px] text-accent">
              {error}
            </p>
          ) : null}
          {clipErr ? (
            <p className="rounded-md border border-accent/30 bg-accent-dim px-3 py-2 font-mono text-[12px] text-accent">
              {clipErr}
            </p>
          ) : null}
          {kiImportNotice ? (
            <p
              className="rounded-md border border-green/30 bg-green-dim px-3 py-2 font-mono text-[12px] text-green"
              role="status"
            >
              {kiImportNotice}
            </p>
          ) : null}

          <section className="rounded-xl border border-border-subtle bg-surface p-4 md:p-5">
            <h2 className="font-mono text-[11px] uppercase tracking-wide text-fg-muted">
              Backup (Supabase)
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <DataExportButtons disabled={busy} />
              <button
                type="button"
                onClick={() => setKiImportOpen(true)}
                disabled={busy}
                className="ui-btn-secondary tap-scale rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide disabled:opacity-40"
              >
                KI-Import
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-border-subtle bg-surface p-4 shadow-[var(--stat-inset)] md:p-5">
            <h2 className="font-mono text-[11px] uppercase tracking-wide text-fg-muted">
              Export für Leitfaden
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-fg-muted">
              Strukturierter Text (Markdown-Abschnitte, Bereiche, Checkboxen).
            </p>
            <button
              type="button"
              onClick={() => void handleExportCopy()}
              disabled={busy}
              className="ui-btn-primary tap-scale mt-4 w-full max-w-full rounded-md px-4 py-2.5 font-mono text-[12px] uppercase tracking-wide disabled:opacity-40 sm:w-auto"
            >
              {copyNotice ? "In Zwischenablage kopiert" : "Text kopieren"}
            </button>
          </section>
        </div>
      </div>

      <KiImportModal
        open={kiImportOpen}
        onClose={() => setKiImportOpen(false)}
        disabled={busy}
        onImport={runKiImport}
      />
    </div>
  );
}
