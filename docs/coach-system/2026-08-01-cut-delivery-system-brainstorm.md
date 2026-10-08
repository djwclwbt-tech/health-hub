# Cut Delivery System Brainstorm — 2026-08-01

Status: brainstorming synthesis, not an app feature spec and not active coaching.
Purpose: use the full Health Coach handoff + live Health Hub data to identify how the delivery system should improve Dylan's Summer Cut v2 performance and adherence.

## User instruction this responds to

Dylan asked for a brainstorming loop using:

- the project handoff and current cut plan
- Health Hub/Supabase data
- program tracking
- Cronometer nutrition data
- Oura recovery data
- Health Hub repo/system context

The output is not an application, a feature list, or a dashboard.

The output is Dylan's cut outcome:

- Dylan's body composition
- Dylan's cut performance
- Dylan's adherence
- Dylan's recovery and injury resilience
- Dylan's ability to course-correct quickly

## Operating frame

We are not coaching Dylan yet.

We are using the available data to brainstorm how the Health Coach delivery system should work so that future coaching actually affects the cut outcome.

Health Hub is instrumentation.
Health Coach is the interpretation/adaptation layer.
Dylan is the output.

## Sources reviewed

Canonical docs:

- `2026-08-01-health-coach-project-orientation.md`
- `2026-07-31-health-coach-full-context-handoff.md`
- `2026-07-31-health-coach-brainstorm.md`
- `2026-08-01-health-coach-baseline-analysis-loop.md`
- `2026-08-01-health-coach-interpretation-loop.md`
- `2026-07-31-health-coach-loop-scope-pass.md`

Live/system sources:

- Health Hub Supabase tables through helper script
- Program/settings/progression state
- Recent nutrition, weight, recovery, steps, workouts, cardio, mobility, debrief, body-comp rows
- Health Hub API files for Cronometer sync, Oura sync, Apple Health/steps/weight sync, MCP/update flows

## Current live baseline

### Outcome position

The handoff says Summer Cut v2 runs July 6-August 30 with target sub-180 by Aug 30.

Live weight data:

- Jul 6: 188.8 lb
- Jul 31: 184.0 lb
- Latest seven logged weigh-ins average ~184.5 lb

Interpretation:

- The cut is not off-track.
- But the live data is less aggressively ahead than the handoff's “182 as of Jul 28” headline implies.
- Sub-180 by Aug 30 requires roughly 4-5 lb more loss in about a month, which is achievable but not automatic.

### Steps / NEAT

Last 14 days:

- Average steps: ~10,944/day
- Weekday average: ~14,129/day
- Weekend average: ~2,983/day
- Days ≥15k: 5/14

Jul 27-31 weekday run:

- 12,172 / 16,206 / 15,709 / 16,141 / 15,194
- Average: ~15,084/day

Weekend crater examples:

- Jul 19: 2,626
- Jul 25: 5,028
- Jul 26: 4,097

Interpretation:

- Dylan can hit the 15k step system on structured weekdays.
- The weak point is not generic “steps motivation”; it is non-routine/weekend delivery.
- Weekend NEAT is a major cut-performance lever because it preserves deficit without adding food restriction.

### Nutrition

Last 14 days:

- Nutrition days >500 kcal: 7/14
- Average on logged >500 days: ~1,508 kcal
- Average protein on logged >500 days: ~169g
- Protein ≥180g: 4/7 logged days

Recent logged run Jul 27-30:

- Calories: 1,739 / 1,731 / 1,890 / 1,257
- Protein: 186.6 / 182.7 / 185 / 159.6

Blank/partial issues:

- Jul 31: no nutrition despite weight/workout/steps/recovery
- Aug 1: no nutrition at time of pull
- Several previous days blank or clearly partial

Interpretation:

- Logged days suggest a strong deficit, sometimes too low relative to the 2,000/200 target.
- But nutrition completeness is not reliable enough for clean weekly physiology decisions.
- Protein consistency is not bad, but it is below the intended 200g target often enough to matter.
- Blank nutrition days are more dangerous to the delivery system than ugly/high-calorie days because they destroy the weekly math.

### Recovery / sleep

Last 14 days:

- Recovery rows: 6 days
- Average readiness: ~79
- Average sleep: ~6.78h

Recent Jul 27-Aug 1:

- Readiness: 90 / 76 / 77 / 79 / 80 / 72
- Sleep: 7.83 / 6.49 / 6.28 / 6.98 / 6.46 / 6.64

Interpretation:

- Oura readiness is not collapsing.
- Sleep duration is consistently below the 8h target.
- This matters because sleep debt can worsen hunger, perceived effort, pain sensitivity, water retention, and anchor performance before readiness turns red.
- The delivery system should not wait for “red recovery” before treating sleep as a constraint.

### Training / program execution

Current handoff plan:

- 5-day Upper/Lower
- Big-three anchors: bench, deadlift, back squat
- Anchors progress; accessories mostly hold
- Active Jul 31 SI flare overrides normal lower plan
- No loaded squatting until resolved
- Tuesday hinge work gated by Monday status
- Hack squats permanently removed

Live data / drift:

- Program state still includes Friday back squat.
- Program state still includes Tuesday deadlift, though hinge work is gated by Monday status.
- Jul 17 shows hack squat despite permanent exclusion.
- Jul 21 shows deadlift not completed.
- Jul 27 flat bench swapped to converging chest press.
- Jul 28 deadlift row appears inconsistent with governing weights/progression context.
- Jul 31 squat swapped to leg press; lower accessories mostly unmarked; known real-world explanation is SI flare, decompression/stretching/dead hangs, some leg work, time limit, and incline walk.

Interpretation:

- The core training issue is not just whether Dylan completed sets.
- The issue is mismatch between written program, app state, logged actuals, and body status.
- A coach that reads only completion percentage will optimize fiction.
- The delivery system must catch deviations, classify the reason, and decide whether the next exposure changes.

### Data/system access state

Useful current instrumentation:

- Supabase has live rows for weight, nutrition, recovery, steps, workouts, cardio, mobility, body_comp, settings, program, progression, debrief, program_updates.
- Cronometer sync preserves manual/assistant meals and refreshes Cronometer-sourced meals.
- Oura sync pulls readiness + sleep into recovery.
- Apple Health/Health Auto Export path can sync steps and weight.
- MCP/update path can queue program/settings changes.

Current gaps/drift:

- Water table empty.
- Stepper table empty.
- Debrief only has 2 rows.
- Mobility exists but quality is uneven; one 4-second row indicates completion data can be low-signal.
- Program still reflects normal lower plan, not active SI override.
- Some progression/e1RM data appears unreliable/outlier-prone.
- Nutrition completeness is inconsistent.

Interpretation:

- The data foundation is already better than nothing. There is enough to generate useful coach intelligence.
- The limiting factor is not raw access. It is interpretation, reconciliation, and delivery timing.

## Brainstorming loop

### 1. Parse

Raw signals show:

- Weight down from block start but current average near 184.5.
- Weekday steps can hit target; weekend steps collapse.
- Nutrition logging is inconsistent; logged days are often low-calorie and protein short of 200g.
- Recovery scores are okay, but sleep is short.
- Training logs contain swaps, incomplete lower days, and stale/conflicted program state.
- The SI flare is the active injury-management constraint.
- Health Hub already collects enough data to support a coach, but the meaning is not reliably surfaced.

### 2. Interpret

The strongest current cut-delivery problem is not lack of willpower, lack of features, or lack of data.

It is that the system does not yet reliably convert available signals into timely, narrow course corrections.

The real failure modes are:

- blank nutrition hiding weekly intake
- weekend routine collapse hiding NEAT leakage
- training deviations hiding pain or equipment/body constraints
- program state drifting from current coaching truth
- sleep debt being underweighted because readiness is still acceptable
- Dylan having to personally notice and report everything for the coach to adapt

### 3. Brainstorm delivery-system improvements

These are delivery-system improvements, not app features. Some may later imply features, but the immediate question is how the coach should operate.

#### A. Establish a “truth reconciliation” habit before advice

Every significant coach pass should reconcile:

- handoff/governing plan
- app program state
- live logs
- Dylan narrative if available

Purpose:

Prevent coaching from stale or fictional state.

Example:

If Health Hub says Friday includes back squat but the handoff says active SI flare/no loaded squatting, the coach must know the handoff override governs.

Delivery implication:

Before prescribing, Coach should say internally: “What source of truth am I using, and what is stale?”

#### B. Treat missing nutrition as a control-system outage

Blank nutrition should not be treated as neutral.

It should trigger a low-friction recovery path:

- ask for rough food narrative if the day is blank/incomplete
- estimate macros with confidence
- preserve known/repeat meals
- queue/write only with approval
- mark source/confidence

Purpose:

A rough honest estimate beats a blank day because it preserves weekly steering.

Delivery implication:

Coach should not nag “log your food.” It should say: “Send me the rough rundown; I’ll structure it.”

#### C. Build a weekend NEAT rescue rule

Weekday steps can work. Weekend steps are the leak.

Potential operating rule:

- If weekend day is below a morning/midday pace, Coach should trigger one concrete movement rescue.
- The prescription should be practical: walk, errands route, walking pad block, Peloton, dog walk stack.
- Do not pair this with reduced weekend calories; that approach failed.

Purpose:

Protect weekly deficit without making weekends feel like diet jail.

Delivery implication:

Coach intervention should be a small movement save, not a lecture.

#### D. Create an abnormal workout debrief rule

Trigger conditions:

- anchor lift skipped or swapped
- pain-risk movement changed
- many sets incomplete
- unusual duration
- hack squat/forbidden movement appears
- deadlift/squat exposure occurs while SI status unclear

Coach response:

- do not classify the session blindly
- ask one short debrief if needed
- classify reason: pain, time, equipment, fatigue, app issue, deliberate swap
- decide whether next exposure is hold/swap/reduce/gate

Purpose:

Catch the exact failure that triggered this project shift: the coach missing two weeks of barbell avoidance/SI flare.

Delivery implication:

The row is not the truth; the row is the prompt for interpretation.

#### E. Separate readiness from sleep adequacy

Current data shows acceptable readiness but short sleep.

Delivery rule:

- Readiness gates gross recovery decisions.
- Sleep duration modifies interpretation of hunger, scale noise, pain sensitivity, and anchor performance.

Purpose:

Avoid waiting for Oura to go red before responding to accumulated sleep debt.

Delivery implication:

On short-sleep anchor days, Coach may give a tighter cue, reduce expectation-setting, or watch bar speed/RIR more closely — without necessarily changing the whole program.

#### F. Use habitual eating as an adherence engine

Dylan repeats foods and orders. That should reduce friction.

Delivery rule:

- When a repeated meal/order appears, retrieve prior macro template/source.
- If unvalidated, validate once and store as a repeat pattern.
- If the order changes, update the template.

Purpose:

Turn habitual eating from “bad behavior risk” into fast data capture and known-good defaults.

Delivery implication:

Coach should make tracking easier with memory, not require a fresh food search every time.

#### G. Preserve one-decision coaching

Dylan should not get broad multi-domain audits from every signal.

Delivery rule:

- Identify the current limiting factor.
- Give one prescribed action.
- Record why.
- Watch one trigger.

Purpose:

More advice is not better delivery. The goal is behavior change.

Delivery implication:

Coach should say less, but at better moments.

### 4. Devil's advocate

Risks if we pursue the wrong delivery system:

1. Too proactive becomes spam.
   - Dylan ignores it.
   - Coach loses trust.

2. Too analytical becomes dashboards.
   - Looks impressive.
   - Does not change behavior.

3. Too automated corrupts data.
   - Estimates get treated as facts.
   - Program changes apply without approval.

4. Too nutrition-focused misses injury.
   - SI flare silently changes lower training.
   - Cut outcome suffers through pain/avoidance.

5. Too program-focused misses adherence.
   - Weekends and blank logs erase the deficit.

6. Too app-focused loses the north star.
   - Features ship.
   - Dylan does not get leaner, more consistent, or healthier.

7. Too quick to prescribe repeats failed approaches.
   - Reduced weekend calories, generic reminders, options menus, and wearable calorie math are already disqualified.

## Delivery-system approaches

### Approach 1 — Silent analyst + selective interventions

Coach runs regular analysis silently, only interrupts when there is a real risk/opportunity.

Examples:

- blank nutrition by evening
- weekend step pace collapsing
- SI flare before hinge/squat exposure
- program/log contradiction
- weekly checkpoint due

Pros:

- Low noise
- Best fit for Dylan's anti-spam preference
- Forces coach to justify intervention

Cons:

- Needs good trigger definitions
- May miss nuance without Dylan debriefs

### Approach 2 — Structured daily coaching cadence

Coach gives morning plan, post-lift analysis, evening closeout, weekly review.

Pros:

- Strong accountability
- More complete data
- Easier to debug early

Cons:

- High risk of becoming annoying
- Canned daily questionnaires are explicitly an anti-pattern
- Dylan may disengage if it feels like homework

### Approach 3 — Manual coach operator mode first

Before automation, Claw/Health Coach manually runs the loop using live data and writes coach notes/specs. Dylan gives use cases/corrections. Only after the loop proves useful do we automate triggers.

Pros:

- Best for foundation phase
- Prevents premature app work
- Lets us discover which interventions actually help Dylan
- Safer with writes/approvals

Cons:

- Less proactive until automated
- Requires periodic deliberate analysis sessions

## Recommendation

Use Approach 3 first, with Approach 1 as the automation target.

In plain terms:

1. Manually run the Health Coach delivery loop for a short period.
2. Learn which signals actually change Dylan's cut performance/adherence.
3. Convert only proven, high-value moments into silent analysis + selective interventions.
4. Avoid building broad app features until a delivery behavior is proven.

Approach 2 should not be the default because Dylan already identified spam/questionnaire behavior as an anti-pattern.

## Proposed initial delivery-system model

### Manual foundation mode

For now, Coach/Claw periodically runs:

1. Pull live data.
2. Reconcile against handoff/source truth.
3. Identify the current cut-delivery bottleneck.
4. Brainstorm possible delivery improvements.
5. Challenge them against known failed approaches.
6. Decide what the delivery system should eventually do.
7. Record the insight.

No active app changes unless Dylan explicitly approves.

### Future operating mode

Once stable, Coach runs mostly silent checks:

- Morning readiness/training risk check
- Post-workout abnormality check
- Evening nutrition visibility check
- Weekend NEAT risk check
- Weekly checkpoint review

Most checks produce no message.

A message is justified only when:

- it changes what Dylan should do today
- it prevents a known failure mode
- it resolves a data gap that blocks coaching
- it catches source-of-truth drift
- it supports the weekly cut decision

## Concrete insights to carry forward

1. The cut is still reachable, but current live weight average is closer to ~184.5 than the most optimistic handoff headline. Treat trend carefully.
2. Weekday steps are not the main problem; weekend steps are.
3. Nutrition blanks are currently the biggest data-quality risk.
4. Logged calories are already low enough that blindly reducing calories would be a weak first move.
5. Protein is good but not consistently at the 200g target.
6. Sleep duration is a real constraint even while readiness scores remain okay.
7. Training completion data needs narrative interpretation because pain/deviation context changes the meaning.
8. Program state currently conflicts with the active SI override.
9. The coach must maintain a do-not-repropose list.
10. The first valuable delivery system is not a feature; it is a reliable reasoning cadence that turns existing data into timely, narrow action.

## Candidate delivery rules to test manually

These are not app features yet.

### Rule 1 — Nutrition visibility rule

If a day has no nutrition by evening, Coach asks for a rough rundown and structures it.

Success criterion:

Blank days decrease without Dylan doing extra platform work.

### Rule 2 — Weekend movement rescue rule

If weekend steps are pacing badly, Coach gives one concrete movement save.

Success criterion:

Weekend steps rise without reintroducing failed reduced-calorie weekends.

### Rule 3 — Abnormal workout debrief rule

If workout logs show swaps/incomplete anchors/pain-risk changes, Coach asks one debrief or classifies from existing context.

Success criterion:

No multi-week training deviations go unnoticed.

### Rule 4 — SI gate rule

Before any squat/deadlift exposure while flare is active or unclear, Coach verifies/gates based on symptoms and mobility compliance.

Success criterion:

Lower training preserves stimulus without worsening SI chain.

### Rule 5 — Weekly checkpoint rule

Weekly review uses weight trend, nutrition completeness, steps/cardio, training deviations, sleep/recovery, and SI status before changing calories or cardio.

Success criterion:

Adjustments are based on reliable trend, not single noisy signals.

## Do-not-repropose list

Do not propose:

- untracked weekends
- reduced-calorie structured weekends as default
- wearable calorie burn for TDEE decisions
- hack squats
- KB swings
- aggressive hamstring stretching
- stretch-only mobility for barbell loading
- generic options-menu coaching
- spammy daily questionnaires
- building app features before the coach operating model is stable
- blindly lowering calories before fixing logging completeness and weekend NEAT visibility

## Next step

The next useful artifact is a Health Coach foundation spec, not code.

It should define:

1. Coach role and boundaries
2. Source-of-truth hierarchy
3. Manual foundation operating mode
4. Data streams and trust levels
5. Delivery rules to test manually
6. Approval/writeback policy
7. Proactivity/silence policy
8. Memory model
9. Future automation path

This spec should be reviewed before implementation planning.
