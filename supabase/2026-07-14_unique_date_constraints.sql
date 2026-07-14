-- Every app upsert sends on_conflict=date; Postgres rejects that with a 400
-- ("no unique or exclusion constraint matching the ON CONFLICT specification")
-- on any table without a unique constraint/index on date. Older tables keyed
-- by an auto-increment id may never have had one. Dedupe (keep newest row per
-- date), then guarantee the unique index everywhere.
do $$
declare t text;
begin
  foreach t in array array['weight','steps','water','recovery','habits',
    'workouts','nutrition','mobility','stepper','debrief','cardio',
    'body_comp','travel_days','tdee_exclude']
  loop
    execute format(
      'delete from public.%I a using public.%I b where a.date=b.date and a.ctid < b.ctid', t, t);
    execute format(
      'create unique index if not exists %I on public.%I(date)', t||'_date_uidx', t);
  end loop;
end $$;

-- Verify: every date-keyed table should now show a unique index on (date).
select tablename, indexname from pg_indexes
  where schemaname='public'
    and indexdef ilike '%unique%'
    and indexdef ilike '%(date)%'
  order by tablename;
