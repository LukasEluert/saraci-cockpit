"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const sb = getSupabase();
      const { error: signErr } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] px-[max(1rem,env(safe-area-inset-left))] py-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm rounded-xl border border-[#222222] bg-[#111111] p-6">
        <h1 className="font-sans text-lg font-medium tracking-tight text-neutral-100">
          Saraci Cockpit
        </h1>
        <p className="mt-1 font-mono text-[11px] text-neutral-500">
          Anmeldung
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wide text-neutral-500">
              E-Mail
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 font-sans text-sm text-neutral-100 outline-none ring-[#e63030]/40 focus:border-[#e63030] focus:ring-1"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wide text-neutral-500">
              Passwort
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 font-sans text-sm text-neutral-100 outline-none ring-[#e63030]/40 focus:border-[#e63030] focus:ring-1"
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-[#e63030]/40 bg-[#1a0a0a] px-3 py-2 font-mono text-[12px] text-[#fca5a5]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-4 py-3 font-mono text-[12px] uppercase tracking-wide text-neutral-200 transition-colors hover:border-[#e63030] hover:text-white disabled:opacity-40"
          >
            {busy ? "Anmelden …" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
