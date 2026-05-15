export interface BereichRow {
  id: string;
  name: string;
  farbe: string;
  created_at: string;
}

export interface TaskBereichJoin {
  name: string;
  farbe: string;
}

export interface Task {
  id: string;
  text: string;
  bereich_id: string;
  deadline: string;
  /** KI-Import / Sortierung; fehlend in älteren Zeilen = behandelt wie null */
  prioritaet?: number | null;
  done: boolean;
  notiz: string | null;
  wiederkehrend: boolean;
  wiederholung: string | null;
  nächste_fälligkeit: string | null;
  created_at: string;
  updated_at: string;
  bereiche?: TaskBereichJoin | null;
  /** Optionaler Kundenname */
  kunde?: string | null;
  /** Optional: Herkunft für künftige Saraci-Core-Anbindung (Spalten ggf. in Supabase anlegen) */
  source_app?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  source_label?: string | null;
  generated_by?: string | null;
  external_url?: string | null;
}

export type Wiederholung = "täglich" | "wöchentlich" | "monatlich";

export type AkquiseKanal =
  | "E-Mail"
  | "LinkedIn"
  | "Post"
  | "Telefon"
  | "Persönlich";

export type AkquiseStatus =
  | "Gesendet"
  | "Antwort erhalten"
  | "Termin vereinbart"
  | "Abgesagt"
  | "In Verhandlung";

export interface AkquiseLogRow {
  id: string;
  firma: string;
  datum: string;
  kanal: AkquiseKanal;
  status: AkquiseStatus;
  notiz: string | null;
  created_at: string;
}

export type ProjektStatus =
  | "Angebot"
  | "In Arbeit"
  | "Abrechnung"
  | "Abgeschlossen"
  | "Pausiert";

export interface ProjektRow {
  id: string;
  kunde: string;
  betrag: number;
  status: ProjektStatus;
  notiz: string | null;
  created_at: string;
  updated_at: string;
}
