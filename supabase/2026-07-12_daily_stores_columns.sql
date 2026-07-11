-- Surfaced by the Setup sync-error panel: habits upserts were failing with
-- "Could not find the 'custom' column of 'habits'". Fix it, plus idempotent
-- guarantees for every other daily store the app writes.
alter table public.habits add column if not exists custom jsonb;

create table if not exists public.mobility (date date primary key, completed boolean default true);
alter table public.mobility add column if not exists duration_secs integer;
create table if not exists public.stepper (date date primary key, completed boolean default true);
create table if not exists public.debrief (date date primary key, completed boolean default true);
create table if not exists public.travel_days (date date primary key, active boolean default true);
create table if not exists public.tdee_exclude (date date primary key, active boolean default true);
create table if not exists public.body_comp (date date primary key, photo_taken boolean default true, analysis jsonb);
alter table public.body_comp add column if not exists analysis jsonb;

-- If the Setup panel ever names `settings`, the app writes these camelCase
-- keys; add whichever the error message names (quoted, case-sensitive):
-- alter table public.settings add column if not exists "notifyToken" text;
-- alter table public.settings add column if not exists "reminders" jsonb;
-- alter table public.settings add column if not exists "customHabits" jsonb;
-- alter table public.settings add column if not exists "notifications" jsonb;
