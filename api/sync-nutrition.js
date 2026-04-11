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
    const { cal, protein, carbs, fat, fiber, token } = params;
    const resolvedDate = params.date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

    if (!token || token !== syncToken) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate)) {
      return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
    }

    const SB_URL = "https://wszumxewqxkggtevfubb.supabase.co";
    const SB_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
    const headers = {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    };

    const nutrition = {
      date: resolvedDate,
      meals: [{
        description: "MFP Daily Total",
        cal: Math.round(Number(cal) || 0),
        protein: Math.round(Number(protein) || 0),
        carbs: Math.round(Number(carbs) || 0),
        fat: Math.round(Number(fat) || 0),
        fiber: Math.round(Number(fiber) || 0),
        source: "mfp",
      }],
      total_cal: Math.round(Number(cal) || 0),
      total_protein: Math.round(Number(protein) || 0),
      total_carbs: Math.round(Number(carbs) || 0),
      total_fat: Math.round(Number(fat) || 0),
      total_fiber: Math.round(Number(fiber) || 0),
    };

    const r = await fetch(`${SB_URL}/rest/v1/nutrition`, {
      method: "POST",
      headers,
      body: JSON.stringify(nutrition),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: `Supabase error: ${err}` });
    }

    return res.status(200).json({
      ok: true,
      date: resolvedDate,
      cal: nutrition.total_cal,
      protein: nutrition.total_protein,
      carbs: nutrition.total_carbs,
      fat: nutrition.total_fat,
      fiber: nutrition.total_fiber,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
