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
        max_tokens: 400,
        system: `You are a concise strength coach mid-workout. ${ctx} Give brief, actionable answers in 1-3 sentences. No fluff. Focus on form cues, substitute exercises, weight adjustments, or technique tips.

If the athlete agrees to a concrete program change (swap exercise, adjust weight, change a setting), return JSON with both "answer" and "actions". Otherwise return JSON with just "answer".

Actions schema: {"answer":"your text","actions":[{"type":"settings"|"exercise","action":"update"|"swap"|"add"|"remove",...fields}]}

Exercise update example: {"type":"exercise","action":"update","exerciseId":"bench-press","fields":{"sw":145,"notes":"Push for 150"}}
Exercise swap example: {"type":"exercise","action":"swap","oldExerciseId":"bench-press","newExercise":{"id":"incline-db-press","name":"Incline DB Press","sets":3,"rr":[8,12],"rest":90,"sw":50,"inc":5,"unit":"lbs","notes":"","cue":""}}
Settings example: {"type":"settings","field":"trainingCal","value":2800}

IMPORTANT: Only include actions when the athlete explicitly asks for a change. Never assume. Always return valid JSON.`,
        messages: [{ role: 'user', content: question }],
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });
    const text = data.content?.[0]?.text || '';

    // Try to parse as JSON (may contain actions)
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (parsed.answer) {
        return res.status(200).json({ answer: parsed.answer, actions: parsed.actions || [] });
      }
      // JSON parsed but no answer field — fall through to plain text
    } catch {}

    // Fallback: plain text answer
    return res.status(200).json({ answer: text, actions: [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
