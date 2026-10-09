# Health Coach Loop Scope Pass — 2026-07-31

Status: scoped brainstorming pass, not implementation plan.
Purpose: use the Health Coach reasoning loop on live Health Hub data and current handoff context, while preventing drift and over-engineering.

## Guardrails

- Do not redesign Health Hub right now.
- Do not start with a feature list.
- Scope around data quality, tracking adherence, and fast correction of bad behavior.
- Start with the smallest useful coach loop that can work with today's actual data and Dylan's real behavior.
- Health Hub remains the data/logging source; the coach is the interpretation and decision layer.
- Ask only questions whose answers change a decision.
- Direct prescriptions, not options menus.
- Record decisions so the next loop starts smarter.

## Source context referenced

- `2026-07-31-health-coach-full-context-handoff.md`
- `2026-07-31-health-coach-brainstorm.md`
- live Health Hub data pulled 2026-07-31

## Live data snapshot used

From Health Hub `today` and recent summaries:

- Date: 2026-07-31
- Weight: 184.0 lb
- Recovery/readiness: 80
- HRV: 88
- RHR: 39
- Sleep: 6.46h
- Steps: 15,085 — step floor hit
- Nutrition: blank / no calories entered for today
- Workout: Friday Lower B, 52 min
  - Back squat was swapped to leg press
  - Leg press completed: 205 x 10, 205 x 9; third set unmarked
  - RDL, leg extension, Bulgarian split squat, seated calf sets unmarked/prefilled
- Recent nutrition:
  - 2026-07-30: 1,257 cal / 159.6g protein
  - 2026-07-29: 1,890 cal / 185g protein
  - 2026-07-28: 1,731 cal / 182.7g protein
  - 2026-07-27: 1,739 cal / 186.6g protein
- Targets from Health Hub settings: 2,000 cal, 200g protein, 15,000 steps, 8h sleep

Critical handoff constraints:

- Active SI/lower-back flare as of Jul 31.
- No loaded squatting until resolved.
- Tuesday hinge work is gated by Monday status.
- Hack squats permanently removed.
- Cronometer/Health Hub nutrition can go blank when logging friction is high.
- Weekends are high-risk; logging is mandatory but should be low-friction.

## Loop run: Parse → Interpret → Brainstorm → Devil's Advocate → Decide → Record → Repeat

### 1. Parse

Today's raw signals show two high-value abnormalities:

1. Training row anomaly
   - Friday lower session appears incomplete.
   - Squat was swapped out.
   - Most lower-body accessory work is unmarked.
   - Session still lasted 52 minutes.
   - Dylan previously clarified the real reason: lower-back/SI flare, stretching/decompression/dead hangs, leg press/curls, time limit, and incline walking.

2. Nutrition capture gap
   - No calories are entered today.
   - Dylan says he can describe intake well enough for a useful estimate.
   - He does not want the 4–5 step manual cross-platform workflow.
   - Dylan is a habitual eater, so repeat meals/orders can become reusable nutrition shorthand.

### 2. Interpret

This is not primarily an app problem. It is a coach-visibility problem.

The app captures structured rows, but the coach needs the missing meaning:

- Training: incomplete lower workout = pain-adapted session, not laziness or simple noncompliance.
- Nutrition: blank day = capture-friction failure, not necessarily diet failure.
- Habitual eating: repeated foods are a data-quality advantage if validated once and reused.

The first useful Health Coach loop should therefore focus on turning messy or missing daily signal into a structured coach note and one concrete next action.

### 3. Brainstorm candidate loops

Candidate A — Abnormal workout debrief loop

Trigger:

- workout has major swap, many incomplete sets, unusual duration/volume drop, or pain-risk exercise affected

Coach action:

- parse workout row
- ask for one short debrief if needed
- classify the session
- decide next-session adjustment
- record pain flag / program decision

Value:

- prevents optimizing fiction
- catches injury/deviation early
- directly addresses the July 31 coaching failure

Candidate B — Conversational nutrition capture loop

Trigger:

- calories blank or obviously incomplete by evening
- Dylan says he can describe intake

Coach action:

- accept voice/text description
- estimate cal/P/C/F/fiber with confidence
- ask only material missing question if needed
- show proposed entry and running total
- write/queue to Health Hub after approval
- save reusable meal patterns when repeated/validated

Value:

- turns blank days into useful data
- reduces logging friction
- improves adherence without spam
- supports weekend/social-day recovery

Candidate C — Daily coach verdict loop

Trigger:

- end of day or next morning

Coach action:

- combine training, steps, recovery, nutrition, pain notes
- produce one verdict and one prescription

Value:

- simple daily accountability
- risks becoming too broad/noisy if built first

Candidate D — Weekly/block steering loop

Trigger:

- weekly checkpoint

Coach action:

- weight trend + lift trend + adherence + pain + recovery
- decide calorie/cardio/training changes

Value:

- important, but depends on reliable daily records

### 4. Devil's Advocate

Risks if we overbuild now:

- Building a new app surface before the loop is proven.
- Designing schemas around imagined future behavior instead of today's actual friction.
- Creating spammy daily check-ins that Dylan ignores.
- Trying to automate direct writes before approval/writeback rules are clear.
- Combining training, nutrition, weekly strategy, saved meals, proactive reminders, and program edits into one large feature.
- Mistaking "habitual eating memory" for a food database product.
- Treating estimates as exact and polluting the source of truth without confidence/source metadata.
- Forgetting restaurant rule: official nutrition first; no silent guesses.

Counterpoint:

- If we only design and never test, we recreate the same failure: the coach has concepts but no operating loop.
- The useful next step is a thin vertical slice that can be executed manually by Claw first, then later automated.

### 5. Decide: smallest useful scope

Build conceptually around one combined Phase 0 loop:

## Phase 0 — Manual Coach Capture Loop

Goal:

Turn one messy day into a useful coach record with minimal Dylan effort.

Trigger examples:

- workout row looks abnormal
- nutrition is blank/incomplete
- pain/deviation was mentioned
- high-risk weekend/social day

Inputs:

- Health Hub live data for the day
- current program handoff rules
- Dylan voice/text debrief only if needed
- known repeat meals/orders if available

Coach output:

1. Factual parse
2. Interpretation
3. One prescription
4. Proposed record/writeback
5. One approval gate if data will be written

Initial real-world test case:

- 2026-07-31
- Training anomaly: Lower B pain-adapted session
- Nutrition anomaly: blank calories, but Dylan can describe intake
- Recovery okay but sleep short; steps hit
- Active SI flare means Monday status and Tuesday hinge decision matter

Prescription for this test case:

- Record today's lower session as pain-adapted, not failed.
- Keep no-loaded-squatting rule active until symptoms resolve.
- Monday debrief must ask only: current left PSIS/lower-back status and whether symptoms appear on hinge/squat pattern.
- For nutrition, when Dylan returns, ask for a single rough food/drink description for today and estimate macros rather than leaving the day blank.

This is the first loop to prove before app-building.

### 6. Record model

Minimum record types needed before implementation:

1. Daily coach note
   - date
   - category: training / nutrition / recovery / adherence / injury
   - raw signal
   - interpretation
   - decision
   - next check
   - confidence
   - source

2. Repeat meal/order template
   - shorthand name
   - description
   - calories/protein/carbs/fat/fiber
   - source: official / label / Cronometer / estimate
   - confidence
   - last validated date
   - notes/modifiers

3. Next-session adjustment
   - date/session affected
   - decision: progress / hold / swap / reduce volume / ask status
   - reason
   - expiry condition

Do not build all three immediately. For Phase 0, a markdown decision log is enough.

### 7. Repeat

The next loop should start from the saved Phase 0 record, not from scratch.

After Dylan returns from the movie, the next useful interaction is not broad scoping. It is one concrete capture pass:

1. Ask Dylan to describe today's food/drink in one message.
2. Estimate macros and daily total.
3. Ask only one material follow-up if needed.
4. Present proposed nutrition record.
5. Separately preserve the training interpretation and Monday SI-status gate.

## Initial scope boundary

In scope now:

- Manual coach loop run by Claw
- Markdown decision records
- Food estimate approval before Health Hub write
- Repeat-meal shorthand captured as notes/templates
- One abnormal workout debrief pattern
- One nutrition-capture pattern

Not in scope yet:

- New Health Hub UI
- Dedicated database schema
- Fully autonomous proactive agent
- Direct Cronometer writes
- Multi-agent architecture
- Restaurant playbook buildout
- Weekly steering automation
- Program-edit automation

## Working title

**Health Coach Phase 0: Manual Loop Before Build**

The point is to prove the behavior before building the mechanism.
