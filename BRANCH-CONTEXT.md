# Branch Context: claude/fix-calorie-estimator-G8J8i

Current state: Clean, up to date with remote. 11 commits ahead of main.

## What Was Done (chronological order)

### 1. Fix adaptive TDEE calculator (8c0ce57)
- TDEE was outputting nonsensical 1,221 cal/day with limited data
- Fixed: switched from EWMA to linear regression for weight trend, raw calorie average, clamped output to 50-150% of intake

### 2. Fix calorie estimator for branded products (d873315)
- Added USDA Branded Foods search as Step 0 before AI parsing
- Updated Haiku prompt to preserve brand names
- Relaxed macro cross-check tolerance from 15% to 25%

### 3. Fix branded product lookup picking wrong USDA results (d3a5329)
- Added scoring by brand match quality, keyword overlap, serving size reasonableness

### 4. Fix USDA serving size for protein supplements (1234ee2)
- USDA had half-scoop servings (15g) for protein powders
- Parse householdServingFullText, detect high-protein supplements, fall through to AI if still wrong

### 5. Allow quick-saving manually added meals (5336072)
- Added "manual" to allowed sources for the "Save Quick" button

### 6. Gate Step 0 branded lookup for generic inputs (640b6db)
- Skip Step 0 when input has weight units, multiple items, or whole food names

### 7. Replace calorie estimator with MFP sync (a4d10bc)
- Added /api/sync-nutrition.js (token-authenticated POST for Apple Shortcut -> HealthKit -> MFP data)
- Deleted /api/smart-lookup.js
- Fixed parseHealthImport to include carbs/fat/fiber
- Added MFP Sync settings section with Shortcut setup instructions

### 8. Extract estimation system to /estimation/ (63bb542)
- Moved all estimation code (AI, barcode, food search, quick meals, USDA lookup) out of main app into /estimation/ directory for archival
- Nutrition input is now MFP sync only with manual entry fallback
- Preserved api/estimate.js, api/usda.js, frontend snippets, and README in /estimation/

### 9. Add GET support to sync-nutrition API (bfe5138)
- Apple Shortcut can now use plain URL with query params instead of JSON POST
- Date defaults to today (America/Chicago timezone)

### 10. Add back-protected Lower A workout variant (0fa94a3)
- "Back-Protected" variant for Wednesday Lower A: replaces RDL and Hack Squat with Leg Extension and Cable Pull-Through
- In-app toggle, persists in localStorage, stored with workout logs

### 11. Fix blank screen from syntax error (b45e021)
- Ternary ?: was consumed by optional chaining ?., crashing JS parsing
- Replaced with getSess helper function

## Files Modified (vs main)

- index.html — Major changes: MFP sync UI, back-protected variant, estimation code removed (~360 lines net reduction)
- api/sync-nutrition.js — NEW - MFP sync endpoint
- api/smart-lookup.js — DELETED
- estimation/ — NEW directory - archived estimation system (estimate.js, usda.js, frontend-snippets.js, README.md)

## Where We Left Off

The last fix was a blank screen bug caused by a syntax error in the workout variant session lookup. The branch is clean and pushed. No open PRs — previous work was merged via PRs #6-#9 into main, and the current 11 commits are unmerged.

## Known Architecture State

- Nutrition tracking now flows through MFP -> Apple Health -> Shortcut -> /api/sync-nutrition.js (no more in-app AI estimation)
- The old estimation system is preserved in /estimation/ if you ever want to rebuild it
- Lower A has a Standard/Back-Protected variant toggle
- Adaptive TDEE uses linear regression + sanity clamping
