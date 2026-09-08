# Health Hub Coach — one brain, two delivery vehicles

Health Hub is a single product with two front ends over one engine:

| Vehicle | What it is | Who drives it |
|---|---|---|
| **The app** (`index.html` + `app.js`) | The phone. Logs sets, meals, weigh-ins; runs timers; shows today's mode and the weekly readout. | The athlete, in the moment. |
| **The Coach** (`/api/mcp`) | A remote MCP server that gives an agent (Claude.ai, or any MCP client) the same numbers and the same write paths. | Claude, in conversation, with full read/write access. |

Both vehicles run `lib/engine.mjs` (progression, weight resolution, substitutions, trend, TDEE, adherence, recommendation, closeout, auto-regulation) and `lib/supabase.mjs` (one column mapping). The Coach never re-derives a number the phone shows; it calls the function the phone calls. When the engine changes, both change.

## How the loop closes

```
athlete ── app ──► Supabase ◄── Coach (Claude.ai via MCP) ──► athlete
             ▲            │
             └── next launch: settings/program rows win, coach changes toast
```

- **Reads.** `get_snapshot` loads every table, runs the same boot normalization the phone runs (`backfillData`, `repairDeloadProgression`, `applyBlockV2`, `pruneProgression`) and returns today's mode, targets, trend, TDEE, weekly summary, recommendation, closeout, auto-regulation proposal, stalls, the last seven days, integration freshness and recent coach changes.
- **Writes.** Day-keyed logs (`log_weight`, `log_meal`, `log_cardio`, `log_steps`, `log_water`, `log_habits`, `log_measurements`, `set_travel_day`) upsert straight into the live tables. The app treats Supabase as authoritative for date-keyed data, so the phone shows them on next launch.
- **Program and targets.** `update_settings` / `update_exercise` apply immediately to the `settings` and `program` rows (via `applyChanges` in the engine) and write an audit row to `program_updates` with your reason. The app toasts unseen changes on launch and lists them under Setup → Coach changes. `/api/update` (curl, scripts) uses the same path.
- **Program identity.** The stored program is trusted only while `program.version` equals `PROG.version` in `lib/engine.mjs`. Coach edits persist within a block; a new block in code resets them. Bump `PROG.version` whenever `PROG.days` changes.
- **Notes.** `log_note` leaves a dated note in the same audit log: decisions, what to watch, why a target moved.

## Tool contract

| Tool | Purpose |
|---|---|
| `get_snapshot(date?)` | Start here. Everything the phone computes, in one object. |
| `get_program()` | Days, exercises, resolved working weights, progression rows, settings, library ids. |
| `get_history(kind, from?, to?, limit?)` | Raw daily rows: workouts, nutrition, weight, recovery, steps, water, cardio, habits, measurements, photos, mobility. |
| `get_exercise(exerciseId)` | Sessions, e1RM line, PR, working weight, ranked substitutions. |
| `update_settings(field, value, reason)` | calories, protein, water, steps, sleep, fiber, trainingCal, wednesdayCal, weekendCal. |
| `update_exercise(action, …, reason)` | update / swap / add / remove on the live program. |
| `log_weight`, `log_meal`, `log_cardio`, `log_steps`, `log_water`, `log_habits`, `log_measurements`, `set_travel_day` | Day-keyed writes. |
| `log_note(note)` | Dated coach note for the athlete. |

Every write takes a `reason` (or is the note itself). The athlete reads it.

## Connecting Claude.ai

1. Deploy (any push to `claude/**` merges and deploys).
2. Run `supabase/2026-09-08_coach.sql` once in the Supabase SQL editor.
3. In Claude.ai → Settings → Connectors → Add custom connector: `https://<your-domain>/api/mcp`, no auth.
4. Create a Project with the instructions below. In each chat, start with `get_snapshot`.

Non-OAuth clients (scripts, other agents) can be gated with the `MCP_TOKEN` env var (`Authorization: Bearer …`). Claude.ai's connector UI has no static-token field, so leave `MCP_TOKEN` unset for that path; the endpoint is otherwise protected only by the unlisted URL (see `SECURITY.md`).

### Project instructions for the Coach

```
You are Dylan's strength coach and nutritionist. You have full access to Health Hub through the connector.

Every conversation: call get_snapshot first, then get_program if training is on the table. Reason from those numbers, never from memory.

The plan: Summer Cut v2. Anchor lifts (flat bench, deadlift, leg press on Friday) progress when every set hits the top of the range; everything else holds weight on the cut and takes rep PRs. Wednesday is a 36-hour fast. Weight trend is the EWMA/OLS slope in get_snapshot.trend; the target pace is 0.6 to 1.5 lb/wk down. Recovery under 60 proposes minus one set on accessories; under 40 proposes a mobility day.

Rules for changing things:
- One lever at a time. Say what you changed and why in the reason field; Dylan sees it as a toast.
- Do not touch calories until adherence is above 60% for a full week and the trend has been flat for 10+ days.
- Never remove or swap an anchor lift without saying so explicitly and getting a yes.
- Keep rep ranges unless the goal changes; a new rep range starts a new progression track.
- Log what Dylan tells you (weigh-ins, meals, cardio, habits, measurements) with the log_* tools so the app has it.
- End a weekly review with log_note: what moved, what to watch, what you will decide next week.
```

## Guardrails built into the engine

- `applyChanges` rejects unknown settings fields, negative values, unknown exercises, duplicate adds and missing days, and reports each rejection in the audit log.
- Weight resolution is sanity-capped by movement pattern (`weightCap`), so a bad log cannot load a 900 lb bench next session.
- Deload week never moves weight or records PRs.
- Program edits are versioned; code wins across blocks, the coach wins within a block.
- The app's sync-health UI shows a red dot and the server's error text if a coach write hits a missing column (run the pending migration in `/supabase/`).

## Verifying it

```bash
npm test          # engine, mapping and API tests (network fully mocked)
npm run check     # build + tests + syntax
```

`test/api.test.mjs` drives `/api/mcp` over JSON-RPC exactly as Claude.ai does, with Supabase stubbed, and asserts the snapshot, program, exercise and write tools end to end.
