import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_BEREICHE: { name: string; farbe: string }[] = [
  { name: "Akquise", farbe: "#2563eb" },
  { name: "Laufendes Projekt", farbe: "#22c55e" },
  { name: "Site Care", farbe: "#d97706" },
  { name: "Website", farbe: "#a855f7" },
  { name: "Admin", farbe: "#737373" },
  { name: "Sonstiges", farbe: "#525252" },
];

export async function ensureDefaultBereiche(
  sb: SupabaseClient
): Promise<void> {
  const { count, error: cErr } = await sb
    .from("bereiche")
    .select("*", { count: "exact", head: true });
  if (cErr) throw new Error(cErr.message);
  if ((count ?? 0) > 0) return;

  const { error: insErr } = await sb.from("bereiche").insert(DEFAULT_BEREICHE);
  if (insErr) throw new Error(insErr.message);
}
