-- ═══ MASTER CATCH-ALL ═══
-- One idempotent pass that guarantees every table + column the app writes.
-- Derived from the actual upsert payloads in index.html (syncToSB/svSB).
-- Safe to run repeatedly; "if not exists" everywhere.

-- weight: {date, value}
create table if not exists public.weight (date date primary key);
alter table public.weight add column if not exists value numeric;

-- steps: {date, value}
create table if not exists public.steps (date date primary key);
alter table public.steps add column if not exists value integer;

-- water: {date, oz}
create table if not exists public.water (date date primary key);
alter table public.water add column if not exists oz integer;

-- recovery: written by app + oura-sync
create table if not exists public.recovery (date date primary key);
alter table public.recovery add column if not exists recovery_score numeric;
alter table public.recovery add column if not exists hrv numeric;
alter table public.recovery add column if not exists rhr numeric;
alter table public.recovery add column if not exists respiratory_rate numeric;
alter table public.recovery add column if not exists sleep_hours numeric;
alter table public.recovery add column if not exists sleep_performance numeric;
alter table public.recovery add column if not exists strain numeric;
alter table public.recovery add column if not exists wake_time text;
alter table public.recovery add column if not exists notes text;
alter table public.recovery add column if not exists source text;
alter table public.recovery add column if not exists sleeplight numeric;
alter table public.recovery add column if not exists sleepdeep numeric;
alter table public.recovery add column if not exists sleeprem numeric;

-- habits: {date, alcohol, cannabis, screens_off, sunlight, bed_by_1030,
--          read_before_bed, supplements, custom}
create table if not exists public.habits (date date primary key);
alter table public.habits add column if not exists alcohol boolean;
alter table public.habits add column if not exists cannabis boolean;
alter table public.habits add column if not exists screens_off boolean;
alter table public.habits add column if not exists sunlight boolean;
alter table public.habits add column if not exists bed_by_1030 boolean;
alter table public.habits add column if not exists read_before_bed boolean;
alter table public.habits add column if not exists supplements boolean;
alter table public.habits add column if not exists custom jsonb;

-- workouts: {date, day_name, exercises, duration_min}
create table if not exists public.workouts (date date primary key);
alter table public.workouts add column if not exists day_name text;
alter table public.workouts add column if not exists exercises jsonb;
alter table public.workouts add column if not exists duration_min numeric;

-- nutrition: {date, meals, total_cal, total_protein, total_carbs, total_fat, total_fiber}
create table if not exists public.nutrition (date date primary key);
alter table public.nutrition add column if not exists meals jsonb;
alter table public.nutrition add column if not exists total_cal numeric;
alter table public.nutrition add column if not exists total_protein numeric;
alter table public.nutrition add column if not exists total_carbs numeric;
alter table public.nutrition add column if not exists total_fat numeric;
alter table public.nutrition add column if not exists total_fiber numeric;

-- progression: keyed by exercise_id (on_conflict=exercise_id)
create table if not exists public.progression (exercise_id text primary key);
alter table public.progression add column if not exists current_weight numeric;
alter table public.progression add column if not exists last_reps jsonb;
alter table public.progression add column if not exists last_date date;
alter table public.progression add column if not exists progressed boolean default false;
alter table public.progression add column if not exists pr jsonb;
alter table public.progression add column if not exists e1rm_history jsonb;
do $$ begin
  alter table public.progression add constraint progression_exercise_id_key unique (exercise_id);
exception when duplicate_table then null; when duplicate_object then null; end $$;

-- daily one-tap stores
create table if not exists public.mobility (date date primary key);
alter table public.mobility add column if not exists completed boolean default true;
alter table public.mobility add column if not exists duration_secs integer;
create table if not exists public.stepper (date date primary key);
alter table public.stepper add column if not exists completed boolean default true;
create table if not exists public.debrief (date date primary key);
alter table public.debrief add column if not exists completed boolean default true;

-- cardio: {date, type, duration_min, intensity, distance_mi, calories, notes, done}
create table if not exists public.cardio (date date primary key);
alter table public.cardio add column if not exists type text;
alter table public.cardio add column if not exists duration_min numeric;
alter table public.cardio add column if not exists intensity text;
alter table public.cardio add column if not exists distance_mi numeric;
alter table public.cardio add column if not exists calories numeric;
alter table public.cardio add column if not exists notes text;
alter table public.cardio add column if not exists done boolean default true;

-- body_comp / travel_days / tdee_exclude
create table if not exists public.body_comp (date date primary key);
alter table public.body_comp add column if not exists photo_taken boolean default true;
alter table public.body_comp add column if not exists analysis jsonb;
create table if not exists public.travel_days (date date primary key);
alter table public.travel_days add column if not exists active boolean default true;
create table if not exists public.tdee_exclude (date date primary key);
alter table public.tdee_exclude add column if not exists active boolean default true;

-- settings: single row id='user', spreads ALL settings keys as columns.
-- camelCase keys MUST be quoted (Postgres lowercases unquoted identifiers).
create table if not exists public.settings (id text primary key);
alter table public.settings add column if not exists calories numeric;
alter table public.settings add column if not exists protein numeric;
alter table public.settings add column if not exists water numeric;
alter table public.settings add column if not exists steps numeric;
alter table public.settings add column if not exists sleep numeric;
alter table public.settings add column if not exists fiber numeric;
alter table public.settings add column if not exists "trainingCal" numeric;
alter table public.settings add column if not exists "wednesdayCal" numeric;
alter table public.settings add column if not exists "weekendCal" numeric;
alter table public.settings add column if not exists "customHabits" jsonb;
alter table public.settings add column if not exists notifications jsonb;
alter table public.settings add column if not exists reminders jsonb;
alter table public.settings add column if not exists "syncToken" text;
alter table public.settings add column if not exists "notifyToken" text;

-- program: single row id='user'
create table if not exists public.program (id text primary key);
alter table public.program add column if not exists data jsonb;

-- Final report: every public table and its columns, so you can eyeball it.
select table_name, string_agg(column_name, ', ' order by ordinal_position) as columns
  from information_schema.columns where table_schema='public'
  group by table_name order by table_name;
