import type { AkquiseKanal, AkquiseStatus, ProjektStatus, Wiederholung } from "@/lib/types";

export const DEADLINES = [
  "Heute",
  "Diese Woche",
  "Diesen Monat",
  "Kein Datum",
] as const;

export type Deadline = (typeof DEADLINES)[number];

export const DEADLINE_ORDER: Record<string, number> = {
  Heute: 0,
  "Diese Woche": 1,
  "Diesen Monat": 2,
  "Kein Datum": 3,
};

export const WIEDERHOLUNGEN: readonly Wiederholung[] = [
  "täglich",
  "wöchentlich",
  "monatlich",
];

export const AKQUISE_KANAELE: readonly AkquiseKanal[] = [
  "E-Mail",
  "LinkedIn",
  "Post",
  "Telefon",
  "Persönlich",
];

export const AKQUISE_STATUS: readonly AkquiseStatus[] = [
  "Gesendet",
  "Antwort erhalten",
  "Termin vereinbart",
  "Abgesagt",
  "In Verhandlung",
];

export const PROJEKT_STATUS: readonly ProjektStatus[] = [
  "Angebot",
  "In Arbeit",
  "Abrechnung",
  "Abgeschlossen",
  "Pausiert",
];

export type BereichBadgeStyle = {
  borderColor: string;
  color: string;
  backgroundColor: string;
};

export function bereichBadgeStyle(farbe: string): BereichBadgeStyle {
  const hex = (farbe || "#525252").trim();
  const border = hex;
  const text = hex;
  let bg = "rgba(38,38,38,0.35)";
  if (/^#([0-9a-fA-F]{6})$/.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    bg = `rgba(${r},${g},${b},0.18)`;
  }
  return {
    borderColor: border,
    color: text,
    backgroundColor: bg,
  };
}

export function deadlineBadgeClass(deadline: string): string {
  const d = deadline?.trim() || "Kein Datum";
  if (d === "Heute") {
    return "bg-[#2a0f0f] text-[#f87171] border-[#e63030]";
  }
  if (d === "Diese Woche") {
    return "bg-[#451a03] text-[#fcd34d] border-[#d97706]";
  }
  if (d === "Diesen Monat") {
    return "bg-[#262626] text-[#a3a3a3] border-[#525252]";
  }
  return "bg-[#171717] text-[#737373] border-[#333333]";
}
