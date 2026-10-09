// POST /api/update · Bearer UPDATE_TOKEN · {changes:[...], reason}
// Same write path as the Coach MCP: changes are applied to the live settings /
// program rows immediately (lib/engine.mjs applyChanges) and logged to
// program_updates, which the app surfaces on next launch. See api/schema.md.
import { applyChanges } from '../lib/engine.mjs';
import { makeClient, writeProgramChanges } from '../lib/supabase.mjs';
import { preflight, requireToken, bodyOf, supabaseEnv } from '../lib/http.mjs';

export default async function handler(req, res) {
  if (preflight(req, res, 'POST')) return;
  if (!requireToken(req, res, 'UPDATE_TOKEN')) return;

  try {
    const { changes, reason } = bodyOf(req);
    if (!Array.isArray(changes) || changes.length === 0) return res.status(400).json({ error: 'changes array is required and must be non-empty' });
    const result = await writeProgramChanges(makeClient(supabaseEnv()), applyChanges, changes, { reason: reason || null, source: 'api' });
    return res.status(200).json({ ok: true, count: result.applied.length, applied: result.applied, rejected: result.rejected.map(r => r.error) });
  } catch (err) {
    console.error('[update]', err);
    return res.status(500).json({ error: 'Update failed' });
  }
}
