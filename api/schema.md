# Health Hub — External Update Integration

## Overview
Health Hub accepts program updates via a REST API. Use this to push workout program changes, nutrition target adjustments, and exercise modifications from external tools (Claude.ai conversations, scripts, etc.).

## Endpoint
```
POST https://<your-vercel-domain>/api/update
```

## Authentication
```
Authorization: Bearer <UPDATE_TOKEN>
```
Set `UPDATE_TOKEN` as a Vercel environment variable.

## Request Schema
```json
{
  "changes": [
    {
      "type": "settings",
      "field": "<setting_name>",
      "value": <number>
    }
  ],
  "reason": "Why this change was made"
}
```

### Change Types

#### Settings Update
Modify a user target (calories, protein, water, steps, sleep, fiber, trainingCal, wednesdayCal, weekendCal).
```json
{
  "type": "settings",
  "field": "trainingCal",
  "value": 1800
}
```

#### Exercise Update
Modify properties of an existing exercise by ID.
```json
{
  "type": "exercise",
  "action": "update",
  "exerciseId": "bench-press",
  "fields": {
    "sw": 145,
    "notes": "Push for 150 at 3x8"
  }
}
```

#### Exercise Swap
Replace one exercise with another.
```json
{
  "type": "exercise",
  "action": "swap",
  "oldExerciseId": "smith-flat-bench",
  "newExercise": {
    "id": "incline-db-press",
    "name": "Incline DB Press",
    "sets": 3,
    "rr": [8, 12],
    "rest": 90,
    "sw": 50,
    "inc": 5,
    "unit": "lbs",
    "notes": "",
    "cue": ""
  }
}
```

#### Exercise Add
Add a new exercise to a specific day.
```json
{
  "type": "exercise",
  "action": "add",
  "day": "tuesday",
  "exercise": {
    "id": "face-pull",
    "name": "Face Pull",
    "sets": 3,
    "rr": [12, 15],
    "rest": 60,
    "sw": 30,
    "inc": 5,
    "unit": "lbs",
    "notes": "Rear delt health",
    "cue": "Pull to forehead, elbows high"
  }
}
```

#### Exercise Remove
Remove an exercise from a specific day.
```json
{
  "type": "exercise",
  "action": "remove",
  "day": "tuesday",
  "exerciseId": "face-pull"
}
```

## Exercise Field Reference
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique kebab-case identifier |
| `name` | string | Display name |
| `sets` | number | Number of working sets |
| `rr` | [min, max] | Rep range array |
| `rest` | number | Rest between sets (seconds) |
| `sw` | number | Starting weight |
| `inc` | number | Weight increment on progression |
| `unit` | string | "lbs", "lbs/hand", or "BW" |
| `notes` | string | Coach notes |
| `cue` | string | Form cue |

## Settings Field Reference
| Field | Default | Description |
|-------|---------|-------------|
| `calories` | 1790 | Daily calorie target (weekly 12,500 / 7) |
| `protein` | 200 | Daily protein (g) |
| `water` | 128 | Daily water (oz) |
| `steps` | 15000 | Daily step target |
| `sleep` | 7.5 | Sleep target (hrs) |
| `fiber` | 30 | Daily fiber (g) |
| `trainingCal` | 2000 | Mon/Tue/Thu/Fri calorie target |
| `wednesdayCal` | 900 | Wednesday (fast day) calorie target |
| `weekendCal` | 1800 | Sat-Sun average — app renders Sat +100 / Sun −100 (1900/1700) |

## Current Exercise IDs (Summer Cut v2 — Jul 6 to Aug 30, 2026)
Anchor lifts (`flat-bench`, `deadlift`, `back-squat`) run 3 sets and progress
(+5/wk bench, +10/wk deadlift & squat when all sets hit the top of the range).
Everything else holds weight at 2 sets — rep PRs only.

### Monday (Upper A — Bench anchor)
`flat-bench`, `seated-row`, `smith-ohp`, `lat-pulldown`, `cable-fly`

### Tuesday (Lower A — Deadlift anchor)
`deadlift`, `leg-press`, `lying-leg-curl`, `standing-calf`

### Wednesday (Mobility + Arms)
`incline-db-curl`, `oh-tricep-ext`, `cable-hammer-curl`, `tricep-pushdown`, `reverse-curl`, `wrist-curl`

### Thursday (Upper B — Hypertrophy)
`db-incline-press`, `overhand-cable-row`, `lateral-raise`, `low-high-cable-fly`, `reverse-fly`

### Friday (Lower B — Squat anchor)
`back-squat`, `rdl`, `leg-extension`, `bulgarian-split-squat`, `seated-calf`

## Claude.ai Project Instructions
Paste the following into a Claude.ai Project's custom instructions to enable the "push to app" workflow:

```
You are also the user's strength coach and nutritionist. When you agree on a concrete change to their program (exercise swap, weight adjustment, calorie target change, etc.), output a JSON code block labeled "HEALTH_HUB_UPDATE" that the user can push to their app:

\`\`\`HEALTH_HUB_UPDATE
{
  "changes": [...],
  "reason": "Brief explanation"
}
\`\`\`

Use the exercise IDs and settings fields from their Health Hub schema. Only output this block when the user explicitly agrees to a change.
```

## How Updates Flow
1. External source (Claude.ai, curl, script) POSTs to `/api/update`
2. Changes are queued in the `program_updates` Supabase table
3. On next app load, pending changes are read, applied to local state, and marked `applied: true`
4. User sees a toast notification for each applied change
