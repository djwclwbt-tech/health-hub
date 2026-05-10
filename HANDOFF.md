# Health Hub — Full Project Handoff

## What This Is
A single-page PWA for personal health/fitness tracking built for one user executing a fat-loss cut while preserving muscle and performance. Deployed on Vercel, data in Supabase, offline-first via localStorage.

**Live URL:** https://health-hub-topaz-sigma.vercel.app
**Repo:** https://github.com/djwclwbt-tech/health-hub
**Primary branch:** `main` (auto-merges from `claude/**` branches via GitHub Actions)

---

## Tech Stack
- **Frontend:** React 18 via CDN, Babel in-browser transpilation. NO build step, NO npm, NO bundler.
- **Everything lives in `index.html`** (~3700 lines). All components inline.
- **Backend:** Vercel Serverless Functions (`/api/*.js`)
- **Database:** Supabase PostgreSQL (cloud sync)
- **Local Storage:** `localStorage` key `dhub6` — offline-first, syncs to Supabase on load
- **AI:** Claude API (Sonnet 4) for meal estimation, workout coaching, weekly analysis, body comp
- **External integrations:** Oura/recovery data where configured, Cronometer (nutrition sync via cron)

---

## Architecture

```
index.html          — Complete SPA, all React components
api/analyze.js      — Weekly AI health analysis
api/coach.js        — Mid-workout AI coaching
api/estimate.js     — AI meal nutrition estimation (photo + text)
api/update.js       — External program update endpoint (MCP, curl, scripts)
api/mcp.js          — Remote MCP server for Claude.ai integration
api/cronometer-sync.js — Cronometer nutrition sync (cron)
lib/cronometer.js   — Cronometer GWT-RPC auth + CSV parsing
sw.js               — Service worker (network-first for navigation, push notifications)
```

---

## Data Model

All data stored in localStorage under key `dhub6`, structured as:

```javascript
{
  wk: { "2026-04-14": { day: "tuesday", exercises: [...], dur: 55, volume: 12500 } },
  nut: { "2026-04-14": { meals: [...], totalCal, totalProtein, totalCarbs, totalFat, totalFiber } },
  wt: { "2026-04-14": 185.2 },
  rec: { "2026-04-14": { recoveryScore, hrv, rhr, sleepHours, sleepPerformance, strain, ... } },
  steps: { "2026-04-14": 11200 },
  water: { "2026-04-14": 96 },
  habits: { "2026-04-14": { alcohol: false, cannabis: false, screensOff: true, sunlight: true, bedBy1030: true, readBeforeBed: true, supplements: true, custom: {} } },
  prog: { "smith-flat-bench": { currentWeight: 150, lastReps: [8,8,8], lastDate: "2026-03-31", progressed: true, pr: {...}, e1rmHistory: [...] } },
  program: { tuesday: { name: "Upper A", exercises: [...] }, ... },
  settings: { calories: 1800, protein: 200, water: 128, steps: 15000, sleep: 7.5, fiber: 30, trainingCal: 1800, wednesdayCal: 900, weekendCal: 1700 },
  qm: [],           // Quick meal library
  mob: {},          // Mobility/stretching completion
  cardio: {},       // Cardio sessions
  bodyComp: {},     // Body composition assessments
  bodyMeas: {},     // Body measurements (chest, waist, arms, thighs)
  travelDays: {},   // Days marked as travel
  tdeeExclude: {},  // Days excluded from TDEE calc
}
```

### Key Data Concepts
- **`prog`** (progression state): Keyed by exercise ID. Tracks currentWeight, lastReps, whether they progressed, estimated 1RM history, and personal records.
- **`program`** (exercise definitions): The actual workout template. Days → exercises with sets, rep ranges, rest, starting weight, increment.
- **`PROG`** (hardcoded constant): The master program definition at the top of index.html. On first load or when exercises change, this seeds `data.program`.
- **Merge priority on load:** Supabase wins for date-keyed data (Oura/Cronometer write directly). Local wins for `prog` (most recent workout actions).

---

## Program Structure

```javascript
PROG = {
  name: "Upper/Lower v2",
  weeks: 8,
  deload: 5,          // Week 5 is deload (50% weight)
  start: "2026-03-09",
  days: {
    monday: { name: "Abs + Mobility", ... },
    tuesday: { name: "Upper A", focus: "Strength", exercises: [...] },
    wednesday: { name: "Lower A", focus: "Strength", exercises: [...] },
    thursday: { name: "Upper B", focus: "Hypertrophy", exercises: [...] },
    friday: { name: "Lower B", focus: "Hypertrophy", exercises: [...] },
  },
  mobility: { _default: [...] },  // Timed stretching routines
  variants: { ... }               // Exercise variants per day
}
```

### Progression System
- `gw(id, def)`: Resolves current weight. Priority: `data.prog[id].currentWeight` → last workout history weight → `def` (exercise sw).
- `finishWorkout()`: On workout completion, checks if all sets hit top of rep range (`hit`). If hit: `currentWeight += inc`. If deload: preserves pre-deload weight.
- `wkn(date)`: Returns week number since PROG.start. Used to detect deload week.
- Deload week = 50% of currentWeight for all sets. Does NOT affect progression state.

---

## Tabs / UI Structure
1. **Dashboard** — Daily summary, habit score, weight trend, volume card, PR board, body measurements, recovery correlation
2. **Training** — Day's exercises with warmups, start workout flow, exercise swap mid-workout, coach chat
3. **Food** — Nutrition tracking (AI photo estimation or manual macro entry), auto-calc calories from macros, weekly calorie total
4. **Habits** — 7 system habits + custom habits, health metrics (recovery/HRV/RHR from Oura), weight check-in, score & streaks
5. **Settings** — Targets, body comp photos, measurement logging, data import/export, program display

---

## Critical Functions (index.html)

| Function | Line (approx) | Purpose |
|----------|---------------|---------|
| `gw(id, def)` | ~1743 | Weight resolution for exercises |
| `startW()` | ~1756 | Initialize workout session |
| `finishWorkout()` | ~1807 | Complete workout, update progression |
| `loadFromSB()` | ~251 | Load all data from Supabase |
| `syncToSB(d)` | ~195 | Full sync to Supabase |
| `svSB.*` | ~220-248 | Individual table sync functions |
| `backfillData(d)` | ~454 | Backfill volume/e1RM from history |
| `repairDeloadProgression(d)` | ~456 | One-time repair of deload-corrupted weights |
| `applyProgramUpdates(d)` | ~3530 | Apply queued program changes from Supabase |
| `wkn(date)` | ~376 | Calculate week number |
| `getStalls(prog, wk)` | ~458 | Detect exercises with 3+ weeks no progression |
| `getInsights()` | ~1050 | Generate dashboard insight cards |

---

## API Endpoints

### POST /api/update
Push program changes (exercise swaps, setting changes) via authenticated API. Changes queue in `program_updates` table, applied on next app load.

### POST /api/estimate
AI meal estimation. Accepts text description and/or base64 image. Returns calories, protein, carbs, fat, fiber. Prioritizes label OCR for branded products.

### POST /api/coach
Mid-workout AI coaching. Receives current exercise, set data, progression history, recovery state. Returns coaching advice + optional actions (weight adjustments, form cues).

### POST /api/analyze
Weekly health analysis. Receives 7 days of workout, nutrition, recovery, habit data. Returns structured insights across training, nutrition, recovery, and body composition.

### GET/POST /api/mcp
Remote MCP server for Claude.ai integration. Tools: `get_program`, `update_settings`, `update_exercise`.

### GET /api/oura-sync (cron: 9AM + 11PM CDT)
Pulls recovery, sleep, strain from Oura API. Upserts to Supabase `recovery` table.

### GET /api/cronometer-sync (cron: hourly)
Pulls daily nutrition from Cronometer. Upserts to Supabase `nutrition` table.

---

## Recent Fixes & Features (reverse chronological)

1. **Deload progression fix** (just deployed) — finishWorkout now preserves pre-deload weights instead of overwriting with 50% values. Includes one-time repair function.
2. **e1RM chart fix** — Group by session (max per date), fix since-start calculation
3. **Body measurements dashboard card** — Chest, waist, arms, thighs with delta tracking
4. **5 bug fixes** — Deficit label, volume chart, strain rounding, stalled lifts dedup, oura steps
5. **e1RM strength progress chart** — Training tab sparkline per exercise
6. **TDEE exclude toggle** — Skip days with <1200 cal from TDEE calculation
7. **Merge priority fix** — Supabase wins for date-keyed data (external syncs)
8. **Cronometer sync** — Hourly cron pulls nutrition data
9. **Oura integration** — Full OAuth2 + daily sync + webhook + strain
10. **Exercise swap mid-workout** — Bottom-sheet with anatomically-matched alternatives
11. **PWA icon fix** — Added missing 192px and 512px icons
12. **Anti-cache fixes** — Network-first HTML, no-cache headers, updateViaCache:none
13. **Label photo OCR** — AI estimation prioritizes reading nutrition labels exactly
14. **Push notifications** — Morning habits, water, stretch, workout reminders
15. **Timed stretching** — Per-exercise countdown, vibrate, auto-advance sides
16. **Weekly calorie total** — Running total card on nutrition page
17. **Auto-calc calories from macros** — Removed manual cal input, computes from P×4 + C×4 + F×9
18. **Habits tab** — Replaced Recovery/Oura tab + killed morning debrief popup
19. **Coach JSON fix** — Regex extraction fallback for mixed text+JSON responses
20. **Water tracker date navigation** — Respects viewDate instead of hardcoded today

---

## Known Issues / Tech Debt

1. **PWA home screen cache** — iOS home screen bookmark sometimes serves stale HTML despite network-first SW and no-cache headers. Multiple fixes attempted; may require user to delete and re-add bookmark.
2. **Progression merge priority** — `prog` still uses "local wins" merge. If local has stale data and Supabase has fresh, local overwrites. Should consider timestamp-based merge or "most recent wins".
3. **No workout persistence** — If user closes app mid-workout before Finish, all set data is lost. React state only (not persisted to localStorage until Finish). UPDATE: Main branch now has `localStorage.setItem("dhub6_workout", ...)` — workout IS persisted.
4. **backfillData positional matching** — Uses array index `dayDef.exercises[i]` to match exercises. If exercise order changes, backfill may assign data to wrong exercise.
5. **Single-file SPA** — index.html is ~3700 lines. Hard to navigate but intentional (no build step, instant deploy).

---

## User Preferences & Working Style

- **Direct communication.** No hedging, no "I think maybe we could...". State what's wrong and fix it.
- **Don't fold on recommendations.** If you think something is bad, say so. Push back.
- **Actually test changes.** Don't claim things work without verification.
- **No recreating broken systems.** User explicitly rejected database-backed food search (MFP clone). AI + label photos only.
- **Investigate before pushing fixes.** When something is broken, understand the root cause before shipping code.
- **This is a personal app for one user.** No multi-tenancy, no user auth beyond API tokens.
- **Offline-first is critical.** User tracks workouts mid-session with phone. Network may be spotty in gym.

---

## Environment & Deployment

- **Vercel** — auto-deploys from `main` branch
- **Auto-merge workflow** — `.github/workflows/auto-merge-claude.yml` creates + merges PRs from `claude/**` branches
- **Supabase** — URL: `wszumxewqxkggtevfubb.supabase.co`
- **Env vars (Vercel):** `ANTHROPIC_API_KEY`, `UPDATE_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CRONOMETER_USERNAME`, `CRONOMETER_PASSWORD`, `CRONOMETER_SYNC_SECRET`

---

## How to Push Changes

```bash
# From the repo root:
git checkout -b claude/your-feature-name
# Make changes to index.html and/or api/*.js
git add -A && git commit -m "feat/fix: description"
git push -u origin claude/your-feature-name
# Auto-merge workflow creates PR and merges to main
# Vercel auto-deploys from main
```

For live data/settings changes without code deploys:
```bash
curl -X POST "https://health-hub-topaz-sigma.vercel.app/api/update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $UPDATE_TOKEN" \
  -d '{"changes":[{"type":"settings","field":"protein","value":210}],"reason":"Increased protein target"}'
```

---

## Supabase Tables

| Table | Key | Purpose |
|-------|-----|---------|
| weight | date | Daily weigh-ins |
| steps | date | Daily step counts |
| water | date | Daily water intake (oz) |
| recovery | date | Oura data: recovery%, HRV, RHR, sleep, strain |
| habits | date | Daily habit completion |
| workouts | date | Workout logs with exercises/sets |
| nutrition | date | Meals array + daily totals |
| progression | exercise_id | Current weight, last reps, PR, e1RM history |
| mobility | date | Stretching completion |
| stepper | date | (deprecated) |
| debrief | date | (deprecated — habits tab replaced this) |
| cardio | date | Peloton/cardio sessions |
| body_comp | date | Body composition photo analyses |
| body_measurements | date | Physical measurements |
| travel_days | date | Travel day markers |
| settings | id (singleton) | User targets and preferences |
| program | id (singleton) | Workout program definition |
| program_updates | id | Queue for pending program changes |
| oura_tokens | id | OAuth tokens for Oura API |

---

## Current Program Week

Start date: 2026-03-09, 8 weeks total, deload = week 5.
Week calculation: `Math.floor((today - start) / 7 days) + 1`

As of 2026-05-01: Week 8 (final week of cycle). After week 8, a new mesocycle should be planned (reset week counter, potentially adjust exercise selection or rep schemes).
