"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PROJEKT_STATUS } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import type { ProjektRow, ProjektStatus } from "@/lib/types";

function parseBetrag(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeProjekt(r: Record<string, unknown>): ProjektRow {
  return {
    id: String(r.id),
    kunde: String(r.kunde ?? ""),
    betrag: parseBetrag(r.betrag),
    status: r.status as ProjektStatus,
    notiz: r.notiz != null ? String(r.notiz) : null,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export default function ProjektePage() {
  const [rows, setRows] = useState<ProjektRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [kunde, setKunde] = useState("");
  const [betrag, setBetrag] = useState("");
  const [status, setStatus] = useState<ProjektStatus>("Angebot");
  const [notiz, setNotiz] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("projekte")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      setRows(((data as Record<string, unknown>[]) ?? []).map(normalizeProjekt));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const offenUmsatz = rows
      .filter((r) => r.status !== "Abgeschlossen")
      .reduce((s, r) => s + r.betrag, 0);
    const inArbeit = rows.filter((r) => r.status === "In Arbeit").length;
    const withValue = rows.filter((r) => r.betrag > 0);
    const avg =
      withValue.length > 0
        ? withValue.reduce((s, r) => s + r.betrag, 0) / withValue.length
        : 0;
    return {
      offenUmsatz,
      inArbeit,
      avg,
    };
  }, [rows]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const k = kunde.trim();
    if (!k) return;
    const b = parseFloat(betrag.replace(",", "."));
    if (!Number.isFinite(b) || b < 0) {
      setErr("Bitte gültigen Betrag eingeben.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const now = new Date().toISOString();
      const { data, error } = await sb
        .from("projekte")
        .insert({
          kunde: k,
          betrag: b,
          status,
          notiz: notiz.trim() || null,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      setRows((prev) => [normalizeProjekt(data as Record<string, unknown>), ...prev]);
      setKunde("");
      setBetrag("");
      setNotiz("");
      setStatus("Angebot");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  return (
    <div className="flex h-full min-h-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto bg-bg px-[max(1rem,env(safe-area-inset-left))] pb-3 max-md:pb-4 pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] md:min-h-[100dvh] md:pb-8">
      <div className="mx-auto w-full min-w-0 max-w-lg space-y-8">
        <header>
          <h1 className="font-sans text-xl font-medium tracking-tight text-fg">
            Projekte
          </h1>
          <p className="mt-1 font-mono text-[11px] text-fg-muted">
            Kunden · Betrag · Status
          </p>
        </header>

        {err ? (
          <p className="rounded-lg border border-accent/30 bg-accent-dim px-3 py-2 font-mono text-[12px] text-accent">
            {err}
          </p>
        ) : null}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatBox label="Umsatz offen" value={fmt(stats.offenUmsatz)} />
          <StatBox label="In Arbeit" value={String(stats.inArbeit)} />
          <StatBox label="Ø Projektwert" value={fmt(stats.avg)} />
        </section>

        <form
          onSubmit={handleAdd}
          className="space-y-4 rounded-xl border border-border-subtle bg-surface p-4"
        >
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-fg-muted">
            Neues Projekt
          </h2>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-fg-muted">
              Kunde
            </span>
            <input
              value={kunde}
              onChange={(e) => setKunde(e.target.value)}
              required
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-border-subtle bg-bg px-3 py-2 font-sans text-sm text-fg focus:border-accent/50 focus:outline-none disabled:opacity-50"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-fg-muted">
                Betrag (EUR)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={betrag}
                onChange={(e) => setBetrag(e.target.value)}
                placeholder="0"
                disabled={busy}
                className="mt-1 w-full rounded-lg border border-border-subtle bg-bg px-3 py-2 font-sans text-sm text-fg focus:border-accent/50 focus:outline-none disabled:opacity-50"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-fg-muted">
                Status
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjektStatus)}
                disabled={busy}
                className="mt-1 w-full rounded-lg border border-border-subtle bg-bg px-3 py-2 font-sans text-sm text-fg focus:border-accent/50 focus:outline-none disabled:opacity-50"
              >
                {PROJEKT_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-fg-muted">
              Notiz
            </span>
            <textarea
              rows={2}
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              disabled={busy}
              className="mt-1 w-full resize-none rounded-lg border border-border-subtle bg-bg px-3 py-2 font-sans text-sm text-fg focus:border-accent/50 focus:outline-none disabled:opacity-50"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy || !kunde.trim()}
              className="w-full ui-btn-primary rounded-md px-4 py-2.5 font-mono text-[12px] uppercase tracking-wide text-white  disabled:opacity-40 sm:w-auto"
            >
              Anlegen
            </button>
          </div>
        </form>

        <section>
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-fg-muted">
            Übersicht
          </h2>
          {loading ? (
            <p className="mt-3 font-mono text-[12px] text-fg-muted">
              Lade …
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rows.length === 0 ? (
                <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center font-sans text-sm text-fg-muted">
                  Noch keine Projekte.
                </li>
              ) : (
                rows.map((r) => (
                  <ProjektCard
                    key={r.id}
                    row={r}
                    busy={busy}
                    onBusy={setBusy}
                    onErr={setErr}
                    onUpdated={(u) =>
                      setRows((prev) =>
                        prev.map((x) => (x.id === u.id ? u : x))
                      )
                    }
                  />
                ))
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface px-3 py-3">
      <p className="font-mono text-[10px] uppercase leading-tight tracking-wide text-fg-muted">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-normal tabular-nums leading-tight text-fg">
        {value}
      </p>
    </div>
  );
}

function ProjektCard({
  row,
  busy,
  onBusy,
  onErr,
  onUpdated,
}: {
  row: ProjektRow;
  busy: boolean;
  onBusy: (v: boolean) => void;
  onErr: (s: string | null) => void;
  onUpdated: (r: ProjektRow) => void;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

  async function changeStatus(next: ProjektStatus) {
    onBusy(true);
    onErr(null);
    try {
      const sb = getSupabase();
      const now = new Date().toISOString();
      const { error } = await sb
        .from("projekte")
        .update({ status: next, updated_at: now })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      onUpdated({ ...row, status: next, updated_at: now });
    } catch (e) {
      onErr(e instanceof Error ? e.message : "Update fehlgeschlagen");
    } finally {
      onBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-border-subtle bg-surface px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-sans text-[15px] text-fg">{row.kunde}</p>
          <p className="mt-1 font-mono text-[13px] text-accent">
            {fmt(row.betrag)}
          </p>
          {row.notiz?.trim() ? (
            <p className="mt-2 font-sans text-[13px] text-fg-muted">
              {row.notiz}
            </p>
          ) : null}
        </div>
        <select
          value={row.status}
          disabled={busy}
          onChange={(e) =>
            void changeStatus(e.target.value as ProjektStatus)
          }
          className="max-w-full shrink-0 rounded-lg border border-border bg-bg px-2 py-1.5 font-mono text-[11px] text-fg focus:border-accent/50 focus:outline-none disabled:opacity-40"
        >
          {PROJEKT_STATUS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}
