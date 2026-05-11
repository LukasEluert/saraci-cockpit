-- KI-Import & Sortierung: Priorität pro Task (nullable)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS prioritaet integer;
