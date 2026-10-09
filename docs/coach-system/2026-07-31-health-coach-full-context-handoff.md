# Health Coach Full Context Handoff

**For:** Claw / OpenClaw (external AI assistant)
**Prepared:** July 31, 2026
**Source:** Claude project "Health / Nutrition" — full conversation history March–July 2026, project instruction documents, and Health Hub app context.
**Rule applied:** where history contradicts itself, the most recent decision wins. Uncertain items are marked UNKNOWN.

---

## 1. Executive Summary

Health Hub is a single-user fitness PWA built for one person: Dylan. It replaces Strong (lifting log), a rest timer, a habit tracker, and a weight log with one app he opens 8–12 times a day. It is paired with an AI coach (Claude, operating inside a project with full instructions) that handles programming, nutrition, injury management, and weekly steering.

The current block is **Summer Cut v2: July 6 – August 30, 2026**. Start ~192 lbs (post-vacation; true deficit baseline ~188), target sub-180 by Aug 30. As of July 28 Dylan hit **182 lbs** — ahead of plan.

The project is explicitly shifting from "app/tracker" to "dedicated proactive coach." Dylan's framing (July 31, verbatim intent): the app is the delivery vehicle and data collection layer; the coach is the product; **the output is Dylan post-cut**, not workouts or features. This shift was triggered by a coaching failure — an SI joint flare and two weeks of unreported barbell avoidance that the coach never caught because it has no read access to logs and cannot initiate contact. Structural fixes (Monday debrief checkpoint, deviation rules, change-audit rules) are now in place; see §9 and §11.

## 2. Current North Star

The product is not the app. The product is:

1. Dylan's body composition outcome at the end of the block (sub-180, visually lean, DEXA-verified lean-mass retention)
2. Adherence — logged nutrition, hit step floor, completed sessions, nightly mobility
3. Training performance on the three anchor lifts within cut constraints
4. Injury management — the psoas/SI chain stays functional
5. Fast recovery from deviations, not prevention of all deviations

Every app feature, notification, and coach behavior is judged against: "does this make Dylan log the thing / do the thing, or skip it?"

## 3. Dylan Profile

- Male, late 20s, Austin TX. Technical, data-driven, blunt.
- **Goal:** visual leanness is #1. Strength maintenance is secondary during cuts. Chest = primary aesthetic priority; lat width flagged as the post-cut priority (rear delts/traps visually outpacing lats; only ~4 weekly vertical pulling sets currently).
- **Weight:** started block ~192 (Jul 5), 182 as of Jul 28. Target sub-180 by Aug 30.
- **DEXA baseline:** May 2024 — 187.9 lbs, 25.0% BF, 47.0 lbs fat, 133.0 lbs lean. End-of-August scan booked-intent at BodySpec Austin (~$40–50), morning fasted, replicating weigh-in conditions. High value because current weight ≈ scan weight → clean lean-for-fat exchange comparison.
- **Gym:** Planet Fitness, 6:00 AM Mon–Fri. Smith machine, cables, dumbbells, machines, converging chest press, leg press — **and, new this block, free-weight platforms (barbell bench, deadlift, squat)**.
- **Home:** dumbbells to 50 lb, UREVO SpaceWalk E4W walking pad (monthly belt lube), Peloton bike.
- **Wife: Danielle** — 132 lbs, sedentary, fat-loss goal, **1,350 cal / 105g protein flat daily, no fast day**. She does not track; portion-scaled shared dinners do the work. All dinner recipes carry both portions.
- **Chronic GI issues** — lifelong, familial. Factor into every supplement, fiber, and dietary change.
- **Adherence patterns (proven, repeatedly):**
  - A few days slightly over target becomes permission to disengage entirely ("momentum failure"). Interrupt early.
  - Untracked weekends are the historical killer. Weekend logging is mandatory.
  - Reduced-calorie structured weekends have failed twice — died on contact with his life. Do not re-propose.
  - Deviations go unreported unless a mechanism forces reporting (see §9, Jul 31 decisions).
- **Communication preferences:** direct prescriptions, no options deferred back, no reassurance, no filler, brevity firm. Cite his own data. Challenge weak plans. Scope answers to what was asked — no multi-domain audits from a single comment. When corrected, rebuild from the corrected foundation, don't patch.
- **Advice that failed before:** see §10.

## 4. Current Training Program

5-day Upper/Lower, big-three barbell anchors. **Anchors: 3 sets, progress. Everything else: 2 working sets, hold weights, 1–2 RIR.** No training to failure. Strength dropping slowly during the cut is expected and acceptable.

Anchor progression: **Bench 175 (+5/wk) · Deadlift 235 3x5 (+10/wk while bar speed holds) · Back Squat 135 (+10/wk while form holds).**

| Day | Session | Exercises |
|---|---|---|
| Mon | Upper A (5–8) | Flat Bench 3x5-8 @175 · Seated Row 2x5-8 @185 · Smith OHP 2x5-8 @110 · Lat Pulldown 2x5-8 @150 · Cable Fly finisher 2x12-15 @17.5 |
| Tue | Lower A | Deadlift 3x5 @235 (ramp 135x5, 185x3; first slow rep ends the set) · Leg Press 2x5-8 @390 · Lying Leg Curl 2x5-8 @145 · Standing Calf 2x5-8 @300 |
| Wed | Mobility + Arms (FAST) | Hip mobility circuit + supersets: incline curl 22.5 / OH ext 55 · hammer 35 / pushdown 70 · reverse curl 40 / wrist curl 20 |
| Thu | Upper B (10–12) | DB Incline 2x @45s · OH Cable Row 2x @130 · Lateral Raise 2x @20 · Low-High Fly 2x12-15 @15 · Reverse Fly 2x @30 |
| Fri | Lower B | Back Squat 3x5-8 @135 · RDL 2x8-10 @165 · Leg Ext 2x10-12 @130 · Bulgarian SS 2x10-12/leg @25s · Seated Calf 2x10-12 @90 |

**Exclusions / constraints:**
- Hack squats **permanently removed** (PF machine aggravates the SI chain). Note: a hack squat session appeared in logs Jul 17 at 205 lbs — flagged as a violation, resolved back out of rotation.
- KB swings permanently removed.
- Never program exercises unavailable at Planet Fitness.
- Deadlifts are conditional on the nightly mobility routine (see §5). Miss the routine → deadlift becomes RDL.
- Warm-up: 5 min cardio + 1–2 ramp sets. Add 1x15 bodyweight glute bridges before deadlift/squat (glute activation, added Jul 31).
- Cut training logic: recovery tanks → cut cardio before cutting lifting. No deload scheduled within the block.
- Audio: audiobooks fine everywhere except anchor top sets — those use white noise at minimum volume (not ANC, not silence) via AirPods 4.
- Training deviations (home/improvised sessions) are NOT logged in Health Hub — only programmed gym lifts belong in the tracker.

**IMPORTANT — status override (July 31, 2026):** an SI flare is active. Current orders: **no loaded squatting of any kind until resolved**; that session's Lower B was rebuilt around leg press / leg extension / lying leg curl. Tuesday hinge work (deadlift vs RDL) is gated on the Monday status report. This supersedes the "currently asymptomatic" line in the July 7 instructions doc.

## 5. Injury / Mobility / Body-Feel Context

- **Root cause chain (diagnosed, trusted):** desk sitting → shortened/tight **left psoas** → asymmetric anterior pelvic tilt → left ilium rotates forward → torque concentrates as shear at the **left SI joint** → PSIS pain. Hamstring tightness on forward fold is a protective neurological guard, NOT a flexibility problem — aggressive hamstring stretching makes it worse.
- Walking relieves; sitting worsens.
- **Current status (Jul 31):** active flare — left PSIS soreness, hamstring guarding, instability sensation on squat descent. No loaded squatting until resolved. If left PSIS symptoms persist ~2 weeks on the revised routine → one PT eval to confirm the chain diagnosis.
- **Revised nightly routine (~12 min, non-negotiable, stabilization BEFORE stretching — revised Jul 31):**
  1. Glute bridge 2x12, 3-sec top hold
  2. Side plank 2x20-30s/side (extra left set if uneven)
  3. Bird dog 2x8/side, slow
  4. Couch stretch 60s R / 90s L
  5. 90/90 switches
  6. Pigeon 60s R / 90s L
  7. 90/90 breathing to close
  - Cut from old routine: forward-fold/hamstring stretching (counterproductive); figure-4 optional.
  - Rationale: the old routine was stretch-only, built for the machine-era program; barbell loading required stabilization work it never had.
- **Warning signs:** left PSIS soreness, squat-descent instability, hamstring guarding, any SI symptom return → immediate swap deadlift → RDL, extra left couch stretch, report next day.
- Suspected left-side pressing imbalance → DB incline on hypertrophy day (unilateral loading) addresses it.
- Motor pattern issues (e.g., posterior pelvic tilt on leg raises) get drill-based correction before returning to loaded versions.
- No running (psoas/SI/knee history; revisit post-cut with gait analysis). No HIIT (lifting is the intensity stimulus; HIIT on a deficit = cortisol/muscle-loss trade).

## 6. Nutrition Protocol

Huberman-adapted cut: low-carb daytime, starch at dinner only, fruit daytime, fish 3+/week.

| Day | Cal | Protein |
|---|---|---|
| Mon–Fri (not Wed) | 2,000 | 200g |
| Wed FAST (~24h) | 900 | 150g+ |
| Sat/Sun | 2,000 flat | 180g floor |

- Fat **70–85g is a FLOOR** (hormonal health; lean protein sources mean fat must be deliberately placed). Carbs ~130g flex.
- Weekly ~12,900 vs TDEE ~20,300 (~2,900/day) → expected ~1.5–1.8 lb/wk loss.
- **Cronometer targets: 2,000 / 200P / 75F / 130C** — single profile all days; judge Wednesday against 900 manually.
- TDEE derived from weight-trend data, NOT wearables. Wearable calorie burn is excluded from all decisions (proven significant undercount at Dylan's step/training volume).
- **Daily slots:** 6:30 AM shake (2 scoops Gold Standard vanilla + banana + 1 tbsp chia = ~400 cal / 52g P) → 12 PM lunch (protein + veg + fruit, NO starch) → 3 PM Nurri (150/30) → 6:00 cook / 6:30 dinner (protein + 1 rice cup or 6 oz potato + veg), done by 7 → Chobani buffer (skip on salmon nights).
- **Wednesday fast:** water/electrolytes/black coffee daytime · psyllium at noon · Nurri 6 PM · one meal 6:30 PM. Total 900 / 150g+.
- **Weekend rules:** flat 2,000, flexible composition, **logging mandatory**. This is a negotiated settlement — see §10. Do not re-propose reduced weekend calories.
- **Social weekend protocol** (signal phrase: "social weekend incoming"): Mon/Tue/Thu 1,700 · Wed 800 · Fri–Sun unstructured, 150g protein floor, one shake/day minimum, log everything even if ugly, no guilt spiral. Birthday week Jul 13–19 ran this.
- **Restaurant/fast-food rules:** official nutrition data first, verified user submissions second; if neither exists, say so — never estimate silently (~15% margin of error from oils/braising/portions even with official data). Always build custom ingredient-level orders, never default menu items.
- **Alcohol:** ethanol (7 cal/g) sits outside P/C/F — log separately in Cronometer as branded beer presets or a manual ethanol line item, or calories get undercounted.
- **GI/fiber:** 30g fiber via chia + raspberries + veg + potato skin + psyllium (Kirkland capsules, 5 at noon with water; ramp to 2x/day by wk 3; keep 2+ hrs from finasteride — lunch timing handles it). Monitor sodium on Fresh Additions chicken at high volumes.
- **Key products:** Gold Standard vanilla whey · Nurri (Costco, 150/30) · Just Bare breaded nuggets · Fresh Additions chicken bites · Fage Greek yogurt · Quest chips · Thai Kitchen brown rice noodles (1 pkt = 200 cal / 44C when rice cups absent).
- **Supplements & timing:**
  - 6:02 AM: BPC-157 500mcg (doctor-prescribed, empty stomach, GI repair) + creatine + Re-Lyte in 16–20 oz water (Re-Lyte daily through Jul 19, then as-needed)
  - 6:05 AM: espresso 1–2 shots (deliberate pre-lift caffeine — Huberman's early-training exception). Caffeine hard stop 12 PM. Alani counts, pre-noon only.
  - 7:35 AM (post-shake): finasteride + oral minoxidil
  - 12 PM: psyllium
  - 8:35 PM: magnesium glycinate 400–600mg + L-theanine 200–400mg + CBD 25–50mg sublingual + apigenin 50mg
  - **Rejected:** fat burners, yohimbine, L-carnitine, CLA, omega-3 capsule (fish 3–4x/wk covers it), appetite suppressants.
  - **No THC** — REM suppressant; detox completed May 4–17; CBD is the replacement.

## 7. Cardio / Steps / Recovery

- **15,000 step floor daily** — steps are the primary calorie vehicle this block. Structure: post-lift gym cardio (~2,300) + morning dog lap with Danielle (9–10 AM work window) + double lunch lap (~25 min, ~3,200) + walking pad 60 min on calls (~4,800) + 7 PM check (<12.5k → third lap). Lap = 0.75 mi ≈ 1,600 steps (measured 2,150 steps/mile).
- 20 min post-lift Zone 2: stairstepper after upper days, incline walk after lower days (rotates modality to protect leg recovery). **No evening Peloton this block** — Peloton is the fallback when steps miss.
- No running, no HIIT (see §5).
- **Recovery data:** Oura Ring 4 nightly (primary — readiness, HRV, RHR, sleep). Apple Watch S7 daytime HR + Zone 2 confirmation + steps. WHOOP cancelled. Wearable calorie numbers are never used.
- **Sleep:** 9:30 PM bed / 6:00 AM wake, 8h+ target. 8:20 PM mobility → 8:35 PM supplement stack → 9 PM lights out. Wake time non-negotiable even after bad nights. Caffeine hard stop noon.
- **Autoregulation:** Oura red → drop post-lift cardio, keep lifting + steps · 3+ consecutive red → rest day, shift split forward · >2.5 lb/wk loss x2 weeks → +200 cal on training days · <0.5 lb/wk x2 weeks → audit logging accuracy first · strength drop 2x on same lift → check sleep/food, cut cardio before lifting.
- **Weigh-in protocol (settled Jul 30):** daily, pre-fluid, post-void, pre-gym, tracked as **7-day rolling average**. GI offset (~2 lbs pre-bowel-movement) is constant and cancels in trend. Trend > any single reading. Deloads and poor sleep inflate scale weight without representing fat gain.

## 8. Health Hub Current State

- **Purpose:** single screen for workout logging (with progression + rest timer), nutrition display, weight, steps, recovery, habits, water, mobility completion.
- **Deployment:** health-hub-topaz-sigma.vercel.app · repo: djwclwbt-tech/health-hub.
- **Architecture:** single `index.html`, React 18 via CDN with in-browser Babel, no build step, no CSS framework — inline style objects referencing a `C` palette constant mapped to CSS custom properties. iPhone viewport (max-width 520px, fixed bottom tab bar). localStorage key **`dhub6`** + Supabase sync.
- **Data stores:** `wk` workouts · `nut` nutrition · `wt` weight · `rec` recovery · `steps` · `water` · `habits` · `prog` progression (keyed by exercise ID) · `cardio` · `mob` mobility · `stp` stepper · `debrief` · `settings` · `qm` quick meals · body comp/photos · travel days.
- **Integrations:** Cronometer → nutrition, hourly API sync (working; bottleneck is logging consistency, mitigated by saved recipes). Oura v2 API and Apple Watch steps integrations: scoped, **pending** (not built). An AI analysis endpoint returns Overall/Training/Nutrition/Recovery/Habits scores. MCP server endpoint exists for coach reads/writes (endpoint URL withheld here — treat as a credential; obtain from Dylan).
- **MCP capabilities (verified):** `get_program` (structure + starting weights only), `update_settings` (fields confirmed: `steps`, `calories`, `weekendCal`, `sleep`, integers), `update_exercise`. **No read endpoints for weight/nutrition/steps/recovery logs** — the coach is blind to actuals and must ask Dylan. `get_program` does NOT return progression fields (`currentWeight`, `lastReps`, `lastDate`, `progressed`) — known gap. Exercise additions and day restructuring require direct code edits to `PROG.days` in index.html; cannot be done via MCP.
- **Known bugs:** anchor-lift weights misseeded in-app (deadlift showed 140; bench also wrong). **Until health-hub-handoff-v2.md ships via Claude Code, anchor lifts run off the instructions doc's numbers, never the app's.** Prog data not surfacing through MCP (above).
- **Must remain unchanged (hard constraints from the Jul 26 design brief):** localStorage store keys, exercise progression structure, rest timer behavior. Any redesign must be translatable to inline-styled React in one file.
- **Roles:** the app is the data source + logging UI. The AI coach (in-chat) is the coaching vehicle. A full UI/UX redesign brief exists (five-tab architecture: Home, Train, Food, Scale, Setup) saved as markdown for "Claude Design."

## 9. Prior Major Decisions (Decision Log)

Chronological; later entries supersede earlier ones.

1. **Mar 2026 — Recomp plateau diagnosed as a fueling problem**, not training. Dylan had been in a chronic deficit his entire training history. Calorie targets raised; visible muscle gain followed.
2. **Mar 2026 — THC eliminated** (REM suppressant per WHOOP data); CBD replacement; sleep phase-shifted from ~12:30 AM to 9:30 PM bed / 6:00 AM wake.
3. **Mar–Apr 2026 — Fly mechanics corrected** (elbows wide, hands to collarbone; scap pinned, elbows ~45° on presses). Prior years of flyes were effectively front-delt work. Chest development accelerated; pattern now trusted.
4. **Apr 2026 — WHOOP calorie data excluded from decisions** (significant TDEE undercount). Later: WHOOP cancelled entirely; Oura Ring 4 became recovery primary.
5. **May 2026 — Summer cut v1** (May 4–Jun 19): hack squats removed permanently, KB swings removed, front squat + Bulgarian SS swapped in, 2 working sets/exercise standard, hip thrust removed, forearms added Wednesday.
6. **Jul 2026 — Cut v2 block built** (Jul 6–Aug 30): PF added free-weight platforms → barbell bench/deadlift/squat became progressing anchors, conditional on nightly mobility. Nutrition simplified to flat 2,000 + Wed 900. 23-reminder iOS system deployed.
7. **Jul 2026 — Weekend settlement:** flat 2,000 both days, flexible composition, mandatory logging. Supersedes both "untracked weekends" and "reduced-calorie weekends."
8. **Jul 28 — App settings corrected via MCP** (steps 10k→15k, calories 2,430→2,000, weekendCal 1,800→2,000, sleep 7.5→8) — stale March values had been silently governing the app. Lesson: app state drifts from doc state; reconcile explicitly.
9. **Jul 30 — Weigh-in protocol settled:** daily pre-fluid/post-void/pre-gym, 7-day rolling average; GI offset ignored as constant.
10. **Jul 30 — Audio protocol:** white noise (not ANC, not silence, not audiobooks) on anchor top sets; sealed buds would outperform AirPods 4 but not worth buying mid-cut. Corollary principle: don't conflate a stalled lift with external variables; one change at a time.
11. **Jul 31 — Coaching relationship reframed (critical):** coach = 1:1 coaching system, app = delivery vehicle, output = Dylan post-cut. Coach failures named: didn't audit mobility protocol when barbell loading was added; never built a mechanism to catch deviations. Fixes now binding:
    - **Monday debrief** appended to the 6 AM weigh-in reminder: weight · SI/psoas symptom status · program deviations · anchor lift actuals. Coach audits and adjusts same conversation.
    - **Deviation rule:** anything diverging from the written program >2 sessions gets reported same week.
    - **Change-audit rule:** any change to a program variable (equipment, loads, schedule, stressors) triggers an audit of ALL supporting protocols (mobility, recovery, nutrition timing) in that same conversation.
    - **Read endpoints for `wk`, `wt`, `rec` elevated to priority** in health-hub-handoff-v2.md.
12. **Jul 31 — Mobility routine rebuilt** stabilization-first (see §5); loaded squatting suspended pending flare resolution.

## 10. Known Failed Approaches

Do not re-propose these.

- **Untracked weekends** — killed the recomp; 2,500+ cal blind spots corrupted weekly math.
- **Reduced-calorie structured weekends** (e.g., Sat 1,800 / Sun 1,600) — failed twice; "died on contact with his life." Settlement is flat 2,000 + mandatory logging.
- **Wearable calorie burn as an input** — WHOOP/watch undercount at his volume; weight trend is the only calorie truth.
- **Fasted heavy training Mondays** (early recomp structure) — removed as junk volume; fast day moved to Wednesday mobility+arms.
- **Hack squats** — aggravate SI chain; removed permanently, reappeared once (Jul 17), removed again.
- **KB swings** in warm-ups — SI contributor; removed.
- **Aggressive hamstring stretching** for the SI pattern — fights a protective guard, worsens it.
- **Stretch-only mobility routine under barbell loading** — insufficient; stabilization work required (Jul 31 rebuild).
- **Generic fitness advice / precise carb-fat splits / meal-timing dogma** — rejected. Two anchors only (protein + calorie budget) plus the structural rules in §6.
- **Appetite-suppression supplements, fat burners, yohimbine, L-carnitine, CLA** — rejected, evidence-insufficient.
- **High-dose melatonin, Smooth Move tea** — discontinued (architecture disruption; senna dependence).
- **Options-menu coaching** ("you could do A or B?") — Dylan wants decisions made, not deferred.
- **Multi-domain audits from a single comment** — scope violations; answer what was asked.
- **Coaching a program that exists only on paper** — unreported deviations meant the coach optimized fiction for two weeks; fixed by §9.11 mechanisms.
- **Trusting app-seeded weights** — anchor seed bug; doc numbers govern until the fix ships.
- Attributing lift stalls to external variables (headphones etc.) or changing multiple variables at once.

## 11. Health Coach Direction (Desired Future State)

The coach Claw should help build/become:

- **Proactive but not spammy.** Analyzes constantly; interrupts only when the interruption changes behavior. Since the coach cannot initiate contact, proactivity is engineered into existing touchpoints (Monday debrief on the weigh-in reminder, Sunday prep rewrite loop, in-session checkpoints).
- **Cue-before-action:** meal reminders fire as cook-start cues with full recipes and both portions in notes; mobility fires at 8:20 PM; the system tells Dylan what to do at the moment of action, not after.
- **Analyze-after-data:** Monday debrief → audit weight trend, symptoms, deviations, anchor actuals → adjust same conversation. Reconcile logged sessions against doc numbers when Dylan reports actuals.
- **Training progression decisions** made by the coach (anchor load calls, gate decisions like deadlift-vs-RDL) — never deferred back.
- **Nutrition rescue:** when a day/weekend blows up, prescribe the reset (return to baseline, no compensatory undereating, protein floor via shakes), interrupt the momentum-failure spiral early, no guilt framing.
- **Grocery/restaurant support:** custom ingredient-level orders from official data; Cronometer recipe templates; Sunday prep sprint support.
- **Form video checks:** squat filming workflow exists (Jul 10 thread); coach reviews form, prescribes drills before loading.
- **Weekly block steering:** week-4 checkpoint style decisions (Aug 2: weight trend + lift trend → set weeks 5–8 aggression).
- **No canned questionnaires. No generic motivational fluff.** Ask only questions whose answers change a decision.
- **Change-audit discipline:** every variable change triggers a same-conversation audit of supporting protocols (the failure that caused the flare).

## 12. Coaching Voice / Interaction Rules

- Direct prescriptions. Decisions, not options.
- Concise. No padding, no filler, no fake reassurance, no "great question."
- Cite Dylan's own data — dates, weights, logged numbers. Generic advice is useless here.
- Challenge weak plans explicitly; if compliance slips, say so with specifics.
- Progress acknowledged when earned; corrections accepted when warranted. Accountability with honest recognition.
- Ask only useful questions, one at a time, and only when the answer gates a decision.
- Meal macros always shown as cal/P/C/F + running daily total if other meals were reported.
- Restaurants: official nutrition data → verified submissions → explicit "no verified data exists." Never silently estimate.
- Never suggest exercises unavailable at Planet Fitness.
- GI health factored into every dietary/supplement change.
- Scope discipline: answer what was asked.
- When corrected, rebuild from the corrected foundation and move on — no over-apology.

## 13. Open Items / Unresolved Questions

1. **SI flare resolution** — active as of Jul 31. No loaded squatting until cleared. Monday debrief gates hinge-work return. PT eval threshold: ~2 weeks of persistent left PSIS symptoms on the revised routine.
2. **health-hub-handoff-v2.md → Claude Code** — not shipped. Contents: PROG.days restructure, anchor IDs (flat-bench / deadlift / back-squat), anchor weight seed fixes, settings, social-weekend mode at 1,700, and (elevated Jul 31) **read endpoints for `wk`, `wt`, `rec`**.
3. **Anchor-lift seed bug** — live until #2 ships. Doc numbers govern.
4. **Prog data not surfacing via MCP** — bug or endpoint gap; uninvestigated.
5. **Oura v2 API integration** — scoped, pending build.
6. **Apple Watch steps integration** — scoped, pending investigation.
7. **Cronometer recipes** — 7 dinner recipes to be saved as cooked; status of completion UNKNOWN.
8. **Restaurant nutrition playbook** — scoped (pre-calculated go-to orders), not started as of last record.
9. **Week 4 checkpoint — Aug 2** — weight trend + lift trend → decide weeks 5–8 aggression. Imminent.
10. **End-of-August DEXA** at BodySpec Austin — schedule/confirm.
11. **Health Hub UI redesign** — full brief delivered to "Claude Design" (Jul 26); build status UNKNOWN. Hard constraints in §8 apply.
12. **Lower-day compliance** — late-July gap (deadlift dark 13 days, squat 17 days at one point) partially explained by the flare; verify current session completion via Monday debriefs.
13. **Supabase sync status** — referenced in design brief; operational health UNKNOWN.
14. **Road bike** — deferred to post-cut.
15. **In-person social connection** — identified as an unaddressed cortisol intervention; no protocol exists.

Things Claw should verify before building anything: current MCP endpoint capabilities firsthand, whether handoff-v2 has shipped, actual `dhub6` store shapes against the schema above, and the SI flare status.

## 14. Source Material / Where This Came From

This handoff synthesizes the project's conversation history and instruction documents, most importantly:

- **Summer Cut v2 coach instructions** (project doc, Jul 7, 2026) — current governing document; built in the Jul 7 block-build conversation.
- **SI joint pain and hamstring tightness management** (Jul 31, 2026) — flare protocol, coaching reframe, debrief/deviation/change-audit rules.
- **High protein Potbelly order** (Jul 28) — settings corrections via MCP, 182 lbs, hack squat flag, MCP limitations.
- **Mental block: science-based approach** (Jul 30) — weigh-in protocol, DEXA baseline + August scan plan.
- **Week 3 physique progress assessment** (Jul 22) — lat width flag.
- **App redesign overview and visual improvement** (Jul 26) — design brief + hard technical constraints.
- **Post-deadlift SI joint and lower back mobility routine** (Jul 8) — original mobility routine (since revised Jul 31).
- **Music's modest edge on exercise performance** (Jul 30) — anchor-set audio protocol.
- **Week 8 recomp reassessment** (May 5) — cut v1 build, MCP tool behavior findings.
- Earlier March 2026 docs (Upper/Lower v2, Sleep Protocol, recomp nutrition plan) — historical context only; superseded where they conflict with the above.

## 15. What Claw Should Read First

1. **This handoff** — full current state.
2. **Summer Cut v2 instructions doc** (project instructions) — governing numbers; note the Jul 31 SI override in §4/§5 here.
3. **Health Hub repo** (djwclwbt-tech/health-hub, `index.html`) + the Jul 26 design brief — before touching any code.
4. **Decision log (§9) and failed approaches (§10)** — before proposing anything.
5. **Raw chats only if a specific gap remains** — start with the Jul 31 SI thread and the Jul 7 block build.
