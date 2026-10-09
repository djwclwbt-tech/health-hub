# Health Hub Mobile UI QA / QoL / Functionality Loop Log

## Cycle 1/4 — 2026-08-01 11:10 AM America/Chicago

- Surface/page: Today/Home dashboard.
- Viewport/tool: Firefox headless screenshot with mobile viewport `390x844`; live production URL `https://health-hub-topaz-sigma.vercel.app/`; screenshot evidence saved outside repo at `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle1-firefox-headless-mobile.png`.
- Live data checked: `health_hub.py today` showed Aug 1 recovery 72, sleep 6.64h, steps 180, no nutrition/weight visible in the helper output. `health_hub.py program` showed `wednesdayCal: 0` and current program/settings.

Findings:

1. **Home dashboard hides available recovery/sleep/steps context**
   - Severity: P1.
   - Observed behavior: The visible Home screen shows date/week, phase tabs, weight CTA, category chips, water `0 / 128 oz`, a weight-trend empty state, `Allergies Loading...`, `Full dashboard`, and bottom nav. It does not show recovery 72, sleep 6.64h, or steps 180 anywhere above the fold.
   - Expected behavior: If Home is the daily command surface, available live daily context should either be visible or clearly reachable without making Dylan hunt, especially recovery/sleep/steps that affect the cut and training decisions.
   - Evidence: Screenshot + live helper output from this cycle.
   - Suggested non-feature fix direction: Reorder/expose existing daily metric cards or make the collapsed “Full dashboard” affordance obvious enough that the current truth is not effectively hidden.

2. **Nutrition state is absent from the primary daily readout**
   - Severity: P1.
   - Observed behavior: No calories/macros or “nothing logged yet” nutrition state is visible on Home, despite nutrition visibility being the known top control-system problem in the foundation spec.
   - Expected behavior: The Today surface should make the current nutrition state unambiguous: logged totals if present, or a clear empty state if no nutrition has been logged.
   - Evidence: Screenshot shows no nutrition totals/empty state; live helper output did not show nutrition rows for today.
   - Suggested non-feature fix direction: Surface the existing food/logging state more clearly on Home; do not add a new dashboard, just make the current state visible.

3. **`Allergies Loading...` looks stuck/unfinished**
   - Severity: P2.
   - Observed behavior: The Home screen displays literal text `Allergies Loading...` with no spinner, timeout, retry, or clear loaded/empty state.
   - Expected behavior: Loading copy should resolve, show an empty state, or fail gracefully; literal concatenated text reads like a broken async component.
   - Evidence: Mobile screenshot.
   - Suggested non-feature fix direction: Replace with a proper loading/empty/error state and verify the data source resolves on production.

4. **Duplicate HOME navigation creates clutter/confusion**
   - Severity: P2.
   - Observed behavior: A top row includes `HOME`, while the bottom tab bar also includes `HOME`. On a 390px mobile screen this consumes space without clarifying hierarchy.
   - Expected behavior: Mobile navigation should make the current section obvious without duplicating labels in competing nav systems.
   - Evidence: Mobile screenshot.
   - Suggested non-feature fix direction: Clarify which row is phase/status vs navigation, or adjust copy/styling so it does not read as two separate Home nav controls.

5. **Weight empty-state copy is partially mismatched to the current task**
   - Severity: P2.
   - Observed behavior: The screen correctly prompts `LOG WEIGHT`, but the trend card says `Log a couple of weigh-ins to see your trend.` If today has no weight yet, the immediate task is one weigh-in, not “a couple.”
   - Expected behavior: Empty-state copy should distinguish “log today’s weight” from “need multiple weigh-ins for trend.”
   - Evidence: Mobile screenshot + live helper output with no weight row visible for today.
   - Suggested non-feature fix direction: Tighten copy/state branching so the immediate action is not diluted.

Open blocker:
- Browser tooling available in this session was limited: no Playwright/Selenium package was installed. Firefox headless mobile screenshot worked; Chromium headless hung/produced blank/black captures in this environment. Non-destructive UI navigation clicks were not reliably automatable this cycle, so the next cycle should prioritize establishing a reusable browser interaction path before broader flow coverage.

Next cycle should inspect:
- Nutrition/Food logging visibility and mobile navigation into Food, specifically whether a real user can quickly tell what is logged today and add/check food without hidden controls or stale totals.

## Cycle 1/4 — What was done
- Surface inspected: Today/Home dashboard.
- UI/tool used: Live production UI via Firefox headless screenshot at 390x844 mobile viewport; live Health Hub helper data for comparison.
- Findings: 5 findings — two P1 visibility/correctness issues, three P2 QoL/friction issues.
- Highest severity: P1 — Home hides available recovery/sleep/steps context and does not clearly represent today’s nutrition state.
- Open blocker: Playwright/Selenium not installed; Chromium capture/automation unreliable here, so click-path interaction was limited this cycle.
- Next cycle should inspect: Nutrition/Food logging visibility and mobile navigation into Food.

## Cycle 2/4 — 2026-08-01 11:26 AM America/Chicago

- Surface/page: Nutrition/Food logging visibility and mobile navigation into Food, building from Cycle 1's nutrition-visibility recommendation.
- Viewport/tool: Playwright Core installed temporarily outside the repo at `/tmp/hh-pw`, using system Chromium headless with mobile viewport `390x844`; live production URL `https://health-hub-topaz-sigma.vercel.app/`. Screenshot/state evidence saved outside repo:
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle2-pw-home.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle2-pw-food.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle2-pw-food-prevday.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle2-pw-state.json`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle2-network-noclick.json`
- Live data checked: `health_hub.py today` showed Aug 1 recovery 72, sleep 6.64h, steps 180, no nutrition/weight visible in the helper output. `health_hub.py date 2026-07-31` showed Jul 31 weight 184, steps 15,194, recovery 80, workout present, and no nutrition rows. `health_hub.py program` showed settings targets including calories 2000, weekendCal 2000, protein 200, and `wednesdayCal: 0`.

Findings:

1. **Read-only page load performs many successful Supabase write/upsert requests**
   - Severity: P0.
   - Observed behavior: A controlled no-click mobile page load produced 195 tracked app/API/Supabase requests, including 176 write-like `POST` requests with `on_conflict` upsert URLs. Counts captured: 109 `POST weight`, 49 `POST progression`, 16 `POST steps`, 1 `POST settings`, and 1 `POST program`; successful response counts included 109 weight, 49 progression, 15 steps, 1 settings, and 1 program status `200` responses before browser close.
   - Expected behavior: Opening the app/read-only dashboard should not mutate or upsert remote data. Viewing Food/Home should be a read path unless Dylan explicitly logs, syncs, edits, or confirms a write.
   - Evidence: `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle2-network-noclick.json`; visible no-click Home state in `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle2-network-noclick-home.png`.
   - Suggested non-feature fix direction: Separate hydration/read initialization from persistence; only call Supabase write/upsert routines from explicit user actions or trusted sync jobs, and add a guard so stale/default local state cannot write back during page load.

2. **Home marks Food complete even though Food shows zero/no meals logged**
   - Severity: P1.
   - Observed behavior: Home closeout row displayed `FOOD ✓` on Aug 1. After tapping Food, the Food screen displayed `0 / 2100 cal`, `0g / 180g protein`, `No meals logged today`, and the live helper output had no nutrition row for today.
   - Expected behavior: Home should not show Food as complete when calories/protein are zero and Food itself says no meals are logged. If the checkmark means “Food tab exists” or “not required yet,” the copy/icon is misleading.
   - Evidence: Home text/state in `cycle2-pw-state.json`; screenshots `cycle2-pw-home.png` and `cycle2-pw-food.png`; live `health_hub.py today` output.
   - Suggested non-feature fix direction: Align the Home closeout status with the same nutrition/logged-state logic used on the Food page; reserve checkmarks for actually satisfied logging/target states.

3. **Food page copy contradicts selected date after using previous-day navigation**
   - Severity: P2.
   - Observed behavior: On the Food page, tapping the previous-day chevron changed the selected date to `Fri, Jul 31`, but the empty state still read `No meals logged today`.
   - Expected behavior: Date-scoped pages should use date-scoped copy, e.g. `No meals logged for Fri, Jul 31` or `No meals logged this day`, so Dylan does not confuse historical review with today's task.
   - Evidence: `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle2-pw-food-prevday.png`; state text in `cycle2-pw-state.json`; live helper confirmed no nutrition rows for Jul 31.
   - Suggested non-feature fix direction: Make empty-state copy derive from `viewDate` instead of hard-coded `today` language.

4. **Food target/remaining language is hard to interpret when nothing is logged**
   - Severity: P2.
   - Observed behavior: Food shows `What do I need next? 180g protein left · 2100 cal flex`, then later `0 / 2100 cal`, `0g / 180g protein`, and `Weekend 2100 cal · 180g pro target`. The information is probably mathematically consistent, but the hierarchy is clunky: a real user has to infer whether “cal flex” means remaining budget, target, or flexible add-on, and why weekend protein is 180 while global settings show 200.
   - Expected behavior: With no food logged, the Food screen should make current truth obvious first: no meals logged, current target, remaining calories/protein. Terminology should not require knowing app internals or day-type logic.
   - Evidence: `cycle2-pw-food.png`; `cycle2-pw-state.json`; program settings from `health_hub.py program`.
   - Suggested non-feature fix direction: Tighten labels and ordering on the existing Food screen; prefer “0 logged / 2100 target” and “180g protein remaining” over ambiguous “cal flex.”

5. **Logging instructions conflict with in-app logging controls**
   - Severity: P2.
   - Observed behavior: The Food page says the grill-night meal is “Saved as a Cronometer recipe. Logging it takes two taps there,” while the same screen also presents in-app template buttons and a `LOG ROUGH MEAL` form. This makes the intended source of truth unclear: Cronometer, Health Hub rough log, or template buttons.
   - Expected behavior: A user should know where to log food without deciding between competing flows. If Cronometer is primary and rough logging is fallback, the UI should say that plainly.
   - Evidence: `cycle2-pw-food.png`; visible controls/text in `cycle2-pw-state.json`.
   - Suggested non-feature fix direction: Clarify existing copy/CTA priority; do not add a new logging feature, just remove source-of-truth ambiguity.

Open blocker:
- No auth blocker. Actual mobile UI interaction worked through disposable Playwright Core + system Chromium. I avoided clicking any food template or submit button because those controls appear capable of creating nutrition writes. One caveat: the app itself performed write/upsert network calls during a no-click load, which should be treated as a QA finding and not as an intentional Health Hub write by this loop.

Next cycle should inspect:
- Workout/program mobile view, especially whether scheduled lower-body movements and swap/progression state communicate current SI-safe training truth without stale or misleading cues.

## Cycle 2/4 — What was done
- Surface inspected: Nutrition/Food logging visibility and mobile navigation into Food.
- UI/tool used: Live production UI via disposable Playwright Core + system Chromium at 390x844 mobile viewport; no-click network capture; live Health Hub helper data for comparison.
- Findings: 5 findings — one P0 hidden write/upsert-on-load issue, one P1 Food completion mismatch, and three P2 copy/QoL/source-of-truth issues.
- Highest severity: P0 — read-only page load generated successful Supabase POST/upsert requests for weight/progression/steps/settings/program.
- Open blocker: None for UI access; avoided food-template/log-submit taps because they may create data writes.
- Next cycle should inspect: Workout/program mobile view, focusing on stale/conflicting SI-safe exercise, swap, and progression cues.

## Cycle 3/4 — 2026-08-01 11:41 AM America/Chicago

- Surface/page: Workout/program mobile view, building from Cycle 2's next-cycle direction around stale/conflicting SI-safe exercise, swap, and progression cues.
- Viewport/tool: Playwright Core from `/tmp/hh-pw` using system Chromium headless with mobile viewport `390x844`; live production URL `https://health-hub-topaz-sigma.vercel.app/`. Screenshot/state/network evidence saved outside repo:
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle3-home.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle3-workout-initial.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle3-friday-collapsed.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle3-workout-state.json`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle3-workout-details-state.json`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle3-buttons.json`
- Live data checked: `health_hub.py today` showed Aug 1 recovery 72, sleep 6.64h, steps 180, no workout/nutrition rows visible. `health_hub.py program` showed active program still containing Tuesday `Deadlift (BB)` and Friday `Back Squat (BB)`, while the foundation spec says active SI flare/no loaded squatting until resolved. Program settings also still returned `wednesdayCal: 900`, which conflicts with the Aug 1 governing 36-hour fast protocol, though this cycle did not inspect the Fast/Food display.

Findings:

1. **Training page load still performs successful hidden Supabase writes**
   - Severity: P0.
   - Observed behavior: Loading Home, tapping Train, and selecting Friday produced 128 tracked app/API/Supabase requests, including 108 successful write-like `POST` requests: 57 `POST weight`, 49 `POST progression`, 1 `POST settings`, and 1 `POST program`. The Training UI also displayed a toast: `Cleaned 4 orphaned lift records (archived by cleanup migration)`.
   - Expected behavior: Read-only training/program viewing should not upsert settings/program/progression/weight rows or run cleanup/migration behavior just because Dylan opens the app or changes the viewed weekday.
   - Evidence: `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle3-workout-state.json`; toast visible/text-captured in `cycle3-friday-collapsed.png` and state files.
   - Suggested non-feature fix direction: Same direction as Cycle 2 but now confirmed on Training: separate hydration/read paths from persistence/cleanup, and gate cleanup/writeback behind explicit maintenance or user-confirmed actions, not page render.

2. **Selected Friday workout is buried under a persistent “Recovery day / No lift today” headline**
   - Severity: P1.
   - Observed behavior: After tapping `fri`, the page still led with `Recovery day`, `No lift today`, and `Keep cardio, mobility, protein, and sleep on track.` The Friday workout card (`Lower B — Hypertrophy`, `START WORKOUT`) appeared much lower on the screen, below stretch, deload, lift-chart, and cardio sections.
   - Expected behavior: When a user selects a planned lift day, the visible top-of-screen state should make the selected day and lift status unambiguous. If the top headline refers to today while the lower card refers to Friday, the UI should clearly separate “today” from “selected day.”
   - Evidence: `cycle3-workout-state.json` safe-click result for `FRI`; screenshot `cycle3-friday-collapsed.png`.
   - Suggested non-feature fix direction: Fix date/scope labeling and ordering so selected-day content is not visually contradicted by today-only recovery copy.

3. **Program surface does not warn about known SI/source-of-truth drift before lower-body work**
   - Severity: P1.
   - Observed behavior: Friday exposes `Lower B — Hypertrophy` with `START WORKOUT`, while live program data still contains `Back Squat (BB)` for Friday and `Deadlift (BB)` for Tuesday. The UI did not surface any visible SI gate, stale-program warning, or “loaded squatting blocked until resolved” context before the start-workout CTA.
   - Expected behavior: For lower-body sessions during an active SI flare/source-of-truth conflict, the training UI should not make the unsafe/stale plan look normal. At minimum, existing program state should be flagged as needing review before Dylan starts the lower session.
   - Evidence: Foundation spec SI rule; `health_hub.py program`; `cycle3-friday-collapsed.png` showing Friday Lower B available with `START WORKOUT` and no visible warning.
   - Suggested non-feature fix direction: Add/restore guard copy or stale-state indication around existing lower-body program cards when current coach truth blocks loaded squats/hinges; this is correctness/safety feedback, not a new feature surface.

4. **Warm-up/exercise disclosure rows look tappable but did not open in mobile automation**
   - Severity: P2.
   - Observed behavior: The Friday card showed `WARM-UP ▾`, `EXERCISES ▾`, `TRAINING CALENDAR ▾`, and `WORKOUT HISTORY (80) ▾`, but Playwright text clicks on those labels timed out/not found as actionable controls, and the DOM button inventory did not list them as buttons. Scrolling bottomed out around `window.scrollY = 156`, with the bottom nav fixed over the lower area.
   - Expected behavior: If these are accordion controls, they should be real, easy-to-hit mobile buttons; if they are static labels, they should not use chevrons. Dylan should be able to inspect warm-up/exercises before starting a lower session.
   - Evidence: `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle3-workout-details-state.json`; `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle3-buttons.json`; scroll state/screenshots.
   - Suggested non-feature fix direction: Make existing accordions actual accessible buttons with clear hit areas, or remove misleading chevrons until they are functional.

5. **Technical cleanup toast leaks internal maintenance language and obscures workout controls**
   - Severity: P2.
   - Observed behavior: A green toast reading `Cleaned 4 orphaned lift records (archived by cleanup migration)` appeared over/near the lower workout card and controls on mobile.
   - Expected behavior: User-facing Training should not show migration/cleanup internals during normal use, especially when the message implies data mutation. Toasts should not cover high-stakes controls like `START WORKOUT`/`EMPTY`.
   - Evidence: `cycle3-friday-collapsed.png`; text captured in `cycle3-workout-state.json` and `cycle3-scroll-state.json`.
   - Suggested non-feature fix direction: Remove internal maintenance toasts from production user flows, or move them to admin/dev-only logging; ensure toast placement does not obscure mobile controls.

Open blocker:
- No UI access blocker. I avoided `START WORKOUT`, `EMPTY SESSION`, `EMPTY`, `LOG CARDIO`, and `LOG` because they appear capable of creating or clearing Health Hub data. The page itself still performed writes during read-only viewing, which is recorded as a finding rather than an intentional loop write.

Next cycle should inspect:
- Fast/Wednesday target display and Setup/settings consistency, specifically whether the UI still shows stale 900-cal Wednesday/half-fast expectations versus the current 36-hour no-calorie Wednesday protocol.

## Cycle 3/4 — What was done
- Surface inspected: Workout/program mobile view, especially Training Friday/Lower B and program/source-of-truth cues.
- UI/tool used: Live production UI via Playwright Core + system Chromium at 390x844 mobile viewport; live Health Hub helper data for comparison.
- Findings: 5 findings — one P0 hidden write/cleanup-on-view issue, two P1 misleading training/source-of-truth issues, and two P2 mobile QoL/accessibility/toast issues.
- Highest severity: P0 — read-only Training navigation generated successful Supabase POST/upsert requests and a cleanup/migration toast.
- Open blocker: None for UI access; avoided destructive/logging/start controls because they may create or clear data.
- Next cycle should inspect: Fast/Wednesday target display and Setup/settings consistency for stale 900-cal/half-fast cues versus the current 36-hour fast protocol.

## Cycle 4/4 — 2026-08-01 11:56 AM America/Chicago

- Surface/page: Fast/Wednesday target display and Setup/settings consistency, building from Cycle 3's next-cycle direction around stale 900-cal/half-fast cues versus the current 36-hour no-calorie Wednesday protocol.
- Viewport/tool: Playwright Core from `/tmp/hh-pw` using system Chromium headless with mobile viewport `390x844`; live production URL `https://health-hub-topaz-sigma.vercel.app/`. Screenshot/state/network evidence saved outside repo:
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-home.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-food.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-food-after-prev.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-setup.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-train.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-fast-setup-state.json`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-targeted-food.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-targeted-food-wed-maybe.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-targeted-setup-collapsed.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-targeted-setup-after-wedfast-click.png`
  - `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-targeted-state.json`
- Live data checked: `health_hub.py today` showed Aug 1 recovery 72, sleep 6.64h, steps 2,368, no nutrition/weight rows visible. `health_hub.py program` showed settings still returning `wednesdayCal: 900` even though the governing Aug 1 fast protocol says Wednesday calorie target should become 0 and Wednesday protein should be manually interpreted as functionally 0 during the fasting window.

Findings:

1. **Read-only Fast/Food/Setup viewing performs broad successful Supabase writes**
   - Severity: P0.
   - Observed behavior: A mobile UI pass that only loaded Home, navigated to Food, used date navigation, and opened Setup generated successful write-like Supabase responses. The targeted pass recorded 109 `POST weight`, 49 `POST progression`, 39 `POST steps`, 1 `POST settings`, and 1 `POST program`, all status `200`. A broader exploratory pass in the same cycle recorded successful status `200` writes across more tables: 213 `POST steps`, 119 `POST recovery`, 111 `POST nutrition`, 109 `POST weight`, 80 `POST workouts`, 78 `POST progression`, 28 `POST water`, 14 `POST habits`, plus settings/program writes.
   - Expected behavior: Opening or reading Fast/Food/Setup should not upsert weight, nutrition, recovery, workouts, water, habits, settings, program, steps, or progression. Read-only QA navigation should be safe and should not mutate data.
   - Evidence: `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-targeted-state.json`; `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-fast-setup-state.json`.
   - Suggested non-feature fix direction: Treat this as the first fix before other UI polish. Split read hydration from persistence across all app surfaces, stop render-time writebacks/cleanup, and add tests/guards proving a no-click app load performs zero Supabase write requests.

2. **Setup shows contradictory Wednesday fast target: summary says 0, editor still says 900**
   - Severity: P1.
   - Observed behavior: Setup's target tile displayed `0 WED FAST`, but after tapping the target area the editable `Day-Type Calorie Targets > Wednesday` input still contained `900`. Live program/settings data also returned `wednesdayCal: 900`.
   - Expected behavior: The Setup surface should have one source of truth. If Wednesday is now a 0-cal fast day, the displayed tile, edit input, saved settings, and Food target logic should all agree. A hidden `900` in the editable field is a high-risk stale-state trap because pressing `SAVE TARGETS` could preserve or reintroduce the old half-fast target.
   - Evidence: `cycle4-targeted-setup-collapsed.png`/state shows `0 WED FAST`; `cycle4-targeted-setup-after-wedfast-click.png`/state shows Wednesday input value `900`; `health_hub.py program` returned `wednesdayCal: 900`.
   - Suggested non-feature fix direction: Reconcile the displayed fast tile and underlying settings form from the same persisted value, migrate/confirm `wednesdayCal` intentionally, and prevent stale form defaults from disagreeing with summary tiles.

3. **Food Wednesday display still grades a fast day against 900 calories and 150g protein**
   - Severity: P1.
   - Observed behavior: On Food after date navigation to `Wed, Jul 29`, the screen showed `TONIGHT · FAST DAY`, `36 H FAST`, and `0 YOUR PLATE`, but the daily target summary still showed `1890 / 900 cal`, `185g / 150g protein`, `Wednesday (Fast)`, `900 cal · 150g pro target`, `Protein hit · 990 cal over, keep next meal lean`, `0g protein left`, and `0 cal left`.
   - Expected behavior: A fast day should not simultaneously be treated as a 900-cal/150g-protein target day. Under the current protocol, Wednesday should be no-calorie; protein should be functionally 0 during the fast and interpreted differently by Coach until the app supports day-specific protein targets.
   - Evidence: `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-targeted-food-wed-maybe.png`; `cycle4-targeted-state.json`; governing protocol in `2026-08-01-wednesday-36h-fast-protocol.md`.
   - Suggested non-feature fix direction: Update existing Food target logic/copy so Fast Day uses the current 0-cal fast truth consistently and suppresses normal protein/remaining-meal grading that conflicts with fasting.

4. **Fast-day copy still presents eating/logging controls as normal next actions**
   - Severity: P2.
   - Observed behavior: On `Wed, Jul 29`, below `36 H FAST` and `0 YOUR PLATE`, the screen still displayed normal food template buttons (`Shake: whey + banana`, `Nurri`, `Prepped protein + veg + fruit`, `Greek yogurt`) and `LOG ROUGH MEAL`. The current fast protocol explicitly says Nurri, whey, caloric drinks, snacks, and “just protein” meals are not allowed during the fast.
   - Expected behavior: On a fast day, existing controls should not visually suggest that whey/Nurri/protein meals are routine next actions unless clearly framed as break-fast/fallback after the fast is over. This is not a request for a new feature; it is a correctness/QoL issue in the current Food screen's state-specific copy/control hierarchy.
   - Evidence: `/home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub/cycle4-targeted-food-wed-maybe.png`; `cycle4-targeted-state.json`; fast protocol allowed/not-allowed list.
   - Suggested non-feature fix direction: Gate or relabel existing template/logging controls when `viewDate` is a fast day so the visible action hierarchy matches the fast rules.

5. **Food date navigation/calendar feedback is too cryptic on mobile**
   - Severity: P2.
   - Observed behavior: Food exposes `‹`, `Today`, `›`, and a small `◎` button. It was possible to reach Wednesday by tapping the previous chevron three times, but the small icon-only controls have no visible labels in the captured button inventory, and the right chevron is disabled on today with no explanation.
   - Expected behavior: Date navigation should be understandable without guessing. A real mobile user should know whether the icon returns to today, opens a picker, or changes day type; tiny unlabeled controls are easy to mis-hit and add friction when reviewing prior fast/nutrition days.
   - Evidence: `cycle4-targeted-food.png` and `cycle4-targeted-food-wed-maybe.png`; button inventories in `cycle4-targeted-state.json`.
   - Suggested non-feature fix direction: Add accessible/visible labels or clearer affordances to existing date navigation controls; keep the same navigation model but make the controls self-explanatory.

Open blocker:
- No UI access blocker. I avoided `SAVE TARGETS`, food template buttons, `LOG ROUGH MEAL`, water buttons, notification toggles, export/admin tools, and any workout/session controls because they may create writes or external/destructive actions. The app itself continued to perform writes during read-only viewing; this is recorded as a P0 finding, not an intentional QA write.

Next cycle should inspect:
- This was cycle 4/4. Before any further QA expansion, get approval to fix/build the P0 hidden write-on-view bug and the P1 Wednesday fast target contradictions, then rerun a focused no-click/mobile regression to prove read-only loads produce zero writes and Wednesday displays one consistent fast target.

## Cycle 4/4 — What was done
- Surface inspected: Fast/Wednesday target display plus Setup/settings consistency.
- UI/tool used: Live production UI via Playwright Core + system Chromium at 390x844 mobile viewport; mobile screenshots; DOM/button/input snapshots; Supabase network capture; live Health Hub helper data for comparison.
- Findings: 5 findings — one P0 broad hidden write-on-view issue, two P1 stale/contradictory Wednesday fast target issues, and two P2 fast-day/date-navigation QoL issues.
- Highest severity: P0 — read-only navigation through Fast/Food/Setup generated successful Supabase write/upsert requests across many Health Hub tables.
- Open blocker: None for UI access; avoided save/log/start/export/admin controls because they may mutate data.
- Next cycle should inspect: No next cycle scheduled; request approval for fixes/build work, then rerun focused regression on read-only writes and Wednesday fast consistency.
