-- Health Hub cardio persistence schema.
-- Required before declaring cardio remote sync accurate.
create table if not exists public.cardio (
  date date primary key,
  type text not null default 'peloton',
  duration_min integer,
  intensity text default 'zone2',
  distance_mi numeric,
  calories integer,
  notes text,
  done boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cardio add column if not exists intensity text default 'zone2';
alter table public.cardio add column if not exists distance_mi numeric;
alter table public.cardio add column if not exists calories integer;
alter table public.cardio add column if not exists notes text;
alter table public.cardio add column if not exists done boolean not null default true;
alter table public.cardio add column if not exists created_at timestamptz not null default now();
alter table public.cardio add column if not exists updated_at timestamptz not null default now();

alter table public.cardio enable row level security;

-- Match existing single-user publishable-key app behavior; tighten if auth is added later.
do $$ begin
  create policy "cardio_public_read" on public.cardio for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cardio_public_insert" on public.cardio for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cardio_public_update" on public.cardio for update using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "cardio_public_delete" on public.cardio for delete using (true);
exception when duplicate_object then null; end $$;
