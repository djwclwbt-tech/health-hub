// GET|POST /api/sync-steps · Apple Shortcut / Health Auto Export sync · SYNC_TOKEN as ?token=, body.token or Bearer.
import { makeClient } from '../lib/supabase.mjs';
import { preflight, requireToken, queryOf, bodyOf, supabaseEnv } from '../lib/http.mjs';

export default async function handler(req, res) {
  if (preflight(req, res, 'GET, POST')) return;
  if (!requireToken(req, res, 'SYNC_TOKEN', { allowQuery: true, allowBody: true })) return;

  try {
    const params = req.method === 'GET' ? queryOf(req) : bodyOf(req);
    const resolvedDate = params.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const client = makeClient(supabaseEnv());

    // Health Auto Export REST payload: {data:{metrics:[{name,units,data:[{date,qty}]}]}}
    // Steps: sums all points per calendar day (HAE can send hourly buckets).
    // Weight (body mass, e.g. Renpho via Apple Health): last reading per day, kg→lbs if needed.
    const haeMetrics = params?.data?.metrics;
    if (Array.isArray(haeMetrics)) {
      const stepMetric = haeMetrics.find(m => /step/i.test(m?.name || ''));
      const stepsByDay = {};
      for (const point of stepMetric?.data || []) {
        const date = String(point?.date || '').slice(0, 10);
        const qty = Number(point?.qty) || 0;
        if (/^\d{4}-\d{2}-\d{2}$/.test(date) && qty > 0) stepsByDay[date] = (stepsByDay[date] || 0) + qty;
      }
      const stepRows = Object.entries(stepsByDay).map(([date, v]) => ({ date, value: Math.round(v) }));

      const weightMetric = haeMetrics.find(m => /body.?mass|^weight/i.test(m?.name || ''));
      const isKg = /kg/i.test(weightMetric?.units || '');
      const weightByDay = {};
      for (const point of weightMetric?.data || []) {
        const date = String(point?.date || '').slice(0, 10);
        const qty = Number(point?.qty) || 0;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || qty <= 0) continue;
        const lbs = +(isKg ? qty * 2.20462 : qty).toFixed(1);
        if (lbs > 80 && lbs < 500) weightByDay[date] = lbs;
      }
      const weightRows = Object.entries(weightByDay).map(([date, value]) => ({ date, value }));

      if (!stepRows.length && !weightRows.length) return res.status(400).json({ error: 'No step or weight data points in payload' });
      if (stepRows.length) await client.upsert('steps', stepRows);
      if (weightRows.length) await client.upsert('weight', weightRows);
      return res.status(200).json({ ok: true, steps: stepRows.length, weight: weightRows.length, syncedSteps: stepRows.slice(-3), syncedWeight: weightRows.slice(-3) });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate)) {
      return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
    }

    const rawSteps = params.steps ?? params.value ?? params.count ?? params.stepCount ?? params.step_count;
    const parseSteps = (raw) => {
      if (Array.isArray(raw)) return raw.reduce((sum, v) => sum + parseSteps(v), 0);
      if (raw && typeof raw === 'object') return parseSteps(raw.steps ?? raw.value ?? raw.count ?? raw.quantity ?? raw.total);
      if (typeof raw === 'number') return raw;
      const text = String(raw ?? '').replace(/,/g, '');
      const nums = text.match(/\d+(?:\.\d+)?/g)?.map(Number).filter(n => Number.isFinite(n) && n > 0 && n < 200000) || [];
      if (!nums.length) return 0;
      return nums.length === 1 ? nums[0] : nums.reduce((sum, n) => sum + n, 0);
    };
    const stepCount = Math.round(parseSteps(rawSteps));
    if (stepCount <= 0) {
      return res.status(400).json({ error: 'steps must be a positive number' });
    }

    await client.upsert('steps', { date: resolvedDate, value: stepCount });
    return res.status(200).json({ ok: true, date: resolvedDate, steps: stepCount });
  } catch (err) {
    console.error('[sync-steps]', err);
    return res.status(500).json({ error: 'Sync failed' });
  }
}
