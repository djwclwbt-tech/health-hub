export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const syncToken = process.env.SYNC_TOKEN;
  if (!syncToken) return res.status(500).json({ error: 'SYNC_TOKEN not configured' });

  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const authToken = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
    const token = params.token || authToken;
    const resolvedDate = params.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

    if (!token || token !== syncToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Health Auto Export REST payload: {data:{metrics:[{name:"step_count",data:[{date,qty}]}]}}
    // Sums all points per calendar day (HAE can send hourly buckets).
    const haeMetrics = params?.data?.metrics;
    if (Array.isArray(haeMetrics)) {
      const stepMetric = haeMetrics.find(m => /step/i.test(m?.name || ''));
      const byDay = {};
      for (const point of stepMetric?.data || []) {
        const date = String(point?.date || '').slice(0, 10);
        const qty = Number(point?.qty) || 0;
        if (/^\d{4}-\d{2}-\d{2}$/.test(date) && qty > 0) byDay[date] = (byDay[date] || 0) + qty;
      }
      const haeRows = Object.entries(byDay).map(([date, v]) => ({ date, value: Math.round(v) }));
      if (!haeRows.length) return res.status(400).json({ error: 'No step data points in payload' });

      const SB_URL = process.env.SUPABASE_URL || "https://wszumxewqxkggtevfubb.supabase.co";
      const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "sb_publishable_zeAejuFbdtMfoCHudxW6Cw_TJKtbYSJ";
      const r = await fetch(`${SB_URL}/rest/v1/steps?on_conflict=date`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify(haeRows),
      });
      if (!r.ok) return res.status(500).json({ error: `Supabase error: ${await r.text()}` });
      return res.status(200).json({ ok: true, synced: haeRows });
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

    // Same env fallback chain as update.js/mcp.js — these three previously had
    // no hardcoded fallback, so a missing env var 500'd every request.
    const SB_URL = process.env.SUPABASE_URL || "https://wszumxewqxkggtevfubb.supabase.co";
    const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "sb_publishable_zeAejuFbdtMfoCHudxW6Cw_TJKtbYSJ";
    const headers = {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    };

    const r = await fetch(`${SB_URL}/rest/v1/steps?on_conflict=date`, {
      method: "POST",
      headers,
      body: JSON.stringify({ date: resolvedDate, value: stepCount }),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: `Supabase error: ${err}` });
    }

    return res.status(200).json({ ok: true, date: resolvedDate, steps: stepCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
