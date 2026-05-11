"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { TASKS_LIST_SELECT } from "@/lib/taskSelect";
import type { Task } from "@/lib/types";
import {
  endOfWeekSunday,
  isTimestampInRange,
  isYmdInWeek,
  startOfWeekMonday,
} from "@/lib/weekUtils";

function bereichName(t: Task): string {
  return t.bereiche?.name?.trim() || "";
}

function isOpenRelevantThisWeek(
  t: Task,
  weekStart: Date,
  weekEnd: Date
): boolean {
  if (t.done) return false;
  const dl = t.deadline?.trim() || "";
  if (dl === "Heute" || dl === "Diese Woche") return true;
  if (t.nächste_fälligkeit && isYmdInWeek(t.nächste_fälligkeit, weekStart, weekEnd))
    return true;
  return false;
}

function isDoneThisWeek(
  t: Task,
  weekStart: Date,
  weekEnd: Date
): boolean {
  return t.done && isTimestampInRange(t.updated_at, weekStart, weekEnd);
}

export default function WochePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("tasks")
        .select(TASKS_LIST_SELECT)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      setTasks((data as Task[]) ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const [{ start: weekStart, end: weekEnd }] = useState(() => {
    const ref = new Date();
    return { start: startOfWeekMonday(ref), end: endOfWeekSunday(ref) };
  });

  const erledigt = useMemo(
    () => tasks.filter((t) => isDoneThisWeek(t, weekStart, weekEnd)),
    [tasks, weekStart, weekEnd]
  );
  const offenWoche = useMemo(
    () => tasks.filter((t) => isOpenRelevantThisWeek(t, weekStart, weekEnd)),
    [tasks, weekStart, weekEnd]
  );
  const akquise = useMemo(
    () =>
      offenWoche.filter(
        (t) => bereichName(t).toLowerCase() === "akquise".toLowerCase()
      ),
    [offenWoche]
  );

  const rate = useMemo(() => {
    const num = erledigt.length;
    const den = Math.max(1, num + offenWoche.length);
    return Math.round((100 * num) / den);
  }, [erledigt.length, offenWoche.length]);

  const labelStart = weekStart.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });
  const labelEnd = weekEnd.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] px-[max(1rem,env(safe-area-inset-left))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-lg space-y-8">
        <header>
          <h1 className="font-sans text-xl font-medium tracking-tight text-neutral-100">
            Wochenübersicht
          </h1>
          <p className="mt-1 font-mono text-[11px] text-neutral-500">
            {labelStart} – {labelEnd}
          </p>
        </header>

        {err ? (
          <p className="rounded-lg border border-[#e63030]/40 bg-[#1a0a0a] px-3 py-2 font-mono text-[12px] text-[#fca5a5]">
            {err}
          </p>
        ) : null}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Erledigt (Woche)" value={String(erledigt.length)} />
          <StatBox label="Offen (Woche)" value={String(offenWoche.length)} />
          <StatBox label="Akquise offen" value={String(akquise.length)} />
          <StatBox label="Erledigungsrate" value={`${rate}%`} />
        </section>

        {loading ? (
          <p className="font-mono text-[12px] text-neutral-500">Lade …</p>
        ) : (
          <>
            <section className="rounded-xl border border-[#222222] bg-[#111111] p-4">
              <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
                Erledigt diese Woche
              </h2>
              <ul className="mt-3 space-y-2">
                {erledigt.length === 0 ? (
                  <li className="font-sans text-sm text-neutral-500">
                    Keine Einträge.
                  </li>
                ) : (
                  erledigt.map((t) => (
                    <li
                      key={t.id}
                      className="border-b border-[#222222] py-2 font-sans text-sm text-neutral-300 last:border-0"
                    >
                      <span className="text-neutral-500">
                        {new Date(t.updated_at).toLocaleDateString("de-DE")}
                      </span>{" "}
                      · {t.text}
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-[#222222] bg-[#111111] p-4">
              <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
                Offen diese Woche
              </h2>
              <ul className="mt-3 space-y-2">
                {offenWoche.length === 0 ? (
                  <li className="font-sans text-sm text-neutral-500">
                    Keine Einträge.
                  </li>
                ) : (
                  offenWoche.map((t) => (
                    <li
                      key={t.id}
                      className="border-b border-[#222222] py-2 font-sans text-sm text-neutral-300 last:border-0"
                    >
                      <span className="font-mono text-[10px] text-neutral-500">
                        {bereichName(t) || "—"}
                      </span>{" "}
                      · {t.text}
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-[#222222] bg-[#111111] p-4">
              <h2 className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
                Akquise (offen, diese Woche)
              </h2>
              <ul className="mt-3 space-y-2">
                {akquise.length === 0 ? (
                  <li className="font-sans text-sm text-neutral-500">
                    Keine Einträge.
                  </li>
                ) : (
                  akquise.map((t) => (
                    <li
                      key={t.id}
                      className="border-b border-[#222222] py-2 font-sans text-sm text-neutral-300 last:border-0"
                    >
                      {t.text}
                    </li>
                  ))
                )}
              </ul>
            </section>
          </>
        )}
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
      <p className="mt-1 font-mono text-2xl font-light text-neutral-100">
        {value}
      </p>
    </div>
  );
}
