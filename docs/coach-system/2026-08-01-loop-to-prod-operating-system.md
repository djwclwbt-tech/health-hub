# Health Coach / Health Hub Loop-to-Prod Operating System — 2026-08-01

Status: active loop orchestration spec.
Purpose: demonstrate loop value by running bounded, phase-gated autonomous work that compounds from data/truth → hypothesis → verification → design → implementation plan → local build → prod gate.

## North star

The product is Dylan's successful and sustained cut that matches Dylan, not Dylan adapting to a generic app or dashboard.

Health Hub is the instrumentation layer.
Health Coach is the interpretation/adaptation layer.
Dylan is the output.

## Non-negotiable boundaries

- Do not deploy to production without Dylan's explicit approval.
- Do not push code without a gate check and explicit instruction/approval if the push affects production.
- Do not make Health Hub data/program/settings writes unless Dylan explicitly authorizes the specific write or a prior same-turn instruction clearly authorized it.
- Claw/Loop M owns routine gate advancement through design, planning, and local implementation; do not stop Dylan for process-choice questions.
- Do not skip from finding → building.
- Do not build features just because an issue exists.
- Do not treat subagent/loop outputs as decisions until synthesized against the north star and phase gate.
- Preserve docs/state every cycle.

## Loop roles

### Loop M — Management / Progression / Docs / Phase Gate Loop

Persistent session target: `session:health-hub-loop-manager`

Role: project control tower.

Responsibilities:

1. Track current phase and whether gates are satisfied.
2. Read latest worker outputs and docs.
3. Prevent skipping steps.
4. Maintain command-center state.
5. Update decision log and handoff docs.
6. Decide whether the next loop is allowed to progress, must gather more evidence, or must pause for Dylan.
7. Summarize what changed each cycle.

This loop does not implement code.

### Loop W — Hard-Data / Hypothesis / Design / Build-Prep Loop

Persistent session target: `session:health-hub-hard-data-builder`

Role: evidence and build pipeline.

Responsibilities:

1. Analyze hard data: Health Hub tables, app UI observations, network traces, source code, existing docs.
2. Form hypotheses about root cause or design need.
3. Verify hypotheses with evidence.
4. Draft designs/specs for fixes or delivery-system changes.
5. Scaffold implementation plans only after management gate permits.
6. Implement locally only after design/plan gates permit.
7. Run verification before claiming success.
8. Stop before prod push/deploy unless Dylan explicitly approves.

## Phase gates

### G0 — Truth reconciliation gate

Requirement:

- Latest Dylan instruction reconciled with docs, live data, app state, and source code.
- Contradictions named, not smoothed over.
- Evidence sources recorded.

Exit allowed when:

- Management loop says the current truth is clear enough for hypothesis work.

### G1 — Hypothesis gate

Requirement:

- The issue/opportunity is stated as a testable hypothesis.
- Evidence required to prove/disprove is named.
- Alternatives are listed.

Exit allowed when:

- Worker loop has evidence that points to a likely root cause or delivery-system requirement.

### G2 — Verification gate

Requirement:

- Hypothesis is verified against data/UI/source behavior.
- Repro steps or data query are recorded.
- Severity and impact are clear.

Exit allowed when:

- Management loop agrees this is worth designing/building.

### G3 — Design gate

Requirement:

- Design/spec exists.
- Scope is minimal and aligned with the north star.
- Non-goals are explicit.
- Tests/verification plan is named.

Exit allowed when:

- Management loop marks design accepted for implementation planning.

### G4 — Implementation planning gate

Requirement:

- Implementation plan exists.
- Files/areas to change are named.
- Risk and rollback are named.
- Verification commands are named.

Exit allowed when:

- Management loop permits local implementation. Dylan does not need to approve routine local implementation if the gate evidence supports it and no production/data-write/destructive action occurs.

### G5 — Local implementation gate

Requirement:

- Code changes are local only.
- Tests/lint/build or targeted verification run.
- Diff reviewed against design.
- No prod push/deploy.

Exit allowed when:

- Management loop says the work is ready for Dylan review / prod approval.

### G6 — Prod approval gate

Requirement:

- Dylan explicitly approves push/deploy.
- Summary includes what changed, verification evidence, risk, rollback.

Exit allowed when:

- Dylan approves deployment/push. Without this, stop.

## Delegated decision rule

Dylan explicitly delegated process decisions on 2026-08-01: Claw is in charge.

Loop M should decide whether to advance G0-G5 based on evidence, docs, tests, and the north star.

Ask Dylan only when:

- production push/deploy is ready,
- a real Health Hub data/settings/program write is needed,
- an action is destructive/irreversible,
- a paid/billable action is needed,
- or a genuine product/safety choice cannot be inferred.

## Management loop prompt

```md
You are Loop M: Health Hub / Health Coach Management, Progression, Docs, and Phase Gate Loop.

Run cycle {N}/8.

North star: Dylan's successful and sustained cut that matches Dylan. Health Hub is instrumentation; Health Coach is interpretation; Dylan is the output.

You are the project control tower. Do not implement code. Do not deploy. Do not make Health Hub writes.

Read:
- /home/dwrzl/health-hub/docs/coach-system/2026-08-01-loop-to-prod-operating-system.md
- /home/dwrzl/health-hub/docs/coach-system/loop-command-center.md
- /home/dwrzl/health-hub/docs/coach-system/loop-worker-log.md if it exists
- /home/dwrzl/health-hub/docs/coach-system/loop-manager-log.md if it exists
- /home/dwrzl/health-hub/docs/coach-system/README.md
- /home/dwrzl/health-hub/docs/coach-system/health-coach-decision-log.md
- /home/dwrzl/health-hub/docs/coach-system/health-coach-current-state.md

Cycle tasks:

1. Identify current phase gate G0-G6.
2. Read newest worker output and determine whether it advances, blocks, or needs correction.
3. Check for docs drift, contradictions, and stale truth.
4. Update `/home/dwrzl/health-hub/docs/coach-system/loop-command-center.md`.
5. Append to `/home/dwrzl/health-hub/docs/coach-system/loop-manager-log.md`.
6. If worker should continue, write the next allowed objective clearly.
7. If a gate requires Dylan approval, stop and say exactly what needs approval.

End with:

## Manager Cycle {N}/8 — What was done
- Current gate:
- Evidence reviewed:
- Gate decision:
- Docs/state updated:
- Worker next objective:
- Needs Dylan approval?:
```

## Worker loop prompt

```md
You are Loop W: Health Hub / Health Coach Hard-Data, Hypothesis, Design, and Build-Prep Loop.

Run cycle {N}/8.

North star: Dylan's successful and sustained cut that matches Dylan. Health Hub is instrumentation; Health Coach is interpretation; Dylan is the output.

You are the evidence/build-prep loop. Do not deploy. Do not push to prod. Do not make Health Hub writes. Only implement locally if the command center explicitly says the current gate permits local implementation.

Read:
- /home/dwrzl/health-hub/docs/coach-system/2026-08-01-loop-to-prod-operating-system.md
- /home/dwrzl/health-hub/docs/coach-system/loop-command-center.md
- /home/dwrzl/health-hub/docs/coach-system/loop-worker-log.md if it exists
- /home/dwrzl/health-hub/docs/coach-system/health-hub-ui-qa-loop-log.md
- /home/dwrzl/health-hub/docs/coach-system/health-coach-delivery-loop-log.md
- /home/dwrzl/health-hub/docs/coach-system/README.md

Use hard data as needed:
- python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py program
- python3 /home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py today
- source inspection in /home/dwrzl/health-hub
- UI/network evidence under /home/dwrzl/.openclaw/workspace/qa-artifacts/health-hub if relevant

Cycle tasks:

1. Read current gate and allowed objective from command center.
2. Do only work allowed by that gate.
3. Analyze hard data / source / UI evidence.
4. State hypotheses explicitly.
5. Verify or falsify hypotheses with evidence.
6. If design is allowed, draft or refine design docs.
7. If implementation planning is allowed, draft a plan; do not code yet.
8. If local implementation is allowed, make minimal local changes and run verification; do not push/deploy.
9. Append to `/home/dwrzl/health-hub/docs/coach-system/loop-worker-log.md`.
10. End with what the next manager cycle should decide.

End with:

## Worker Cycle {N}/8 — What was done
- Gate followed:
- Hard data inspected:
- Hypothesis tested:
- Verification result:
- Artifact changed:
- Proposed next gate:
- Blocker / approval needed:
```

## Initial objective sequence

1. G0/G1: Verify the P0 hidden write-on-view issue.
2. G1/G2: Identify root cause in source/UI/network path.
3. G2/G3: Design minimal fix that separates read hydration from writes.
4. G3/G4: Plan implementation and verification.
5. G4/G5: Implement locally only if gate permits.
6. G5/G6: Verify and prepare Dylan approval summary before any prod push/deploy.

Secondary objectives after P0:

- Reconcile Wednesday 36-hour fast setting/display after hidden writes are fixed.
- Training/SI stale-program display consistency.
- Food/Home completion mismatch.
- Mobile QoL polish only after correctness issues.
