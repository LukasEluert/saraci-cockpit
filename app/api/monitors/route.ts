import { NextResponse } from "next/server";

type UptimeRobotMonitor = {
  id: number;
  friendly_name: string;
  url: string;
  status: number;
  custom_uptime_ranges?: string;
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
      // 1-Tages-Uptime-Fenster
      custom_uptime_ranges: "1",
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
      return NextResponse.json(
        { error: `UptimeRobot Fehler: ${res.status} ${res.statusText}` },
        { status: 502 },
      );
    }

    const json = (await res.json()) as {
      stat: string;
      monitors?: UptimeRobotMonitor[];
      error?: { message?: string };
    };

    if (json.stat !== "ok" || !Array.isArray(json.monitors)) {
      return NextResponse.json(
        { error: json.error?.message || "UptimeRobot Antwort ungültig." },
        { status: 502 },
      );
    }

    const monitors: ApiMonitor[] = json.monitors.map((m) => {
      const uptimeRaw = (m.custom_uptime_ranges || "").split("-")[0] || "";
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

