// GET|POST /api/sync-weight · Apple Shortcut scale sync · SYNC_TOKEN as ?token=, body.token or Bearer.
import { makeClient } from '../lib/supabase.mjs';
import { preflight, requireToken, queryOf, bodyOf, supabaseEnv } from '../lib/http.mjs';

export default async function handler(req, res) {
  if (preflight(req, res, 'GET, POST')) return;
  if (!requireToken(req, res, 'SYNC_TOKEN', { allowQuery: true, allowBody: true })) return;

  try {
    const params = req.method === 'GET' ? queryOf(req) : bodyOf(req);
    const resolvedDate = params.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate)) {
      return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
    }

    const rawWeight = params.weight ?? params.lbs ?? params.value ?? params.bodyMass ?? params.body_mass;
    const parseWeight = (raw) => {
      if (Array.isArray(raw)) return parseWeight(raw[raw.length - 1]);
      if (raw && typeof raw === 'object') return parseWeight(raw.weight ?? raw.lbs ?? raw.value ?? raw.quantity ?? raw.bodyMass ?? raw.body_mass);
      if (typeof raw === 'number') return raw;
      const text = String(raw ?? '').replace(/,/g, '');
      const n = Number(text.match(/\d+(?:\.\d+)?/)?.[0] || 0);
      return Number.isFinite(n) ? n : 0;
    };
    const weight = Math.round(parseWeight(rawWeight) * 10) / 10;
    if (weight <= 0 || weight > 1000) {
      return res.status(400).json({ error: 'weight must be a positive number in pounds' });
    }

    await makeClient(supabaseEnv()).upsert('weight', { date: resolvedDate, value: weight });
    return res.status(200).json({ ok: true, date: resolvedDate, weight });
  } catch (err) {
    console.error('[sync-weight]', err);
    return res.status(500).json({ error: 'Sync failed' });
  }
}
