# Health Hub — Technical Audit for Third-Party Review

This document describes the complete system for Health Hub, a single-page PWA used daily by one person to track strength training workouts, nutrition, recovery, and habits during body recomposition. It is not a generic health dashboard. It is a daily-use workout tracker — the user opens it at the gym, logs weights and reps set by set, finishes the workout, and the app automatically decides whether to increase weight next session.

---

## 1. Architecture Overview

### File Layout

```
index.html              — Complete SPA (~3733 lines). All React components inline.
api/analyze.js          — Weekly AI health analysis (POST)
api/bodycomp.js         — Body composition photo analysis (POST)
api/coach.js            — Mid-workout AI coaching (POST)
api/estimate.js         — AI meal nutrition estimation with vision (POST)
api/update.js           — External program update endpoint (POST, Bearer auth)
api/mcp.js              — Remote MCP server for Claude.ai integration (GET/POST)
api/whoop-sync.js       — Whoop recovery data sync (GET, cron)
api/whoop-auth.js       — Whoop OAuth2 flow (GET)
api/whoop-webhook.js    — Whoop real-time webhook (POST, HMAC-SHA256)
api/cronometer-sync.js  — Cronometer nutrition sync (GET, cron)
api/sync-nutrition.js   — Apple Shortcut MFP nutrition sync (GET/POST)
lib/whoop.js            — Whoop API utilities (pure functions, native fetch)
lib/cronometer.js       — Cronometer GWT-RPC auth + CSV parsing
sw.js                   — Service worker (network-first navigation, push notifications)
vercel.json             — Serverless config, cron schedules, cache headers
package.json            — Only 2 dependencies: mcp-handler, zod
manifest.json           — PWA manifest
```

### Stack

- **Frontend**: React 18 loaded via CDN (`unpkg.com/react@18`), Babel in-browser transpilation. No build step, no npm, no bundler. Everything in `index.html`.
- **Backend**: Vercel Serverless Functions. Each file in `/api/` is one endpoint. Functions get 1024 MB memory, 60s timeout (`vercel.json:2-5`).
- **Database**: Supabase PostgreSQL at `wszumxewqxkggtevfubb.supabase.co`. Accessed via REST API with the publishable anon key (hardcoded in `index.html:147`).
- **Local storage**: `localStorage` key `dhub6` holds the entire data model as JSON. This is the offline-first source of truth at the gym.
- **AI**: Claude Sonnet 4 (`claude-sonnet-4-20250514`) for all AI features. Called from serverless functions, never from the client.

### Why Single File

This is intentional. No build step means: push `index.html` to `main`, Vercel auto-deploys in seconds. No dependency management, no broken builds. The tradeoff is a 3733-line file that's hard to navigate — but it works for a single developer making targeted changes.

### Deployment

- Vercel auto-deploys from `main` branch
- Auto-merge GitHub Action (`.github/workflows/auto-merge-claude.yml`) creates and merges PRs from any `claude/**` branch
- Env vars on Vercel: `ANTHROPIC_API_KEY`, `UPDATE_TOKEN`, `SUPABASE_URL`, `SUPABASE_KEY`, `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI`, `CRONOMETER_USERNAME`, `CRONOMETER_PASSWORD`, `CRONOMETER_SYNC_SECRET`

---

## 2. Data Model

All client-side data lives in `localStorage` under key `dhub6` (`index.html:138`). The shape is defined by `bl()` at line 143:

```javascript
{
  wk: {                          // Workout logs, keyed by YYYY-MM-DD
    "2026-04-22": {
      day: "tuesday",
      variant: null,
      exercises: [
        {
          id: "smith-flat-bench",
          wu: [{ w: 70, r: 10, l: "50%", done: true }, ...],
          sets: [{ weight: 150, reps: 7, rir: "", done: true }, ...],
          swappedTo: null          // or { id, name, sw, inc, unit, cue } if swapped mid-workout
        }
      ],
      dur: 62,                     // duration in minutes
      volume: 14200                // total volume (weight * reps summed)
    }
  },

  nut: {                          // Nutrition logs, keyed by date
    "2026-04-22": {
      meals: [
        { description: "Grilled chicken + rice", cal: 650, protein: 52, carbs: 60, fat: 18, fiber: 3 }
      ],
      totalCal: 2450,
      totalProtein: 195,
      totalCarbs: 230,
      totalFat: 72,
      totalFiber: 28
    }
  },

  wt: { "2026-04-22": 184.6 },   // Weight in lbs, keyed by date

  rec: {                          // Recovery from Whoop, keyed by date
    "2026-04-22": {
      recoveryScore: 72,           // 0-100 percentage
      hrv: 48,                     // ms
      rhr: 52,                     // bpm
      sleepHours: 7.2,
      sleepPerformance: 85,        // percentage
      strain: 12.4,                // 0-21 Whoop scale
      respiratoryRate: 15.2,
      wakeTime: "6:30",
      notes: null
    }
  },

  steps: { "2026-04-22": 11200 }, // Daily step count
  water: { "2026-04-22": 96 },    // Oz consumed

  habits: {                       // Daily habit checklist, keyed by date
    "2026-04-22": {
      alcohol: false,              // true = consumed (bad)
      cannabis: false,
      screensOff: true,            // screens off by 10pm
      sunlight: true,              // morning sunlight
      bedBy1030: true,
      readBeforeBed: true,
      supplements: true,
      custom: {}                   // user-defined habits
    }
  },

  prog: {                         // Progression state, keyed by exercise ID
    "smith-flat-bench": {
      currentWeight: 150,          // what to load next session
      lastReps: [7, 7, 6],        // reps achieved per set last time
      lastDate: "2026-04-22",
      progressed: true,            // did weight increase last session?
      pr: { name: "Smith Flat Bench", weight: 150, reps: 8, e1rm: 190, date: "2026-04-15" },
      e1rmHistory: [               // last 12 sessions, for sparkline chart
        { date: "2026-03-25", e1rm: 175 },
        { date: "2026-04-01", e1rm: 180 },
        ...
      ]
    }
  },

  program: {                      // Active workout template, keyed by day name
    tuesday: {
      name: "Chest Heavy Upper A",
      focus: "Strength",
      exercises: [...]             // same shape as PROG.days.tuesday.exercises
    },
    ...
  },

  settings: {
    calories: 2430,
    protein: 200,
    water: 128,                    // oz
    steps: 10000,
    sleep: 7.5,                    // hours
    fiber: 30,                     // grams
    mondayCal: 1300,               // caloric cycling: low on Monday (rest day)
    trainingCal: 2600,             // training days Tue-Fri
    weekendCal: 2500,
    customHabits: [],
    notifications: { enabled: false, habits: true, water: true, stretch: true, workout: true }
  },

  qm: [],                         // Quick meal library (saved meals for re-use)
  mob: { "2026-04-22": { done: true, dur: 720, exercises: 10 } },  // Mobility/stretching
  cardio: { "2026-04-22": { type: "peloton", duration: 35, done: true } },
  bodyComp: {},                    // Body composition photo assessments
  bodyMeas: {},                    // Physical measurements (chest, waist, arms, thighs)
  travelDays: {},                  // Dates marked as travel
  tdeeExclude: {},                 // Dates excluded from TDEE calculation
}
```

### Key Distinctions

- **`prog`** = live progression state. Keyed by exercise ID (`"smith-flat-bench"`). This is what determines the weight you load next session. Written by `finishWorkout()`.
- **`program`** = the workout template. Keyed by day name (`"tuesday"`). Defines what exercises exist on each day, their sets, rep ranges, rest, starting weight, increment. Seeded from the `PROG` constant on first load.
- **`PROG`** = the hardcoded master program definition at the top of `index.html` (lines 32-132). On first load or when exercises change, this seeds `data.program`. It also defines mobility routines, day variants, deload week number, and program start date.

---

## 3. Workout Flow (Start to Finish)

This is the core loop. The user opens the app at the gym, the Training tab shows today's workout, they tap Start, log each set, and tap Finish.

### Step 1: Weight Resolution — `gw(id, def)` at line 1745

When displaying exercises or starting a workout, the app needs to know what weight to show. `gw()` resolves this with a fallback chain:

```
data.prog[id].currentWeight → most recent workout history for that exercise → def (exercise.sw)
```

```javascript
const gw = (id, def) => {
  const p = data.prog[id]?.currentWeight;
  if (p != null) return p;                     // 1. Progression state wins
  const dates = Object.keys(data.wk).sort().reverse();
  for (const d of dates) {
    const wex = data.wk[d].exercises?.find(e => e.id === id);
    if (wex) {
      const ds = wex.sets?.filter(s => s.done && s.weight > 0);
      if (ds?.length) return ds[0].weight;     // 2. Last logged weight
    }
  }
  return def;                                   // 3. Starting weight from program
};
```

### Step 2: Start Workout — `startW()` at line 1757

Creates the workout object in React state. For each exercise:
1. Calls `gw(ex.id, ex.sw)` to get current working weight
2. If it's deload week: `Math.round(cw * 0.5 / 5) * 5` (50% rounded to nearest 5)
3. Generates warmup sets via `WU()` (line 133): 50% x 10, 70% x 5, 85% x 3 (thresholds apply)
4. Creates `ex.sets` working sets (all at the resolved weight, reps=0, done=false)
5. Sets `workout.isDeload` flag on the workout object

The workout is immediately persisted to `localStorage.dhub6_workout` via the `setWorkout` wrapper (line 3583). This survives app close/crash mid-workout.

### Step 3: Logging Sets

During the workout, the user taps each set to mark it done (`dS()` at line 1770). They can edit weight and reps per set (`uS()` at line 1765). Rest timer starts automatically based on exercise rest time. Timer survives app backgrounding via `visibilitychange` listener (line 1789).

### Step 4: Mid-Workout Swap

If equipment is taken, the user can swap any exercise via `SWAP_MAP` (lines 1578-1669). The swap modal shows anatomically-matched alternatives with their last-used weight. When selected, the workout's exercise gets a `swappedTo` field, and all subsequent sets use the new exercise's progression track.

### Step 5: Finish Workout — `finishWorkout()` at line 1809

This is the most critical function. It processes every exercise in the workout:

```javascript
workout.exercises.forEach((ex, i) => {
  const pe = s.exercises[i];              // program exercise definition
  const aid = ex.swappedTo ? ex.swappedTo.id : pe.id;      // actual exercise ID
  const ainc = ex.swappedTo ? ex.swappedTo.inc : pe.inc;    // weight increment
  const cs = ex.sets.filter(s => s.done);                    // completed sets

  // Did user hit all sets at top of rep range?
  const hit = cs.length === pe.sets && cs.every(s => s.reps >= pe.rr[1]);
  const cw = cs[0].weight;               // weight actually used

  // Preserve pre-deload weight during deload weeks
  const prevWeight = nd.prog[aid]?.currentWeight || gw(aid, asw);
  const newWeight = workout.isDeload
    ? prevWeight                          // DELOAD: keep pre-deload weight
    : (ainc === 0 ? cw : (hit ? cw + ainc : cw));  // NORMAL: progress if hit

  nd.prog[aid] = {
    currentWeight: newWeight,
    lastReps: cs.map(s => s.reps),
    lastDate: t,
    progressed: workout.isDeload ? false : (hit && ainc > 0),
    pr: prevPr || null,
    e1rmHistory: prevHistory
  };

  // e1RM and PR tracking only for non-deload workouts
  if (!workout.isDeload) {
    const bestSet = cs.reduce((best, s) =>
      e1rm(s.weight, s.reps) > e1rm(best.weight, best.reps) ? s : best, cs[0]);
    const newE1rm = e1rm(bestSet.weight, bestSet.reps);
    if (newE1rm > 0) {
      nd.prog[aid].e1rmHistory = [...prevHistory, { date: t, e1rm: newE1rm }].slice(-12);
      if (!prevPr || newE1rm > prevPr.e1rm)
        nd.prog[aid].pr = { name: aname, weight: bestSet.weight, reps: bestSet.reps, e1rm: newE1rm, date: t };
    }
  }
});
```

After processing all exercises:
- Calculates total volume: `calcVolume()` at line 452
- Saves to `data.wk[today]`
- Writes to localStorage via `sv()`
- Syncs workout + each progression entry to Supabase via `svSB.workout()` and `svSB.progression()`
- Clears the workout state and rest timer

### Workout Persistence

`setWorkout` (line 3583) wraps React's `setWorkoutRaw` to also write to `localStorage.dhub6_workout`. On mount (line 3582), the app restores any in-progress workout from this key. This means: if the user closes the app mid-workout and reopens, the workout is still there with all sets logged so far.

---

## 4. Progression Logic

### The Rule

Each exercise has a rep range `rr: [low, high]` and an increment `inc`. After a workout:
- If the user completed all prescribed sets AND hit the top of the rep range on every set → increase weight by `inc` for next session
- Otherwise → keep the same weight
- If `inc === 0` (bodyweight exercises like hanging leg raises) → use whatever weight was logged

### Example

Smith Flat Bench: `sets: 3, rr: [5, 8], inc: 5`
- User does 150 lbs for 8, 8, 8 → `hit = true` → next session: 155 lbs
- User does 150 lbs for 8, 7, 6 → `hit = false` → next session: 150 lbs

### Deload Handling

The program runs 8-week cycles. Week 5 is deload (`PROG.deload: 5`, line 33). Start date is `2026-03-09`.

- `wkn(date)` (line 376) calculates week number: `Math.floor((date - start) / 7 days) + 1`
- During deload: `startW()` loads 50% of `currentWeight`, rounded to nearest 5
- `finishWorkout()` checks `workout.isDeload` — if true, preserves `prevWeight` instead of overwriting with the 50% value
- e1RM and PR tracking are skipped during deload

### Deload Repair

`repairDeloadProgression()` (line 456) is a one-time repair function that runs on every app load. It scans all exercises and checks if `currentWeight` is suspiciously low (<75% of what the most recent non-deload workout suggests). If so, it restores the correct weight. This was added to fix a bug where deload weights were being written to `currentWeight`.

### Stall Detection

`getStalls()` (line 459) checks every exercise: if the last 3 workout sessions all failed to hit the top of the rep range, the exercise is flagged as stalled. The coach AI receives this flag and can recommend changes.

### e1RM Calculation

`e1rm(w, r)` at line 451: `r === 1 ? w : Math.round(w * (1 + r/30))`. Simple Epley-like formula. Used for PR tracking and the sparkline chart on the Training tab.

---

## 5. Exercise Swapping

### SWAP_MAP (lines 1578-1669)

A hardcoded mapping from exercise ID to an array of alternatives. Alternatives are anatomically matched — pressing movements swap with pressing movements, hinges with hinges, etc.

```javascript
SWAP_MAP = {
  "smith-flat-bench": [
    { id: "smith-incline", name: "Smith Incline Press", sw: 105, unit: "lbs", inc: 5, cue: "..." },
    { id: "converging-chest-press", name: "Converging Chest Press", sw: 140, unit: "lbs", inc: 5, cue: "..." },
    { id: "cable-fly", name: "Cable Fly (flat)", sw: 10, unit: "lbs/side", inc: 2.5, cue: "..." },
  ],
  // ... 20+ exercise IDs mapped
}
```

### Swap Flow

1. During workout, user taps swap button on an exercise
2. `SwapModal` (line 1672) shows alternatives from `SWAP_MAP[exerciseId]`
3. Each option shows last-used weight (via `gw()`) or starting weight
4. On selection: the workout exercise gets `swappedTo: { id, name, sw, inc, unit, cue }`
5. `finishWorkout()` reads `ex.swappedTo.id` for progression — the swapped exercise gets its own progression track
6. The original exercise's progression is untouched

### Key Detail

Swapped exercises use their own `data.prog[swappedId]` entry. So if you swap Smith Bench for Converging Chest Press, the Converging Chest Press gets its own `currentWeight` tracking. Next time you see it in the swap list, `gw()` returns its last-used weight.

---

## 6. Sync Behavior

### Architecture

The app is offline-first. All writes go to `localStorage` immediately. Supabase is a cloud backup that also receives data from external integrations (Whoop, Cronometer).

### On App Load (lines 3593-3642)

1. Load all tables from Supabase in parallel via `loadFromSB()` (line 253)
2. Load local data via `ld()` (line 139)
3. Smart merge with clear priority rules:
   - **Date-keyed data** (wk, nut, wt, rec, steps, water, habits, mob, cardio, etc.): `{...local, ...supabase}` — **Supabase wins**. This is because Whoop and Cronometer write directly to Supabase.
   - **Progression** (`prog`): `{...supabase, ...local}` — **Local wins**. The most recent workout action is always on the device.
   - Settings, program: Supabase overlay on local
4. Apply pending program updates from `program_updates` table via `applyProgramUpdates()` (line 3536)
5. Run `backfillData()` (line 454) to compute missing volume and e1RM history
6. Run `repairDeloadProgression()` (line 456) to fix any deload-corrupted weights
7. Save merged data to both localStorage and Supabase
8. Sync all `prog` entries back to Supabase (line 3639)

### On Every Data Change (lines 3705-3708)

```javascript
useEffect(() => {
  sv(data);                    // save to localStorage immediately
  if (sbLoaded) syncToSB(data); // debounced (2s) full sync to Supabase
}, [data, sbLoaded]);
```

`syncToSB()` (line 179) is debounced at 2 seconds. It iterates every data category and upserts each entry individually. This means a burst of UI changes (logging 3 sets quickly) only triggers one sync.

### Individual Writes — `svSB` (lines 222-251)

For targeted sync after specific actions (finish workout, log weight, etc.), the code calls `svSB.workout()`, `svSB.progression()`, etc. These are immediate (not debounced) upserts for the specific record.

### Supabase Client (lines 150-175)

A minimal REST wrapper — not the Supabase JS SDK. Four operations:
- `sb.upsert(table, data, conflict)` — POST with `Prefer: resolution=merge-duplicates`
- `sb.select(table, order, dir, limit)` — GET with ordering
- `sb.deleteRow(table, col, val)` — DELETE single row
- `sb.deleteAll(table)` — DELETE all rows (used by Reset All Data)

### Program Updates Queue

External changes (from MCP, `/api/update`, or coach actions) don't modify the app directly. They insert rows into the `program_updates` Supabase table with `applied: false`. On next app load, `applyProgramUpdates()` reads pending rows, applies them, marks them `applied: true`, and shows toast notifications.

---

## 7. Cronometer Integration

### Purpose

Hourly cron pulls nutrition data from Cronometer into Supabase's `nutrition` table. The user logs food in Cronometer throughout the day; the app picks it up automatically.

### How It Works — `api/cronometer-sync.js` + `lib/cronometer.js`

The Cronometer web app has no public API. The integration reverse-engineers their internal GWT-RPC protocol:

1. **GET `/login/`** — fetch login page, follow redirects, extract `anticsrf` token from HTML
2. **POST `/login`** — submit form with `anticsrf`, `username`, `password` → get `sesnonce` cookie
3. **POST GWT-RPC `authenticate`** — send serialized GWT-RPC payload → get `userId`
4. **POST GWT-RPC `generateAuthorizationToken`** — get export auth token
5. **GET `/export?nonce=...&generate=servings`** — download CSV for date range

The CSV is parsed by `parseServings()` (line 256 in `lib/cronometer.js`). It groups food items by date, sums macros, and returns per-day nutrition objects matching the app's format.

### Fragility

Two hardcoded constants in `lib/cronometer.js`:
- `GWT_PERMUTATION = '7B121DC5483BF272B1BC1916DA9FA963'` (line 26)
- The GWT-RPC serialized payloads (lines 45-57)

If Cronometer updates their frontend, these break silently. The fix is to inspect network requests on cronometer.com in browser devtools and update the constants.

### Cron Schedule

`vercel.json:12`: runs once daily at midnight UTC (`"0 0 * * *"`). Fetches today's data. The result is upserted to Supabase's `nutrition` table, which the app picks up on next load (Supabase wins for date-keyed data).

### Also: `api/sync-nutrition.js`

A separate endpoint for Apple Shortcuts integration. POST with `{ date, calories, protein, carbs, fat, fiber }` and `SYNC_TOKEN` auth. Upserts daily totals directly to the nutrition table. This was the original MFP sync path before Cronometer.

---

## 8. Mobility Routine

### Definition — `PROG.mobility._default` (lines 34-51)

Five timed stretches:

| Exercise | Duration | Sets | Sides | Priority |
|----------|----------|------|-------|----------|
| Kneeling Hip Flexor Stretch | 90s | 3 | Left, Right, Left | Highest (left gets extra) |
| Hip 90/90 | 60s | 2 | Left, Right | Feeds hack squat depth |
| Pigeon Stretch | 60s | 2 | Left, Right | Deep external rotators |
| Supine Psoas Release | 90s | 2 | Left, Right | Left side priority |
| Supine Spinal Twist | 60s | 2 | Left, Right | Decompression |

Total: ~12 minutes.

### Flow

1. User taps "Start Mobility" on the Training tab
2. `startMob()` (line 1850) begins a session timer, persists `{ running: true, startedAt }` to `localStorage.dhub6_mob_active`
3. Each stretch has a countdown timer via `startStretchTimer()` (line 1854)
4. Timer counts down, vibrates on completion, auto-advances to next side/exercise
5. User can skip individual timers
6. `finishMob()` (line 1879) records total duration to `data.mob[today]` and syncs to Supabase
7. Mobility state persists across app close — restores on mount (line 1721)

### When It's Done

The Training tab shows whether today's mobility is complete. The evening notification (8-9 PM) reminds the user if they haven't done it.

---

## 9. AI Features

All AI calls use Claude Sonnet 4 (`claude-sonnet-4-20250514`) via the Anthropic Messages API. The `ANTHROPIC_API_KEY` env var is only on the server.

### 9a. Meal Estimation — `api/estimate.js`

**Input**: Text description and/or base64 image (photo of food or nutrition label).
**Output**: `{ description, cal, protein, carbs, fat, fiber, components, confidence, notes }`

System prompt (line 56) has 10 critical rules:
1. **Nutrition label photos get highest priority** — read exact values, don't estimate
2. Branded products without labels get `confidence: "low"`
3. Estimate portions on the higher end (people underestimate)
4. Account for hidden calories (oils, sauces, dressings)
5. Use USDA reference values per 100g
6. Cross-check: `cal ≈ protein*4 + carbs*4 + fat*9`
7. For photos: use visual references (plate ~10in, fork ~7in)
8. Accepts context: user's daily targets, past corrections, recent meals

The client sends recent meal descriptions and any prior corrections so the AI calibrates to the user's actual portions over time.

### 9b. Mid-Workout Coach — `api/coach.js`

**Input**: Question, current exercise details, weight, reps, sets done, focus day, last 4 sessions of progression history, today's recovery from Whoop, stall status, program week.
**Output**: `{ answer, actions }` — text advice + optional program changes.

The coach can return actions that modify the program live:
- `{ type: "settings", field: "trainingCal", value: 2800 }`
- `{ type: "exercise", action: "update", exerciseId: "bench-press", fields: { sw: 145 } }`
- `{ type: "exercise", action: "swap", oldExerciseId: "...", newExercise: { ... } }`

Actions are only included when the user explicitly asks for a change. `applyCoachActions()` (line 1894) processes them immediately on the client side.

The system prompt instructs the AI to:
- Reference progression history to identify trends
- Factor in recovery data (reduce intensity if poor)
- If exercise is stalled, suggest technique changes or alternatives
- Factor in program week (early = build volume, late = peak, deload = form focus)

### 9c. Weekly Analysis — `api/analyze.js`

**Input**: 7-day window of all data: workouts, nutrition averages, recovery averages, weight change, steps, water, habits score, body composition assessments.
**Output**: Structured JSON with scores (0-100 per category), wins, gaps, trends, correlations, recommendations, next-week focus, and body composition trends.

Scoring guide in the system prompt: 100 = perfect execution, 70+ = solid, 45-70 = inconsistent, <45 = needs attention.

### 9d. Body Composition Analysis — `api/bodycomp.js`

**Input**: Base64 photo of the user's body.
**Output**: Body fat range estimate, muscle development assessment, areas of progress, areas to focus.

### 9e. MCP Integration — `api/mcp.js`

Remote MCP server using `mcp-handler` + `zod`. Allows Claude.ai conversations to modify the program without touching code:

**Tools**:
- `get_program` — returns current program structure (exercises, settings) as a hardcoded snapshot (`PROGRAM_SNAPSHOT`, line 17)
- `update_settings` — queues a settings change to `program_updates` table
- `update_exercise` — queues exercise add/remove/swap/update to `program_updates` table

The snapshot in `mcp.js` is hardcoded and may drift from `PROG` in `index.html`. This is a known issue.

---

## 10. Known Technical Debt

### Critical

1. **`PROGRAM_SNAPSHOT` in `mcp.js` is stale** (lines 17-72). It's a hardcoded copy of the program that doesn't update when `PROG` in `index.html` changes. The MCP `get_program` tool returns outdated exercise lists. Fix: read from Supabase `program` table instead, or generate the snapshot from `PROG` at build time (there is no build time).

2. **Progression merge: local always wins**. `prog` merge is `{...supabase, ...local}` (line 3612). If the user hasn't opened the app in weeks and Supabase has fresher data from a different device, local overwrites it. Should be timestamp-based (most recent `lastDate` wins per exercise).

3. **`backfillData` positional matching** (line 454). Uses array index `dayDef.exercises[i]` to match logged exercises to program definitions. If exercise order changes (e.g., via a program update that reorders exercises), backfill assigns e1RM data to the wrong exercise.

4. **Supabase anon key hardcoded in client** (line 147-148). `SB_KEY` is visible in page source. Supabase RLS (Row Level Security) must be properly configured to prevent unauthorized data access. Currently unclear if RLS is enforced.

### Moderate

5. **Single-file SPA at ~3733 lines**. Intentional but limits collaboration. No code splitting, no lazy loading. The entire app loads on every page view.

6. **No error boundaries**. A crash in any component brings down the whole app. React error boundary would at least isolate tab crashes.

7. **Debounced sync can lose data**. `syncToSB()` has a 2-second debounce (line 181). If the user finishes a workout and closes the app within 2 seconds, the full sync may not fire. The individual `svSB.workout()` calls in `finishWorkout()` mitigate this for workout data, but other data categories rely on the debounced sync.

8. **PWA cache staleness on iOS**. iOS home screen bookmarks sometimes serve stale HTML despite network-first service worker and no-cache headers. Multiple fixes attempted (Cache-Control headers, SW `updateViaCache: 'none'`, `skipWaiting`). The issue persists intermittently.

9. **No TypeScript**. All state is plain objects with no type checking. Shape mismatches between client data model and Supabase column names are caught only at runtime.

### Minor

10. **Warmup generation thresholds are arbitrary** (`WU()` at line 133). 50% at 95+ lbs, 70% at 135+ lbs, 85% at 155+ lbs. These work but aren't configurable.

11. **Coach JSON parsing fallback** (lines 54-72 in `coach.js`). The AI sometimes returns text before JSON. The fallback regex `text.match(/\{[\s\S]*\}$/)` works but is fragile — it grabs the last JSON-like block.

12. **Cronometer GWT constants** (`lib/cronometer.js:26`). `GWT_PERMUTATION` will break without warning when Cronometer deploys a frontend update. There's no monitoring for this.

---

## 11. Recommended Refactor Plan

Priority order based on impact and risk:

### Phase 1: Data Integrity (do first)

1. **Fix progression merge to be timestamp-based**. Compare `prog[exId].lastDate` between local and Supabase. Whichever is newer wins for that exercise. This prevents stale local data from overwriting fresh Supabase data.

2. **Fix `backfillData` to match by exercise ID, not array index**. Instead of `dayDef.exercises[i]`, match workout exercises to program exercises by `id` field. This makes backfill safe across exercise reorder.

3. **Make `mcp.js` read from Supabase `program` table** instead of the hardcoded `PROGRAM_SNAPSHOT`. The table already contains the live program. Read it in `get_program`, use it as the source of truth.

### Phase 2: Resilience

4. **Add React error boundary** around each tab. If the Settings tab crashes, the Training tab still works.

5. **Make `syncToSB` flush on `beforeunload`**. Add a `window.addEventListener('beforeunload', ...)` that cancels the debounce timer and fires the sync immediately. This prevents data loss on app close.

6. **Add Supabase RLS audit**. Verify that the anon key cannot read/write other users' data (even though this is a single-user app, the key is public).

### Phase 3: Quality of Life

7. **Extract components from `index.html`** into separate files loaded via ES module imports. This would require a build step (or clever use of `<script type="module">`), but would make the codebase navigable.

8. **Add Cronometer health check**. A lightweight probe that hits the Cronometer login page and verifies the GWT permutation constant is still valid. Alert (via notification or Supabase flag) if it fails.

---

## 12. Commands and Environment

### Local Development

There is no local dev server. The app runs from `index.html` opened in a browser, or via Vercel's deployed URL. API endpoints only work on Vercel (they need env vars).

### Push Changes

```bash
cd /home/user/health-hub
git checkout -b claude/feature-name
# edit files
git add index.html  # or api/whatever.js
git commit -m "feat: description"
git push -u origin claude/feature-name
# Auto-merge workflow creates PR and merges to main
# Vercel auto-deploys from main
```

### Push Program/Settings Changes Without Code Deploy

```bash
source /home/user/health-hub/.env
curl -s -X POST "${HEALTH_HUB_URL}/api/update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${UPDATE_TOKEN}" \
  -d '{"changes":[{"type":"settings","field":"protein","value":210}],"reason":"Increased protein target"}'
```

### Cron Jobs (vercel.json)

| Schedule | Endpoint | Purpose |
|----------|----------|---------|
| `0 14 * * *` (2 PM UTC / 9 AM CDT) | `/api/whoop-sync` | Morning Whoop recovery pull |
| `0 4 * * *` (4 AM UTC / 11 PM CDT) | `/api/whoop-sync` | Evening Whoop recovery pull |
| `0 0 * * *` (midnight UTC) | `/api/cronometer-sync` | Daily nutrition sync |

### Key localStorage Keys

| Key | Purpose |
|-----|---------|
| `dhub6` | Main data store (entire app state) |
| `dhub6_workout` | Active workout persistence (survives app close) |
| `dhub6_mob_active` | Active mobility session persistence |
| `dhub6_variant` | Active day variant selection (e.g., "back-protected" for wednesday) |
| `dhub6_notif_habits` | Last date habits notification was sent |
| `dhub6_notif_water_hr` | Last hour water notification was sent |
| `dhub6_notif_stretch` | Last date stretch notification was sent |
| `dhub6_notif_workout` | Last date workout notification was sent |

### Supabase Tables

| Table | Key Column | Purpose |
|-------|------------|---------|
| weight | date | Daily weigh-ins |
| steps | date | Daily step counts |
| water | date | Daily water intake (oz) |
| recovery | date | Whoop: recovery%, HRV, RHR, sleep, strain |
| habits | date | Daily habit completion |
| workouts | date | Workout logs (exercises, sets, duration) |
| nutrition | date | Meals + daily macro totals |
| progression | exercise_id | Current weight, last reps, PR, e1RM history |
| mobility | date | Stretching completion + duration |
| cardio | date | Cardio sessions |
| body_comp | date | Body composition photo analyses |
| body_measurements | date | Physical measurements |
| travel_days | date | Travel day markers |
| tdee_exclude | date | Days excluded from TDEE calc |
| settings | id (singleton) | User targets and preferences |
| program | id (singleton) | Active workout program definition |
| program_updates | id | Queue of pending program changes |
| whoop_tokens | id | OAuth tokens for Whoop API |

---

## 13. Questions for the Reviewer

These are specific areas where a third-party review would be most valuable:

1. **Progression merge strategy**: Is there a better approach than "local wins for prog"? The app needs to handle: (a) user works out on phone with spotty connection, (b) Whoop/Cronometer write to Supabase while user is offline, (c) user reopens app later. How should per-exercise progression be merged when both sides have updates?

2. **Is the deload repair function (`repairDeloadProgression`) still needed?** It runs on every load. It scans all exercises and compares `currentWeight` to the most recent non-deload workout. The original bug is fixed — should this be removed, kept as a safety net, or made smarter?

3. **`backfillData` correctness**: The function uses positional matching (`exercises[i]`) to correlate logged workout exercises with program definitions. Is there a safe way to retrofit ID-based matching without breaking existing historical data where the exercise order may have been different?

4. **Sync timing**: The full `syncToSB()` is debounced at 2 seconds. `finishWorkout()` also calls individual `svSB.progression()` and `svSB.workout()` immediately. Is this double-write pattern (immediate targeted + debounced full) sound, or should it be one or the other?

5. **Supabase security**: The Supabase anon key is in the client-side HTML (line 147). What's the risk surface if someone extracts it? Is RLS sufficient for a single-user app, or should the client go through a server-side proxy?

6. **Service worker cache strategy**: The SW is network-first for navigation and pre-caches static assets. iOS home screen bookmarks still sometimes serve stale HTML. Is there a more reliable approach for PWA freshness on iOS Safari?

7. **Cronometer integration durability**: The GWT-RPC reverse engineering works today but is inherently fragile. Should this be replaced with a different approach (e.g., browser extension, manual CSV import, or a user-facing "sync now" button that triggers the cron)?

8. **Coach action safety**: The mid-workout coach AI can return `actions` that modify the program (swap exercises, change settings). These are applied immediately via `applyCoachActions()`. Should there be a confirmation step, or is the current approach (AI only returns actions when explicitly asked) sufficient?

9. **Single-file maintainability**: At 3733 lines, `index.html` is the biggest maintenance risk. But splitting requires a build step, which the user explicitly wants to avoid. Is there a middle ground — e.g., ES modules loaded via `<script type="module">` from separate files on the same CDN/origin?

10. **What's missing for the next mesocycle?** The current program (Upper/Lower v2) ends after week 8. The user needs: new exercise selection, potentially different rep schemes, reset or carry-forward of progression data. What should the "new cycle" workflow look like in code?
