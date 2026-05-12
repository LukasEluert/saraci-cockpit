"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DuplicateTasksPanel } from "@/components/DuplicateTasksPanel";
import { getSupabase } from "@/lib/supabase";
import {
  readShowAkquise,
  readShowProjekte,
  writeShowAkquise,
  writeShowProjekte,
} from "@/lib/navPreferences";
import { ensureDefaultBereiche } from "@/lib/seedBereiche";
import type { BereichRow } from "@/lib/types";

export default function EinstellungenPage() {
  const [bereiche, setBereiche] = useState<BereichRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAkquise, setShowAkquise] = useState(true);
  const [showProjekte, setShowProjekte] = useState(true);

  const [newName, setNewName] = useState("");
  const [newFarbe, setNewFarbe] = useState("#e63030");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sb = getSupabase();
      await ensureDefaultBereiche(sb);
      const { data, error } = await sb
        .from("bereiche")
        .select("*")
        .order("name");
      if (error) throw new Error(error.message);
      setBereiche((data as BereichRow[]) ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      setBereiche([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setShowAkquise(readShowAkquise());
    setShowProjekte(readShowProjekte());
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const n = newName.trim();
    if (!n) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const now = new Date().toISOString();
      const { data, error } = await sb
        .from("bereiche")
        .insert({ name: n, farbe: newFarbe.trim() || "#525252", created_at: now })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      setBereiche((prev) =>
        [...prev, data as BereichRow].sort((a, b) =>
          a.name.localeCompare(b.name, "de")
        )
      );
      setNewName("");
      setNewFarbe("#e63030");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Anlegen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function saveRow(row: BereichRow, name: string, farbe: string) {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const { error } = await sb
        .from("bereiche")
        .update({ name: n, farbe: farbe.trim() || "#525252" })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      setBereiche((prev) =>
        prev
          .map((b) =>
            b.id === row.id ? { ...b, name: n, farbe: farbe.trim() } : b
          )
          .sort((a, b) => a.name.localeCompare(b.name, "de"))
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRow(row: BereichRow) {
    const ok = window.confirm(`Bereich „${row.name}“ wirklich löschen?`);
    if (!ok) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const { count, error: cErr } = await sb
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("bereich_id", row.id);
      if (cErr) throw new Error(cErr.message);
      if ((count ?? 0) > 0) {
        throw new Error(
          "Bereich ist noch Aufgaben zugeordnet und kann nicht gelöscht werden."
        );
      }
      const { error: dErr } = await sb.from("bereiche").delete().eq("id", row.id);
      if (dErr) throw new Error(dErr.message);
      setBereiche((prev) => prev.filter((b) => b.id !== row.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto bg-[#0a0a0a] px-[max(1rem,env(safe-area-inset-left))] pb-3 pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] max-md:pb-4 md:min-h-[100dvh] md:pb-8">
      <div className="mx-auto w-full min-w-0 max-w-lg space-y-8">
        <header>
          <h1 className="font-sans text-xl font-medium tracking-tight text-neutral-100">
            Einstellungen
          </h1>
          <p className="mt-1 font-mono text-[11px] text-neutral-500">
            Bereiche verwalten
          </p>
        </header>

        {err ? (
          <p className="rounded-lg border border-[#e63030]/40 bg-[#1a0a0a] px-3 py-2 font-mono text-[12px] text-[#fca5a5]">
            {err}
          </p>
        ) : null}

        <section className="rounded-xl border border-[#222222] bg-[#111111] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Navigation
          </h2>
          <p className="mt-2 font-sans text-[13px] text-neutral-400">
            Ausgeblendete Bereiche erscheinen nicht in der Sidebar und in der
            mobilen unteren Navigation.
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-3">
              <span className="font-mono text-[12px] uppercase tracking-wide text-neutral-200">
                Akquise anzeigen
              </span>
              <input
                type="checkbox"
                checked={showAkquise}
                onChange={(e) => {
                  const v = e.target.checked;
                  setShowAkquise(v);
                  writeShowAkquise(v);
                }}
                className="h-4 w-4 shrink-0 rounded border-[#404040] bg-[#111111] text-[#e63030] focus:ring-[#e63030]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-3">
              <span className="font-mono text-[12px] uppercase tracking-wide text-neutral-200">
                Projekte anzeigen
              </span>
              <input
                type="checkbox"
                checked={showProjekte}
                onChange={(e) => {
                  const v = e.target.checked;
                  setShowProjekte(v);
                  writeShowProjekte(v);
                }}
                className="h-4 w-4 shrink-0 rounded border-[#404040] bg-[#111111] text-[#e63030] focus:ring-[#e63030]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-[#222222] bg-[#111111] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Wochenrückblick
          </h2>
          <p className="mt-2 font-sans text-[13px] text-neutral-400">
            Auswertung der aktuellen Kalenderwoche: erledigte und offene Tasks,
            Akquise und Motivation.
          </p>
          <Link
            href="/wochenrueckblick"
            className="mt-4 inline-flex rounded-lg border border-[#333333] px-4 py-2.5 font-mono text-[12px] uppercase tracking-wide text-neutral-200 transition-colors hover:border-[#e63030] hover:text-white"
          >
            Wochenrückblick anzeigen
          </Link>
        </section>

        <DuplicateTasksPanel />

        <form
          onSubmit={handleAdd}
          className="space-y-4 rounded-xl border border-[#222222] bg-[#111111] p-4"
        >
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Neuer Bereich
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-neutral-500">
                Name
              </span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={busy}
                className="mt-1 max-h-11 w-full rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-sm text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-neutral-500">
                Farbe (Hex)
              </span>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={newFarbe.length === 7 ? newFarbe : "#e63030"}
                  onChange={(e) => setNewFarbe(e.target.value)}
                  disabled={busy}
                  className="box-border h-9 w-9 shrink-0 cursor-pointer rounded border border-[#333333] bg-[#0a0a0a] disabled:opacity-50 md:h-10 md:w-12"
                />
                <input
                  value={newFarbe}
                  onChange={(e) => setNewFarbe(e.target.value)}
                  disabled={busy}
                  placeholder="#e63030"
                  className="min-w-0 max-h-11 flex-1 rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-mono text-sm text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
                />
              </div>
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="rounded-lg bg-[#e63030] px-4 py-2.5 font-mono text-[12px] uppercase tracking-wide text-white hover:bg-[#c92828] disabled:opacity-40"
            >
              Hinzufügen
            </button>
          </div>
        </form>

        <section>
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Bereiche
          </h2>
          {loading ? (
            <p className="mt-3 font-mono text-[12px] text-neutral-500">
              Lade …
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5 md:space-y-3">
              {bereiche.map((b) => (
                <BereichEditorRow
                  key={b.id}
                  row={b}
                  busy={busy}
                  onSave={saveRow}
                  onDelete={deleteRow}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function BereichEditorRow({
  row,
  busy,
  onSave,
  onDelete,
}: {
  row: BereichRow;
  busy: boolean;
  onSave: (row: BereichRow, name: string, farbe: string) => void;
  onDelete: (row: BereichRow) => void;
}) {
  const [name, setName] = useState(row.name);
  const [farbe, setFarbe] = useState(row.farbe);

  useEffect(() => {
    setName(row.name);
    setFarbe(row.farbe);
  }, [row.id, row.name, row.farbe]);

  const dirty = name.trim() !== row.name || farbe.trim() !== row.farbe;
  const colorValue = /^#[0-9a-fA-F]{6}$/.test(farbe) ? farbe : "#525252";

  return (
    <li className="rounded-lg border border-[#222222] bg-[#111111] px-2 py-1.5 md:p-3">
      <div className="flex items-center justify-between gap-2 md:hidden">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          placeholder="Name"
          className="min-h-0 min-w-0 max-h-11 flex-1 rounded-lg border border-[#222222] bg-[#0a0a0a] px-2 py-2 font-sans text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
        />
        <div className="flex shrink-0 items-center gap-1">
          <input
            type="color"
            value={colorValue}
            onChange={(e) => setFarbe(e.target.value)}
            disabled={busy}
            aria-label="Farbe"
            className="box-border h-9 w-9 shrink-0 cursor-pointer rounded border border-[#333333] bg-[#0a0a0a] p-0 disabled:opacity-50"
          />
          <BereichIconButton
            label="Speichern"
            disabled={busy || !dirty}
            onClick={() => onSave(row, name, farbe)}
            variant="save"
          />
          <BereichIconButton
            label="Löschen"
            disabled={busy}
            onClick={() => void onDelete(row)}
            variant="delete"
          />
        </div>
      </div>

      <div className="hidden md:block">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1">
          <span className="font-mono text-[10px] uppercase text-neutral-500">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            className="mt-1 w-full rounded-lg border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-sans text-sm text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
          />
        </label>
        <label className="block sm:w-40">
          <span className="font-mono text-[10px] uppercase text-neutral-500">
            Farbe
          </span>
          <div className="mt-1 flex gap-2">
            <input
              type="color"
              value={colorValue}
              onChange={(e) => setFarbe(e.target.value)}
              disabled={busy}
              className="h-10 w-12 shrink-0 cursor-pointer rounded border border-[#333333] bg-[#0a0a0a] disabled:opacity-50"
            />
            <input
              value={farbe}
              onChange={(e) => setFarbe(e.target.value)}
              disabled={busy}
              className="min-w-0 flex-1 rounded-lg border border-[#222222] bg-[#0a0a0a] px-2 py-2 font-mono text-[12px] text-neutral-100 focus:border-[#e63030] focus:outline-none disabled:opacity-50"
            />
          </div>
        </label>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={() => onSave(row, name, farbe)}
            className="rounded-lg border border-[#333333] px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-neutral-200 hover:border-[#e63030] hover:text-white disabled:opacity-40"
          >
            Speichern
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete(row)}
            className="rounded-lg border border-[#333333] px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-neutral-500 hover:border-[#e63030] hover:text-[#e63030] disabled:opacity-40"
          >
            Löschen
          </button>
        </div>
        </div>
      </div>
    </li>
  );
}

function BereichIconButton({
  label,
  disabled,
  onClick,
  variant,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  variant: "save" | "delete";
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#333333] text-neutral-400 transition-colors hover:border-[#e63030] hover:text-[#e63030] disabled:opacity-40 md:h-10 md:w-10"
    >
      {variant === "save" ? (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14ZM10 11v6M14 11v6" />
        </svg>
      )}
    </button>
  );
}
