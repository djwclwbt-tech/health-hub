# HealthHub workspace notes

Read `CLAUDE.md` for the existing architecture, commands, and repository rules. Explicit user instructions take precedence over its publishing workflow.

## Direct band experiment

- Current authorization: bypass WHOOP's app/cloud; use the existing HealthHub app and agent ecosystem. No UI redesign or production deployment is authorized. Final band naming is undecided.
- `lib/band.mjs`: standard heart-rate decoding, capture validation, freshness. `api/band-sync.js`: Bearer `SYNC_TOKEN`, writes `band:` capture rows in the existing `program` table. Do not write these samples into scored recovery.
- `api/mcp.js`: `get_band_status` reads the same capture store. Raw packets do not enter agent replies. The normal web app does not yet consume a live band stream.
- `companion/BandLink.xcodeproj`: native iOS collector source; `bash companion/check-build.sh` performs an unsigned simulator build on a Mac; Apple frameworks only. No proprietary band commands. Local capture files are retained for retries and capped for short tests.
- `bash companion/check-outbox.sh`: ten isolated native storage/upload checks on a Mac, with intercepted network requests and no keychain access. `npm run check`: full backend/mapping checks. `node --test test/band.test.mjs`: focused receiver checks. Device setup and verification limits: `docs/whoop-2026-11/direct-band.md`.
- Native builds passed on Dylan's Mac with Xcode 26.3 for simulator and unsigned physical-device targets on 2026-11-07. The setup screen launched and was visually checked in a simulator. Real band access remains untested. The Mac source is `/Users/dylan/HealthHubBand-2026-11-07/companion/BandLink.xcodeproj`. Remote Login works for `dylan`; use secure authentication and never save passwords. The iPhone is connected and trusted according to Dylan, and USB inventory sees it; Xcode device discovery does not yet list it. Dylan later approved Accessibility access, and Xcode interface control succeeded. He signed into Xcode with a personal Apple account. A remote signed build failed with `User interaction is not allowed` and no provisioning profile. A build was then started inside Xcode; its result is unchecked. Both Xcode and the Mac phone-connection service still return no devices after reconnection. Dylan left on 2026-11-07; interactive Mac work stopped. No physical installation or band capture has succeeded.

## Recovered integration

- WHOOP support exists in Git history: added `5d8c29c` (2026-04-11), removed `5720bff` (2026-05-03) during the Oura switch. Recover source from `5720bff^` for review; do not assume registration or authorization must be created again. Current source has no WHOOP routes.

## Research documentation

- `docs/whoop-2026-11/index.md` records the November 7, 2026 REA source investigation, WHOOP feasibility findings, and Dylan's confirmed product goals and integration scope. Dylan owns a WHOOP 5.0. The research does not establish tested device compatibility.
- Refresh source references and distinguish source findings from device tests when updating this research.
- Build the readable brief with `~/.claude/scripts/docs-build docs/whoop-2026-11 healthhub-whoop-research`.

- Offline verification expanded on 2026-11-07: `npm run check` passed 111 tests; the native outbox passed ten checks. A Swift-generated synthetic recording was accepted by the JavaScript decoder. Updated unsigned simulator and device builds passed, and the simulator setup screen was rechecked. A regression test found and fixed freshness rounding beyond the 120-second boundary. See `docs/whoop-2026-11/offline-testing.md`. No physical Bluetooth or production verification occurred.

## Mail intake

`intake/mail/` holds one note per health email (portal messages, results, pharmacy), written from headers only by Mack's mail triage (`/home/dwrzl/.t3/scratch/2026-11-11-find-the-email-tracking-app-9a946969/mail_triage.py`). Gitignored.
