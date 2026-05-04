export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const syncToken = process.env.SYNC_TOKEN;
  if (!syncToken) return res.status(500).json({ error: 'SYNC_TOKEN not configured' });

  try {
    const params = req.method === 'GET' ? req.query : req.body;
    const { steps, token } = params;
    const resolvedDate = params.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

    if (!token || token !== syncToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate)) {
      return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
    }

    const stepCount = Math.round(Number(steps) || 0);
    if (stepCount <= 0) {
      return res.status(400).json({ error: 'steps must be a positive number' });
    }

    const SB_URL = "https://wszumxewqxkggtevfubb.supabase.co";
    const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
    const headers = {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    };

    const r = await fetch(`${SB_URL}/rest/v1/steps`, {
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
