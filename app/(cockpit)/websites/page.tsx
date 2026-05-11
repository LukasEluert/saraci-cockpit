"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type MonitorStatus = "up" | "down" | "paused";

type Monitor = {
  id: number;
  name: string;
  url: string;
  status: MonitorStatus;
  uptime24h: number;
};

type Summary = {
  total: number;
  up: number;
  down: number;
  paused: number;
  uptime24hAvg: number;
};

type ApiResponse = {
  monitors: Monitor[];
  summary: Summary;
};

export default function WebsitesPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const res = await fetch("/api/monitors", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Laden fehlgeschlagen (${res.status})`);
      }
      const data = (await res.json()) as ApiResponse;
      setMonitors(data.monitors ?? []);
      setSummary(data.summary ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      setMonitors([]);
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const s = summary;
    if (!s) {
      return {
        total: 0,
        up: 0,
        down: 0,
        uptime: 0,
      };
    }
    return {
      total: s.total,
      up: s.up,
      down: s.down,
      uptime: s.uptime24hAvg,
    };
  }, [summary]);

  return (
    <div className="flex h-full min-h-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto bg-[#0a0a0a] px-[max(1rem,env(safe-area-inset-left))] pb-3 max-md:pb-4 pr-[max(1rem,env(safe-area-inset-right))] pt-[max(env(safe-area-inset-top),16px)] md:min-h-[100dvh] md:pb-8">
      <div className="mx-auto w-full min-w-0 max-w-lg space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-sans text-xl font-medium tracking-tight text-neutral-100">
              Websites
            </h1>
            <p className="mt-1 font-mono text-[11px] text-neutral-500">
              UptimeRobot · Status &amp; Uptime
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="tap-scale shrink-0 rounded-lg border border-[#333333] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-neutral-200 hover:border-[#e63030] hover:text-white disabled:opacity-40"
          >
            {refreshing ? "Lädt …" : "Aktualisieren"}
          </button>
        </header>

        {error ? (
          <p className="rounded-lg border border-[#e63030]/40 bg-[#1a0a0a] px-3 py-2 font-mono text-[12px] text-[#fca5a5]">
            {error}
          </p>
        ) : null}

        <section className="grid grid-cols-3 gap-3">
          <StatCard label="Up" value={loading ? "—" : String(stats.up)} tone="up" />
          <StatCard
            label="Down"
            value={loading ? "—" : String(stats.down)}
            tone={stats.down > 0 ? "down" : "neutral"}
          />
          <StatCard
            label="Uptime 24h"
            value={loading ? "—" : `${stats.uptime.toFixed(1)}%`}
            tone="neutral"
          />
        </section>

        <section className="rounded-xl border border-[#222222] bg-[#111111] p-4">
          <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
            Monitore
          </h2>
          {loading ? (
            <p className="mt-3 font-mono text-[12px] text-neutral-500">Lade …</p>
          ) : monitors.length === 0 ? (
            <p className="mt-3 font-sans text-sm text-neutral-500">
              Keine Monitore gefunden. Bitte UptimeRobot-Konfiguration prüfen.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {monitors.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-[#222222] bg-[#0f0f0f] px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-sans text-[15px] text-neutral-100">
                        {m.name}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-neutral-500">
                        {m.url}
                      </p>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="mt-1.5 font-mono text-[11px] text-neutral-400">
                    Uptime 24h:{" "}
                    <span className="tabular-nums">
                      {m.uptime24h.toFixed(1)}
                      %
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "up" | "down" | "neutral";
}) {
  const color =
    tone === "up" ? "#22c55e" : tone === "down" ? "#e63030" : "#e5e5e5";
  return (
    <div className="rounded-xl border border-[#222222] bg-[#111111] px-3 py-3">
      <p className="font-mono text-[10px] uppercase leading-tight tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className="mt-1 font-mono text-xl font-normal tabular-nums leading-tight"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: MonitorStatus }) {
  const { label, color, bg } =
    status === "up"
      ? {
          label: "Up",
          color: "#22c55e",
          bg: "bg-[#022c16]",
        }
      : status === "down"
        ? {
            label: "Down",
            color: "#f97373",
            bg: "bg-[#2b0b0b]",
          }
        : {
            label: "Paused",
            color: "#a3a3a3",
            bg: "bg-[#171717]",
          };
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border border-[#333333] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        bg,
      ].join(" ")}
      style={{ color }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

