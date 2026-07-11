-- Stage 4 cleanup: archive-then-delete orphaned/fossil progression rows.
-- Pre-approved decision 2026-07-11. Run AFTER 2026-07-11_progression_e1rm_history.sql.
--
-- Keeps:
--   * current Summer Cut v2 composite keys (id__reprange)
--   * plain legacy IDs of current non-ambiguous exercises that hold real reps
--     (the app's weight-fallback logic still consults these)
--   * anything last logged during the current block (last_date >= 2026-07-06)
-- Archives + deletes everything else: old-program exercises (front-squat,
-- converging-chest-press, ...), index-collision garbage (reverse-curl 300 lb),
-- and fossil rows whose last_reps is [] / all zeros.
--
-- The app performs the same prune on its local store every boot, so deleted
-- rows are not resurrected by the client sync.

begin;

create table if not exists public.progression_archive
  as select p.*, now() as archived_at from public.progression p where false;

with keep_composite(k) as (values
  ('flat-bench__5-8'),('seated-row__5-8'),('smith-ohp__5-8'),('lat-pulldown__5-8'),('cable-fly__12-15'),
  ('deadlift__5-5'),('leg-press__5-8'),('lying-leg-curl__5-8'),('standing-calf__5-8'),
  ('incline-db-curl__10-12'),('oh-tricep-ext__10-12'),('cable-hammer-curl__10-12'),('tricep-pushdown__10-12'),('reverse-curl__12-15'),('wrist-curl__12-15'),
  ('db-incline-press__10-12'),('overhand-cable-row__10-12'),('lateral-raise__10-12'),('low-high-cable-fly__12-15'),('reverse-fly__10-12'),
  ('back-squat__5-8'),('rdl__8-10'),('leg-extension__10-12'),('bulgarian-split-squat__10-12'),('seated-calf__10-12')
), keep_plain(k) as (values
  -- current base ids minus the ambiguous legacy trio (leg-press, rdl, lying-leg-curl)
  ('flat-bench'),('seated-row'),('smith-ohp'),('lat-pulldown'),('cable-fly'),
  ('deadlift'),('standing-calf'),
  ('incline-db-curl'),('oh-tricep-ext'),('cable-hammer-curl'),('tricep-pushdown'),('reverse-curl'),('wrist-curl'),
  ('db-incline-press'),('overhand-cable-row'),('lateral-raise'),('low-high-cable-fly'),('reverse-fly'),
  ('back-squat'),('leg-extension'),('bulgarian-split-squat'),('seated-calf')
), has_real_reps as (
  select exercise_id,
    exists (select 1 from jsonb_array_elements_text(coalesce(last_reps,'[]'::jsonb)) e
            where e ~ '^[0-9.]+$' and e::numeric > 0) as real_reps
  from public.progression
), doomed as (
  select p.exercise_id from public.progression p
  join has_real_reps h using (exercise_id)
  where not (
    p.exercise_id in (select k from keep_composite)
    or (p.last_date is not null and p.last_date >= date '2026-07-06')
    or (p.exercise_id in (select k from keep_plain) and h.real_reps)
  )
)
insert into public.progression_archive
  select p.*, now() from public.progression p
  where p.exercise_id in (select exercise_id from doomed);

delete from public.progression
  where exercise_id in (select exercise_id from public.progression_archive)
    and not (last_date is not null and last_date >= date '2026-07-06');

-- Report: rows archived this run + what remains.
select
  (select count(*) from public.progression_archive) as total_archived,
  (select count(*) from public.progression)         as remaining_live;

commit;
