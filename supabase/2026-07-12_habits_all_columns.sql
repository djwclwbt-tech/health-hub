-- Catch-all: ensure the habits table has EVERY column the app writes
-- (same treatment that fixed progression). The app upserts:
-- date, alcohol, cannabis, screens_off, sunlight, bed_by_1030,
-- read_before_bed, supplements, custom.
create table if not exists public.habits (date date primary key);
alter table public.habits add column if not exists alcohol boolean;
alter table public.habits add column if not exists cannabis boolean;
alter table public.habits add column if not exists screens_off boolean;
alter table public.habits add column if not exists sunlight boolean;
alter table public.habits add column if not exists bed_by_1030 boolean;
alter table public.habits add column if not exists read_before_bed boolean;
alter table public.habits add column if not exists supplements boolean;
alter table public.habits add column if not exists custom jsonb;

-- Shows the resulting schema so you can eyeball it:
select column_name, data_type from information_schema.columns
  where table_schema='public' and table_name='habits' order by ordinal_position;
