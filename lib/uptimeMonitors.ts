/** Roh-Antwort von UptimeRobot v2 getMonitors (über /api/monitors). */
export function parseMonitorsUpTotal(data: unknown): {
  up: number;
  total: number;
} | null {
  const d = data as {
    stat?: string;
    monitors?: Array<{ status?: number }>;
  };
  if (d.stat !== "ok" || !Array.isArray(d.monitors) || d.monitors.length === 0) {
    return null;
  }
  const total = d.monitors.length;
  const up = d.monitors.filter((m) => Number(m.status) === 2).length;
  return { up, total };
}
