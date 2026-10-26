# Health Hub hillclimb

Health Hub now has a scorecard. Three automatic graders measure the app screens, the data, and the coaching. Each change has to raise a score without lowering another. ==Biggest finding: Oura has sent no recovery data since Aug 22, and nothing in the app said so.==

!!! warning "One thing only you can do"
    Oura has retired personal access tokens, and the one the sync uses now gets refused. Fixing it needs you to log in to Oura once, so it can grant the sync a new key. Until then the app and the Coach now say "recovery feed stale" instead of quietly reasoning from old numbers.

## What you asked for, and what it is really for

You asked to make the interface, UX, features, data fidelity and AI coaching an Opus 5.5 hillclimb. A hillclimb is a loop: measure, change one thing, measure again, keep the change only if the score went up.

The real goal is behind that: **reach 175 lb by Nov 29 without losing strength, with a coach you can trust.** Week 4 of 8 started today. The live data says three things:

- The scale trend is flat at about 185, and 10 lb remain. That needs about 2 lb a week, which is faster than the safe pace of 0.6 to 1.5.
- Food is logged on only 2 of the last 6 eating days. With that little data, nobody can judge calories, including the AI.
- Your anchor lifts went **up** over the last 4 weeks (leg press +17% estimated max). That is good news a flat-scale panic would miss.

So the first wins are data the coach can trust, and a coach that admits what it can't see.

## The four lenses

### Altitude

The outcome is a finished cut, not a prettier app. So the scorecard checks the data pipes first: Oura, Cronometer, steps and weigh-ins. Then it checks whether the coaching names the one lever that matters this week.

Access I used without you: the live database (read only), production logs, Cronometer and Oura through the app's own keys, and a headless browser on the Pi. Access I still need from you: one Oura login.

### Depth

A top coach starts from the raw sheet, not from averages. The old weekly analysis sent the AI one line per area: average calories over **logged** days, and weight as "first weigh-in minus last". Two noisy weigh-ins could read as "-1.1 lb this week" while the real trend was flat.

The new **coaching brief** (`lib/engine/coach.mjs`) is built by the same engine the phone uses:

- the trend from the one slope function, with a "not reliable" flag
- food coverage: "2 of 6 eating days logged", with Wednesday counted as the fast day
- anchor lifts, first and last best set over 4 weeks
- recovery only from a live feed, never a stale average
- TDEE only when enough days were logged
- a list of data gaps at the top

The unreasonable target: **zero made-up numbers.** Every number the AI writes must appear in the brief, and a checker counts any that don't.

### Range

The app has to do five things for you: show what to do now, record what happened, tell the truth about progress, pick the next lever, and warn you when something breaks. I borrowed one method from each of five fields:

| Field | Method used here |
|---|---|
| Aviation | A preflight checklist: every data feed checked for freshness before any advice |
| Clinical trials | Blind grading: a second model scores old and new coaching without knowing which is which |
| Accounting | Reconciliation: daily totals must equal their meals, and live targets must match the last recorded decision |
| Typography and print QA | A rule checker on every screen: text size, contrast, all-caps, dashes |
| Short selling | Attack the claim: test athletes built to trip the coach (sparse logging, dead feed, overreaching, losing too fast) |

### Verification

Nothing here is graded by the model that built it:

- **Screens:** headless Chrome at iPhone size, 8 screens, 14 rules from your design system, all counted.
- **Data:** 14 checks against the live database and the Oura API.
- **Coaching:** 4 test athletes, each with "must do" and "must not do" rules. A separate Opus model grades blind, and a script counts made-up numbers.

## Scorecard

| Area | Before | After |
|---|---|---|
| Screens (14 rules, 8 screens) | 94 | **100** |
| Data (live, 14 checks) | 36 | 48 |
| Coaching, blind grade out of 10 | 5.4 | **8.5** |
| Made-up numbers in coaching | 20 | **0** |

The coaching took three rounds. Each round, 4 test athletes went to fresh Opus 5.5 runs, and a separate Opus grader scored the old and new answers side by side without knowing which was which.

| Round | What changed | Result |
|---|---|---|
| 1 | Engine brief replaces the old summary | 5.4 → 8.6. The old one told an on-track athlete to cut calories |
| 2 | Rule: a recovery crash comes before logging | Fixed the overreaching case (7.5 → 9). Broke losing-too-fast (9 → 7). Not shipped as written |
| 3 | Rule names the cause: recovery crash means cut training, slipping lifts with fine recovery mean eat more. No food changes under 100 cal | Beat round 1 in 3 of 4 cases on the same sheet (33.5 vs 31.5 of 40). Shipped |

!!! note "How much to trust the grader"
    The same answer scored up to one point apart across grading runs. So the jump from 5.4 to 8.5 is real. The gap between rounds 1 and 3 is small, and the side-by-side grade decides it.

### What the data score still needs

- **Oura login (you).** Personal tokens are refused, so recovery has been missing since Aug 22.
- **Food logged daily.** 3 of 6 eating days last week. The app and the Coach now say so instead of averaging two days.
- **One decision.** The Coach set Wednesday to a 0-calorie fast on Aug 1, but the live target is 900. Training days were set to 2,100 on May 3, live is 2,000. The app now records target changes you make on the phone, so this can't drift silently again.

### What changed in the app

- Weekly analysis runs on Opus 5.5 from the engine brief. It lists missing data first, with a confidence level.
- The Coach's `get_snapshot` carries the same brief, and its written instructions describe PF Austin Cut.
- Today says "No recovery data" when the Oura feed stops, instead of showing nothing.
- The rule engine puts a measured recovery crash ahead of a logging gap.
- Changing a target on the phone leaves a dated record next to Coach changes.
- Screen fixes: faint gray text that carried meaning is now readable, small buttons are 44 px, and labels are in sentence case.

### What now runs on its own

The app no longer waits for you to notice problems.

- **Every morning (9:30 Austin):** a watchdog checks Oura, steps, weigh-ins and food. If a feed stopped, your phone buzzes, and Today shows it. It repeats at most every 3 days unless something new breaks.
- **8:30 pm on eating days:** if no food is logged yet, a nudge to log it in Cronometer.
- **Sunday morning:** the Coach writes your weekly review with Opus 5.5 from the engine brief. It shows on Today on Sunday and Monday, and lands in the decision trail.

Push reaches the phone that already has rest-timer alerts on. It registers itself the next time you open the app.

!!! warning "What the watchdog saw on its first run"
    Today's weigh-in was 188. The two-week trend is now **up** 1.3 lb a week, and 13 lb remain in 34 days. That needs 2.7 lb a week, about double the safe pace. The goal or the date has to move, and the Nov 1 checkpoint is the place to decide.

### Next round

The losing-too-fast case is the weakest (7.5). The coach adds 100 to 250 calories, which may be too little at 2.7 lb a week. Next lever: size the food added to the gap in the rate.

## The rewritten prompt

```text
Health Hub (/home/dwrzl/health-hub) is Dylan's cut-tracking PWA plus an MCP Coach.
Goal: 175 lb by 2026-11-29 without losing strength. Run a hillclimb on it.

1. Run the scorecard: `npm run score` (eval/ui.mjs, eval/fidelity.mjs with
   .env.local sourced, eval/coach.mjs score). Read eval/out/*.json.
2. Pick the lowest-scoring rule. Fix the cause in the right module
   (rules and numbers in lib/engine/*, never in components or routes).
3. Re-run the scorecard. Keep the change only if that score rose and none fell.
   `npm run check` must pass. Add an engine test when a rule changes.
4. Coaching changes: `node eval/coach.mjs prep`, run each prompt through a
   fresh model with no other context, write *.out.txt, then have a separate
   model grade them blind against each scenario's must and must-not rules
   (grade-*.json). The variant ships only if its rubric average and
   grounding (zero made-up numbers) beat the current one.
5. Never invent numbers. Never put real figures in docs or fixtures.
   Ask before pushing (every push to claude/** is a production deploy).
6. Log each round's scores in docs/hillclimb-2026-10/index.md.
```
