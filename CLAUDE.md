# Health Hub - Development Guide

## Overview
Health Hub is a single-page PWA for personal health and fitness tracking, built for a strength athlete executing a fat-loss cut while preserving muscle and performance. It runs as a monolithic `index.html` with React 18 via CDN (no build process).

## Tech Stack
- **Frontend**: React 18 (CDN, Babel in-browser transpilation)
- **Backend**: Vercel Serverless Functions in `/api/`
- **Database**: Supabase PostgreSQL (cloud sync; migrations in `/supabase/`)
- **Local Storage**: Browser localStorage for offline-first functionality
- **AI**: Claude API (`AI_MODEL` env, default `claude-sonnet-4-6`) for weekly analysis and body-comp photo analysis

## Architecture
- `index.html` — Complete SPA (~4,500 lines, all components inline)
- `api/analyze.js` — Weekly health analysis endpoint
- `api/bodycomp.js` — Body-composition photo analysis
- `api/update.js` — Program update endpoint (curl/script, Bearer UPDATE_TOKEN)
- `api/mcp.js` — Remote MCP server (Claude.ai integration)
- `api/oura-sync.js` — Oura recovery sync (cron 2x daily)
- `api/cronometer-sync.js` — Cronometer nutrition sync (cron nightly; source of truth for food)
- `api/sync-steps.js`, `api/sync-weight.js` — Apple Shortcut sync (SYNC_TOKEN)
- `api/push-schedule.js` — Server web push for rest timers (VAPID + optional NOTIFY_TOKEN)
- `api/allergies.js` — Austin pollen/mold counts
- `sw.js` — Service worker (offline cache + push display)
- `supabase/*.sql` — Database migrations (run in Supabase SQL editor)
- `manifest.json` — PWA manifest

## UI: Three Moments shell
The Home tab resolves a **mode** from the clock and today's state (test with `?clock=HH:MM&day=weekday`):
- **Morning** (04:30–09:00, until weight logged): full-screen scale pad, trend one-liner, water quick-add
- **Session** (training day after weigh-in until 13:00, or manual): today's workout + Oura recovery line with rule-based auto-regulation — recovery <60% proposes "−1 set on non-anchor accessories" (tap-to-accept, mutates today's plan only), <40% additionally offers a mobility swap
- **Closeout** (after 19:30): stretch launch, "Mark clean day", compact metrics, tomorrow one-liner
- **Neutral** (weekends/unmatched): compact trend + water + manual mode buttons

Tabs: Home (moments) / Train / Food / Scale / Setup. The Habits tab is gone — habit logging is the one-tap "Mark clean day" in the closeout surface. Food is a quick-log (calories+protein, three presets); Cronometer-synced meals are read-only in-app.

## Visual system: Iron & Steel
All colors are CSS custom properties in the single `:root` block in `index.html` (auto dark/light via `prefers-color-scheme`). **Never hardcode a hex outside that block.** The JS `C` object maps token names to `var(--…)`. Accent (red, reserved for actions) is the only brand color; the UI is otherwise monochrome graphite; red/green = semantic, and there is deliberately **no amber/warning tier** — mid states render graphite (`t2`/`t3`). Type: Barlow (UI) + Barlow Condensed (display/numerals/buttons, uppercase). Tabular numerals globally; sharp 3-4px radii — industrial, not SaaS.

## Data Structure
All data is stored in localStorage under key `dhub6` and synced to Supabase:
- `wk` — Workout logs (keyed by date)
- `nut` — Nutrition logs (keyed by date, contains meals array)
- `wt` — Weight entries (keyed by date)
- `rec` — Recovery data (keyed by date: recoveryScore, hrv, rhr, sleepHours, source, ...)
- `steps`, `water`, `habits`, `mob`, `stp`, `debrief`, `cardio` — daily stores (keyed by date)
- `prog` — Exercise progression, keyed by `exerciseId__repRange` (legacy plain-id rows kept only where the fallback reads them; orphans pruned on boot)
- `autoregLog` — Accepted/dismissed auto-regulation decisions (keyed by date; local)
- `bodyComp`, `bodyMeas`, `travelDays`, `tdeeExclude`, `settings`, `program`
- `backfillVersion` — history-replay one-shot marker

## Weight trend
`getTrend()` (EWMA-smoothed OLS slope over the last 14 calendar days, lbs/week to 1 decimal) is the **only** trend formula. Every surface consumes it; do not add another.

## Sync health
`sb.upsert` failures are loud: console.error + one toast per table per session + a red dot on Setup. If the dot is red, a Supabase column/table is missing — check `/supabase/` for a pending migration.

## Settings (User-Customizable)
Stored in `data.settings`: `calories` (default 1790), `protein` (200), `water` (128), `steps` (15000), `sleep` (7.5), `fiber` (30), `trainingCal` (2000), `wednesdayCal` (900), `weekendCal` (1800; app renders Sat +100 / Sun −100), `syncToken`, `notifyToken`, `customHabits`, `reminders` (dormant).

## Pushing Workout & Settings Updates via API
When the user agrees to a workout program change or settings adjustment during conversation, push it live using `/api/update` — no code change or deploy needed.

```bash
source /home/user/health-hub/.env
curl -s -X POST "${HEALTH_HUB_URL}/api/update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${UPDATE_TOKEN}" \
  -d '{"changes":[...],"reason":"..."}'
```

Payload format: see `api/schema.md`. Change types: `settings` field/value, `exercise` update/swap/add/remove. Always include a `reason`; the app applies pending updates on next load (toast).

## Claude.ai MCP Integration
`/api/mcp` exposes `get_program`, `update_settings`, `update_exercise`. `get_program` reads **live state** from the Supabase `settings`/`program`/`progression` tables (the app mirrors them on every change) and tags the response `source:"live"`; a hardcoded snapshot is the fallback only. Updates flow through the `program_updates` queue and apply on next app load.

## Environment variables (Vercel)
`ANTHROPIC_API_KEY`, `AI_MODEL` (optional), `SUPABASE_URL`/`SUPABASE_KEY` (or `SUPABASE_ANON_KEY`), `UPDATE_TOKEN`, `SYNC_TOKEN`, `OURA_PAT`, `OURA_SYNC_SECRET` (optional), `CRONOMETER_USERNAME`/`CRONOMETER_PASSWORD`, `CRONOMETER_SYNC_SECRET` (optional), `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, `NOTIFY_TOKEN` (optional).

## Checks
`npm run check` — syntax-checks every `/api/*.js`. There is no build step or test suite; verify UI changes by loading the app (use `?clock=` to simulate times).

## Git Workflow
1. Commit with a clear message
2. Push to a feature branch
3. Create a PR
4. Note: `.github/workflows/auto-merge-claude.yml` auto-merges `claude/**` branches

## Security
See `SECURITY.md` — hardening is documented and deliberately deferred.
