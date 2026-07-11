-- Stage 2 migration: progression sync has silently failed since 2026-05-09
-- because the app upserts an e1rm_history field the table never got.
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query),
-- then load the app once; it re-pushes corrected local progression on boot.
alter table public.progression add column if not exists e1rm_history jsonb;

-- Verify: after one app load, this should show current-block dates.
-- select exercise_id, last_date, current_weight from public.progression
--   order by last_date desc nulls last limit 10;
