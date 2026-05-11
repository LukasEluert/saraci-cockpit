export async function GET() {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key missing" }, { status: 500 });
  }
  try {
    const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `api_key=${apiKey}&format=json&logs=0`,
      cache: "no-store",
    });
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    console.error("UptimeRobot error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

