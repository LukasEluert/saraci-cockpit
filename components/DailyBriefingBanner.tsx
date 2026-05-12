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
      className="relative mb-3 flex min-w-0 items-stretch overflow-hidden rounded-lg border border-[#333333] bg-[#111111] shadow-md"
      role="status"
    >
      <div
        className="w-1 shrink-0 bg-[#e63030]"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 pr-10">
        <p className="min-w-0 font-mono text-[11px] leading-snug text-neutral-200 md:text-[12px]">
          <span className="text-[#e63030]">Heute:</span>{" "}
          {faelligHeute} {faelligHeute === 1 ? "Task" : "Tasks"} fällig ·{" "}
          {ueberfaellig} überfällig · {akquiseTeil}
        </p>
      </div>
      <button
        type="button"
        onClick={() => consume()}
        className="tap-scale absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-[#222222] hover:text-neutral-100"
        aria-label="Briefing schließen"
      >
        ×
      </button>
    </div>
  );
}
