# Security Posture (documented 2026-07-11, updated 2026-10-08 — broad hardening still deferred by decision)

## Known risks

### 1. Top open risk: public Supabase key + permissive RLS
The Supabase URL and publishable (anon) key are hardcoded in source:

- `lib/supabase.mjs` (`DEFAULT_URL` / `DEFAULT_KEY`), used by the app bundle and,
  through `supabaseEnv()` in `lib/http.mjs`, as the last fallback for every `/api/*` route
- `index.html` (SUPABASE CLIENT block)

Server routes resolve the key in one order: `SUPABASE_KEY`, then
`SUPABASE_ANON_KEY`, then the public default.

Combined with permissive row-level-security policies (see the public
read/write pattern in `supabase/cardio_schema.sql`, applied similarly to the
other tables), **all health data is readable and writable by anyone who has
the page source or repo**. The key is by design a client-side credential;
the missing control is RLS. Every endpoint gate below is moot for someone who
talks to Supabase directly, so this stays the first thing to fix.

### 2. Endpoint gates (all in `lib/http.mjs`, secrets compared in constant time)
- `/api/mcp` (the Coach) reads and writes every table. When `MCP_TOKEN` is set it
  requires the token as `Authorization: Bearer …` **or** `?key=…` in the URL.
  Claude.ai's custom connector can't send headers, so its connector URL is
  `https://<domain>/api/mcp?key=<MCP_TOKEN>`. The URL then holds the secret: treat
  it like a password and rotate `MCP_TOKEN` (and the connector URL) if it leaks.
  With `MCP_TOKEN` unset the Coach is open to anyone who knows the URL.
- `/api/update` requires `Bearer UPDATE_TOKEN`; refuses (500) when unset.
- `/api/sync-steps`, `/api/sync-weight` require `SYNC_TOKEN` (query, body or
  Bearer); refuse (500) when unset. Empty bodies get 401, not a crash.
- `/api/oura-sync`, `/api/cronometer-sync` run for Vercel cron or with
  `OURA_SYNC_SECRET` / `CRONOMETER_SYNC_SECRET` (`x-sync-secret` or `?secret=`);
  refuse when the secret is unset. A cron call must carry Vercel's
  `Authorization: Bearer $CRON_SECRET` (set in production 2026-10-08). Without
  `CRON_SECRET` every cron call is refused; the `vercel-cron/` User-Agent proves nothing.
  Cronometer's `?debug=1` needs the manual secret, never the cron path.
- `/api/push-schedule` refuses POSTs (503) unless `NOTIFY_TOKEN` is set and sent
  as `x-notify-token`.
- `/api/analyze` and `/api/bodycomp` (Claude API spend) require `x-sync-token`
  equal to `SYNC_TOKEN` when `SYNC_TOKEN` is set. The app sends Setup → Sync
  Token as that header, so the AI features need the token entered on the phone.
  With `SYNC_TOKEN` unset they stay open (the 2026-07-31 zero-setup decision).
- `/api/allergies` is public read-only (scrapes a public pollen site).

Removed: `update.html` (stored `UPDATE_TOKEN` in localStorage on the app's
origin) and `privacy.html` (written for the removed WHOOP OAuth flow).

## Future fix path (when hardening is picked up)
1. Enable restrictive RLS on every table; move all client access behind a
   single authenticated Supabase user (email or anonymous sign-in pinned to
   the device) so the publishable key alone grants nothing.
2. Rotate the publishable key after RLS lands.
3. Set `CRON_SECRET`, `MCP_TOKEN`, `OURA_SYNC_SECRET`, `CRONOMETER_SYNC_SECRET`
   and `NOTIFY_TOKEN` in Vercel; the code already honors them.
4. Replace the Coach's URL key with OAuth (mcp-handler `withMcpAuth`) once
   Claude.ai's connector flow is wired.
5. Consider moving Supabase writes behind Vercel functions with a service
   key so the browser never talks to Supabase directly.

Nothing in this file is implemented beyond what is noted as already in code.
