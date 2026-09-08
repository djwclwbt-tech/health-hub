# Health Hub - Development Guide

## Overview
Health Hub is a single-page PWA for personal health and fitness tracking, built for a strength athlete executing a fat-loss cut while preserving muscle and performance. It is one product with two delivery vehicles over one engine: the **app** (`src/app.jsx` → `app.js`) and the **Coach** (`/api/mcp`, a remote MCP server for Claude.ai). See `COACH.md`.

## The engine (read this first)
- `lib/engine.mjs` — every rule and number: program (`PROG`, versioned), exercise library, progression (`resolveWeight`, `buildSession`, `applyWorkout`, `swapOptions`, `sessionCursor`), analytics (`getTrend`, `calcAdaptiveTDEE`, `getWeeklyCutSummary`, `getWeeklyCutRecommendation`, `getTonightCloseout`, `getAutoregProposal`, stalls, insights), targets (`getDayCalTarget`…), `resolveMode`, plates, and `applyChanges` (the Coach's write path). Pure and isomorphic: no window, no fetch. **Put logic here, not in components or API routes.**
- `lib/supabase.mjs` — the one column mapping (`toRow`, `fromRows`, `loadAll`, `writeProgramChanges`, `makeClient`). Both vehicles use it; a column rename happens once.
- `test/*.test.mjs` — `npm test`. Engine, mapping and API routes (network mocked). Add a test when you change a rule.

## Tech Stack
- **Frontend**: React 18 (vendored UMD in `/vendor`), JSX in `src/app.jsx` compiled to `app.js` by `npm run build` (esbuild, minified, es2020). Fonts self-hosted in `/fonts`.
- **Backend**: Vercel Serverless Functions in `/api/`
- **Database**: Supabase PostgreSQL (cloud sync; migrations in `/supabase/`)
- **Local Storage**: Browser localStorage for offline-first functionality
- **AI**: Claude API (`AI_MODEL` env, default `claude-sonnet-4-6`) for weekly analysis and body-comp photo analysis

## Build (the one step)
`npm run build` compiles `src/app.jsx` → `app.js` and stamps a build id shown at the bottom of Setup. **Commit `app.js` with every source change.** The `claude/**` auto-merge workflow runs `npm run check` and commits a rebuilt `app.js` if you forgot, so a stale build cannot ship, but do not rely on it. Never edit `app.js` by hand. In-browser Babel is gone; a phone renders in ~100 ms instead of several seconds.

## Architecture
- `src/app.jsx` — Complete SPA (~5,000 lines, all components inline). Source of truth for the UI.
- `app.js` — Build output of the above (committed).
- `index.html` — Thin shell: `:root` color tokens, `@font-face`, base CSS + animations, boot skeleton, script tags.
- `vendor/` — React + ReactDOM UMD (copied from node_modules by the build). `fonts/` — Barlow woff2 (OFL).
- `scripts/build.mjs` — the build.
- `api/analyze.js` — Weekly health analysis endpoint
- `api/bodycomp.js` — Body-composition photo analysis
- `api/update.js` — Program update endpoint (curl/script, Bearer UPDATE_TOKEN); applies changes to the live rows via the engine
- `api/mcp.js` — The Coach: remote MCP server (Claude.ai). Tools: get_snapshot, get_program, get_history, get_exercise, update_settings, update_exercise, log_* writes, set_travel_day, log_note. Optional `MCP_TOKEN` bearer for non-OAuth clients.
- `api/oura-sync.js` — Oura recovery sync (cron 2x daily)
- `api/cronometer-sync.js` — Cronometer nutrition sync (cron nightly; source of truth for food)
- `api/sync-steps.js`, `api/sync-weight.js` — Apple Shortcut sync (SYNC_TOKEN)
- `api/push-schedule.js` — Server web push for rest timers (VAPID + optional NOTIFY_TOKEN)
- `api/allergies.js` — Austin pollen/mold counts
- `sw.js` — Service worker: network-first (2.5 s timeout, cache fallback) for `/`, `/index.html`, `/app.js`; cache-first for `/vendor`, `/fonts`, icons; push display; notification tap deep-links to a tab
- `supabase/*.sql` — Database migrations (run in Supabase SQL editor)
- `manifest.json` — PWA manifest

## UI: Three Moments shell
The Home tab resolves a **mode** from the clock and today's state (test with `?clock=HH:MM&day=weekday`):
- **Morning** (04:30–09:00, until weight logged): full-screen scale pad, trend one-liner, water quick-add
- **Session** (training day after weigh-in until 13:00, or manual): today's workout + Oura recovery line with rule-based auto-regulation — recovery <60% proposes "−1 set on non-anchor accessories" (tap-to-accept, mutates today's plan only), <40% additionally offers a mobility swap
- **Closeout** (after 19:30): stretch launch, "Mark clean day", compact metrics, tomorrow one-liner
- **Neutral** (weekends/unmatched): compact trend + water + manual mode buttons

Tabs: Home (moments) / Train / Food / Scale / Setup. The Habits tab is gone — habit logging is the one-tap "Mark clean day" in the closeout surface. Food is a quick-log (calories+protein, three presets); Cronometer-synced meals are read-only in-app.

## Navigation & overlay rules
- Tabs are **keep-alive**: `TabPane` mounts a tab on first visit and hides it afterwards, so stretch/cardio/rest timers survive tab switches. Window scroll is saved/restored per tab.
- Every overlay uses `Sheet` (bottom sheet) or `ConfirmModal`; both render through `Portal` to `document.body` and register with `useBackClose`, so the Android/browser back button closes them. Sub-views (workout log, meal detail, Progress, classic dashboard) call `useBackClose` too. Never add a raw `position:fixed` overlay inside a tab, and never call `confirm()`.
- Rest timer is a fixed bar above the tab bar (portaled, visible on every tab); the top mini bar shows set count and rest countdown when off the Train tab.
- Train deck: tap the lift name for history (last sessions + e1RM line), tap the big number to type it, PLATES on barbell lifts, haptics on log, Screen Wake Lock while a session is open, post-workout summary sheet with volume/duration/new e1RM records.

## Visual system: Iron & Ember
All colors are CSS custom properties in the single `:root` block in `index.html` (also `--on-accent-line`, `--on-accent-dim`, `--accent-glow` for text/lines on ember or ink surfaces). **Light mode only** — dark mode was removed on purpose; do not add a `prefers-color-scheme` block back. **Never hardcode a hex outside `:root`.** The JS `C` object maps token names to `var(--…)`. Warm paper bg, graphite ink, one ember accent (`--accent #C2410C`, actions only); olive = earned, deep red = destructive/broken only, and there is deliberately **no amber/warning tier** — mid states render graphite (`t2`/`t3`). Type: Barlow (UI) + Barlow Condensed (display/numerals/buttons, uppercase). Tabular numerals globally; radii 6 (inputs) / 8-9 (buttons) / 10-12 (cards). Copy rules: active voice, short sentences, no em dashes, no semicolons in prose, middots only between data values, empty numerics render "○".

## Data Structure
All data is stored in localStorage under key `dhub6` and synced to Supabase:
- `wk` — Workout logs (keyed by date)
- `nut` — Nutrition logs (keyed by date, contains meals array)
- `wt` — Weight entries (keyed by date)
- `rec` — Recovery data (keyed by date: recoveryScore, hrv, rhr, sleepHours, source, ...)
- `steps`, `water`, `habits`, `mob`, `stp`, `debrief`, `cardio` — daily stores (keyed by date)
- `prog` — Exercise progression, keyed by `exerciseId__repRange` (legacy plain-id rows kept only where the fallback reads them; orphans pruned on boot)
- `autoregLog` — Accepted/dismissed auto-regulation decisions (keyed by date; local)
- `bodyComp`, `bodyMeas` (synced to `body_measurements`), `travelDays`, `tdeeExclude`, `settings`, `program`, `programVersion`, `coachLog` (read-only mirror of `program_updates`)
- `backfillVersion` — history-replay one-shot marker
- `dhub6_workout`, `dhub6_rest_timer`, `dhub6_mob_active`, `dhub6_variant`, `dhub6_notification_settings` — sibling localStorage keys for in-flight session state

## Weight trend
`slopePerWeek()` (EWMA 0.3 + OLS slope) is the **only** slope; `getTrend()` applies it to the last 14 days, `calcAdaptiveTDEE` to its estimate window. Do not add another.

## Program versioning
`PROG.version` in `lib/engine.mjs` names the block. The stored `program` row (coach edits: swap/add/remove/update) is kept only while its `version` matches; a different version resets to the code's days. **Bump `PROG.version` whenever you edit `PROG.days`.**

## Sync health
`sb.upsert` distinguishes two failure classes. **HTTP errors** (schema/auth) are loud: console.error + one toast per table per session + a red dot on Setup — a red dot means a Supabase column/table is missing; check `/supabase/` for a pending migration. **Network blips** (request never left the phone) are transient: retried once after 1.5s, listed quietly on Setup as "dropped requests", never toasted, and cleared by the next successful write to that table. A full re-sync fires on `online` and on returning to the foreground with recorded failures.

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

## Claude.ai MCP Integration (the Coach)
`/api/mcp` is the second delivery vehicle; see `COACH.md` for the tool contract and the Claude.ai project instructions. Reads run the engine over `loadAll()`. Writes go straight to the live tables; settings/program changes are applied server-side by `writeProgramChanges` and logged to `program_updates` (`applied`, `applied_at`, `source`, `summary`, `reason`), which the app toasts on next launch and lists under Setup → Coach changes. There is no client-side apply step anymore.

## Environment variables (Vercel)
`ANTHROPIC_API_KEY`, `AI_MODEL` (optional), `SUPABASE_URL`/`SUPABASE_KEY` (or `SUPABASE_ANON_KEY`), `UPDATE_TOKEN`, `SYNC_TOKEN`, `OURA_PAT`, `OURA_SYNC_SECRET` (optional), `CRONOMETER_USERNAME`/`CRONOMETER_PASSWORD`, `CRONOMETER_SYNC_SECRET` (optional), `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, `NOTIFY_TOKEN` (optional).

## Checks
`npm run check` — builds `app.js`, runs `npm test`, and syntax-checks every `/api/*.js`. There is no test suite; verify UI changes by loading the app (`npm run serve`, use `?clock=HH:MM&day=weekday` to simulate moments). Push notifications deep-link with `?tab=training`.

## Git Workflow
1. `npm run check`, then commit `src/app.jsx` **and** `app.js` together with a clear message
2. Push to a feature branch
3. Create a PR
4. Note: `.github/workflows/auto-merge-claude.yml` rebuilds `app.js` if stale, then auto-merges `claude/**` branches (every push there is a production deploy)

## Security
See `SECURITY.md` — hardening is documented and deliberately deferred.
