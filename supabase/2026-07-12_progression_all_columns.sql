-- Catch-all: ensure the progression table has EVERY column the app writes.
-- (2026-07-11 migration added e1rm_history; sync still failing suggests the
-- May-2026 keyed-progression commit also introduced pr/progressed/last_date
-- before the table got them.)
alter table public.progression add column if not exists current_weight numeric;
alter table public.progression add column if not exists last_reps jsonb;
alter table public.progression add column if not exists last_date date;
alter table public.progression add column if not exists progressed boolean default false;
alter table public.progression add column if not exists pr jsonb;
alter table public.progression add column if not exists e1rm_history jsonb;

-- The app upserts with on_conflict=exercise_id; make sure that's enforceable.
do $$ begin
  alter table public.progression add constraint progression_exercise_id_key unique (exercise_id);
exception when duplicate_table then null; when duplicate_object then null; end $$;

select column_name, data_type from information_schema.columns
  where table_schema='public' and table_name='progression' order by ordinal_position;
