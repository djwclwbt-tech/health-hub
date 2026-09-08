// POST /api/update · Bearer UPDATE_TOKEN · {changes:[...], reason}
// Same write path as the Coach MCP: changes are applied to the live settings /
// program rows immediately (lib/engine.mjs applyChanges) and logged to
// program_updates, which the app surfaces on next launch. See api/schema.md.
import { applyChanges } from '../lib/engine.mjs';
import { makeClient, writeProgramChanges } from '../lib/supabase.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.UPDATE_TOKEN;
  if (!token) return res.status(500).json({ error: 'UPDATE_TOKEN not configured' });
  if (req.headers.authorization !== `Bearer ${token}`) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { changes, reason } = body;
    if (!Array.isArray(changes) || changes.length === 0) return res.status(400).json({ error: 'changes array is required and must be non-empty' });
    const client = makeClient({ url: process.env.SUPABASE_URL || undefined, key: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || undefined });
    const result = await writeProgramChanges(client, applyChanges, changes, { reason: reason || null, source: 'api' });
    return res.status(200).json({ ok: true, count: result.applied.length, applied: result.applied, rejected: result.rejected.map(r => r.error) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
