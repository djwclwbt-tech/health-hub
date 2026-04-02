export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // This endpoint is a placeholder for future server-push.
  // Currently notifications are handled client-side via the Notification API.
  return res.status(200).json({ ok: true, message: 'Notifications are currently client-side only' });
}
