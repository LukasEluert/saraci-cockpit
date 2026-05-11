"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export function LogoutButton() {
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

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={busy}
      className="shrink-0 rounded-lg border border-[#333333] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-neutral-400 transition-colors hover:border-[#e63030] hover:text-[#e63030] disabled:opacity-40"
    >
      {busy ? "…" : "Abmelden"}
    </button>
  );
}
