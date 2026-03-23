# Health Hub - Development Guide

## Overview
Health Hub is a single-page PWA for personal health and fitness tracking, built for strength athletes doing body recomposition. It runs as a monolithic `index.html` with React 18 via CDN (no build process).

## Tech Stack
- **Frontend**: React 18 (CDN, Babel in-browser transpilation)
- **Backend**: Vercel Serverless Functions (3 API endpoints in `/api/`)
- **Database**: Supabase PostgreSQL (cloud sync)
- **Local Storage**: Browser localStorage for offline-first functionality
- **AI**: Claude API (Sonnet 4) for meal estimation, workout coaching, weekly analysis

## Architecture
- `index.html` — Complete SPA (~1600 lines, all components inline)
- `api/analyze.js` — Weekly health analysis endpoint
- `api/coach.js` — Mid-workout AI coaching endpoint
- `api/estimate.js` — Meal nutrition estimation endpoint
- `manifest.json` — PWA manifest

## Data Structure
All data is stored in localStorage under key `dhub6` and synced to Supabase:
- `wk` — Workout logs (keyed by date)
- `nut` — Nutrition logs (keyed by date, contains meals array)
- `wt` — Weight entries (keyed by date)
- `rec` — Recovery data (keyed by date: recoveryScore, hrv, rhr, sleepHours, etc.)
- `steps` — Step counts (keyed by date)
- `water` — Water intake in oz (keyed by date)
- `habits` — Daily habit tracking (keyed by date)
- `prog` — Exercise progression state (keyed by exercise ID)
- `qm` — Quick meal library (array)
- `mob` — Mobility completion (keyed by date)
- `stp` — Stepper completion (keyed by date)
- `debrief` — Morning debrief completion (keyed by date)
- `settings` — User-customizable targets and preferences

## Key Design Decisions
- **Offline-first**: All data writes go to localStorage immediately, then sync to Supabase
- **No build step**: React loaded via CDN for simplicity; no npm/webpack needed
- **Single file**: All components in index.html for easy deployment to Vercel
- **Date-keyed data**: Each day's data is independent — no carryover between days

## Settings (User-Customizable)
Stored in `data.settings`:
- `calories` — Daily calorie target (default: 2430)
- `protein` — Daily protein target in grams (default: 180)
- `water` — Daily water target in oz (default: 128)
- `steps` — Daily step target (default: 10000)
- `sleep` — Sleep target in hours (default: 7.5)
- `fiber` — Daily fiber target in grams (default: 30)

## Pushing Workout & Settings Updates via API
When the user agrees to a workout program change or settings adjustment during conversation, push it live immediately using the `/api/update` endpoint — no code change or deploy needed.

**How to push an update:**
```bash
source /home/user/health-hub/.env
curl -s -X POST "${HEALTH_HUB_URL}/api/update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${UPDATE_TOKEN}" \
  -d '{"changes":[...],"reason":"..."}'
```

Or use the helper script:
```bash
/home/user/health-hub/scripts/push-update.sh '{"changes":[...],"reason":"..."}'
```

**Payload format**: See `api/schema.md` for the full schema. Supported change types:
- `{"type":"settings","field":"<name>","value":<number>}` — Update a setting (calories, protein, water, steps, sleep, fiber, mondayCal, trainingCal, weekendCal)
- `{"type":"exercise","action":"update","exerciseId":"<id>","fields":{...}}` — Modify an existing exercise
- `{"type":"exercise","action":"swap","oldExerciseId":"<id>","newExercise":{...}}` — Replace an exercise
- `{"type":"exercise","action":"add","day":"<day>","exercise":{...}}` — Add exercise to a day
- `{"type":"exercise","action":"remove","day":"<day>","exerciseId":"<id>"}` — Remove exercise from a day

**Rules:**
- Always include a `reason` field explaining why the change was made
- Confirm to the user what was pushed and show the API response
- The app picks up pending updates on next load (toast notification)

## Git Workflow
When making code changes to the repo:
1. Commit with a clear message
2. Push to a feature branch
3. Create a PR with `gh pr create`
4. Merge immediately with `gh pr merge --merge --delete-branch`

This gives a paper trail of every change while removing manual work.

## Deployment
Deploy to Vercel with `ANTHROPIC_API_KEY` environment variable set for AI features.

## Common Tasks
- **Add a new exercise**: Add to `PROG.days` object in index.html
- **Change targets**: Use the Settings tab in the app (or modify defaults in code)
- **Add API endpoint**: Create new file in `/api/` directory
- **Push workout/settings change**: Use the `/api/update` endpoint (see above)
