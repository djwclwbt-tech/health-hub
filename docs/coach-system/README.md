# Health Coach System Docs

This folder contains planning and context for repurposing Health Hub into the vehicle for a dedicated proactive Health Coach.

## Canonical current-context docs

1. `2026-08-01-health-coach-project-orientation.md`
   - Start here. Stabilizes the project map after the Aug 1 drift.
   - Explains what was already built yesterday, the current phase, how Dylan can hand Claw/Coach information without knowing OpenClaw, and why this is not a restart from zero.

2. `2026-07-31-health-coach-full-context-handoff.md`
   - Imported from Dylan's Claude Health/Nutrition project on 2026-07-31.
   - Treat as the strongest single source for historical background, current cut rules, decisions, failed approaches, and open items.
   - Where this conflicts with older Health Hub or cut docs, use the most recent explicit Dylan instruction and then this handoff.

3. `2026-07-31-health-coach-brainstorm.md`
   - Claw/Dylan brainstorm from 2026-07-31 about the dedicated Health Coach agent/session concept.
   - Captures product direction: app is vehicle/data layer; coach is operating brain; output is Dylan/results.

4. `2026-08-02-coach-launch-v0.md`
   - Current launch plan for data-first Coach onboarding.
   - Defines review-before-questions, baseline fields, seven-day manual mode, approval gates, and success criteria.

5. `2026-08-02-coach-baseline-v0.md`
   - First corrected Coach baseline pass after the generic Discord onboarding failure.
   - Summarizes reviewed docs/data, current facts, drift, SI constraints, and the only questions Coach should ask before tomorrow.

6. `2026-08-02-coach-sustainer.md`
   - Nightly Coach memory steward.
   - Keeps baseline, source drift, decisions, and open questions current without becoming coaching automation.

7. `2026-08-02-coach-operational-launch-loop.md`
   - Active tonight loop for launching `@Coach` as the first operational dOS bot/agent experience.
   - Separates Coach-the-agent readiness from Coach-the-visible-Discord-bot plumbing so onboarding is not blocked by bot-token work.

8. `2026-08-03-coach-morning-readiness-path.md`
   - Prepared tomorrow-morning response path for Coach after the operational launch loop.
   - Defines default assumptions, Monday Upper A path, SI guardrails, nutrition response, and the required response template.

9. `2026-08-01-health-coach-foundation-spec.md`
   - Current foundation/operating-model spec synthesized from the delivery-system brainstorming loop and focused audits.
   - Defines manual foundation mode, source hierarchy, role boundaries, delivery rules to test manually, proactivity/silence policy, memory model, approval/writeback policy, do-not-repropose list, and next build direction.

10. `2026-08-01-health-coach-manual-operating-playbook.md`
   - Manual loop playbook for running Health Coach before automation.
   - Defines cadence, trigger checklists, exact user-facing prompts, decision outputs, recording locations, and automation-readiness criteria.

11. `2026-08-01-wednesday-36h-fast-protocol.md`
   - Current governing Wednesday fast update from Dylan.
   - Replaces the old 900-cal half-fast with a true 36-hour fast and practical electrolyte coaching.

12. `2026-08-01-manual-weekly-checkpoint.md`
   - First manual weekly checkpoint using the playbook and live Health Hub data.
   - Current verdict: limiter is data/adherence visibility, with weekend NEAT as today's live rescue target; do not lower baseline calories yet.

13. `2026-08-01-visual-cue-inputs-note.md`
   - New delivery-system input-channel idea from Dylan.
   - Treats visual/form/body-part observations as qualitative coaching data, not a premature app feature.

14. `2026-08-01-loop-to-prod-operating-system.md`
   - Active bounded loop orchestration spec for management gates and hard-data/build-prep loops.
   - Defines G0-G6 gates from truth reconciliation through prod approval.

15. `loop-command-center.md`
   - Current loop state, active gate, allowed work, and next worker/manager objectives.

16. `2026-08-01-cut-delivery-system-brainstorm.md`
   - Brainstorming loop using the project handoff + live Health Hub data to identify delivery-system improvements for Dylan's Summer Cut v2 outcome.
   - Focuses on cut performance/adherence, not app features: nutrition visibility, weekend NEAT, abnormal workout debriefs, SI gating, weekly checkpoints, and selective interventions.

17. `2026-08-01-health-coach-baseline-analysis-loop.md`   - Current foundation loop doc.
   - Defines baseline establishment: analyze the full handoff + live Health Hub/project data, classify source truth/data quality/conflicts, and build the starting model before proposing coaching changes or app features.

18. `2026-08-01-health-coach-interpretation-loop.md`   - Later daily/weekly coaching interpretation pattern.
   - Useful after the baseline and agent foundation are defined, but premature as the starting point.

19. `2026-07-31-health-coach-loop-scope-pass.md`   - Earlier scoped loop pass using live Health Hub data and the current health program handoff.
   - Useful for data hygiene/writeback ideas, but too narrow to be the primary coaching loop.

20. `2026-07-31-chat-import-plan.md`   - Plan for importing additional Claude/Kloc/Health Hub chat history without dumping raw transcripts into active prompts.

## Durable coach memory files

- `health-coach-current-state.md` — current phase, limiting factors, active constraints, next required loop.
- `health-coach-decision-log.md` — durable decisions and rationale.
- `health-coach-do-not-repropose.md` — disqualified advice/patterns.
- `health-coach-food-templates.md` — repeat food/order templates with source/confidence.
- `health-coach-injury-history.md` — SI/psoas/body-feel context and movement constraints.

## Operating principles

- Do not redesign Health Hub before defining the coach operating loop.
- Do not treat the app as the product. The product is Dylan's outcome.
- Start with a thin vertical coaching loop before expanding.
- Preserve raw context privately; commit curated context only when Dylan approves.
- Before implementation, verify live Health Hub data/schema and current SI flare status.
