import {
  akquiseWeekRows,
  isDoneThisWeek,
  isOpenRelevantThisWeek,
  weekBounds,
} from "@/lib/dashboardMetrics";
import type { AkquiseLogRow, Task } from "@/lib/types";

export type WeekReviewStats = {
  erledigtWoche: number;
  offenJetzt: number;
  akquiseWoche: number;
  ratePercent: number;
  top3Erledigt: Task[];
  motivation: string;
};

function motivationForRate(rate: number): string {
  if (rate >= 80)
    return "Stark — du ziehst die Woche souverän durch.";
  if (rate >= 55) return "Solide Basis — ein paar Punkte für nächste Woche merken.";
  if (rate >= 30) return "Jede erledigte Sache zählt — nächste Woche neu fokussieren.";
  return "Atmen, priorisieren, kleine Schritte — du schaffst das.";
}

export function buildWeekReviewStats(
  tasks: Task[],
  akquise: AkquiseLogRow[],
  clock: Date
): WeekReviewStats {
  const { start: weekStart, end: weekEnd } = weekBounds(clock);
  const open = tasks.filter((t) => !t.done);
  const erledigtListe = tasks.filter((t) =>
    isDoneThisWeek(t, weekStart, weekEnd)
  );
  const akquiseWoche = akquiseWeekRows(akquise, weekStart, weekEnd).length;
  const offenRelevant = open.filter((t) =>
    isOpenRelevantThisWeek(t, weekStart, weekEnd)
  );
  const ratePercent = Math.round(
    (100 * erledigtListe.length) /
      Math.max(1, erledigtListe.length + offenRelevant.length)
  );
  const top3Erledigt = [...erledigtListe]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 3);
  return {
    erledigtWoche: erledigtListe.length,
    offenJetzt: open.length,
    akquiseWoche,
    ratePercent,
    top3Erledigt,
    motivation: motivationForRate(ratePercent),
  };
}
