export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
  try {
    const { question, exercise, weight, reps, sets, focus } = req.body;
    if (!question) return res.status(400).json({ error: 'No question provided' });
    const ctx = exercise ? `Current exercise: ${exercise}, ${weight}lbs, ${sets}x${reps}, ${focus} day.` : '';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `You are a concise strength coach mid-workout. ${ctx} Give brief, actionable answers in 1-3 sentences. No fluff. Focus on form cues, substitute exercises, weight adjustments, or technique tips.`,
        messages: [{ role: 'user', content: question }],
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });
    const text = data.content?.[0]?.text || '';
    return res.status(200).json({ answer: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
