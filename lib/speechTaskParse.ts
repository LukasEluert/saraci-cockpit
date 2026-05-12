import type { Deadline } from "@/lib/constants";
import type { BereichRow } from "@/lib/types";

type SpeechParseResult = {
  text: string;
  deadline: Deadline | null;
  bereichId: string | null;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Erkennt Deadline- und Bereichs-Hinweise im erkannten Text und entfernt sie aus dem Aufgabentext.
 */
export function parseVoiceTaskText(
  raw: string,
  bereiche: BereichRow[]
): SpeechParseResult {
  let t = raw.trim();
  let deadline: Deadline | null = null;
  let bereichId: string | null = null;

  const lower = norm(t);

  if (/\bheute\b/i.test(t)) {
    deadline = "Heute";
    t = t.replace(/\bheute\b/gi, " ").trim();
  } else if (/\bdiese\s*woche\b/i.test(t)) {
    deadline = "Diese Woche";
    t = t.replace(/\bdiese\s*woche\b/gi, " ").trim();
  } else if (/\bdiesen\s*monat\b/i.test(t)) {
    deadline = "Diesen Monat";
    t = t.replace(/\bdiesen\s*monat\b/gi, " ").trim();
  } else if (/\bkein\s*datum\b/i.test(t)) {
    deadline = "Kein Datum";
    t = t.replace(/\bkein\s*datum\b/gi, " ").trim();
  }

  for (const b of bereiche) {
    const name = b.name.trim();
    if (!name) continue;
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${esc}\\b`, "i");
    if (re.test(t)) {
      bereichId = b.id;
      t = t.replace(re, " ").trim();
      break;
    }
  }

  t = t.replace(/\s+/g, " ").trim();
  return { text: t, deadline, bereichId };
}
