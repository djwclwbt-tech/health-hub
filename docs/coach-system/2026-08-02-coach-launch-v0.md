# Coach Launch v0

Date: 2026-08-02

Status: launch design. Manual foundation mode. Not automation and not app implementation.

Discord pin: `#coach` message `1533609742394593522`.

## Goal

Launch Coach as a data-first onboarding and daily adaptation system.

Coach should review the dataset first, then ask only questions that change interpretation, rules, or next actions.

## Launch Sequence

1. Read canonical coach docs in order.
2. Import Claude/Health Hub chat history as private raw archive only when Dylan provides/approves it.
3. Summarize imports into curated baseline artifacts with source, confidence, and date.
4. Query live Health Hub data and reconcile against governing docs and app/program state.
5. Build the first Coach baseline.
6. Ask only post-review gap questions.
7. Run manual Coach v0 for seven days before automation.
8. Record every decision/change in durable coach memory files.
9. Automate only rules that prove useful and non-spammy.

## Baseline Fields

- Current block: goal, dates, target, success criteria.
- Source hierarchy and conflict rules.
- Body trend and confidence.
- Nutrition targets, blanks, partial days, repeated foods, Wednesday fast handling.
- Training plan vs actual execution.
- SI/psoas injury status, movement gates, forbidden movements.
- Steps/cardio weekday and weekend baselines.
- Recovery and sleep modifiers.
- Behavior/adherence failure modes.
- Reliable, partial, stale, and missing data streams.
- Approval boundaries.
- Open questions that change decisions.

## Manual Daily Adaptation Rules

- Nutrition visibility.
- Protein closeout.
- Weekend movement rescue.
- Abnormal workout debrief.
- SI/lower-body gate.
- Short-sleep modifier.
- Weekly checkpoint.

## Post-Review Questions

Ask only after data review:

- Is the SI flare still active today?
- What is the rough rundown for the last blank/partial nutrition day?
- Was a workout deviation pain, time, equipment, fatigue, deliberate swap, or app/logging weirdness?
- Which zero-cal electrolyte is available for the Wednesday fast?
- Which Claude/Kloc/Health Hub exports are available as text/markdown/json?
- Which raw imports are approved to store privately, and which summaries are safe to commit?
- Should Coach routine nudges stay inside existing check-in windows or get a separate schedule later?

## Approval Gates

- No Health Hub writes without explicit same-turn approval.
- No program/settings changes without approval and current symptom status.
- No nutrition writeback without cal/protein/carbs/fat, source, confidence, and Dylan confirmation.
- No raw private chat export commits unless Dylan approves.
- No automation until manual rules prove useful.

## Success Criteria

After seven days, Coach should know:

- what it can infer from data,
- what it must ask Dylan,
- which interventions changed behavior,
- which rules were annoying or useless,
- what should become automated,
- what must stay manual.
