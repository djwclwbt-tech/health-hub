-- One paste for every table the app expects (2026-10-20). Safe to re-run.
-- Run in the Supabase SQL editor. It combines 2026-07-26-lytes.sql,
-- 2026-09-08_coach.sql and 2026-10-08_push_jobs.sql, and gives each new table
-- the same open policy the other app tables use.

-- Fast-day electrolytes (mg per day)
create table if not exists public.lytes (date date primary key);
alter table public.lytes add column if not exists na integer default 0;
alter table public.lytes add column if not exists k integer default 0;
alter table public.lytes add column if not exists mg integer default 0;
alter table public.lytes add column if not exists updated_at timestamptz default now();

-- Tape measurements (inches)
create table if not exists public.body_measurements (date date primary key);
alter table public.body_measurements add column if not exists chest numeric;
alter table public.body_measurements add column if not exists waist numeric;
alter table public.body_measurements add column if not exists arm_l numeric;
alter table public.body_measurements add column if not exists arm_r numeric;
alter table public.body_measurements add column if not exists thigh_l numeric;
alter table public.body_measurements add column if not exists thigh_r numeric;

-- Rest-alert ledger: one current alert per phone
create table if not exists public.push_jobs (device text primary key);
alter table public.push_jobs add column if not exists tag text;
alter table public.push_jobs add column if not exists due_at bigint;
alter table public.push_jobs add column if not exists updated_at timestamptz default now();

-- Coach columns (no-ops if already there)
alter table public.program add column if not exists version text;
alter table public.recovery add column if not exists source text;

do $$
declare t text;
begin
  foreach t in array array['lytes','body_measurements','push_jobs'] loop
    execute format('alter table public.%I enable row level security', t);
    begin
      execute format('create policy "anon all" on public.%I for all using (true) with check (true)', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Report: should list all three tables
select table_name, string_agg(column_name, ', ' order by ordinal_position) as columns
  from information_schema.columns where table_schema='public'
   and table_name in ('lytes','body_measurements','push_jobs')
  group by table_name order by table_name;
