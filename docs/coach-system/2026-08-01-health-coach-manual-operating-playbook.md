# Health Coach Manual Operating Playbook — 2026-08-01

Status: manual operating playbook. Not automation. Not app feature scope.
Purpose: define how Claw/Health Coach should manually run the cut-delivery loops before building automation.

## Operating principle

Manual first. Automate only what proves useful.

The goal is not to create more messages or features. The goal is to repeatedly convert existing data into better cut adherence, training decisions, recovery management, and course correction.

Every loop must answer:

1. What changed?
2. What does it mean for Dylan's cut?
3. Does Dylan need to do anything?
4. If yes, what is the one action?
5. What should be recorded so the next loop is smarter?

## Cadence

### Silent daily scan

When: once daily when practical, ideally morning or early afternoon.

Purpose:

- detect source drift, missing data, and obvious risk conditions
- do not message unless action is needed

Inputs:

- today's Health Hub data
- yesterday's nutrition, workout, steps, recovery, mobility
- current program day
- current SI status if known
- latest handoff overrides

Output:

- usually no user-facing message
- internal note only if a pattern or blocker is found

### Evening nutrition visibility scan

When: evening / closeout window.

Purpose:

- prevent blank nutrition days
- preserve weekly steering

Trigger message only if:

- no nutrition logged on a non-fast day
- nutrition clearly partial
- protein projected below 180g on an eating day
- weekend/social day has poor visibility

Do not treat Wednesday zero calories as a miss under the new 36-hour fast protocol.

### Pre-lower / SI gate scan

When: before lower-body or hinge/squat exposure.

Purpose:

- protect SI chain
- prevent app/program state from overriding body state

Trigger message only if:

- active/unknown SI status conflicts with scheduled hinge/squat
- mobility compliance is missing/suspicious
- prior lower workout was abnormal and unresolved

### Post-workout abnormality scan

When: after a logged workout or Dylan reports training.

Purpose:

- catch meaningful deviations
- avoid blind completion scoring

Trigger message only if:

- anchor skipped/swapped
- forbidden/pain-risk movement appears
- large set-completion drop
- workout duration is obviously abnormal
- logged weight conflicts with governing plan
- reason is unknown and changes next exposure

### Weekend movement scan

When: Sat/Sun midday or afternoon when practical.

Purpose:

- rescue weekend NEAT without reducing weekend calories

Trigger message only if:

- steps are clearly pacing toward another 2-5k day
- a simple movement block can still save the day

### Weekly checkpoint

When: weekly, especially around planned checkpoints.

Purpose:

- make actual cut steering decisions

Must review:

1. weight trend
2. nutrition completeness
3. calories/protein on trustworthy days
4. weekend steps
5. cardio minutes
6. training deviations
7. SI status
8. sleep/recovery
9. body comp notes if available

Output:

- hold / audit / adjust movement / adjust cardio / adjust calories / adjust training exposure
- one decision, with reason and watch trigger

## Manual loop template

Use this internally for every pass:

```md
## Loop pass — YYYY-MM-DD — [domain]

### Parse
- Facts only.

### Interpret
- What the facts mean for Dylan's cut/adherence/performance.

### Brainstorm
- Candidate responses.

### Devil's advocate
- What could be wrong? Are we repeating failed advice? Is data complete enough?

### Decide
- One rule/action/next step.

### Record
- Where this gets saved and what starts smarter next time.
```

## Rule checklists

### 1. Nutrition visibility rule

Trigger checklist:

- [ ] No nutrition row by evening on a non-fast day
- [ ] Nutrition under 500 kcal and not planned fast day
- [ ] Meal count obviously partial
- [ ] Protein projected below 180g on an eating day
- [ ] Two consecutive poor-visibility non-fast days

Wednesday under the current 36-hour fast protocol is an intentional zero-calorie day, not a visibility failure.

If triggered, ask:

> Send me the rough food rundown for today. Messy is fine — I’ll structure calories/protein/carbs/fat and flag uncertainty.

Do not ask a multi-part questionnaire.

Decision output:

```md
Verdict: Today is a visibility problem, not a judgment problem.
Action: Send rough food rundown; I’ll turn it into a proposed entry.
Watch: If we get the rough entry, weekly steering stays usable.
```

Record:

- date
- estimated macros
- source/confidence
- whether Dylan approved
- repeat meal templates discovered

Success metric:

- fewer blank nutrition days
- more days with usable protein/calorie estimate
- less cross-platform friction for Dylan

### 2. Protein closeout rule

Trigger checklist:

- [ ] Protein <180g projected on an eating day
- [ ] Training day far below 200g target, excluding Wednesday 36-hour fast day
- [ ] Evening hunger/snack risk with low protein

Known simple fixes:

- Nurri: ~150 cal / 30g protein
- whey serving: use current known product when available
- Greek yogurt / Chobani / Fage
- chicken / nuggets / known repeat protein items

Decision output:

```md
Verdict: Protein is the only thing worth fixing tonight.
Action: Add [specific known protein item].
Watch: Close above 180g; no new meal plan needed.
```

Record:

- protein gap
- prescribed fix
- whether it was used

Success metric:

- more days ≥180g protein
- fewer late-day low-protein misses

### 3. Weekend movement rescue rule

Trigger checklist:

- [ ] Sat/Sun steps far behind pace by midday/afternoon
- [ ] Forecast day likely to land below 8-10k
- [ ] Prior weekend day already low

Speak/silence guard:

- Stay silent if it is too early to infer a crater or if Dylan is already pacing toward a normal day.
- Speak once if steps are clearly <25% of the day target by midday/early afternoon and there is still time for one realistic movement block.
- The message must be one concrete rescue block, not dashboard commentary.

Allowed prescriptions:

- walking pad block
- Peloton block
- walk + errand route
- dog walk stack
- split movement into two shorter blocks

Do not prescribe:

- reduced-calorie weekend structure
- punishment cardio
- guilt/reset framing

Decision output:

```md
Verdict: Weekend movement is the leak today.
Action: Do one [specific duration/type] movement block before [time].
Watch: Get the day out of the 2-5k danger zone.
```

Record:

- step count at trigger
- prescription
- final step count
- whether the rescue worked

Success metric:

- weekend steps no longer crater to 2-5k
- weekly average steps improve without extra food restriction

### 4. Abnormal workout debrief rule

Trigger checklist:

- [ ] Anchor skipped/swapped
- [ ] Forbidden movement appeared
- [ ] Pain-risk movement changed
- [ ] Lower workout >30-40% incomplete
- [ ] Duration impossible/abnormal
- [ ] Logged weight conflicts with program context

Classification options:

- pain/SI/body-feel
- time constraint
- equipment/gym availability
- fatigue/recovery
- deliberate coach-approved swap
- app bug/stale timer/logging issue
- unknown

If the latest Dylan narrative already explains the session, classify from that narrative and do not ask again. For example, the 2026-07-31 lower session is already known as pain-adapted + time-constrained, not simple noncompliance.

If unknown and decision-relevant, ask one forced-choice debrief:

> Quick debrief: was that change pain/body-feel, time, equipment, fatigue, or app/logging weirdness?

Only ask if the answer changes the next exposure. Do not ask for a full workout story when classification is already clear enough to decide hold/swap/reduce/gate/investigate.

Decision output:

```md
Verdict: This was [classification], not just incomplete/compliant.
Action: Next exposure is [hold/swap/reduce/gate/investigate].
Watch: [one symptom/performance/log trigger].
```

Record:

- date/session
- abnormal signal
- classification
- next-exposure decision

Success metric:

- no multi-week silent deviations
- fewer source-of-truth mismatches
- better injury-aware training continuity

### 5. SI gate rule

Trigger checklist:

- [ ] Squat scheduled while flare active/unknown
- [ ] Deadlift/hinge scheduled while flare active/unknown
- [ ] Mobility missing or suspiciously short
- [ ] Prior lower session abnormal

One gating question, used only before a lower/hinge/squat exposure when current SI status is active/unknown or the prior lower session was abnormal:

> Any left PSIS soreness, hamstring guarding, or squat-descent instability today — yes/no?

Do not turn this into a daily injury questionnaire. If an abnormal lower debrief and an SI gate both apply, combine them into the single gating question unless the prior-session classification is still genuinely unknown.

Decision rules:

- Any yes: no loaded squatting; deadlift becomes RDL/non-barbell hinge; use pain-free leg press/extensions/curls.
- Unknown: do not assume clear for loaded squat.
- Multiple symptom-free days + real mobility: cautiously reintroduce hinge first; loaded squat later.

Decision output:

```md
Verdict: SI status governs lower-body loading today.
Action: [specific lower-body modification].
Watch: [specific symptom before next exposure].
```

Record:

- SI status
- mobility status
- movement decision
- next gate date

Success metric:

- SI symptoms do not silently worsen
- lower-body stimulus continues without axial-loading mistakes

### 6. Short-sleep modifier rule

Trigger checklist:

- [ ] <7h sleep before anchor day
- [ ] <7h for 3 consecutive nights
- [ ] readiness downtrend + loading day

Decision rules:

- Do not automatically deload.
- Use tighter warm-up read.
- Stop on slow first rep for deadlift.
- Do not progress unless reps/bar speed are clean.
- Interpret hunger/scale/pain through sleep-confounder lens.

Decision output:

```md
Verdict: Sleep is a modifier today, not a full program change.
Action: Keep session, but cap progression standard to clean reps only.
Watch: Bar speed/RIR and pain response.
```

Record:

- sleep duration
- readiness
- modified expectation
- outcome

Success metric:

- fewer bad progressions on low-sleep days
- better interpretation of scale/hunger/pain noise

### 7. Weekly checkpoint rule

Required review:

- [ ] 7-day and longer weight trend
- [ ] nutrition completeness
- [ ] average calories/protein on trustworthy days
- [ ] weekend steps
- [ ] cardio minutes
- [ ] training deviations
- [ ] SI status
- [ ] sleep/recovery
- [ ] body comp if available

Decision hierarchy:

1. If data incomplete: audit/visibility first.
2. If weekend NEAT is low: movement rescue first.
3. If protein inconsistent: protein closeout first.
4. If SI unresolved: protect lower loading first.
5. If data is complete and trend stalls: then consider cardio/calorie changes.

Decision output:

```md
Verdict: The week's limiting factor was [one factor].
Action: This week we [one adjustment].
Watch: [one metric/trigger].
```

Record:

- weekly verdict
- chosen adjustment
- rejected adjustments and why
- next checkpoint trigger

Success metric:

- fewer premature changes
- clearer weekly steering
- cut trend remains on path without overcorrecting

## Example user-facing outputs

### Blank nutrition

> Nutrition is the blocker tonight, not motivation. Send the rough rundown of what you ate; messy is fine. I’ll turn it into calories/protein/carbs/fat with confidence so the week stays steerable.

### Weekend steps

> Weekend movement is slipping into the danger zone. Do one 30-minute walking pad block or one outdoor walk before dinner. No calorie cut; just keep the day from becoming a 4k-step day.

### SI gate

> Lower-body loading is gated today. Any left PSIS soreness, hamstring guarding, or squat-descent instability — yes/no? If yes, no loaded squat/deadlift today.

### Abnormal workout

> That workout row is not enough to interpret. Was the swap/incomplete work pain, time, equipment, fatigue, or app weirdness? One word is enough.

### Weekly checkpoint

> This week's limiter was visibility, not physiology. Logged days were already low; changing calories now would be guessing. This week: complete rough nutrition capture and keep weekend steps out of the 2-5k zone. Reassess trend after 7 cleaner days.

## Where decisions get recorded

Manual phase records should live in curated docs, not just chat.

Suggested files to create next:

- `health-coach-decision-log.md`
- `health-coach-current-state.md`
- `health-coach-food-templates.md`
- `health-coach-injury-history.md`
- `health-coach-do-not-repropose.md`

Until those exist, record significant decisions in dated coach-system docs and memory.

## Evaluation criteria

A manual rule is worth automating only if it satisfies all three:

1. It catches a real failure mode in Dylan's data/life.
2. It causes a concrete behavior or decision change.
3. It does not feel like spam, homework, or dashboard commentary.

If a rule only produces interesting analysis, do not automate it.

## Wednesday 36-hour fast handling

Use `2026-08-01-wednesday-36h-fast-protocol.md` as governing.

Delivery reminders:

- Tuesday evening: confirm last calories by ~8 PM and electrolytes available.
- Wednesday: zero calories is the target; hydration/electrolytes are the coaching focus.
- Wednesday workout: keep mobility/arms light/moderate; optional cardio only if energy is good.
- Thursday morning: break fast protein-forward and GI-friendly; avoid rebound/high-fat first meal.

Electrolyte prompt if needed:

> Wednesday is a true fast, so the job is hydration/electrolytes, not protein. Use water + zero-cal electrolytes in the morning, then repeat midday/afternoon if headache, lightheadedness, cramps, or unusual fatigue show up. Don’t chug salt water; spread it out.

## Next loop

The durable coach memory files now exist. Next: run the first manual weekly checkpoint using this playbook.
