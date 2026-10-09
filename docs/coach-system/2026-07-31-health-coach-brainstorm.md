# Health Coach System Brainstorm — 2026-07-31

Status: raw product/coaching notes, not an implementation plan.
Purpose: preserve Dylan's direction before any build work.

## Core realization

Health Hub's foundation and design are solid. The goal is not to rebuild the app. The goal is to repurpose Health Hub as the vehicle for a dedicated, proactive personal health coaching system.

The output is not the app. The output is Dylan's body, performance, adherence, and results at the end of the programmed block.

This mirrors the Fluidez Spanish app lesson: the visible app is not the product. The user's developed ability is the product.

## Separation of roles

### General Claw

- Handles life, projects, coding, research, errands, general chat, Health Hub implementation work when asked.
- Can be consulted by the Health Coach agent when historical context or broader help is needed.

### Dedicated Health Coach agent/session

A persistent, primed coach context focused only on Dylan's health outcomes.

It should have full health context and Health Hub access, but should not waste attention on casual/general conversations unless they affect:

- training
- recovery
- nutrition
- adherence
- pain/injury risk
- schedule constraints
- sleep/stress
- weekly trend decisions

Rule of thumb: if a message does not change Dylan's training, recovery, nutrition, adherence, pain, schedule, or weekly trend, Health Coach ignores it.

## Why a separate persistent coach context is likely needed

Dylan does not want to have to make the system proactive. If it relies on Dylan initiating every check-in, it fails.

A dedicated agent/session gives the coach:

- stable context
- lower noise
- a narrow outcome mandate
- persistent coaching memory
- scheduled analysis loops
- permissioned Health Hub read/write paths
- a place to maintain program, cue, food, adherence, and injury models

This does not require a totally separate assistant identity. It likely requires a dedicated Health Coach agent/session with its own instructions, state, schedules, and documentation.

## Coaching philosophy

No good trainer fits the person to the program. The system should fit the program to Dylan.

Health Coach should preserve the goal while adapting the path.

Adherence beats optimal. The system should restructure around Dylan's real life, not repeat advice that has already failed.

The coach should be direct, concise, data-aware, and prescriptive. Not generic, not chatty, not questionnaire-driven.

## What successful trainer behavior implies for this system

The strongest traits to model:

- Individualization: adjust the plan based on Dylan's actual performance, sleep, soreness, pain, schedule, and adherence.
- Pattern recognition: notice trends before Dylan does.
- Meaningful feedback: explain what changed and what to do next.
- Supportive accountability: Dylan should feel that a competent coach is watching the process.
- Real-world constraint solving: fast food, Costco/Sam's, cooking friction, weekend history, time pressure, GI health, gym availability.
- Listening and adjustment: when Dylan reports something does not survive his life, adapt the math and structure.
- Technical coaching: exercise selection, progression, form checks, mind-muscle cues, injury risk flags.

## Anti-patterns

Avoid:

- more spam texts
- canned daily questionnaires
- check-the-box prompts that do not affect decisions
- generic fitness advice
- motivational fluff
- long option lists
- asking questions already answerable from Health Hub/history
- fitting Dylan to the spreadsheet
- changing the app foundation before the coach system is defined

## Proactivity model

The system should be proactive, but not noisy.

Preferred intervention types:

1. Cue before action.
2. Analyze after data.
3. Interrupt when risk or opportunity is real.
4. Do weekly strategic adjustment.

Not every scheduled check has to produce a user-facing message. Most checks should run silently unless there is something actionable.

## Core coaching loops

### Morning state review

Inputs:

- weight/trend
- Oura/recovery/sleep
- planned lift/cardio/steps
- yesterday's nutrition/adherence
- soreness/pain flags

Outputs:

- concise daily plan only if useful
- adjustments to cardio/training stress if recovery or trend warrants it
- nutrition emphasis if deficits/protein/adherence are off

### Pre-lift cue

One focused cue, not a questionnaire.

Examples:

- Bench: scapula pinned, sternum high, elbows ~45°, press through chest rather than front delts.
- Squat: brace before descent, ribs stacked over pelvis, stop chasing depth if PSIS/lower back talks.
- RDL: hips back, lats locked, hamstrings loaded, no lower-back stretch hunting.

Dylan likes mind-muscle connection when it is done right, so cueing should be specific and session-relevant.

### Post-lift analysis

Triggered by Health Hub workout log or Dylan reporting actuals.

Analyze:

- load/reps/RIR
- progression success/failure
- volume drop-off
- pain/body notes
- sleep/recovery context
- whether next exposure should progress, hold, swap, deload, or reduce volume/cardio

Ask follow-up only when the answer changes the decision.

### Pain/body-feel adaptation

If Dylan reports lower back, PSIS, psoas, SI, shoulder, elbow, or other issues:

- classify severity and pattern only as needed
- adapt today's movement selection
- update mobility prescription
- decide if progression is held
- log/retain the cue or warning for next similar session

Example:

> Your squat performance dropped two weeks in a row and PSIS/lower-back notes increased. Today: no back squat. Use leg press and leg extension to keep quad stimulus, remove axial fatigue, add left-priority hip reset, report tomorrow.

Correction from imported Claude handoff: hack squats are permanently removed and should not be suggested.

Note: exercise suggestions must respect Dylan's actual gym/equipment and known exclusions.

### Nutrition adherence loop

The coach should use current daily totals and Dylan's known patterns.

Examples:

- protein short late day: give realistic meals Dylan actually uses
- fast food: official nutrition first, fit against today's totals and cut plan
- weekends: do not re-propose structures already known to fail
- grocery support: Costco/Sam's planning to prevent outside eating
- cooking friction: choose adherence-preserving defaults, not perfect meal prep fantasy

### Weekly adjustment loop

Review:

- weight trend
- lift trend
- adherence
- recovery
- steps/cardio
- pain flags
- hunger/GI issues
- upcoming social/schedule constraints

Decide:

- stay the course
- audit logging before changing physiology assumptions
- adjust calories/cardio/training stress
- deload/recovery emphasis
- grocery/meal structure changes

## Health Hub's role

Health Hub should remain the instrument panel, logging surface, data layer, and coach record. It does not need to become the whole coach brain.

Potential coach-facing records/surfaces:

- current lift cue
- known form issue
- pain watch
- next session adjustment
- progression decision
- food preference library
- adherence risk notes
- weekly coach verdict
- decision log: what changed, why, and when

## Video form checks

This is likely essential if the system is serious.

Flow:

1. Dylan submits video in chat.
2. Coach evaluates against known cues and lift-specific checklist.
3. Coach gives 1–2 fixes max.
4. Coach updates personal cue library.
5. Coach flags risk patterns for future sessions.

Priority lifts/movements:

- squat
- deadlift
- RDL
- bench
- Bulgarian split squat
- cable fly/pressing mechanics

Potential flags:

- lumbar extension/flexion compensation
- hip shift
- bar path drift
- scapular position loss
- knee cave
- depth/range compensation
- loading the joint instead of the target muscle

## Existing Claude project instructions as baseline

Dylan has a detailed Claude project instruction doc titled:

`DYLAN — AI COACH INSTRUCTIONS · SUMMER CUT v2`

It covers:

- role: combined fitness coach, strength programming advisor, nutritionist
- Dylan profile and goal: Summer cut, sub-180 by Aug 30
- Planet Fitness/home equipment
- Oura/Apple Watch/Cronometer/Health Hub context
- wife Danielle's nutrition context
- chronic left psoas/anterior pelvic tilt/SI risk context
- current 5-day upper/lower program with anchor lifts
- known Health Hub anchor-lift seed bug
- cardio/steps structure
- nutrition targets and weekend/social protocols
- supplements and timing
- iOS Reminder system
- weekly rhythm
- autoregulation rules
- open items

This doc is useful as the coach constitution, but it is static. The Health Coach agent must turn it into an active operating loop.

## Chat/history import question

Dylan asked whether prior Health Hub/Kloc chats can be imported so the coach starts with the full foundation.

Initial answer: likely yes, but not by dumping every giant chat directly into the active prompt.

Better ingestion approach:

1. Export or collect all relevant chats/transcripts/files.
2. Store raw exports outside the active prompt, probably under a private ignored folder.
3. Run a summarization pass to extract durable coaching facts, decisions, corrections, failed approaches, preferences, pain history, food patterns, and program changes.
4. Produce curated artifacts:
   - coach baseline profile
   - decision log
   - program history
   - nutrition preference/adherence history
   - injury/body-feel history
   - form/cue library
   - unresolved/open items
5. Give Health Coach retrieval access to the raw archive when needed, but keep its normal context small and curated.

Important: giant chat imports need privacy handling and deduplication. The useful output is not the raw pile. The useful output is distilled coaching memory plus searchable source archive.

## Candidate documentation artifacts to create later

- `docs/coach-system/health-coach-agent-spec.md`
- `docs/coach-system/coach-operating-loops.md`
- `docs/coach-system/coach-memory-model.md`
- `docs/coach-system/chat-import-plan.md`
- `docs/coach-system/form-check-protocol.md`
- `docs/coach-system/nutrition-adherence-protocol.md`
- `docs/coach-system/weekly-adjustment-protocol.md`
- `docs/coach-system/health-hub-writeback-policy.md`

## Open questions for later

- What exact authority can Health Coach have without explicit approval?
- Which messages should be proactive vs silent analysis?
- Should Health Coach write directly to Health Hub, queue updates for approval, or both by category?
- How should video submissions be stored and referenced?
- What is the minimum Health Hub schema/support needed for coach memory without redesigning the app?
- What is the best way to ingest Claude/Kloc chat exports securely and practically?

## Canonical thesis example — 2026-07-31 lower-body session

Dylan identified 2026-07-31 as the perfect example of why Health Coach needs live coaching/debrief context, not just backend workout rows.

What backend/app data may show:

- incomplete lower-body workout
- back squat swapped to leg press
- several sets not marked complete
- session ended with cardio

What actually happened, per Dylan voice memo:

- lower back was flaring and bothering him
- he spent meaningful time stretching and trying to loosen it up
- he did dead hangs
- he performed a few leg presses
- he did hamstring/leg curls
- he ran out of time
- he still completed 20 minutes of incline treadmill walking

Coach interpretation:

This is not simply an incomplete workout. It is a pain-adapted session with useful signals:

- lower-back/SI flare affected training execution
- loaded squat pattern was avoided/substituted
- Dylan self-selected mobility/decompression work
- posterior-chain/leg work was reduced by time and symptoms
- cardio was still completed
- next-session hinge/squat decisions should be gated by symptom status, not by the app's completion percentage alone

Product implication:

Health Hub rows alone can lose the most important coaching signal. The Health Coach needs a post-session debrief loop that captures why the workout diverged, what pain/body-feel signals appeared, what Dylan substituted, and what decision that implies for the next exposure.

Design requirement:

When workout data shows incomplete sets, swaps, unusual volume drops, or pain-risk exercises affected, Health Coach should not classify the session blindly. It should ask one decision-relevant follow-up or prompt a short voice debrief, then store the interpretation as a coach note/decision.

## Health Coach reasoning loop — parse, interpret, challenge, decide

Dylan proposed a loop for getting more value out of Health Hub data and brainstorms instead of jumping straight from raw data to action.

Working name: **Parse → Interpret → Brainstorm → Devil's Advocate → Decide → Record → Repeat**

### 1. Parse

Collect the raw signals without judgment.

Examples:

- workout rows
- completed vs incomplete sets
- exercise swaps
- load/reps/RIR
- steps/cardio
- Oura/recovery/sleep
- weight trend
- nutrition totals
- Dylan voice debrief
- pain/body-feel notes
- schedule constraints

Output: factual summary of what happened.

### 2. Interpret

Convert raw facts into coach meaning.

Example:

- Raw: incomplete lower workout, squat swapped to leg press.
- Interpretation: lower-back flare drove a pain-adapted session; not a motivation failure.

Output: one clear read of the situation.

### 3. Brainstorm

Generate possible coaching responses.

Examples:

- hold next squat exposure
- swap hinge to RDL
- reduce axial loading
- add decompression/mobility
- preserve cardio
- ask for one symptom status check Monday

Output: candidate responses, not yet accepted.

### 4. Devil's Advocate

Challenge the interpretation and proposed responses.

Questions:

- Are we overreacting to one bad day?
- Are we underreacting to injury risk?
- Does the data support this or are we filling gaps with story?
- Is this advice practical for Dylan's actual life/gym/time?
- Is this repeating a failed approach?
- What would a good human coach notice that the app misses?

Output: risks, objections, and missing information.

### 5. Decide / Agree

Make the coaching call.

Rules:

- direct prescription, not options-menu coaching
- ask only one question if the answer changes the decision
- otherwise decide based on available evidence
- distinguish between temporary session modification and program-level change

Output: the actual coaching decision.

### 6. Record

Store the decision and rationale so the next loop starts smarter.

Potential records:

- coach note attached to date/session
- next-session adjustment
- pain watch
- current cue
- decision log entry
- open question

Output: durable memory, not just chat.

### 7. Repeat

The next loop starts from the recorded decision plus new data.

This creates compounding coaching intelligence: each session refines the model instead of disappearing into chat.

## Loop variants

### Fast loop: same-day coaching

Use when something happened today and a decision is needed soon.

1. Parse today's data.
2. Interpret abnormal signal.
3. Ask one missing question if needed.
4. Decide next action.
5. Record note.

### Deep loop: weekly/block steering

Use weekly or at checkpoints.

1. Parse seven-day trend.
2. Interpret adherence/performance/recovery pattern.
3. Brainstorm adjustment candidates.
4. Devil's advocate against overfitting/noise.
5. Decide stay-course vs adjust.
6. Record the block decision.

### Product loop: building Health Coach itself

Use when designing the system.

1. Parse Dylan's ideas and current docs/data.
2. Interpret the actual underlying need.
3. Brainstorm implementation/operating approaches.
4. Devil's advocate risks, privacy, spam, complexity, failure modes.
5. Agree on the smallest useful loop.
6. Record spec/handoff.
7. Build only after the loop is clear.

## Why this matters

Health Coach should not blindly react to data, and Claw should not blindly implement ideas. The loop forces structured thinking while still keeping Dylan out of project-manager burden.

The goal is not bureaucracy. The goal is making the coach act more like a good human trainer: observe, infer, challenge, decide, remember.

## Teaching layer while building Health Coach

Dylan wants Claw to teach the process while we build this project, not just execute silently.

This connects to Dylan's broader AI curriculum and work use of Claude Code, but Dylan is not an engineer and does not write code. Dylan builds sales tools for work. Do not conflate building/operator ownership of sales tools with being responsible for software engineering.

The Health Coach project should double as a practical education track in AI-assisted product/system thinking for a non-engineer sales-tools builder/operator: how to shape ideas, spot gaps, manage loops, review outputs, and direct AI systems well.

Teaching goals:

- explain why we are building each piece
- explain how loops work and why they matter
- show how to design a loop from an idea to a reliable operating system
- teach transferable practices for directing AI tools at work without requiring Dylan to become an engineer
- use the live Health Coach build as the example, not abstract lectures

Preferred delivery:

- concise teaching moments during the work
- practical, tied to the current decision
- not long generic lessons
- show the pattern: what we are doing, why, what mistake it prevents, how Dylan can reuse it

Example teaching frame:

1. Concept: what is the systems idea?
2. Why it matters here.
3. What failure it prevents.
4. How we are applying it now.
5. How Dylan can reuse it in Claude Code/work.

Initial curriculum topic: **thinking loops**

A thinking loop is a repeatable process that turns messy inputs into better decisions over time. For Health Coach, the loop is Parse → Interpret → Brainstorm → Devil's Advocate → Decide → Record → Repeat. For Dylan's work/AI use, the same structure maps to context → desired outcome → possible approaches → risk/gap review → decision → verification/documentation → next iteration. The goal is better AI direction and project judgment, not making Dylan write code.

## Apple Watch sleep-data note

Dylan has been wearing his Apple Watch at night, so some sleep/recovery information may exist in Apple Health even when Oura data is missing or imperfect.

Notes:

- Apple Watch Series 7 sleep analysis is not as strong as Oura, but it may still provide useful backup sleep duration/timing data.
- If needed, Dylan can provide Apple Health screenshots or exports.
- Health Coach should treat Oura as primary when available, but Apple Health/Watch data can fill gaps.
- Future integration question: whether Apple Health sleep data can be synced into Health Hub or manually captured through screenshot/import workflow.

## Canonical use case — conversational nutrition capture

Dylan identified another high-value Health Coach use case: days where no calories are built/entered yet, but Dylan can describe what he ate well enough for a useful estimate.

Problem:

- Logging accurately across platforms can take 4–5 steps.
- Dylan often will not do that friction-heavy workflow.
- If the system waits for perfect Cronometer entry, the day may stay blank and the coach loses nutrition signal.

Desired loop:

1. Dylan sends a short voice/text food description.
2. Health Coach parses meals, portions, brands/restaurants, cooking method, modifiers, and uncertainty.
3. Coach estimates calories/protein/carbs/fat with confidence level.
4. Coach asks only for missing details that materially change the estimate.
5. Coach shows the proposed entry and running daily total.
6. Dylan approves.
7. Coach writes/queues the entry to Health Hub, and possibly later reconciles with Cronometer if needed.

Rules:

- For restaurant/fast-food, official nutrition data first; do not silently estimate when official data is needed.
- For home/known foods, use Dylan's known products/preferences where available.
- Mark uncertainty honestly.
- Prefer useful estimate over blank day when the alternative is no logging.
- Do not require Dylan to do multiple app/platform steps when one coached conversation can capture enough signal.

Product implication:

Health Coach should reduce nutrition logging friction by turning natural-language meal recall into structured macro entries with approval. This supports adherence and preserves coach visibility on imperfect days.

## Habitual eating as a data-quality advantage

Dylan clarified that he is a habitual eater, especially when out and about. This should be treated as a coaching/data-quality advantage, not merely a feature request.

Use case:

- Dylan often repeats the same meals, restaurants, fast-food orders, drinks, snacks, and convenience foods.
- If Health Coach captures and validates those repeat patterns once, future logging can become faster and more accurate.
- The point is not app feature scoping yet. The point is improving data quality, tracking, and correction of bad behavior in an easy-to-meet way.

Coaching implication:

Health Coach should build a practical memory of Dylan's repeat meals/orders and use it to:

- estimate faster from short descriptions
- reduce repeated macro research
- detect when a normal order has changed
- suggest known-good defaults when Dylan is out
- preserve nutrition visibility on days that would otherwise go blank
- correct drift early when habitual choices are hurting the cut

Examples:

- "usual Potbelly order" should resolve to a known macro template if already validated.
- "Costco chicken bites + Nurri" should use Dylan's known products.
- "same taco order as last time" should retrieve prior estimate/source rather than restarting.
- If Dylan describes a repeated but unvalidated meal, Health Coach should validate it once, then store it as a repeat pattern.

Rules:

- Do not turn this into feature scoping/app building yet.
- Treat it as a data-quality and adherence loop.
- Official restaurant data still governs eating-out estimates.
- Known home/product meals can use saved templates with honest uncertainty.
- The goal is an easier path to accurate-enough tracking and faster correction of bad behavior.
