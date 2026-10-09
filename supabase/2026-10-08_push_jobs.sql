-- Rest-alert ledger (2026-10-08). Run in the Supabase SQL editor; safe to re-run.
-- One row per phone (device = hash of its push endpoint) holding the tag of the
-- one rest alert that should still fire. api/push-schedule.js writes it when a
-- rest starts, clears it when a rest is skipped, and checks it before sending.
-- Without this table, alerts still send (they just cannot be cancelled).
create table if not exists public.push_jobs (
  device text primary key,
  tag text,
  due_at bigint,
  updated_at timestamptz default now()
);
alter table public.push_jobs enable row level security;
do $$ begin
  create policy "anon all" on public.push_jobs for all using (true) with check (true);
exception when duplicate_object then null; end $$;
