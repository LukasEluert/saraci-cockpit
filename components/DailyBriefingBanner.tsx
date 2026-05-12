"use client";

import { useEffect, useRef, useState } from "react";
import { markDailyBriefingShownToday } from "@/lib/briefingStorage";

type Props = {
  faelligHeute: number;
  ueberfaellig: number;
  akquiseTageSeit: number | null;
  akquiseNie: boolean;
  onConsumed: () => void;
};

export function DailyBriefingBanner({
  faelligHeute,
  ueberfaellig,
  akquiseTageSeit,
  akquiseNie,
  onConsumed,
}: Props) {
  const [visible, setVisible] = useState(true);
  const dismissed = useRef(false);
  const onConsumedRef = useRef(onConsumed);
  onConsumedRef.current = onConsumed;

  function consume() {
    if (dismissed.current) return;
    dismissed.current = true;
    markDailyBriefingShownToday();
    setVisible(false);
    onConsumedRef.current();
  }

  useEffect(() => {
    const t = window.setTimeout(() => consume(), 8000);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  const akquiseTeil = akquiseNie
    ? "noch keine Akquise"
    : akquiseTageSeit === null
      ? "Akquise unbekannt"
      : akquiseTageSeit === 0
        ? "Letzte Akquise heute"
        : akquiseTageSeit === 1
          ? "Letzte Akquise vor 1 Tag"
          : `Letzte Akquise vor ${akquiseTageSeit} Tagen`;

  return (
    <div
      className="ui-animate-briefing relative mb-3 flex min-w-0 items-stretch overflow-hidden rounded-lg border border-accent/20 pr-10 shadow-[var(--stat-inset)]"
      style={{
        background: "rgba(20,20,20,0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      role="status"
    >
      <div
        className="w-[3px] shrink-0 bg-accent"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5">
        <p className="min-w-0 font-mono text-[11px] leading-snug text-fg md:text-[12px]">
          <span className="text-accent">Heute:</span>{" "}
          {faelligHeute} {faelligHeute === 1 ? "Task" : "Tasks"} fällig ·{" "}
          {ueberfaellig} überfällig · {akquiseTeil}
        </p>
      </div>
      <button
        type="button"
        onClick={() => consume()}
        className="tap-scale absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-muted transition-colors duration-100 ease-out hover:bg-surface-hover hover:text-fg"
        aria-label="Briefing schließen"
      >
        ×
      </button>
    </div>
  );
}
