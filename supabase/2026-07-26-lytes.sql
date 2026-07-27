-- Electrolyte tracking for fast Wednesdays (Iron & Ember redesign, 2026-07-26)
-- Run in the Supabase SQL editor. The app writes one row per day from the
-- fast-day card: sodium, potassium, magnesium in mg.
create table if not exists lytes (
  date date primary key,
  na integer not null default 0,
  k integer not null default 0,
  mg integer not null default 0,
  updated_at timestamptz default now()
);
alter table lytes enable row level security;
do $$ begin
  create policy "anon all" on lytes for all using (true) with check (true);
exception when duplicate_object then null; end $$;
