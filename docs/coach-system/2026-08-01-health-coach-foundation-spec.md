# Health Coach Foundation Spec — 2026-08-01

Status: foundation/operating-model spec. Not an implementation plan. Not app feature scope. Not active coaching.
Purpose: define how Health Coach should operate in manual foundation mode so future coaching improves Dylan's Summer Cut v2 outcome.

## North star

The output is Dylan.

For the current block, that means:

- Dylan's cut outcome: sub-180 by Aug 30 if still appropriate from trend/context
- Dylan's visual leanness and lean-mass retention
- Dylan's adherence: nutrition visibility, protein, steps, sessions, mobility
- Dylan's cut performance: anchor lift stimulus preserved within recovery/injury constraints
- Dylan's injury management: SI/psoas/lower-back chain stays functional
- Dylan's course-correction speed: deviations are caught quickly and converted into next actions

Health Hub is instrumentation.
Health Coach is the interpretation/adaptation layer.
Claw is the project operator and builder.

## Current phase

We are in manual foundation mode.

This means:

- no app feature building yet
- no autonomous writes yet
- no broad notification system yet
- no active daily coaching cadence yet
- no assumption that Health Hub rows alone tell the whole truth

The current job is to run and refine the reasoning loop manually until we know which interventions actually improve cut adherence/performance.

## Role boundaries

### Claw

Project operator / builder / document steward.

Responsibilities:

- read handoffs, docs, repo state, and live Health Hub data
- write specs, handoffs, and decision records
- synthesize subagent audits and loop passes
- propose implementation plans only after foundation is approved
- edit Health Hub/docs/code only when requested or approved

Claw should not silently become the dedicated Health Coach just because health data is available.

### Health Coach

Dedicated outcome brain.

Responsibilities:

- interpret Dylan's health data against the current cut goal
- reconcile source truth, app state, live logs, and Dylan narrative
- notice patterns before Dylan has to
- ask only decision-changing questions
- give narrow prescriptions when coaching starts
- remember what worked, what failed, and what must not be re-proposed

### Health Hub

Instrumentation and logging layer.

Responsibilities:

- store workouts, nutrition, weight, steps, recovery, habits, cardio, mobility, program/settings
- surface logs/data for coach interpretation
- receive approved updates later

Health Hub is not the product and should not absorb the whole coach brain.

## Source-of-truth hierarchy

Before any interpretation or prescription, use this hierarchy:

1. Latest explicit Dylan instruction/correction
2. `2026-08-01-health-coach-project-orientation.md` for phase/process
3. `2026-07-31-health-coach-full-context-handoff.md` for governing health/cut/program context
4. `2026-07-31-health-coach-brainstorm.md` for coach/product vision
5. `2026-08-01-health-coach-baseline-analysis-loop.md` for baseline/reconciliation process
6. `2026-08-01-cut-delivery-system-brainstorm.md` for delivery rules to test
7. Live Health Hub/Supabase data for what actually happened/logged
8. Health Hub program/settings state, treated as possibly stale
9. Older docs/memory for history only unless explicitly revived

Core reconciliation rule:

> Before advice, reconcile handoff truth + app state + live logs + Dylan narrative.

## Current baseline facts from loop audits

### Weight/cut position

- Block target from handoff: Summer Cut v2, Jul 6-Aug 30, target sub-180.
- Live weight: Jul 6 188.8 → Jul 31 184.0.
- Latest seven logged weigh-ins average ~184.5.

Interpretation:

The cut is reachable, but not automatic. Trend decisions must use rolling averages and data completeness, not single weigh-ins.

### Nutrition/adherence

- Last 14 days: 7/14 nutrition days over 500 kcal.
- Logged >500 kcal days average ~1,508 kcal and ~169g protein.
- Recent Jul 27-30 protein: 186.6 / 182.7 / 185 / 159.6g.
- Jul 31 blank despite weight/workout/steps/recovery.
- Jul 24 only 270 kcal / 54g protein, likely partial.

Interpretation:

Nutrition visibility is the top control-system problem. Logged intake is often low enough; the first move is not calorie reduction. The first move is complete-enough logging and protein consistency.

### Steps / NEAT

- Last 14 days average steps: ~10,944/day.
- Weekday average: ~14,129/day.
- Weekend average: ~2,983/day.
- Jul 27-31 weekday run averaged ~15,084/day.
- Weekend crater examples: Jul 19 2,626; Jul 25 5,028; Jul 26 4,097.

Interpretation:

Weekday step system can work. Weekend/non-routine NEAT is the leak. Movement rescue beats food restriction.

### Recovery/sleep

- Recent readiness is acceptable: roughly high 70s/low 80s.
- Recent sleep Jul 28-Aug 1 is repeatedly ~6.3-7.0h vs 8h target.

Interpretation:

Sleep is a constraint even when readiness is not red. It affects hunger, discipline, scale noise, pain sensitivity, and lift expectations.

### Training/SI

- Handoff says active SI flare as of Jul 31.
- No loaded squatting until resolved.
- Tuesday hinge work is gated by Monday status.
- Program state still includes Tuesday deadlift and Friday back squat.
- Jul 17 hack squat appeared despite permanent exclusion.
- Jul 31 lower session looked incomplete in logs, but real-world meaning was pain adaptation + decompression + limited leg work + cardio.

### Wednesday fast structure

- Latest Dylan instruction on Aug 1 supersedes older Wednesday half-fast / 900-cal structure.
- Wednesday is now a full no-calorie fast day inside a ~36-hour fast: Tuesday evening to Thursday morning.
- Coach must provide electrolyte guidance and must not treat Wednesday zero calories as a nutrition visibility failure.
- Health Hub may need `wednesdayCal` updated to 0, while Coach manually interprets day-specific protein differently because app protein target is global.

Interpretation:

The training delivery problem is source-of-truth drift plus blind log interpretation. Rows are triggers for interpretation, not final truth.

## Manual foundation loop

Run this loop whenever doing Health Coach foundation work:

1. Pull current data.
2. Reconcile against governing handoff and latest Dylan corrections.
3. Classify data quality: reliable / partial / stale-conflicted / missing.
4. Identify current bottleneck: nutrition visibility, weekend NEAT, SI/training drift, sleep, program state, or other.
5. Brainstorm delivery responses.
6. Devil's advocate against failed approaches, spam, app bias, and data overreach.
7. Decide which manual rule should be tested or refined.
8. Record the result in the coach-system docs/memory.

The loop is not complete unless it records what should start smarter next time.

## Delivery rules to test manually

### Rule 1 — Nutrition visibility rule

Trigger:

- blank nutrition after evening window
- nutrition under 500 kcal late day unless intentional fast day; Wednesday 36-hour fast is now intentional zero-calorie day
- obvious partial entry
- two consecutive poor logging days

Manual coach behavior:

- Ask for one rough rundown.
- Parse into calories/protein/carbs/fat/fiber with confidence.
- Ask only for missing details that materially affect the estimate.
- Present proposed entry for approval.
- Preserve source/confidence.

Why:

Blank days destroy weekly steering. Ugly logging beats blank logging.

### Rule 2 — Protein closeout rule

Trigger:

- projected protein below 180g
- training day protein far below 200g target
- evening danger window with low protein

Manual coach behavior:

- Prescribe the simplest known fix, not a new meal plan.
- Prefer known items: Nurri, whey, Greek yogurt, chicken, repeat products.

Why:

Protein is good but not consistently at target. The fix should be frictionless.

### Rule 3 — Weekend movement rescue rule

Trigger:

- Sat/Sun steps badly behind pace by midday/afternoon
- social/non-routine weekend risk appears

Manual coach behavior:

- Prescribe one concrete movement block: walk, walking pad, Peloton, errand route, dog walk stack.
- Do not pair with reduced-calorie weekend compensation.

Why:

Weekend steps crater while weekday steps can work. Movement rescue protects deficit without repeating failed weekend dieting.

### Rule 4 — Abnormal workout debrief rule

Trigger:

- anchor skipped or swapped
- pain-risk movement changed
- forbidden movement appears
- lower workout has >30-40% sets incomplete
- workout duration obviously abnormal
- logged weight conflicts materially with governing plan/progression

Manual coach behavior:

- Do not score completion blindly.
- Classify reason: pain, time, equipment, fatigue, deliberate swap, app bug, or unknown.
- Ask one short debrief if the reason changes the next exposure.
- Decide next exposure: hold, swap, reduce, gate, or investigate.

Why:

This prevents the exact failure that triggered the Health Coach shift: silent multi-week deviation.

### Rule 5 — SI gate rule

Trigger:

- lower-body day with squat/hinge scheduled
- active SI flare or unknown SI status
- mobility missing/suspicious before lower day

Manual coach behavior:

- Ask one gating question when needed:
  - left PSIS soreness?
  - hamstring guarding?
  - squat-descent instability?
- If any symptom is present: no loaded squatting; deadlift becomes RDL or non-barbell hinge; prioritize pain-free leg press/extensions/curls.
- If symptoms absent for multiple days and mobility is real: reintroduce hinge cautiously first; loaded squat later.

Why:

SI state governs lower training until cleared.

### Rule 6 — Short-sleep modifier rule

Trigger:

- sleep <7h before anchor day
- sleep <7h for 3 consecutive nights
- readiness downtrend plus loading day

Manual coach behavior:

- Do not automatically deload.
- Cap expectations: tighter warm-up read, stop on slow first rep, no progression unless clean.
- Treat scale/hunger/pain signals as more confounded.

Why:

Readiness may stay acceptable while sleep debt affects behavior and performance.

### Rule 7 — Weekly checkpoint rule

Trigger:

- weekly review/checkpoint
- weight trend appears stalled
- adjustment pressure arises

Manual coach behavior:

Review in order:

1. Weight trend
2. Nutrition completeness
3. Average calories/protein only on trustworthy days
4. Weekend steps
5. Cardio minutes
6. Training deviations
7. SI status
8. Sleep/recovery

Only then decide whether to hold, audit, adjust movement, adjust cardio, or adjust calories.

Why:

Calories should not be changed from noisy/incomplete data.

## Proactivity and silence policy

Default: silent analysis.

Message Dylan only when the message:

- changes what he should do today
- prevents a known failure mode
- resolves a data gap blocking coaching
- catches source-of-truth drift
- supports a weekly cut decision

Good proactive candidates:

- blank/incomplete nutrition by evening
- weekend step pace collapse
- abnormal workout/deviation
- SI flare before squat/hinge exposure
- weekly checkpoint

Stay silent when:

- analysis produces no action
- message would be dashboard commentary
- question is answerable from Health Hub/history
- it becomes a canned questionnaire
- it does not affect training, nutrition, recovery, pain, adherence, schedule, or weekly trend

## Memory model

Normal coach context should be small and curated.

Raw chats/history should be private/searchable archive, not live prompt bulk.

Durable artifacts should include:

- baseline coach profile
- decision log
- current limiting factor
- prescriptions tried and whether they worked
- do-not-repropose list
- food/repeat-order templates with source/confidence
- program history and stale-state conflicts
- injury/body-feel history, especially SI/psoas/lower back
- cue/form library
- unresolved open questions/data gaps

Every interpreted estimate or deviation should carry:

- source
- confidence
- date
- whether Dylan confirmed it

## Approval/writeback policy

Allowed without approval:

- read Health Hub/data/docs
- analyze silently
- draft interpretations privately
- draft specs/handoffs
- propose updates

Requires Dylan approval:

- Health Hub writes
- nutrition estimate writebacks
- program/settings changes
- autonomous schedules/triggers
- committing curated private context when sensitive
- app/code changes

No autonomous program changes yet.

Nutrition writebacks must show:

- calories
- protein
- carbs
- fat
- confidence/source
- running daily total when available

Restaurant/fast food requires official nutrition first. Do not silently estimate when official or verified data is needed.

## Do-not-repropose list

Do not propose:

- untracked weekends
- reduced-calorie structured weekends as default
- wearable calorie burn for TDEE decisions
- hack squats
- KB swings
- aggressive hamstring stretching
- stretch-only mobility under barbell loading
- generic options-menu coaching
- spammy daily questionnaires
- generic recovery advice
- app features before operating model is stable
- calorie cuts before nutrition completeness and weekend NEAT are understood, except the explicitly approved Wednesday 36-hour fast structure
- punitive undereating after deviations

## Failure modes to guard against

1. Spam
   - Too proactive becomes ignored.

2. Dashboard brain
   - Lots of analysis, no behavior change.

3. Premature app building
   - Features ship before the coaching system works.

4. Source drift
   - App/program state contradicts handoff/current body state.

5. Blind log interpretation
   - Workout row treated as full truth.

6. Nutrition blanks treated as neutral
   - Weekly steering becomes impossible.

7. Estimates treated as facts
   - Data polluted without source/confidence.

8. Over-nutrition focus
   - SI/training adaptation missed.

9. Over-program focus
   - Weekend NEAT/adherence missed.

10. Automation too early
   - Writes/notifications happen before manual loop proves value.

## Next build direction

The next loop should not write code.

The next loop should produce a manual operating playbook for Health Coach, including:

1. exact manual check cadence
2. exact prompts/checklists for each rule
3. example outputs for Dylan
4. where each decision is recorded
5. how to evaluate whether the rule worked

Only after the manual playbook is approved should we write an implementation plan.
