# Coach Baseline v0

Date: 2026-08-02

Status: first pass. Created to correct the failed generic `#coach` onboarding note and give the live Coach route a real starting model.

## Sources Reviewed

- `README.md`
- `2026-08-02-coach-launch-v0.md`
- `health-coach-current-state.md`
- `health-coach-decision-log.md`
- `health-coach-injury-history.md`
- `2026-08-01-health-coach-baseline-analysis-loop.md`
- Health Hub helper: `today`
- Health Hub helper: `summary 14`
- Health Hub helper: `program`

## Stable Facts

- Current block: Summer Cut v2, Jul 6-Aug 30, 2026.
- Target remains sub-180 by Aug 30 if trend/context supports it.
- Recent cut trend from current-state doc: Jul 6 188.8 to Jul 31 184.0; latest seven logged weigh-ins around 184.5.
- Coach is in manual foundation mode, not automation and not app implementation.
- The product is Dylan's outcome; Health Hub is the data/app vehicle.

## Current Data Snapshot

- Today, 2026-08-02, Health Hub has steps only: 3,858.
- 2026-08-01 has recovery/readiness data and steps, but no weight/nutrition/workout.
- 2026-07-31 logged weight 184, workout `friday`, steps 15,194, readiness 80.
- Recent nutrition visibility is inconsistent: several days are blank or partial.
- Weekend step pattern is still a live risk: 2026-08-01 had 4,543 steps and 2026-08-02 has 3,858 so far.

## Governing Decisions

- Do not lower calories as the first move.
- Improve nutrition visibility, protein consistency, and weekend NEAT before making cut adjustments.
- Wednesday is now a true 36-hour fast; zero calories on Wednesday is intentional and must not be treated as a logging failure.
- Manual rules to test first: nutrition visibility, protein closeout, weekend movement rescue, abnormal workout debrief, SI gate, short-sleep modifier, weekly checkpoint.

## Injury / Movement Constraints

- Active SI/lower-back flare governs until Dylan confirms resolved.
- No loaded squatting during active or unknown flare.
- Tuesday hinge work is gated by current symptom status.
- Hack squats are removed/forbidden.
- Aggressive hamstring stretching is contraindicated by the current model.
- Abnormal lower-body sessions require interpretation before the next lower exposure.

## App / Source Drift

- Live Health Hub program still contains Friday `back-squat`.
- Live Health Hub program still contains Tuesday `deadlift`.
- Live settings still show `wednesdayCal: 900`, which conflicts with the newer true 36-hour fast decision.
- Live app/program state is useful data but cannot be treated as governing truth until reconciled.

## Tomorrow Readiness

Tomorrow is Monday, 2026-08-03.

Current live app program labels Monday as `Upper A - Strength`, which is less directly constrained by the SI/lower-body rules than Tuesday/Friday. However, old imported prompt context and app/program state may conflict, so Coach should confirm the intended session before prescribing.

Coach should not ask Dylan to redo onboarding. Coach should ask only:

1. Is the SI flare still active today/tomorrow: left PSIS soreness, hamstring guarding, or squat-descent instability?
2. Is tomorrow intended to be the Monday Upper A session, or are you following a different schedule from the live app?
3. Do you want tomorrow guidance based only on existing data, or should Coach also factor in a quick rough food/protein rundown from today?

## Coach Launch Behavior

The next `#coach` interaction should start with:

- what Coach has reviewed,
- what it believes is true,
- what is stale/conflicted,
- the one to three questions that actually affect tomorrow,
- then a concise workout/readiness recommendation once those are answered.

Do not post a generic onboarding questionnaire.
