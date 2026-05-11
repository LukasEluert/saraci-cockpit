"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Props = {
  variant?: "default" | "compact";
  className?: string;
};

export function LogoutButton({ variant = "default", className = "" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      const sb = getSupabase();
      await sb.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        title="Abmelden"
        aria-label="Abmelden"
        onClick={() => void handleLogout()}
        disabled={busy}
        className={`tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#333333] text-neutral-400 transition-colors hover:border-[#e63030] hover:text-[#e63030] disabled:opacity-40 md:h-11 md:w-11 ${className}`}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={busy}
      className="tap-scale shrink-0 rounded-lg border border-[#333333] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-neutral-400 hover:border-[#e63030] hover:text-[#e63030] disabled:opacity-40"
    >
      {busy ? "…" : "Abmelden"}
    </button>
  );
}
