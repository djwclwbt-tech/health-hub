# Coach — Hermes Migration Contract

**Status:** candidate read-only launch
**Owner:** Dylan
**Execution owner:** Mack
**Runtime host:** Raspberry Pi
**Created:** 2026-08-23

## End state

Dylan can use Coach as an independent, persistent health/lifestyle agent backed by the existing Health Hub and OpenClaw Coach knowledge, without Coach becoming a second general assistant or technical project supervisor.

## Scope

Coach covers training, nutrition, recovery, sleep, symptoms/allergies, supplement and medication adherence tracking, habits, and Health Hub interpretation. Coach remains separate from Mack's general-life context.

## Current implementation

- Hermes profile created: `/home/dwrzl/.hermes/profiles/coach/`
- Coach identity: profile `coach`, dedicated `SOUL.md`, `AGENTS.md`, memory files, workspace, and logs
- OpenClaw Coach references retained under the profile's `reference/` links
- Health Hub Coach-system docs linked read-only under `reference/coach-system/`
- Health Hub read helper available at `/home/dwrzl/.openclaw/workspace/skills/health-hub/scripts/health_hub.py`
- Background self-audit passed the live `program` read path

## Guardrails

- Initial mode is read-only manual foundation.
- No Health Hub, Supabase, program, settings, deployment, or external writes.
- No proactive coaching schedule yet.
- Latest direct Dylan instruction outranks dated imported plans.
- Health Hub is instrumentation, not unquestionable authority.
- No diagnosis, medication prescribing, or impersonation of a clinician.
- Mack owns MPS, technical sequencing, worker delegation, acceptance, and recovery.

## Known drift to quarantine

- Dated Summer Cut material is not automatically current.
- Live program/settings contain documented conflicts with Coach injury and nutrition decisions.
- These must be surfaced as drift, not silently auto-corrected.

## Verification evidence

- Hermes profile creation completed successfully.
- Profile self-audit session: `20260823_165912_7ccad3`
- Audit log: `/home/dwrzl/.hermes/profiles/coach/logs/launch-self-audit.txt`
- Helper command exited successfully and returned live program/settings data.
- One file-tool context defect was found and countered by placing prompt files at both profile root and workspace root. A second self-audit is required before acceptance.

## Blocked owner boundary

The direct interface target is not chosen yet:

- reuse/verify existing Coach bot and `#coach` route,
- create a new Coach Discord identity/channel,
- or use private Pi/CLI first and bind Discord after behavior verification.

No credential or gateway change is authorized by this contract.

## Verified direct interface binding

The existing Coach Discord application was located and safely repurposed as the Hermes Coach transport.

- Discord identity: Coach#1364
- Bot ID: `1533648226119450724`
- Credential source: `/home/dwrzl/.openclaw/secrets/openclaw-secrets.json`, Coach account token
- Hermes credential destination: `/home/dwrzl/.hermes/profiles/coach/.env` (mode 600)
- Channel: `#coach` / `1533498530268708997`
- Gateway process: isolated `hermes -p coach gateway run`
- Gateway evidence: `/home/dwrzl/.hermes/profiles/coach/logs/agent.log:18-32`
- Discord evidence: `Connected as Coach#1364`; slash commands synced; channel directory built

Mack's Discord bot and default Hermes gateway were not changed. Claw's bot was not repurposed.

Behavioral verification still requires Dylan to send a test message in `#coach`; no public test message was sent automatically.
