import { NextResponse } from "next/server";

type UptimeRobotMonitor = {
  id: number;
  friendly_name: string;
  url: string;
  status: number;
  custom_uptime_ranges?: unknown;
};

type ApiMonitor = {
  id: number;
  name: string;
  url: string;
  status: "up" | "down" | "paused";
  uptime24h: number;
};

type ApiSummary = {
  total: number;
  up: number;
  down: number;
  paused: number;
  uptime24hAvg: number;
};

type ApiResponse = {
  monitors: ApiMonitor[];
  summary: ApiSummary;
};

function mapStatus(code: number): ApiMonitor["status"] {
  // UptimeRobot v2 status codes:
  // 0 = paused, 1 = not checked yet, 2 = up, 8/9 = seems down/down
  if (code === 2) return "up";
  if (code === 9 || code === 8) return "down";
  return "paused";
}

export async function GET(): Promise<NextResponse<ApiResponse | { error: string }>> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "UPTIMEROBOT_API_KEY fehlt in der Server-Konfiguration." },
      { status: 500 },
    );
  }

  try {
    const body = new URLSearchParams({
      api_key: apiKey,
      format: "json",
      logs: "0",
    });

    const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
      // kurze Timeouts, damit das Dashboard nicht hängt
      cache: "no-store",
    });

    if (!res.ok) {
      const maybeText = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.error("UptimeRobot HTTP Fehler", {
        status: res.status,
        statusText: res.statusText,
        response: maybeText.slice(0, 400),
      });
      return NextResponse.json(
        { error: `UptimeRobot Fehler: ${res.status} ${res.statusText}` },
        { status: 502 },
      );
    }

    let json: unknown = null;
    try {
      json = (await res.json()) as unknown;
    } catch {
      const raw = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.error("UptimeRobot Antwort ist kein JSON", raw.slice(0, 400));
      return NextResponse.json(
        { error: "UptimeRobot Antwort ist ungültig (kein JSON)." },
        { status: 502 },
      );
    }

    const parsed = json as {
      stat?: string;
      monitors?: UptimeRobotMonitor[];
      error?: { message?: string };
    };

    if (parsed.stat !== "ok" || !Array.isArray(parsed.monitors)) {
      return NextResponse.json(
        { error: parsed.error?.message || "UptimeRobot Antwort ungültig." },
        { status: 502 },
      );
    }

    const monitors: ApiMonitor[] = parsed.monitors.map((m) => {
      const cru = m.custom_uptime_ranges;
      const uptimeRaw =
        typeof cru === "string"
          ? cru.split("-")[0] || ""
          : typeof cru === "number"
            ? String(cru)
            : "";
      const uptime = Number.parseFloat(uptimeRaw);
      const uptime24h = Number.isFinite(uptime) ? Math.max(0, Math.min(100, uptime)) : 0;
      return {
        id: m.id,
        name: m.friendly_name,
        url: m.url,
        status: mapStatus(m.status),
        uptime24h,
      };
    });

    const total = monitors.length;
    const up = monitors.filter((m) => m.status === "up").length;
    const down = monitors.filter((m) => m.status === "down").length;
    const paused = monitors.filter((m) => m.status === "paused").length;
    const uptime24hAvg =
      total > 0
        ? Math.round(
            (monitors.reduce((sum, m) => sum + m.uptime24h, 0) / total) * 10,
          ) / 10
        : 0;

    const summary: ApiSummary = {
      total,
      up,
      down,
      paused,
      uptime24hAvg,
    };

    return NextResponse.json({ monitors, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler bei UptimeRobot.";
    // eslint-disable-next-line no-console
    console.error("UptimeRobot Route Error", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

