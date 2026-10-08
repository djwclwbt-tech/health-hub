# Visual / Cue-Technique Input Channel Note — 2026-08-01

Status: new idea captured for Health Coach delivery-system thinking. Not a feature spec. Not implementation.

## Dylan input

Dylan raised the idea of inputs on cue techniques through the app / Health Coach system.

Important framing:

- This is about the delivery system and analysis inputs, not output/features.
- Do not turn this into a premature app feature.
- Do not frame it as “upload form videos and the app fixes you.”
- Treat visual/form/body-part observations as another data point Coach can reason from.

Example Dylan gave:

- Chest visually holding more fat/softness around nipple-side/lower chest versus upper chest.

## Interpretation

Health Coach may eventually need an input channel for qualitative visual/body/form observations that affect coaching interpretation, such as:

- body-part lag or visual fat distribution
- exercise cue effectiveness
- visible execution quality when Dylan gives form notes/photos/videos
- whether a movement is hitting intended tissue
- whether programming/cues match the physique outcome Dylan wants
- whether body comp notes conflict with scale/nutrition/training data

This should be treated like narrative debrief data:

- source-marked
- confidence-marked
- not over-weighted
- not used as a standalone reason for aggressive changes
- connected to concrete coaching decisions only when it changes action

## Delivery-system questions to explore

1. What types of visual/cue inputs are useful enough to remember?
2. How should Coach classify them?
   - form cue
   - target-muscle feel
   - pain/guarding signal
   - physique lag
   - fat-distribution/body comp note
   - confidence/lighting/pump caveat
3. When should Coach ask for a cue/form/body observation?
4. When should Coach stay silent because visual evidence is too noisy?
5. How should these observations influence:
   - exercise cues
   - exercise swaps
   - progression interpretation
   - weekly cut decisions
   - body comp checkpoint interpretation
6. What should be recorded so future Coach does not forget the observation?

## Guardrails

- Do not diagnose medical/body-image issues from photos.
- Do not overreact to lighting/pump/pose/noise.
- Do not use visual softness alone to cut calories if nutrition visibility is poor.
- Do not prescribe feature work yet.
- Do not make this another dashboard.
- The output is better coaching decisions for Dylan.

## Candidate memory artifact

Future durable file:

- `health-coach-visual-cue-observations.md`

Potential schema:

```md
## YYYY-MM-DD — Observation title

- Source: Dylan note / photo / video / Coach observation / Health Hub body comp
- Domain: form cue / target feel / pain signal / physique lag / fat distribution
- Observation:
- Confidence:
- Caveats:
- Coaching implication:
- Recheck trigger:
```
