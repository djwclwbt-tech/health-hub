# Health Coach Decision Log

## 2026-08-01 — Manual foundation mode first

Decision: Health Coach will start in manual foundation mode, not automation or active daily coaching.

Rationale:

- Dylan wants the coach delivery system engineered before app features.
- Current data already exposes useful signals, but source truth/log interpretation need reconciliation.
- Manual loops should prove which interventions change Dylan's behavior/cut outcome before automation.

Source docs:

- `2026-08-01-health-coach-foundation-spec.md`
- `2026-08-01-health-coach-manual-operating-playbook.md`

## 2026-08-01 — First delivery rules to test

Decision: Test these rules manually first:

1. Nutrition visibility rule
2. Protein closeout rule
3. Weekend movement rescue rule
4. Abnormal workout debrief rule
5. SI gate rule
6. Short-sleep modifier rule
7. Weekly checkpoint rule

Rationale:

These map to the strongest live-data failure modes: blank nutrition, weekend NEAT collapse, source drift, SI flare, short sleep, and premature adjustment risk.

## 2026-08-01 — Do not lower calories as first move

Decision: Do not make calorie reduction the first cut adjustment.

Rationale:

Recent logged days are already low-calorie and nutrition completeness is inconsistent. First move is visibility/protein/weekend NEAT, then trend reassessment.

## 2026-08-01 — SI override governs app/program state

Decision: Jul 31 SI flare override governs over live program state until resolved.

Rationale:

Program still includes Friday back squat and Tuesday deadlift, but handoff says no loaded squatting and hinge work gated by Monday status.

## 2026-08-01 — Wednesday becomes true 36-hour fast

Decision: Replace the prior Wednesday half-fast / 900-cal structure with a true 36-hour fast.

Schedule:

- Tuesday dinner ends ~7:30-8:00 PM.
- Wednesday is zero calories.
- Thursday break fast ~7:30-8:00 AM, adjusted if training/GI logistics require.

Health Hub action:

- Queued `wednesdayCal = 0` via `/api/update` on 2026-08-01.

Coach implications:

- Wednesday zero calories is intentional, not a nutrition visibility miss.
- Coach must provide electrolyte guidance.
- Protein closeout rules exclude Wednesday fast day.
- Thursday break-fast should be protein-forward and GI-friendly.

Source:

- Dylan explicit Telegram instruction 2026-08-01.
- `2026-08-01-wednesday-36h-fast-protocol.md`

## 2026-08-01 — First manual weekly checkpoint

Verdict: The week's limiting factor was data/adherence visibility, not proven metabolic stall.

Today’s live limiting factor: weekend NEAT pace.

Action:

- Do not lower baseline calories yet.
- Run the new Wednesday 36-hour fast with electrolytes.
- Treat Wednesday zero calories as intentional.
- Improve rough nutrition capture on non-fast days.
- Rescue weekend steps before they crater.

Watch:

- Reassess after 7 cleaner days under the new structure: Wednesday fast completed safely, non-fast nutrition visible, weekend steps rescued, and weight trend checked again.

Source:

- `2026-08-01-manual-weekly-checkpoint.md`
