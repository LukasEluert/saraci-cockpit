-- Optional: Spalten für Saraci-Core-Brücke (nur anlegen, wenn ihr externes Routing nutzt).
-- In Supabase SQL Editor ausführen, wenn die App diese Felder persistieren soll.

alter table tasks add column if not exists source_app text;
alter table tasks add column if not exists source_type text;
alter table tasks add column if not exists source_id text;
alter table tasks add column if not exists source_label text;
alter table tasks add column if not exists generated_by text;
alter table tasks add column if not exists external_url text;
