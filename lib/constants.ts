export const BEREICHE = [
  "Akquise",
  "Laufendes Projekt",
  "Site Care",
  "Website",
  "Admin",
  "Sonstiges",
] as const;

export type Bereich = (typeof BEREICHE)[number];

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

export function bereichBadgeClass(bereich: string): string {
  const b = bereich?.trim() || "Sonstiges";
  switch (b) {
    case "Akquise":
      return "bg-[#1e3a5f] text-[#93c5fd] border-[#2563eb]";
    case "Laufendes Projekt":
      return "bg-[#14532d] text-[#86efac] border-[#22c55e]";
    case "Site Care":
      return "bg-[#451a03] text-[#fcd34d] border-[#d97706]";
    case "Website":
      return "bg-[#3b0764] text-[#e9d5ff] border-[#a855f7]";
    case "Admin":
      return "bg-[#262626] text-[#d4d4d4] border-[#525252]";
    case "Sonstiges":
    default:
      return "bg-[#1a1a1a] text-[#a3a3a3] border-[#404040]";
  }
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
