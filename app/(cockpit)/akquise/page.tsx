"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AKQUISE_KANAELE,
  AKQUISE_STATUS,
} from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import { endOfWeekSunday, startOfWeekMonday } from "@/lib/weekUtils";
import type { AkquiseKanal, AkquiseLogRow, AkquiseStatus } from "@/lib/types";

const OPEN_STATUS: AkquiseStatus[] = [
  "Gesendet",
  "Antwort erhalten",
  "Termin vereinbart",
  "In Verhandlung",
];

function isResponseStatus(s: AkquiseStatus): boolean {
  return (
    s === "Antwort erhalten" ||
    s === "Termin vereinbart" ||
    s === "In Verhandlung"
  );
}

export default function AkquisePage() {
  const [rows, setRows] = useState<AkquiseLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [{ start: weekStart, end: weekEnd }] = useState(() => {
    const ref = new Date();
    return { start: startOfWeekMonday(ref), end: endOfWeekSunday(ref) };
  });

  const [firma, setFirma] = useState("");
  const [datum, setDatum] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [kanal, setKanal] = useState<AkquiseKanal>("E-Mail");
  const [status, setStatus] = useState<AkquiseStatus>("Gesendet");
  const [notiz, setNotiz] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("akquise_log")
        .select("*")
        .order("datum", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      setRows((data as AkquiseLogRow[]) ?? []);
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

  const weekRows = useMemo(
    () =>
      rows.filter((r) => {
        const d = new Date(r.datum + "T12:00:00");
        return d.getTime() >= weekStart.getTime() && d.getTime() <= weekEnd.getTime();
      }),
    [rows, weekStart, weekEnd]
  );

  const stats = useMemo(() => {
    const total = weekRows.length;
    const responded = weekRows.filter((r) => isResponseStatus(r.status)).length;
    const rate = total > 0 ? Math.round((100 * responded) / total) : 0;
    const openContacts = rows.filter((r) => OPEN_STATUS.includes(r.status))
      .length;
    return { total, rate, openContacts };
  }, [rows, weekRows]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const f = firma.trim();
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const now = new Date().toISOString();
      const { data, error } = await sb
        .from("akquise_log")
        .insert({
          firma: f,
          datum,
          kanal,
          status,
          notiz: notiz.trim() || null,
          created_at: now,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      setRows((prev) => [data as AkquiseLogRow, ...prev]);
      setFirma("");
      setNotiz("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: string, next: AkquiseStatus) {
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const now = new Date().toISOString();
      const { error } = await sb
        .from("akquise_log")
        .update({ status: next })
        .eq("id", id);
      if (error) throw new Error(error.message);
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: next } : r))
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto bg-[#0a0a0a] px-[max(1rem,env(safe-area-inset-left))] pb-3 max-md:pb-4 pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] md:min-h-[100dvh] md:pb-8">
      <div className="mx-auto w-full min-w-0 max-w-lg space-y-8">
        <header>
          <h1 className="font-sans text-xl font-medium tracking-tight text-neutral-100">
            Akquise-Log
          </h1>
          <p className="mt-1 font-mono text-[11px] text-neutral-500">
            Kontakte · Status · Kanal
          </p>
        </header>

        {err ? (
          <p className="rounded-lg border border-[#e63030]/40 bg-[#1a0a0a] px-3 py-2 font-mono text-[12px] text-[#fca5a5]">
            {err}
          </p>
        ) : null}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatBox label="Einträge diese Woche" value={String(stats.total)} />
          <StatBox label="Antwortrate (Woche)" value={`${stats.rate}%`} />
          <StatBox label="Offene Kontakte" value={String(stats.openContacts)} />
        </section>

        <form
          onSubmit={handleAdd}
          className="space-y-4 overflow-hidden rounded-xl border border-[#222222] bg-[#111111] p-4"
        >
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Neuer Eintrag
          </h2>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-neutral-500">
              Firma
            </span>
            <input
              value={firma}
              onChange={(e) => setFirma(e.target.value)}
              required
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-sm text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-neutral-500">
                Datum
              </span>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                disabled={busy}
                className="mt-1 w-full max-w-full box-border rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-sm text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-neutral-500">
                Kanal
              </span>
              <select
                value={kanal}
                onChange={(e) => setKanal(e.target.value as AkquiseKanal)}
                disabled={busy}
                className="mt-1 w-full rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-sm text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
              >
                {AKQUISE_KANAELE.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-neutral-500">
              Status
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AkquiseStatus)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-sm text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
            >
              {AKQUISE_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-neutral-500">
              Notiz
            </span>
            <textarea
              rows={2}
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              disabled={busy}
              className="mt-1 w-full resize-none rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-sm text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy || !firma.trim()}
              className="w-full rounded-lg bg-[#e63030] px-4 py-2.5 font-mono text-[12px] uppercase tracking-wide text-white hover:bg-[#c92828] disabled:opacity-40 sm:w-auto"
            >
              Speichern
            </button>
          </div>
        </form>

        <section>
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Alle Einträge
          </h2>
          {loading ? (
            <p className="mt-3 font-mono text-[12px] text-neutral-500">
              Lade …
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rows.length === 0 ? (
                <li className="rounded-lg border border-dashed border-[#333333] px-3 py-6 text-center font-sans text-sm text-neutral-500">
                  Noch keine Einträge.
                </li>
              ) : (
                rows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-[#222222] bg-[#111111] px-3 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-sans text-[15px] text-neutral-100">
                          {r.firma}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-neutral-500">
                          {new Date(r.datum + "T12:00:00").toLocaleDateString(
                            "de-DE"
                          )}{" "}
                          · {r.kanal}
                        </p>
                        {r.notiz?.trim() ? (
                          <p className="mt-2 font-sans text-[13px] text-neutral-400">
                            {r.notiz}
                          </p>
                        ) : null}
                      </div>
                      <select
                        value={r.status}
                        disabled={busy}
                        onChange={(e) =>
                          void updateStatus(r.id, e.target.value as AkquiseStatus)
                        }
                        className="max-w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-2 py-1.5 font-mono text-[11px] text-neutral-200 focus:border-[#e63030] focus:outline-none disabled:opacity-40"
                      >
                        {AKQUISE_STATUS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
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
    <div className="rounded-xl border border-[#222222] bg-[#111111] px-3 py-3">
      <p className="font-mono text-[10px] uppercase leading-tight tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-normal tabular-nums leading-tight text-neutral-100">
        {value}
      </p>
    </div>
  );
}
