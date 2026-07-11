# Security Posture (documented 2026-07-11 — hardening deferred by decision)

## Known risks

### 1. Hardcoded Supabase publishable key + permissive RLS
The Supabase URL and publishable (anon) key are hardcoded in source:

- `index.html` (SUPABASE CLIENT block)
- `api/mcp.js`, `api/update.js`, `api/sync-steps.js`, `api/sync-weight.js` (env fallback)

Combined with permissive row-level-security policies (see the public
read/write pattern in `supabase/cardio_schema.sql`, applied similarly to the
other tables), **all health data is readable and writable by anyone who has
the page source or repo** — the key is by design a client-side credential;
the missing control is RLS.

### 2. Unauthenticated / lightly-authenticated endpoints
- `/api/mcp` trusts the Supabase key alone for `get_program`; the `update_*`
  tools write to the `program_updates` queue with no caller auth beyond the
  Bearer token configured in the Claude.ai integration.
- `/api/oura-sync` and `/api/cronometer-sync` are public unless
  `OURA_SYNC_SECRET` / `CRONOMETER_SYNC_SECRET` env vars are set.
- `/api/push-schedule` accepts any push job unless `NOTIFY_TOKEN` is set
  (added 2026-07-11 — set the env var to activate the check).

## Future fix path (when hardening is picked up)
1. Enable restrictive RLS on every table; move all client access behind a
   single authenticated Supabase user (email or anonymous sign-in pinned to
   the device) so the publishable key alone grants nothing.
2. Rotate the publishable key after RLS lands.
3. Set `OURA_SYNC_SECRET`, `CRONOMETER_SYNC_SECRET`, and `NOTIFY_TOKEN` in
   Vercel; they are already honored by the code.
4. Require `UPDATE_TOKEN` on `/api/mcp` tool calls (mcp-handler
   `verifyBearerAuth`), matching `/api/update`.
5. Consider moving Supabase writes behind Vercel functions with a service
   key so the browser never talks to Supabase directly.

Nothing in this file is implemented beyond what is noted as already in code.
