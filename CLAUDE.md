# Health Hub - Development Guide

## Overview
Health Hub is a single-page PWA for personal health and fitness tracking, built for a strength athlete executing a fat-loss cut while preserving muscle and performance. It is one product with two delivery vehicles over one engine: the **app** (`src/app.jsx` → `app.js`) and the **Coach** (`/api/mcp`, a remote MCP server for Claude.ai). See `COACH.md`.

## The engine (read this first)
- `lib/engine.mjs` — the one public entry for every rule and number. It only re-exports `lib/engine/*.mjs`; always import from `engine.mjs`. Pure and isomorphic: no window, no fetch. **Put logic in the matching module, not in components or API routes.** Imports flow down this list only (no cycles):
  - `program.mjs` (`PROG`, versioned; library, supersets, poses, dinners, cardio, `DEFAULTS`, plates) · `dates.mjs` (`lds`, `td`, `dw`, `wkn`, formatting) · `state.mjs` (`bl`, `migrate`, seed, `sumMeals`, `progKey`/`repTrack`)
  - `progression.mjs` — e1RM and set rules, stalls, `resolveWeight`, `buildSession`, `swapOptions`, `sessionCursor`, `applyWorkout`
  - `analytics.mjs` — targets (`getDayCalTarget`…), `getTrend`, `calcAdaptiveTDEE`, weekly summary/recommendation, closeout, insights, `resolveMode`, `getAutoregProposal`
  - `migrations.mjs` — boot/one-shot normalizers (`backfillData`, `pruneProgression`, `repairDeloadProgression`, `applyBlockV2`) · `changes.mjs` — `applyChanges`, `exerciseReport` (the Coach's write path)
- `lib/supabase.mjs` — the one column mapping (`toRow`, `fromRows`, `loadAll`, `writeProgramChanges`, `makeClient`). Both vehicles use it; a column rename happens once. `loadAll` marks tables that failed to load in a hidden `__failed` list; the app keeps the phone's copy for those, so an offline launch never resets settings. Tokens (`syncToken`, `notifyToken`) never go to the cloud.
- `lib/http.mjs` — shared API plumbing: `preflight` (CORS + method check), `requireToken`, `safeEqual`, `isCron`, `sameOrigin`, `supabaseEnv`. Every `api/*.js` uses it; do not copy auth or CORS code into a route.
- `test/*.test.mjs` — `npm test`. Engine, mapping and API routes (network mocked). Add a test when you change a rule.

## Tech Stack
- **Frontend**: React 18 (vendored UMD in `/vendor`), JSX in `src/app.jsx` compiled to `app.js` by `npm run build` (esbuild, minified, es2020). Fonts self-hosted in `/fonts`.
- **Backend**: Vercel Serverless Functions in `/api/`
- **Database**: Supabase PostgreSQL (cloud sync; migrations in `/supabase/`)
- **Local Storage**: Browser localStorage for offline-first functionality
- **AI**: Claude API (`AI_MODEL` env, default `claude-sonnet-4-6`) for weekly analysis and body-comp photo analysis

## Build (the one step)
`npm run build` compiles `src/app.jsx` → `app.js` and stamps a build id shown at the bottom of You. **Commit `app.js` with every source change.** The `claude/**` auto-merge workflow runs `npm run check` and commits a rebuilt `app.js` if you forgot, so a stale build cannot ship, but do not rely on it. Never edit `app.js` by hand. In-browser Babel is gone; a phone renders in ~100 ms instead of several seconds.

## Architecture
- `src/` — the UI, bundled by esbuild from `src/app.jsx` (App shell, error boundary, boot merge). React is a global (vendored UMD); each module starts with `const { useState, … } = React;`.
  - `src/core/` — `storage.js` (localStorage, sync health, Supabase client, outbox, `svSB`), `theme.js` (`C`, `FD`), `nav.js` (`useBackClose`), `device.js` (haptics, notifications, push), `hooks.js` (`useToday`, `waterOps`).
  - `src/ui/` — atoms, overlays (`Portal`, `Sheet`, `ConfirmModal`, toasts), shell (tab bar, `TabPane`).
  - `src/cards/` — shared cards (weight trend, scale pad, plates, Closeout). `src/views/` — Analysis, Progress, classic dashboard.
  - `src/tabs/` — one file per tab: `Moments` (Home), `Training` (+ `train/`), `Nutrition`, `Weight`, `Settings`.
  - Module-level state lives in exactly one module. esbuild does not flag undefined names, so a missing import is a runtime crash: load every tab after a move.
- `app.js` — Build output of `src/` + `lib/` (committed).
- `index.html` — Thin shell: `:root` color tokens, `@font-face`, base CSS + animations, boot skeleton, script tags.
- `vendor/` — React + ReactDOM UMD (copied from node_modules by the build). `fonts/` — Libre Franklin woff2, weights 400/500/600 (OFL).
- `scripts/build.mjs` — the build.
- `api/analyze.js` — Weekly health analysis endpoint
- `api/bodycomp.js` — Body-composition photo analysis
- `api/update.js` — Program update endpoint (curl/script, Bearer UPDATE_TOKEN); applies changes to the live rows via the engine
- `api/mcp.js` — The Coach: remote MCP server (Claude.ai). Tools: get_snapshot, get_program, get_history, get_exercise, update_settings, update_exercise, log_* writes, set_travel_day, log_note. When `MCP_TOKEN` is set, callers send it as `Authorization: Bearer …` or `?key=…` (Claude.ai uses the `?key=` connector URL).
- `api/oura-sync.js` — Oura recovery sync (cron 3x daily, incl. 11:30 UTC morning run)
- `api/cronometer-sync.js` — Cronometer nutrition sync (cron 3x daily; source of truth for food)
- Crons are UTC. Only Vercel's `Bearer CRON_SECRET` counts as a cron call; without `CRON_SECRET` crons are refused.
- `api/sync-steps.js`, `api/sync-weight.js` — Apple Shortcut sync (SYNC_TOKEN)
- `api/push-schedule.js` — Server web push for rest timers (VAPID + NOTIFY_TOKEN). Latest wins: `push_jobs` holds one current alert per phone; a skipped or re-timed rest is cancelled before it sends (fails open if the table is missing).
- `api/allergies.js` — Austin pollen/mold counts
- `sw.js` — Service worker: network-first (2.5 s timeout, cache fallback) for `/`, `/index.html`, `/app.js`; cache-first for `/vendor`, `/fonts`, icons; push display; notification tap deep-links to a tab
- `supabase/*.sql` — Database migrations (run in Supabase SQL editor)
- `manifest.json` — PWA manifest

## UI: the Day line (Oct 2026 redesign)
Four tabs: **Today / Train / Trends / You** (ids `dashboard` / `training` / `weight` / `settings`, kept so `?tab=` deep links and push taps still work). Design record: `docs/redesign-2026-10/` (mockup `mockups/b-dayline.html`, `plan.md`).
- **Today** (`src/tabs/Today.jsx`) is one timeline: weigh-in, recovery, lift, food and water (or the Wednesday fast), cardio, close the day. Done rows are one quiet line, the **Now** row is open with the main button, later rows wait below and open on tap. `nowId` order: scale (until noon if not logged) → active or pending lift (until 19:30) → close (after 19:30) → fast (Wednesday) → food. Test with `?clock=HH:MM&day=weekday`. The weigh-in keypad (`ScalePad`) lives in the scale row. Auto-regulation shows inside the lift row: recovery <60% proposes one set less on each non-anchor accessory, <40% offers the mobility swap (today only). Food opens the full Nutrition page in a sheet; Cronometer is the source. `resolveMode` in the engine is no longer used by the UI.
- **Train** — workout is a Strong-style set table per lift (Set, Last, lb, Reps, check). The cursor set has ember-outlined inputs and the "Log set" button under it; tap any check to log or undo, tap a collapsed lift to open it. Skip set, skip lift, swap, plates and form cue sit under the table.
- **Trends** (`src/tabs/Trends.jsx`) — weight trend hero (same `getTrend` number as Today), a scrubbable chart (2W default so line and hero match; 8W/All seed their own EWMA), to-goal / burn / weigh-ins / protein grid, weigh-in history, and "Lifts and body" (Progress view: photos, measurements, weekly analysis).
- **You** (`src/tabs/Settings.jsx`) — targets, integrations, sync health, Coach changes, and the old full dashboard.

## Navigation & overlay rules
- Tabs are **keep-alive**: `TabPane` mounts a tab on first visit and hides it afterwards, so stretch/cardio/rest timers survive tab switches. Window scroll is saved/restored per tab.
- Every overlay uses `Sheet` (bottom sheet) or `ConfirmModal`; both render through `Portal` to `document.body` and register with `useBackClose`, so the Android/browser back button closes them. Sub-views (workout log, meal detail, Progress, classic dashboard) call `useBackClose` too. Never add a raw `position:fixed` overlay inside a tab, and never call `confirm()`.
- Rest timer is a fixed bar above the tab bar (portaled, visible on every tab); the top mini bar shows set count and rest countdown when off the Train tab.
- Train set table: tap the lift name for history (last sessions + e1RM line), type weight and reps in the outlined cells, Plates on barbell lifts, haptics on log, Screen Wake Lock while a session is open, post-workout summary sheet with volume/duration/new e1RM records.

## Visual system: Day line
All colors are CSS custom properties in the single `:root` block in `index.html`. **Light mode only** — dark mode was removed on purpose; do not add a `prefers-color-scheme` block back. **Never hardcode a hex outside `:root`.** The JS `C` object maps token names to `var(--…)` (`t`, `t2`, `t3` = muted, `t4` = faint, for decoration only). Cool gray page `#F5F6F7`, white cards, gray lines, near-black ink. **Ember (`--accent #C2410C`) means "now" and the main action only**: the Now dot, the one primary button on a screen, the current set's inputs, the session clock. Selected states (tabs, day pickers, RIR) are ink, not ember. Green = on track or earned. Deep red = destructive or broken only, never "below target". There is deliberately **no amber/warning tier**. Cards are flat (border, no shadow); sheets and toasts keep a soft shadow.
Type: **Libre Franklin** for words and numbers, weights 400/500/600 only (the 600 face covers 600–900, so heavier weights render as 600). **No all-caps labels** and no wide letter spacing; sentence case everywhere except real codes (HRV, RIR, TDEE). Tabular figures on numbers only (`fontVariantNumeric:"tabular-nums"`, inputs get it from CSS). Product scale: 22px page titles, 15px row titles, 13px secondary, 12px minimum labels, 11px absolute floor. Radii 6 (inputs) / 8-9 (buttons) / 12 (cards). `FD` in `theme.js` is now the same family and kept only so older call sites compile. Copy rules: active voice, short sentences, no em dashes, no semicolons in prose, middots only between data values, empty numerics render "○".

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
`slopePerWeek()` (least-squares line through the raw weigh-ins; fitting the EWMA series under-read the rate by ~15%) is the **only** slope; `getTrend()` applies it to the last 14 days, `calcAdaptiveTDEE` to its estimate window. Do not add another.

## Program versioning
`PROG.start`/`end`/`weeks`/`deload`/`targetWeight` describe the current block (PF Austin Cut: 2026-10-05 → 11-29, goal 175, no fixed deload). They drive week numbers, the TDEE "current" window and the trajectory card, so update them when a new block starts. Engine tests pin the frozen Summer Cut block themselves.
`PROG.version` in `lib/engine.mjs` names the block. The stored `program` row (coach edits: swap/add/remove/update) is kept only while its `version` matches; a different version resets to the code's days. **Bump `PROG.version` whenever you edit `PROG.days`.**

## Sync health
`sb.upsert` distinguishes two failure classes. **HTTP errors** (schema/auth) are loud: console.error + one toast per table per session + a red dot on You — a red dot means a Supabase column/table is missing; check `/supabase/` for a pending migration. **Network blips** (request never left the phone) are transient: retried once after 1.5s, listed quietly on You as "dropped requests", never toasted, and cleared by the next successful write to that table. A full re-sync fires on `online` and on returning to the foreground with recorded failures.

## Settings (User-Customizable)
Stored in `data.settings`: `calories` (default 1790), `protein` (200), `water` (128), `steps` (15000), `sleep` (7.5), `fiber` (30), `trainingCal` (2000), `wednesdayCal` (900), `weekendCal` (1800; app renders Sat +100 / Sun −100), `syncToken`, `notifyToken`, `customHabits`, `reminders` (dormant).

## Pushing Workout & Settings Updates via API
When the user agrees to a workout program change or settings adjustment during conversation, push it live using `/api/update` — no code change or deploy needed.

```bash
set -a; source /home/dwrzl/health-hub/.env.local; set +a   # or: ./scripts/push-update.sh '<json>'
HEALTH_HUB_URL=${HEALTH_HUB_URL:-https://health-hub-topaz-sigma.vercel.app}
curl -s -X POST "${HEALTH_HUB_URL}/api/update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${UPDATE_TOKEN}" \
  -d '{"changes":[...],"reason":"..."}'
```

Payload format: see `api/schema.md`. Change types: `settings` field/value, `exercise` update/swap/add/remove. Always include a `reason`. The change is applied server-side at once; the app shows it as a toast on next launch.

## Claude.ai MCP Integration (the Coach)
`/api/mcp` is the second delivery vehicle; see `COACH.md` for the tool contract and the Claude.ai project instructions. Reads run the engine over `loadAll()`. Writes go straight to the live tables; settings/program changes are applied server-side by `writeProgramChanges` and logged to `program_updates` (`applied`, `applied_at`, `source`, `summary`, `reason`), which the app toasts on next launch and lists under You → Coach changes. There is no client-side apply step anymore.

## Environment variables (Vercel)
`ANTHROPIC_API_KEY`, `AI_MODEL` (optional), `SUPABASE_URL`/`SUPABASE_KEY` (or `SUPABASE_ANON_KEY`), `UPDATE_TOKEN`, `SYNC_TOKEN`, `OURA_PAT`, `OURA_SYNC_SECRET` (optional), `CRONOMETER_USERNAME`/`CRONOMETER_PASSWORD`, `CRONOMETER_SYNC_SECRET` (optional), `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, `NOTIFY_TOKEN` (optional), `MCP_TOKEN` (Coach lock), `CRON_SECRET` (required: cron proof).

## Checks
`npm run check` — builds `app.js`, runs `npm test` (72 tests: engine, mapping, every API route with the network mocked), and syntax-checks every `/api/*.js`. Verify UI changes by loading the app (`npm run serve`, use `?clock=HH:MM&day=weekday` to simulate moments). Push notifications deep-link with `?tab=training`.

## Git Workflow
1. `npm run check`, then commit `src/app.jsx` **and** `app.js` together with a clear message
2. Push to a feature branch
3. Create a PR
4. Note: `.github/workflows/auto-merge-claude.yml` rebuilds `app.js` if stale, then auto-merges `claude/**` branches (every push there is a production deploy)

## Local workspace (Raspberry Pi, T3 Code)
This checkout at `/home/dwrzl/health-hub` is the primary place to build and maintain the app. See `LOCAL_SETUP.md`. Secrets live in Vercel; `.env.local` is a gitignored copy (`vercel env pull`). Background and past planning docs live in `docs/` (`docs/coach-system/`, `docs/archive/`); where they disagree with this file, this file wins.

## Security
See `SECURITY.md` — hardening is documented and deliberately deferred.
