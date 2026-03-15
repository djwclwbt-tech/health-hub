export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.UPDATE_TOKEN;
  if (!token) return res.status(500).json({ error: 'UPDATE_TOKEN not configured' });

  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${token}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { changes, reason } = req.body;
    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ error: 'changes array is required and must be non-empty' });
    }

    const SB_URL = process.env.SUPABASE_URL || "https://wszumxewqxkggtevfubb.supabase.co";
    const SB_KEY = process.env.SUPABASE_KEY || "sb_publishable_zeAejuFbdtMfoCHudxW6Cw_TJKtbYSJ";
    const sbHeaders = {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${SB_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    };

    let inserted = 0;
    for (const change of changes) {
      if (!change.type) continue;

      const row = {
        type: change.type,
        action: change.action || null,
        payload: JSON.stringify(change),
        reason: reason || null,
        applied: false,
      };

      const r = await fetch(`${SB_URL}/rest/v1/program_updates`, {
        method: "POST",
        headers: sbHeaders,
        body: JSON.stringify(row),
      });

      if (r.ok) inserted++;
      else console.error(`[update] Failed to insert change:`, await r.text());
    }

    return res.status(200).json({ ok: true, count: inserted });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
