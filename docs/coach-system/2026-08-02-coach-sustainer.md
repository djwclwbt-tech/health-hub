# Coach Sustainer

Date: 2026-08-02

Status: launch now as memory steward. Not coaching automation.

Discord destination: `#coach`.

Cron job: `coach-sustainer-nightly` (`bc900023-d96c-48c3-8e21-d7c3acea09a0`)

## Purpose

Keep Coach's baseline, memory, source conflicts, and open questions current so Dylan does not have to re-explain the Health Hub system every session.

## What It Sustains

- current baseline,
- active injury/SI status,
- active cut constraints,
- nutrition visibility and protein gaps,
- weekend NEAT risk,
- source/app drift,
- decisions not to repropose,
- prompts/interventions that worked or failed,
- next questions that actually change coaching.

## Cadence

Nightly at 21:40 America/Chicago.

## Required Reads

- `/home/dwrzl/.openclaw/workspace-fitness-coach/AGENTS.md`
- `/home/dwrzl/.openclaw/workspace-fitness-coach/memory/coach-baseline.md`
- `/home/dwrzl/.openclaw/workspace-fitness-coach/memory/coach-sustainer.md`
- `/home/dwrzl/health-hub/docs/coach-system/README.md`
- `/home/dwrzl/health-hub/docs/coach-system/2026-08-02-coach-launch-v0.md`
- `/home/dwrzl/health-hub/docs/coach-system/2026-08-02-coach-baseline-v0.md`
- `/home/dwrzl/health-hub/docs/coach-system/health-coach-current-state.md`
- `/home/dwrzl/health-hub/docs/coach-system/health-coach-decision-log.md`
- `/home/dwrzl/health-hub/docs/coach-system/health-coach-do-not-repropose.md`
- `/home/dwrzl/health-hub/docs/coach-system/health-coach-injury-history.md`

## Required Health Hub Reads

Read-only only:

```bash
python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py today
python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py summary 14
python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py program
```

## Allowed Writes

- Update Coach memory files under `/home/dwrzl/.openclaw/workspace-fitness-coach/memory/`.
- Update coach-system docs/logs when a durable fact changes.
- Post a concise result in `#coach`.

## Not Allowed

- No Health Hub data/settings/program writes.
- No code changes.
- No deploys.
- No paid usage.
- No credentials.
- No new reminders/notifications.
- No generic coaching questionnaire.
- No raw private export storage unless Dylan explicitly approves.

## Output Format

```text
Coach Sustainer result

Reviewed:
Baseline changes:
Open questions:
No-write boundary:
Next:
```

## Launch Note

This exists because the first `#coach` onboarding note failed by asking Dylan for generic inputs instead of proving Coach had reviewed the existing system. Sustaining memory is now part of Coach launch, but coaching automation still waits until manual foundation rules prove useful.
