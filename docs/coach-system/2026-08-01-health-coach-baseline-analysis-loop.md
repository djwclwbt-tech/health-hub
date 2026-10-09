# Health Coach Baseline Analysis Loop — 2026-08-01

Status: foundational loop definition. This supersedes premature coaching-action framing.
Purpose: establish the starting model of Dylan and the current Health Coach project before proposing changes, interventions, app features, schedules, or automations.

## Dylan's correction

Dylan is not asking for a loop around him right now.

He is asking for a loop that analyzes the full handoff and all available Health Hub/project data so the system can establish a baseline to build from.

The immediate job is not to coach, prescribe, or build features.

The immediate job is to understand:

- What is the current state?
- What data do we actually have?
- What does the handoff say is governing truth?
- What conflicts exist between handoff, app state, live logs, and prior docs?
- What is reliable enough to use?
- What is missing or stale?
- What patterns already exist?
- What baseline model should future coaching decisions start from?

## Definition

The Baseline Analysis Loop is the Health Coach foundation pass.

It repeatedly processes:

1. Project handoff/context
2. Governing plans and decisions
3. Live Health Hub data
4. Health Hub app/program state
5. Known failures and constraints
6. Current gaps and unknowns

And produces:

1. A baseline state model
2. A data-quality map
3. Conflict/staleness flags
4. Known behavioral and physiological patterns
5. The first set of facts that future coaching should treat as true until updated
6. A list of open questions only where the answer changes the model

## What this loop is not

This is not:

- a fat-loss adjustment loop
- a daily coaching loop
- a feature list
- an app redesign plan
- a notification/reminder plan
- a writeback/capture workflow
- a generic “AI coach” brainstorm

Those come later.

This loop is the foundation underneath them.

## Operating principle

Before coaching Dylan, the system must know what it thinks is true about Dylan.

Before changing the app, the system must know what the app currently represents and where it drifts from the governing plan.

Before prescribing adjustments, the system must know whether the data is complete enough to justify that adjustment.

## Baseline loop structure

### Pass 1 — Source inventory

Collect source layers and rank authority:

1. Latest explicit Dylan correction/instruction
2. Current full handoff
3. Current Summer Cut v2 / governing program docs
4. Live Health Hub data
5. Health Hub program/settings state
6. Older memory/docs only when they clarify history

Output:

- Source list
- Authority order
- Known superseded docs/rules
- Current active block and north star

### Pass 2 — State extraction

Extract the current model from the handoff and live data.

Domains:

- Outcome/north star
- Body composition and weight trend
- Nutrition targets and actuals
- Training program and actual execution
- Injury/mobility status
- Steps/cardio/recovery
- Sleep and readiness
- Habit/adherence patterns
- App/data architecture
- Known bugs and source-of-truth conflicts
- Open items

Output:

- Domain-by-domain baseline
- What is known / unknown / stale
- Confidence level per domain

### Pass 3 — Conflict and drift audit

Compare sources against each other.

Examples:

- Handoff says Summer Cut v2 targets 2,000 calories; older cut file says 1,800 training days and different dates.
- Handoff says active SI flare and no loaded squatting; program still contains back squat on Friday.
- Handoff says anchor lifts use doc numbers because app seeds are wrong; app progression/logs show inconsistent weights.
- Handoff says app/coach had been blind to deviations; live logs show swaps and incomplete rows that require interpretation.
- Handoff says weekend reduced-calorie structures failed; any future baseline must not treat reduced weekends as viable default.

Output:

- Conflict list
- Governing resolution
- Whether code/app state needs later reconciliation

### Pass 4 — Data quality classification

Classify every major data stream:

- Reliable enough for immediate modeling
- Useful but partial
- Stale/conflicted
- Missing/unbuilt
- Requires Dylan report to resolve

Health Hub data streams to classify:

- Weight
- Nutrition
- Steps
- Recovery/Oura
- Workouts
- Cardio
- Mobility
- Habits
- Program/settings
- Progression records
- Body-comp/photos
- Coach debriefs

Output:

- Data-quality matrix
- What can be trusted now
- What cannot support decisions yet

### Pass 5 — Pattern extraction

Only after data quality is classified, extract patterns.

Pattern types:

- Physiological: weight movement, recovery, sleep, injury response
- Behavioral: logging gaps, weekend behavior, deviation reporting, habitual meals
- Training: anchor execution, swaps, pain-linked substitutions, incomplete sessions
- App/system: stale settings, wrong seeded weights, incomplete read endpoints, invisible deviations
- Coaching: prior failures, overbroad advice, options-menu anti-patterns, need for decision-making discipline

Output:

- Baseline patterns
- Evidence dates
- Confidence level

### Pass 6 — Baseline model synthesis

Create the current starting model the coach should carry forward.

Output format:

```md
## Current baseline model

### Stable facts
- ...

### Active constraints
- ...

### Live risks
- ...

### Data gaps
- ...

### App/state drift
- ...

### Do-not-repropose list
- ...

### Next analysis pass should verify
- ...
```

### Pass 7 — Repeat/update rule

The baseline is not static.

Run this loop when:

- Dylan provides a new handoff
- A current-state doc changes
- Health Hub data source changes
- App/program state changes
- A major correction happens
- A block phase changes
- A weekly checkpoint is due
- A contradiction appears between logs and coaching assumptions

Output:

- Updated baseline doc
- Changelog of what changed
- Retired assumptions

## Initial baseline from 2026-08-01 pass

### Current governing source

Primary current source is `2026-07-31-health-coach-full-context-handoff.md` plus Dylan's Aug 1 correction.

Governing current block from handoff:

- Summer Cut v2: July 6 – August 30, 2026
- Start ~192 lbs post-vacation; true deficit baseline ~188
- Target sub-180 by Aug 30
- Product is Dylan's body/composition/adherence/training/recovery/injury management, not Health Hub itself

### Stable facts

- Dylan is the output; Health Hub is the instrumentation/data layer.
- The immediate project need is baseline establishment, not feature creation.
- Latest instruction wins. When corrected, rebuild from the corrected foundation rather than patching the old framing.
- Current goal hierarchy from handoff: body composition outcome, adherence, anchor lift performance within cut constraints, injury management, fast recovery from deviations.
- Dylan prefers direct, concise, data-cited decisions; no generic fitness advice, no options-menu coaching, no filler.
- Known failed approaches are binding: untracked weekends, reduced-calorie structured weekends, wearable calorie burn as input, hack squats, KB swings, aggressive hamstring stretching, stretch-only mobility under barbell loading, generic advice, appetite-suppression/fat-burner supplements, and trusting app-seeded weights.

### Current active constraints

- Active SI/lower-back flare as of Jul 31.
- No loaded squatting until resolved.
- Tuesday hinge work is gated by Monday status.
- Hack squats permanently removed.
- Nightly mobility routine is stabilization-first; stretch-only is superseded.
- Health Hub program state still includes loaded back squat on Friday, so app/program state is not fully reconciled with the Jul 31 override.
- App-seeded/progression weights are known unreliable for anchor lifts; governing doc/handoff numbers win until fixed.

### Live Health Hub baseline signals pulled Aug 1

Weight:

- Jul 6: 188.8
- Jul 24-25: 182.5 / 183.0
- Jul 27-31: 187.0 / 186.8 / 183.8 / 184.6 / 184.0
- Interpretation for baseline: weight is directionally down from block start, but late-July daily values are noisy. Use 7-day rolling average, not single weigh-ins.

Steps:

- Jul 27-31: 12,172 / 16,206 / 15,709 / 16,141 / 15,194. Weekday average ~15,084.
- Jul 25-26: 5,028 / 4,097. Weekend average ~4,563.
- Interpretation for baseline: weekday step system can work; weekend/social/non-routine days are the visible NEAT vulnerability.

Recovery/sleep:

- Jul 27-Aug 1 sleep: 7.83 / 6.49 / 6.28 / 6.98 / 6.46 / 6.64. Average ~6.78h.
- Readiness remains mostly green/yellow: 90 / 76 / 77 / 79 / 80 / 72.
- Interpretation for baseline: readiness is not collapsing, but sleep duration is consistently below 8h target and should be treated as a confounder for hunger, water retention, and training quality.

Nutrition:

- Recent complete-ish entries Jul 27-30: 1,739 / 1,731 / 1,890 / 1,257 kcal; protein 186.6 / 182.7 / 185 / 159.6g.
- Several days are blank or obviously partial, including Jul 31 and Aug 1 at time of pull.
- Interpretation for baseline: logged days suggest strong deficit and decent protein, but nutrition completeness is not yet reliable enough to support clean weekly physiology conclusions.

Training:

- Program state still shows barbell anchors: flat bench, deadlift, back squat.
- Live logs show repeated swaps/deviations: flat bench swapped to converging chest press Jul 27; back squat swapped to leg press Jul 31; hack squat appeared Jul 17 despite exclusion; several lower-body accessories unmarked Jul 31.
- Handoff explains the core failure: two weeks of unreported barbell avoidance/SI flare were not caught because the coach lacked read access/proactive mechanisms.
- Interpretation for baseline: the training baseline is not just performance numbers. The critical baseline fact is mismatch between written program, app state, logged deviations, and actual body status.

App/data state:

- Settings currently show calories 2000, protein 200, fiber 30, steps 15000, sleep 8, water 128, Wednesday 900, weekend 2000.
- Program currently still contains Friday back squat and Tuesday deadlift despite SI flare gating/override.
- Handoff says read endpoints for wk/wt/rec are priority gaps in MCP, though the local Health Hub helper can read live Supabase data.
- Interpretation for baseline: Health Hub has useful live data, but source-of-truth drift is an active baseline condition.

### Data-quality matrix

Reliable enough now:

- Handoff current decisions and constraints
- Settings targets
- Recent step rows
- Recent Oura recovery rows
- Recent weight rows as raw values, not single-day conclusions
- Workout logs as evidence of what was logged/swapped/completed

Useful but partial:

- Nutrition logs: useful when present, incomplete across days
- Mobility logs: completion exists but not enough context; one 4-second entry indicates quality issues
- Cardio logs: visible sessions only; may not capture all movement if not logged
- Body-comp notes: useful qualitative signal, not enough alone for numeric adjustments

Stale/conflicted:

- Older Summer Cut file with May-June dates and 1,800-cal training day targets conflicts with current Summer Cut v2 handoff.
- Program state still containing squats conflicts with active SI flare override.
- Progression/e1RM history has obvious corrupted/outlier values for some movements.

Missing/unbuilt/unknown:

- Current subjective SI status after Jul 31
- Whether health-hub-handoff-v2 has shipped
- Whether Oura/Apple Watch integrations are built beyond current data ingestion/helper visibility
- Whether Cronometer recipe templates are complete
- Actual status of restaurant nutrition playbook
- Whether Health Hub UI redesign has been built

### Baseline conflict list

1. Current program vs SI override
   - Program contains back squat Friday.
   - Handoff says no loaded squatting until resolved.
   - Resolution: SI override governs. Program/app state requires later reconciliation.

2. Current app/program weights vs governing doc
   - Handoff says anchor seeds/app weights have bugs.
   - Live logs show inconsistent anchor weights and swaps.
   - Resolution: governing handoff/doc numbers win for intent; live logs win for what actually happened.

3. Older cut plan vs Summer Cut v2
   - Older file lists May-June block and 1,800 training calories.
   - Handoff lists Jul 6-Aug 30 block and 2,000 flat days, Wed 900, weekend 2,000.
   - Resolution: handoff/Summer Cut v2 governs.

4. App-as-product vs Dylan-as-output
   - Earlier docs could tempt feature-building.
   - Dylan explicitly corrected: foundation baseline first; Dylan/output later; app is not the product.
   - Resolution: do not build features until baseline model and needs are clear.

### Current baseline model

#### Stable facts

- Health Coach must start from Dylan's current block, not generic fitness logic.
- The current block is Summer Cut v2, not the older May-June cut plan.
- The core failure to fix foundationally is not missing features; it is coach blindness to real-world deviations and source-of-truth drift.
- Dylan's adherence patterns are known and must be treated as design constraints, not moral failings.
- Weekday movement system appears functional; weekend/non-routine movement is more fragile.
- Nutrition logging completeness is not stable enough to support high-confidence weekly calorie conclusions.
- Sleep is consistently below target even when readiness is acceptable.
- SI/lower-back status is currently a gating constraint for lower-body training.

#### Active risks

- Coaching from stale program state.
- Mistaking incomplete logs for true behavior.
- Overreacting to noisy scale movement.
- Recommending already-failed approaches.
- Building app surfaces before knowing what baseline gaps actually matter.
- Treating Health Hub logs as the whole truth when Dylan's lived narrative explains key deviations.

#### Data gaps that block confident coaching changes

- Current SI symptom status after the Jul 31 flare.
- Clean 7-day nutrition completeness.
- Reconciled program state after SI override.
- Confirmation of current read/write endpoint capabilities.
- Whether recent training swaps were deliberate coaching decisions, equipment constraints, pain responses, or app misuse.

#### First baseline conclusion

The system should not start by prescribing a new behavior loop or app feature. It should start by maintaining this baseline model and repeatedly reconciling handoff truth, app state, and live logs until it can distinguish:

- real physiology from noisy/incomplete data
- planned program from actual execution
- adherence failure from logging friction
- injury adaptation from skipped training
- app state from governing coaching truth

Only after that baseline is established should the coach propose changes.

## Next baseline analysis pass

The next pass should answer, in order:

1. Is the SI flare still active today?
2. Has Health Hub's program state been updated to reflect the Jul 31 no-squat override?
3. Which recent nutrition days are complete vs partial vs blank?
4. What is the current 7-day rolling weight average using available values?
5. Which logged workout deviations are body-driven vs app/program drift vs convenience swaps?
6. Which Health Hub data gaps are truly blocking coaching, versus merely nice-to-have?

No app feature work should start before those are answered or explicitly marked unknown.
