# Health Coach Next Loop Handoff — 2026-08-01

Status: handoff for continuing the loop without restarting or waiting on Dylan to manage context.

## Current phase

Manual foundation mode for Health Coach.

Do not build app features yet.
Do not start active daily coaching yet.
Do not ask Dylan broad clarifying questions unless truly blocking.

## North star

Dylan is the output: Summer Cut v2 performance, adherence, recovery, injury management, and outcome.

## Read first

1. `2026-08-01-health-coach-project-orientation.md`
2. `2026-08-01-health-coach-foundation-spec.md`
3. `2026-08-01-health-coach-manual-operating-playbook.md`
4. `2026-08-01-wednesday-36h-fast-protocol.md`
5. `2026-08-01-manual-weekly-checkpoint.md`
6. `health-coach-current-state.md`
7. `health-coach-decision-log.md`
8. `health-coach-do-not-repropose.md`
9. `health-coach-injury-history.md`
10. `health-coach-food-templates.md`
11. `2026-07-31-health-coach-full-context-handoff.md` if deeper context is needed
12. `2026-08-01-cut-delivery-system-brainstorm.md` if reviewing the data-backed rationale

## What was just completed

- Delivery-system brainstorm from handoff + live Health Hub data.
- Focused audits for nutrition/adherence, training/SI/recovery, and operating model.
- Foundation spec created.
- Manual operating playbook created.
- Durable coach memory files scaffolded.
- Wednesday changed to a true 36-hour fast; Health Hub `wednesdayCal` verified at 0.
- First manual weekly checkpoint completed and recorded.
- README updated to make these canonical.

## Key findings

- Cut still reachable; latest live trend around ~184.5 average.
- Nutrition visibility is the biggest control-system issue.
- Logged calories are often already low; do not cut calories first.
- Protein is good but not consistently at target.
- Weekday steps can work; weekend NEAT craters.
- Sleep is short despite acceptable readiness.
- SI flare/source drift makes lower-body programming risky unless gated.
- App/program rows need interpretation and may be stale/conflicted.

## Current delivery rules to test manually

1. Nutrition visibility rule
2. Protein closeout rule
3. Weekend movement rescue rule
4. Abnormal workout debrief rule
5. SI gate rule
6. Short-sleep modifier rule
7. Weekly checkpoint rule

## Next recommended loop

Run the next manual daily scan / weekend movement rescue using `2026-08-01-health-coach-manual-operating-playbook.md`.

Current checkpoint verdict:

```md
Verdict: The week's limiting factor was data/adherence visibility, not proven metabolic stall.
Action: Do not lower baseline calories yet. Run the Wednesday 36-hour fast with electrolytes, improve rough nutrition capture on non-fast days, and rescue weekend steps.
Watch: Reassess after 7 cleaner days under the new structure.
```

Today-specific action from the checkpoint:

- Weekend movement rescue rule is active.
- If Aug 1 steps remain low later today, prompt one concrete movement block to keep the day out of the 2-5k danger zone.

Do not produce a broad coaching audit to Dylan unless asked. The immediate goal is to prove the manual loop structure.

## Suggested next prompt

Continue the Health Coach loop from `/home/dwrzl/health-hub/docs/coach-system/2026-08-01-health-coach-next-loop-handoff.md`. Run the next manual scan using the playbook and live Health Hub data. Do not build app features. Produce one limiting factor, one action if needed, one watch trigger, and update the coach memory files.
