# Cut App IA Audit — 2026-05-09

Goal: Health Hub should help Dylan execute the cut, not browse health data.

## Default Home / Dashboard

- **Must-have daily execution:** Cut Command, today mode, one next action, protein/calorie remaining, training/cardio obligation, completion checklist, adaptation reason.
- **Useful weekly review:** weight trend, adherence, recovery trend, training progress/stalls, weekly recommendation.
- **Detail/history only:** recomp score, charts, body measurements, PR board, volume, import controls, TDEE internals.
- **Remove/defer from default:** anything that does not change today’s plan.

Plan: keep Home as Cut Command only. Rename dense dashboard access to Review/details and keep it secondary.

## Training

- **Must-have daily execution:** today’s session, start workout, active workout set logging, safe swaps, post-lift cardio.
- **Useful weekly review:** strength drops/stalls, e1RM trends, calendar/history.
- **Detail/history only:** PR charts, old workout drilldowns, AI coach.
- **Remove/defer from default:** dense history before workout is complete.

Plan: split by state: before workout = today plan/start; during = active workout only; after = summary + recovery/cardio instruction.

## Nutrition / Food

- **Must-have daily execution:** calories remaining, protein remaining, fast rough meal logging, synced meals list.
- **Useful weekly review:** weekly calorie adherence and social/travel effects.
- **Detail/history only:** TDEE internals, week bars, water history, checkpoints.
- **Remove/defer from default:** adjustment internals unless recommendation changed.

Plan: make “what do I need next?” and quick add primary; collapse week/TDEE/water history.

## Weight / Scale

- **Must-have daily execution:** fast morning weight log.
- **Useful weekly review:** trend weight and pace vs target.
- **Detail/history only:** entries list and chart.

Plan: make log field primary; keep chart/history collapsed except review.

## Habits / Recovery

- **Must-have daily execution:** recovery/weight check-in, evening closeout, sleep/stretch/water/steps flags.
- **Useful weekly review:** 7-day adherence, streaks, recovery trend.
- **Detail/history only:** manage habits and history list.

Plan: reduce to check-in/closeout flow; move management lower/collapsed.

## Settings

- **Must-have daily execution:** none.
- **Useful weekly review:** target changes and protocols.
- **Detail/history only:** sync, photos, data import/export, program editor.

Plan: keep as setup/admin, not part of daily loop.

## Phase order

1. Lock IA and backup. ✅
2. Home = Cut Command only; secondary Review/details link; explicit adaptation “why.”
3. Fix cardio schema/sync correctness before declaring cardio done.
4. Simplify nutrition quick logging.
5. Simplify training/cardio state flow.
6. Build weekly adjustment recommendation card.
