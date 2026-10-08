# Coach Operational Launch Loop

Date: 2026-08-02

Status: active tonight; revised after Dylan clarified that visible `@Coach` is part of the launch, not a later nice-to-have.

Discord home: `#coach`.

OpenClaw agent: `fitness-coach`.

## End Goal

Launch `@Coach` as the first operational dOS bot/agent experience tonight:

- data-first onboarding,
- baseline established from existing Health Hub / coach-system docs / live data,
- only targeted gap questions,
- tomorrow-morning workout and nutrition guidance ready,
- visible Discord bot identity treated as a launch requirement,
- no generic onboarding,
- no Health Hub writes or program changes without explicit Dylan approval.

## Important Distinction

Coach has two layers:

1. **Coach agent**: the brain, memory, tools, Health Hub read access, and coaching behavior.
2. **Coach visible bot identity**: a separate Discord bot/person Dylan can tag as `@Coach`.

The visible bot identity is now part of the launch goal. The only reason it can remain incomplete is the real setup dependency: Dylan must create/provide a separate Discord bot token and invite the bot to dOS. Do not downgrade this to "later UX polish."

## North Star

Dylan should be able to open `#coach` tomorrow morning and ask what to do. Coach should answer from actual Health Hub data and coach-system context, not from a blank-slate form.

## Source Hierarchy

1. Latest Dylan instruction.
2. Coach-system README order.
3. Coach baseline docs.
4. Live Health Hub helper reads.
5. Existing Claude Health/Fitness handoffs as candidate historical context.
6. Older app/program state only after reconciliation.

## Required Read-First Set

- `README.md`
- `2026-08-01-health-coach-project-orientation.md`
- `2026-07-31-health-coach-full-context-handoff.md`
- `2026-07-31-health-coach-brainstorm.md`
- `2026-08-02-coach-launch-v0.md`
- `2026-08-02-coach-baseline-v0.md`
- `2026-08-01-health-coach-baseline-analysis-loop.md`
- `health-coach-current-state.md`
- `health-coach-decision-log.md`
- `health-coach-injury-history.md`

## Live Data Checks

Run read-only:

```bash
python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py today
python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py summary 10
python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py program
```

Known current facts from the 2026-08-02 launch check:

- Today has steps only: 3,858.
- Weekend nutrition/recovery visibility is thin.
- Recent weekday training/nutrition data exists.
- Current app program still contains lower-body drift/conflicts, including back squat/deadlift patterns and `wednesdayCal: 900`, which conflict with newer coaching decisions.
- Tomorrow is Monday 2026-08-03, and the live app Monday program is `Upper A - Strength`.

## Tonight Loop

Use Build / Measure / Learn:

### Build

- Refresh the Coach baseline from docs and read-only Health Hub data.
- Produce a concise `#coach` launch note that states what Coach reviewed, what it believes, what is conflicted/stale, and what it needs from Dylan.
- Keep the note targeted. No generic onboarding.

### Measure

Coach is ready only if:

- `fitness-coach -> #coach` binding is still verified.
- Coach memory/index exists and is readable.
- Coach can cite baseline/docs/data used.
- Coach asks no more than three targeted gap questions before tomorrow.
- Coach can produce a Monday workout/nutrition plan from the answer.

### Learn

- If Dylan corrects Coach, update the baseline and decision log.
- If the visible bot identity is still missing, track it as a launch blocker requiring Dylan's Discord Developer Portal/token step, not as a vague future wishlist item.
- If Health Hub app data conflicts with the governing coach model, document the conflict before proposing app/code updates.

## Initial Targeted Questions

Coach should ask only these unless new data changes the need:

1. Is the SI flare still active: left PSIS soreness, hamstring guarding, or squat-descent instability?
2. Is tomorrow the live Monday `Upper A - Strength` session, or are you following a different schedule?
3. Should tomorrow guidance factor in a rough food/protein rundown from today, or proceed from existing data only?

## Exit Criteria Tonight

This loop can stop when:

- Coach has posted a baseline-aware launch note in `#coach`.
- Dylan has answered the targeted gap questions or Coach has clearly marked them pending.
- Coach has a ready tomorrow-morning response path.
- The visible `@Coach` bot identity requirement is either done or explicitly blocked on Dylan's token/invite step with exact next actions posted in Discord.

## First Run Result

Time: 2026-08-02 evening.

Cron job:

- `coach-operational-launch-loop`
- `5062408a-423f-4985-bd3f-993dc48cd584`

Result:

- Manual first run completed successfully and delivered to `#coach`.
- Coach reported `READY_FOR_TOMORROW=true` with Dylan's three targeted answers pending.
- The temporary 20-minute loop was disabled after the successful run to avoid repeating the same prompt.
- Nightly `coach-sustainer-nightly` remains enabled for memory/baseline stewardship.

Pending Dylan answers:

1. Is the SI flare still active: left PSIS soreness, hamstring guarding, or squat-descent instability?
2. Is tomorrow Upper A - Strength, or are you following a different schedule?
3. Should tomorrow guidance use a rough food/protein rundown from today, or existing data only?

Follow-up hardening:

- Created `2026-08-03-coach-morning-readiness-path.md`.
- Deleted the stale generic `#coach` onboarding prompt.
- Posted and pinned the morning readiness note in `#coach`: `1533645174599843942`.

## Approval Gates

Ask Dylan before:

- Health Hub writes,
- program/app edits,
- Supabase mutations,
- deploys,
- paid model/provider/tool usage,
- storing raw private Claude exports,
- creating or configuring a new Discord bot identity/token unless Dylan provides the token/setup path,
- granting new credentials or public exposure.

## Visible Bot Onboarding

Canonical setup doc:

- `/home/dwrzl/.openclaw/workspace/docs/personal-assistant/COACH_BOT_ONBOARDING.md`

Current implementation truth:

- `fitness-coach` is ready as the Coach brain.
- `#coach` is ready as the Coach room.
- A separate visible Discord bot account named Coach is still blocked on Dylan creating/providing the Discord bot token and inviting that bot to dOS.
