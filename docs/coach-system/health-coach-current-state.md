# Health Coach Current State

Last updated: 2026-08-08 21:40 America/Chicago

## Phase

Manual foundation mode, now ready for Coach Launch v0 data-first onboarding.

Not yet active coaching, automation, or app feature implementation.

## North star

Dylan is the output: Summer Cut v2 outcome, adherence, training performance within constraints, recovery, SI management, and fast course correction.

## Current block

- Summer Cut v2: Jul 6-Aug 30, 2026
- Target: sub-180 by Aug 30 if trend/context still supports it
- Live baseline from Aug 1 loop: Jul 6 188.8 → Jul 31 184.0; latest seven logged weigh-ins average ~184.5

## Current nutrition structure

Latest Dylan instruction on 2026-08-01 supersedes older Wednesday 900-cal half-fast language:

- Wednesday is now a true 36-hour fast.
- Default schedule: Tuesday dinner ends ~7:30-8:00 PM → Wednesday no calories → Thursday break fast ~7:30-8:00 AM.
- Wednesday calorie target should be interpreted as 0.
- Electrolyte coaching is required because Dylan does not yet know the routine.

See `2026-08-01-wednesday-36h-fast-protocol.md`.

## Current limiting factors

1. Nutrition visibility: blank/partial non-fast days block weekly steering.
2. Weekend NEAT: weekday steps can work; weekends crater.
3. SI/source drift: active SI override still conflicts with Tuesday deadlift and stale settings, though Friday squat replacement is now reflected in the live program.
4. Protein consistency: good floor, not consistently at target on eating days.
5. Sleep: recent short sleep despite acceptable readiness.

## Active constraints

- Active SI flare as of Jul 31 handoff.
- No loaded squatting until resolved.
- Tuesday hinge work gated by Monday status.
- Hack squats permanently removed.
- Program/app state may be stale; do not coach from app state alone.


## Latest manual checkpoint — 2026-08-01

Verdict: weekly limiting factor is data/adherence visibility, not proven metabolic stall.

Today’s live limiting factor is weekend NEAT pace.

Action this week:

- Do not lower baseline calories yet.
- Run the new Wednesday 36-hour fast with electrolytes.
- Treat Wednesday zero calories as intentional.
- Improve rough nutrition capture on non-fast days.
- Rescue weekend steps before they crater.

Watch: reassess after 7 cleaner days under the new structure.

## Next required loop

Start Coach Launch v0 using `2026-08-02-coach-launch-v0.md`: review the dataset first, build the baseline, then ask only post-review questions that change Coach's model or next action.

## Coach Baseline v0 — 2026-08-02

Created `2026-08-02-coach-baseline-v0.md` after the first `#coach` Discord guide failed by asking Dylan a generic onboarding form instead of training on existing Health Hub/Claude context.

Current corrected behavior:

- Coach reads the canonical coach docs and Health Hub helper data first.
- Coach treats live app/program state as useful but potentially stale.
- Coach asks only targeted questions after review.
- For tomorrow, the likely live-app session is Monday Upper A, but Coach must confirm intended schedule and current SI status before prescribing.

## Operational launch loop refresh — 2026-08-02 20:13

Read-first set completed for the active launch loop:

- `AGENTS.md`
- `README.md`
- `2026-08-02-coach-operational-launch-loop.md`
- `2026-08-02-coach-launch-v0.md`
- `2026-08-02-coach-baseline-v0.md`
- `2026-08-01-health-coach-baseline-analysis-loop.md`
- `health-coach-current-state.md`
- `health-coach-decision-log.md`
- `health-coach-injury-history.md`

Read-only Health Hub refresh:

- `today`: 2026-08-02 has steps only, 3,858.
- `summary 10`: weekday training/nutrition exists for Jul 27-Jul 31, but weekend nutrition remains blank and weekend steps remain low.
- `program`: Monday is still `Upper A - Strength`; app state still contains stale lower-body conflicts (`deadlift`, `back-squat`) and `wednesdayCal: 900`.

Operational status:

- Current OpenClaw route context shows `fitness-coach` running against Discord channel `1533498530268708997`, matching the `#coach` destination metadata for the launch loop.
- Coach memory/baseline exists and is readable through this doc plus `2026-08-02-coach-baseline-v0.md`.
- Tomorrow plan path exists: Monday `Upper A - Strength`, pending Dylan confirmation that the schedule is unchanged.
- Visible `@Coach` bot identity remains separate bot plumbing, not a blocker to Coach readiness.

## Nightly sustainer refresh — 2026-08-02 21:40

Read-only Health Hub refresh:

- `today`: 2026-08-02 now has partial nutrition, not blank: 1,270 kcal, 147 g protein, 101 g carbs, 29.5 g fat, 8 g fiber.
- `today`: 2026-08-02 steps later updated from 3,858 to 10,393.
- `summary 14`: 2026-08-01 remains blank for nutrition/workout/weight with 4,543 steps, 6.64 h sleep, readiness 72.
- `program`: no pending program updates; live app still contains Tuesday `deadlift`, Friday `back-squat`, and settings `wednesdayCal: 900`.

Baseline implication:

- Sunday nutrition visibility improved from blank to partial, but calories and fiber are low relative to the live settings targets.
- Sunday NEAT was rescued to 10,393 steps; Saturday remained the weekend low point at 4,543 steps.
- No visible injury-status update yet; active/unknown SI flare guardrails still govern.

## Nightly sustainer refresh — 2026-08-03 21:41

Read-only Health Hub refresh:

- `today`: 2026-08-03 has full nutrition visibility: 1,832 kcal, 209.9 g protein, 79.6 g carbs, 84.4 g fat, 36 g fiber.
- `today`: 2026-08-03 weight is 185.6, steps are 14,902, readiness is 83, and sleep is 6.83 h.
- `today`: Monday Upper A was completed in 68 min. Main logged work: bench 175x8/8/6, seated row 210x8/6, Smith OHP 120x8/6, pull-ups swapped for lat pulldown 10/4, cable fly 15x12/15.
- `summary 14`: Sunday 2026-08-02 was step-rescued to 10,393 with partial nutrition; Saturday 2026-08-01 remains blank for nutrition and low at 4,543 steps.
- `program`: no pending program updates; live app still contains Tuesday `deadlift`, Friday `back-squat`, and settings `wednesdayCal: 900`.

Baseline implication:

- Monday execution was materially better: workout done, protein above target, fiber above target, and steps essentially at target.
- The 185.6 weigh-in is a single-day uptick after recent lower readings; do not treat it as a stall without trend context.
- Tuesday lower-body/hinge guidance still requires current SI symptom status because app state conflicts with active/unknown flare guardrails.

## Nightly sustainer refresh — 2026-08-04 21:40

Read-only Health Hub refresh:

- `today`: 2026-08-04 has full nutrition visibility: 1,886 kcal, 186.3 g protein, 139.6 g carbs, 69 g fat, 16.9 g fiber.
- `today`: 2026-08-04 steps are 14,321, readiness is 86, sleep is 8.62 h, HRV is 81, and RHR is 36.
- `today`: Tuesday Lower A was completed in 56 min. Deadlift was swapped to RDL 135x8/8/8 at RIR 2; leg press was 450x5/6; lying leg curl was swapped to cable pull-through 50x10 with the second set not completed; standing calf sets were not completed.
- `today`: mobility was completed for 1,354 sec.
- `summary 14`: Monday and Tuesday are now both visible for nutrition, training, and steps; Saturday 2026-08-01 remains the main recent blank/low-step day.
- `program`: no pending program updates; live app still contains Tuesday `deadlift`, Friday `back-squat`, and settings `wednesdayCal: 900`.

Baseline implication:

- Tuesday adherence was mostly strong: training completed with substitutions, steps near target, sleep/recovery strong, and nutrition visible.
- Protein was slightly below the 200 g live target but still high at 186.3 g; fiber was low at 16.9 g.
- Hinge exposure happened despite active/unknown SI guardrails, but it was self-modified down from deadlift to RDL. Coach still needs a symptom response before treating lower-body loading as cleared.
- Wednesday should be handled as the true 36-hour fast unless Dylan says otherwise; stale `wednesdayCal: 900` remains drift.

## Nightly sustainer refresh — 2026-08-07 23:54

Read-only Health Hub refresh:

- `today`: 2026-08-07 has partial nutrition visibility: 792 kcal, 95.4 g protein, 43.4 g carbs, 25.5 g fat, 2 g fiber.
- `today`: 2026-08-07 steps are 15,382, cardio is 20 min zone-2 incline walk, readiness is 75, sleep is 5.92 h, HRV is 102, and RHR is 40.
- `today`: Friday Lower B was logged in 57 min. Completed work was back squat 195x1/1/1 at RIR 2 and cable pull-through 45x10, 40x10. Leg extension, Bulgarian split squat, and seated calf were prefilled/not done.
- `summary 14`: 2026-08-06 was visible and high-execution for steps/cardio/protein: 2,374 kcal, 198.3 g protein, 16,742 steps, 20 min cardio, weight 184.4. Sleep was short at 5.62 h.
- `summary 14`: 2026-08-05, the planned fast day, shows 766 kcal and 81.6 g protein, so the true 36-hour fast was modified, broken, or represented by partial logging. Do not treat it as a blank-log failure.
- `program`: no pending program updates; live app still contains Tuesday `deadlift`, Friday `back-squat`, and settings `wednesdayCal: 900`.

Baseline implication:

- The biggest new issue is not a need for generic coaching; it is source/injury conflict. Friday included loaded back squat despite the active/unknown SI guardrail against loaded squatting.
- Treat Friday as an abnormal lower-body exposure requiring symptom follow-up before next lower-body loading.
- Nutrition visibility improved across Aug 3-Aug 6 but 2026-08-07 is incomplete/low unless Dylan confirms it was final. Fiber remains repeatedly low except Aug 3.
- Steps/cardio are strong Aug 5-Aug 7. Weekend NEAT risk remains active but Friday was executed.
- Weight remains around mid-184s to mid-185s in the visible data; do not call a metabolic stall without cleaner nutrition and weekend trend context, but compliance/visibility needs a hard audit.

## Nightly sustainer refresh — 2026-08-08 21:40

Read-only Health Hub refresh:

- `today`: 2026-08-08 has steps only at 9,973. No visible nutrition, weight, workout, sleep, readiness, HRV, RHR, cardio, or water data yet.
- `summary 14`: 2026-08-07 nutrition later filled in to 2,212 kcal, 170.4 g protein, 122.4 g carbs, 91 g fat, and 13 g fiber. This replaces the earlier partial 792 kcal snapshot; protein and fiber were below live targets, but Friday was not a severe under-eating day.
- `summary 14`: 2026-08-05 still shows 766 kcal and 81.6 g protein, so the planned true 36-hour fast remains unresolved as modified, broken, or partially logged.
- `program`: Friday Lower B now leads with Leg Press and notes it as the squat replacement while SI/psoas symptoms are active or unknown. This resolves the Friday back-squat program drift.
- `program`: Tuesday still contains `Deadlift (BB)` and settings still show `wednesdayCal: 900`; these remain drift against the governing SI gate and true Wednesday fast decision.

Baseline implication:

- Saturday weekend NEAT is moderate at 9,973 steps but below the 15,000-step live target so far; nutrition visibility is the main missing stream for today.
- Friday nutrition visibility is now adequate, but protein and fiber remain short of live targets.
- Lower-body programming is partially reconciled: Friday squat replacement is fixed, but Tuesday hinge exposure still needs symptom gating before prescription.
