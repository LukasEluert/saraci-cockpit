"use client";

import Link from "next/link";
import { WeekReviewPanel } from "@/components/WeekReviewPanel";

export default function WochenrueckblickPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-bg px-[max(1rem,env(safe-area-inset-left))] pb-8 pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full min-w-0 max-w-lg">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/einstellungen"
            className="font-mono text-[11px] uppercase tracking-wide text-fg-muted transition-colors duration-100 ease-out hover:text-accent"
          >
            ← Einstellungen
          </Link>
        </div>
        <WeekReviewPanel clock={new Date()} />
      </div>
    </div>
  );
}
