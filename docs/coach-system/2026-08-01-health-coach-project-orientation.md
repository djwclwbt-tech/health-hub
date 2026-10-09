# Health Coach Project Orientation — 2026-08-01

Status: orientation/stabilization doc after Dylan flagged that the project was drifting and feeling like a restart.
Purpose: preserve yesterday's momentum, explain the current foundation plainly, and define how Dylan can work with Claw/Health Coach without needing to understand OpenClaw internals.

## Not starting from zero

We are not restarting.

Yesterday created real foundation:

1. Canonical full context handoff imported from Claude Health/Nutrition.
   - File: `2026-07-31-health-coach-full-context-handoff.md`
   - Role: current best source of truth for Dylan's health/coaching context.

2. Health Coach brainstorm captured.
   - File: `2026-07-31-health-coach-brainstorm.md`
   - Role: product/coaching direction. Health Hub is the vehicle/data layer; the coach is the operating brain; Dylan is the output.

3. Canonical use cases emerged.
   - Lower-body/SI flare example: app row looked incomplete, real-world meaning was pain adaptation + decompression + time constraint.
   - Conversational nutrition capture: blank nutrition can become usable data from Dylan's description.
   - Habitual eating: repeated meals/orders should become a data-quality advantage.

4. A first loop attempt happened.
   - File: `2026-07-31-health-coach-loop-scope-pass.md`
   - Status: useful as a data-hygiene/writeback slice, but too narrow as the core project framing.

5. Corrections on Aug 1 clarified the next layer.
   - Interpretation loop was written, then recentered.
   - Baseline analysis loop was written.
   - These are not wasted; they show the phase boundary and what must come before coaching.

The actual issue was not lack of work. The issue was Claw losing phase discipline and trying to turn use cases into final architecture too quickly.

## Current project phase

We are in:

> Foundation and operating-model design for a dedicated Health Coach agent.

We are not yet in:

- active coaching
- app feature implementation
- notification scheduling
- autonomous writebacks
- UI redesign
- daily/weekly adjustment automation

## Current north star

The product is Dylan's outcome, not Health Hub.

Health Hub = instrumentation, logs, source data, app surface.

Health Coach = dedicated reasoning/interpretation/adaptation system.

Dylan = output.

Success means the coach helps Dylan's body, recovery, adherence, training, injury management, and decision quality improve over time.

## What the foundation must establish

Before building the coach agent, we need a foundation that answers:

1. What does the coach know?
2. What sources does it trust?
3. What data can it read directly?
4. What data is missing, stale, or conflicted?
5. What decisions can it make by itself?
6. What decisions require Dylan approval?
7. How should Dylan talk to Coach?
8. How should Coach talk to Dylan?
9. When should Coach stay silent?
10. What should be remembered between sessions?
11. How do we prevent source-of-truth drift?
12. How do we safely move from manual coaching to automation?

## The simple mental model for Dylan

Dylan does not need to know OpenClaw.

He can treat this as three layers:

### 1. Claw

General assistant/project operator.

Use Claw for:

- building the system
- reading docs/data
- organizing project context
- writing handoffs
- editing Health Hub code/docs
- explaining how to work with the system

### 2. Health Coach

Dedicated health outcome brain.

Future use:

- interpret training/nutrition/recovery data
- notice patterns
- ask only necessary questions
- give concise prescriptions
- remember what worked/failed
- protect Dylan from blind spots

### 3. Health Hub

App/data layer.

Use Health Hub for:

- workouts
- nutrition
- weight
- steps
- recovery
- habits
- cardio
- logs and data collection

## How Dylan should hand things to Claw/Coach

Dylan does not need perfect prompts.

Useful input can be messy. The system's job is to structure it.

Good handoff types:

### 1. Full context handoff

Use when importing from another project/session.

Say:

> Here is the current handoff. Ingest it, identify governing facts, conflicts, open questions, and what it changes.

### 2. Use case

Use when explaining what the coach should eventually handle.

Say:

> Here is a real example. Don't build yet. Use this to sharpen the model.

Example:

> The app says I skipped most lower body, but reality was SI flare, decompression, leg press/curls, and incline walk.

### 3. Correction

Use when Claw/Coach is off track.

Say:

> Recenter. The actual point is X, not Y. Update the project frame before continuing.

### 4. Data interpretation request

Use later, once baseline exists.

Say:

> Interpret today's data against the current coach baseline. Tell me what matters and what changes.

### 5. Build request

Use only once the foundation is settled.

Say:

> Turn the approved coach foundation into an implementation plan. Do not code yet.

## How Claw should respond when Dylan gives a use case

Do not immediately build.

Correct response pattern:

1. Identify what the use case teaches about the coach.
2. Add it to the model.
3. Identify what system requirement it implies.
4. Identify whether it changes the foundation.
5. Only propose a build step if Dylan asks or the foundation is ready.

Example:

Dylan says:

> I can describe food better than I can log it across five apps.

Claw should infer:

- Coach must accept messy narrative intake.
- Coach must estimate with confidence.
- Coach must ask only material missing details.
- Coach must preserve data quality without forcing Dylan through logging friction.
- This is a capability requirement, not immediately an app feature.

## Current canonical docs order

Read in this order:

1. `2026-08-01-health-coach-project-orientation.md`
   - This file. Project map and how to work together.

2. `2026-07-31-health-coach-full-context-handoff.md`
   - Governing health/project context.

3. `2026-07-31-health-coach-brainstorm.md`
   - Product/coaching vision and use cases.

4. `2026-08-01-health-coach-baseline-analysis-loop.md`
   - How to establish the starting model from handoff + data before coaching/building.

5. `2026-08-01-health-coach-interpretation-loop.md`
   - Later daily/weekly interpretation pattern; useful but not the current build phase.

6. `2026-07-31-health-coach-loop-scope-pass.md`
   - Narrow data hygiene/writeback slice; useful later, not governing.

## What happened in the drift

Dylan was providing use cases to solidify the picture.

Claw misread those use cases as requests to define an immediate loop or begin coaching.

That caused three bad moves:

1. Turning examples into premature architecture.
2. Over-centering fat loss mechanics.
3. Talking about restarting from ground zero when the correct move was to preserve yesterday's foundation and add phase clarity.

Correction:

- Preserve yesterday's foundation.
- Treat use cases as model-sharpening inputs.
- Define the Health Coach agent foundation before coaching/building.
- Give Dylan simple ways to hand material over without requiring OpenClaw knowledge.

## Next recommended objective

Create the actual Health Coach foundation spec.

It should define:

1. Agent role and boundaries
2. Source-of-truth hierarchy
3. Required context/memory files
4. What data the coach reads
5. What the coach is allowed to write/propose
6. Human approval rules
7. Communication style
8. Silence/proactivity rules
9. Baseline analysis process
10. Future coaching loop process
11. Initial manual operating mode
12. Later automation path

Do this before any code or active coaching.
