-- Saraci Cockpit — Schema v2 (Bereiche, Task-Erweiterungen, Akquise, Projekte)
-- Im Supabase SQL-Editor ausführen. Mehrfach ausführbar (IF NOT EXISTS / DO-Blöcke).

-- ─── 1) Tabelle bereiche ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bereiche (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  farbe text NOT NULL DEFAULT '#525252',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bereiche_name_unique UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_bereiche_name ON public.bereiche (name);

-- Standard-Bereiche (Konflikt = bereits vorhanden)
INSERT INTO public.bereiche (name, farbe) VALUES
  ('Akquise', '#2563eb'),
  ('Laufendes Projekt', '#22c55e'),
  ('Site Care', '#d97706'),
  ('Website', '#a855f7'),
  ('Admin', '#737373'),
  ('Sonstiges', '#525252')
ON CONFLICT (name) DO NOTHING;

-- ─── 2) tasks: neue Spalten ────────────────────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS bereich_id uuid REFERENCES public.bereiche (id);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS notiz text;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS wiederkehrend boolean NOT NULL DEFAULT false;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS wiederholung text;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS "nächste_fälligkeit" date;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS prioritaet integer;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS kunde text;

-- Legacy-Spalte bereich (text) → bereich_id (falls vorhanden)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'bereich'
  ) THEN
    UPDATE public.tasks AS t
    SET bereich_id = b.id
    FROM public.bereiche AS b
    WHERE t.bereich_id IS NULL
      AND t.bereich IS NOT NULL
      AND b.name = t.bereich::text;
  END IF;
END $$;

UPDATE public.tasks AS t
SET bereich_id = (SELECT id FROM public.bereiche WHERE name = 'Sonstiges' LIMIT 1)
WHERE t.bereich_id IS NULL;

ALTER TABLE public.tasks
  ALTER COLUMN bereich_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'bereich'
  ) THEN
    ALTER TABLE public.tasks DROP COLUMN bereich;
  END IF;
END $$;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_wiederholung_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_wiederholung_check CHECK (
    wiederholung IS NULL
    OR wiederholung IN ('täglich', 'wöchentlich', 'monatlich')
  );

-- ─── 3) akquise_log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.akquise_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firma text NOT NULL,
  datum date NOT NULL,
  kanal text NOT NULL,
  status text NOT NULL,
  notiz text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT akquise_log_kanal_check CHECK (
    kanal IN ('E-Mail', 'LinkedIn', 'Post', 'Telefon', 'Persönlich')
  ),
  CONSTRAINT akquise_log_status_check CHECK (
    status IN (
      'Gesendet',
      'Antwort erhalten',
      'Termin vereinbart',
      'Abgesagt',
      'In Verhandlung'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_akquise_log_datum ON public.akquise_log (datum DESC);

-- ─── 4) projekte ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projekte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde text NOT NULL,
  betrag numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL,
  notiz text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projekte_status_check CHECK (
    status IN ('Angebot', 'In Arbeit', 'Abrechnung', 'Abgeschlossen', 'Pausiert')
  )
);

CREATE INDEX IF NOT EXISTS idx_projekte_status ON public.projekte (status);

-- ─── 5) Optional: RLS (bei Nutzung von Supabase Auth empfohlen) ────────────
-- ALTER TABLE public.bereiche ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY bereiche_authenticated_all ON public.bereiche FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- (analog für tasks, akquise_log, projekte)
