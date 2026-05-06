-- Fehler: "new row violates row-level security policy for table tasks"
-- Im SQL-Editor (Supabase Dashboard) ausführen.

-- Variante A: RLS komplett aus (passt zur ursprünglichen App-Idee, nur Anon-Key im Client)
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Variante B: RLS an lassen, aber Anon zugriff erlauben (nur wenn du RLS aktiv behalten willst)
-- Zuerst eventuell alte Policies droppen, dann:
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "tasks_anon_all" ON tasks
--   FOR ALL
--   TO anon
--   USING (true)
--   WITH CHECK (true);
