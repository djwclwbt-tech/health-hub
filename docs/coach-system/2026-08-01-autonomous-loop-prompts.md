# Autonomous Health Coach / Health Hub Loop Prompts — 2026-08-01

Status: bounded autonomous loop design. Stop before building.

Purpose: run two separate persistent loops every 15 minutes for 4 cycles, each building on its own prior cycle and producing durable artifacts.

## Loop principles

- Each loop must build on prior loop output, not restart.
- Each cycle must end with: what was done, what changed, what should the next cycle inspect.
- Do not build app features.
- Do not make autonomous Health Hub writes unless Dylan explicitly authorizes that specific write.
- Do not spam Dylan with raw internal findings. Produce concise completion summaries only when useful.
- The product is Dylan's successful, sustained cut that matches him, not a dashboard or generic plan.

## Loop A — Health Coach Delivery-System Reasoning Loop

Persistent session key: `session:health-coach-delivery-loop`

Mission: design the Health Coach delivery system, not app features. Brainstorm, iterate, correlate data/trends, understand what must be included, and refine the manual operating model. Stop before implementation.

Cycle prompt template:

```md
You are running cycle {N}/4 of the Health Coach Delivery-System Reasoning Loop.

North star: Dylan's successful and sustained Summer Cut v2. The system should adapt to Dylan, not force Dylan to adapt to the system.

Do not build app features or code. Do not make Health Hub writes. This is reasoning/design only.

Read/update from:
- /home/dwrzl/health-hub/docs/coach-system/README.md
- /home/dwrzl/health-hub/docs/coach-system/2026-08-01-health-coach-project-orientation.md
- /home/dwrzl/health-hub/docs/coach-system/2026-08-01-health-coach-foundation-spec.md
- /home/dwrzl/health-hub/docs/coach-system/2026-08-01-health-coach-manual-operating-playbook.md
- /home/dwrzl/health-hub/docs/coach-system/2026-08-01-wednesday-36h-fast-protocol.md
- /home/dwrzl/health-hub/docs/coach-system/2026-08-01-manual-weekly-checkpoint.md
- /home/dwrzl/health-hub/docs/coach-system/health-coach-current-state.md
- /home/dwrzl/health-hub/docs/coach-system/health-coach-decision-log.md
- /home/dwrzl/health-hub/docs/coach-system/health-coach-do-not-repropose.md
- /home/dwrzl/health-hub/docs/coach-system/health-coach-injury-history.md
- /home/dwrzl/health-hub/docs/coach-system/health-coach-food-templates.md
- /home/dwrzl/health-hub/docs/coach-system/2026-08-01-visual-cue-inputs-note.md
- /home/dwrzl/health-hub/docs/coach-system/health-coach-delivery-loop-log.md if it exists

Use live data as needed via:
- python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py summary 14
- python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py recent 14
- python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py today
- python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py program

Cycle steps:

1. Parse latest context
   - Latest Dylan instruction wins.
   - Reconcile handoff truth, current docs, live Health Hub data, program/settings, and Dylan narrative.

2. Correlate data/trends
   - Weight trend, nutrition visibility, protein, Wednesday fast structure, weekend NEAT, cardio, sleep/recovery, workouts, SI status, app/source drift, and qualitative visual/cue observations when available.
   - Identify only correlations that change delivery-system design or coaching rules.

3. Brainstorm delivery-system requirements
   - What must Coach know?
   - What must Coach remember?
   - When should Coach speak vs stay silent?
   - What exact prompt/action should Coach deliver?
   - What should be recorded after each intervention?
   - What qualitative form/cue/body-comp observations are useful enough to remember as analysis inputs without turning them into premature features?

4. Devil's advocate
   - Is this spammy?
   - Is this dashboard commentary instead of behavior change?
   - Are we repeating failed advice?
   - Are we overfitting incomplete data?
   - Are we drifting into app features or automation too early?

5. Iterate the design
   - Refine one or two rules, memory artifacts, prompt templates, or decision criteria.
   - Prefer fewer, sharper changes.

6. Update durable artifacts
   - Append the cycle to /home/dwrzl/health-hub/docs/coach-system/health-coach-delivery-loop-log.md
   - If a rule/memory artifact clearly improves, update the relevant coach-system doc.
   - Do not overwrite major docs wholesale unless necessary.

7. End with this exact section:

## Cycle {N}/4 — What was done
- Read/checked:
- Data/trends correlated:
- Design change made:
- Open concern:
- Next cycle should inspect:
```

Success criteria:

- The delivery system gets sharper each cycle.
- No app building.
- No generic coaching fluff.
- Each cycle leaves a durable record and one specific next-cycle direction.
```

## Loop B — Health Hub Mobile UI QA / QoL / Functionality Loop

Persistent session key: `session:health-hub-ui-qa-loop`

Mission: interact with the actual Health Hub web/mobile UI like a user. Check quality, usability, friction, correctness, and functionality. Do not invent feature ideas. Do not redesign. Do not build.

Latest Dylan input: expect real functionality/QoL problems. The app feels clunky and like a non-technical-person-built app. The UI QA loop should not be timid or assume the app is fine; it should actively look for broken, awkward, confusing, slow, misleading, or high-friction flows while staying grounded in actual UI evidence.

Cycle prompt template:

```md
You are running cycle {N}/4 of the Health Hub Mobile UI QA / QoL / Functionality Loop.

Mission: use the actual Health Hub website/mobile app as Dylan would. This is QA/QoL/functionality checking, not feature discovery and not implementation. Dylan explicitly says the app is fairly clunky and likely has many functionality/improvement issues, so inspect assertively instead of politely assuming things are acceptable.

Do not build code. Do not edit app files. Do not make destructive or external writes. If login/auth or app access blocks you, document the blocker precisely.

Read/update from:
- /home/dwrzl/health-hub/docs/coach-system/README.md
- /home/dwrzl/health-hub/docs/coach-system/health-hub-ui-qa-loop-log.md if it exists
- /home/dwrzl/health-hub/docs/coach-system/2026-08-01-health-coach-foundation-spec.md for Health Hub vs Coach boundaries
- /home/dwrzl/health-hub/docs/coach-system/2026-08-01-wednesday-36h-fast-protocol.md for current Wednesday target expectations

Use live app/data context as needed:
- python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py today
- python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py program

Interact with the actual UI using available browser/Playwright tooling from the repo/workspace. Prefer mobile viewport. If no browser tool is exposed, use the existing Playwright/Chromium setup or document the missing access precisely.

Cycle steps:

1. Pick one app surface to inspect this cycle
   - Today dashboard
   - Nutrition/logging visibility
   - Workout/program view
   - Fast/Wednesday target display
   - Steps/cardio/recovery/habits
   - Mobile navigation/friction

2. Use the UI as a real user
   - Load the app.
   - Use mobile viewport.
   - Observe what is visible without developer assumptions.
   - Compare displayed state against Health Hub data when relevant.

3. Check functionality/QoL
   - Is the screen understandable to a real user without knowing the code?
   - Does it show the current truth?
   - Does it mislead Dylan?
   - Is there friction, clunkiness, or broken flow?
   - Are taps/inputs awkward, slow, hidden, or too easy to mis-hit on mobile?
   - Are values stale/conflicting?
   - Does mobile layout hide important controls or context?
   - Does it feel like a non-technical-person-built app because information architecture, state, copy, or interaction feedback is unclear?

4. Do not feature-hunt
   - Do not propose new dashboards or major features.
   - Only record issues that affect correctness, usability, logging, training/nutrition execution, or Dylan's ability to follow the cut.

5. Prioritize findings
   - P0: blocks use or corrupts/misleads data
   - P1: likely causes Dylan to make wrong decision or skip logging
   - P2: friction/confusion with realistic workaround
   - P3: polish only; record sparingly

6. Update durable artifact
   - Append cycle findings to /home/dwrzl/health-hub/docs/coach-system/health-hub-ui-qa-loop-log.md
   - Include exact page/surface, viewport/tool, observed behavior, expected behavior, severity, evidence, and suggested non-feature fix direction.
   - Do not edit app code.

7. End with this exact section:

## Cycle {N}/4 — What was done
- Surface inspected:
- UI/tool used:
- Findings:
- Highest severity:
- Open blocker:
- Next cycle should inspect:
```

Success criteria:

- Each cycle touches the actual UI or records a precise access blocker.
- Findings are about quality/functionality/QoL, not new features.
- Each cycle builds on previous QA findings.
- No code changes.
```

## Scheduling recommendation

Run both loops as separate persistent sessions every 15 minutes for 4 cycles:

- Cycle 1: immediate
- Cycle 2: +15 min
- Cycle 3: +30 min
- Cycle 4: +45 min

This is enough to get compounding iteration without letting the agents wander indefinitely.

After cycle 4, pause and summarize:

- What changed in the Health Coach delivery-system design.
- What UI/QoL/functionality issues were found.
- What should be approved before any build/code/app changes.
