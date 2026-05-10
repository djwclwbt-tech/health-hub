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

    const SB_URL = "https://wszumxewqxkggtevfubb.supabase.co";
    const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
    const headers = {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    };

    const r = await fetch(`${SB_URL}/rest/v1/weight?on_conflict=date`, {
      method: "POST",
      headers,
      body: JSON.stringify({ date: resolvedDate, value: weight }),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: `Supabase error: ${err}` });
    }

    return res.status(200).json({ ok: true, date: resolvedDate, weight });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
