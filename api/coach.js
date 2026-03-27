export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
  try {
    const { question, exercise, weight, reps, sets, focus, history, recovery, stalled, week } = req.body;
    if (!question) return res.status(400).json({ error: 'No question provided' });
    const ctx = exercise ? `Current exercise: ${exercise}, ${weight}lbs, ${sets}x${reps}, ${focus} day.` : '';
    const historyCtx = history && history.length ? `\nPROGRESSION HISTORY (last ${history.length} sessions):\n${history.map(h => `${h.date}: ${h.weight}lbs × ${h.reps.join(',')} reps (${h.sets} sets)`).join('\n')}` : '';
    const recoveryCtx = recovery ? `\nTODAY'S RECOVERY: Score ${recovery.score || '?'}%, HRV ${recovery.hrv || '?'}ms, RHR ${recovery.rhr || '?'}bpm, Sleep ${recovery.sleep || '?'}h` : '';
    const stallCtx = stalled ? '\n⚠️ This exercise is STALLED (not progressing for 3+ sessions).' : '';
    const weekCtx = week ? `\nProgram week: ${week}` : '';
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
        system: `You are a concise strength coach mid-workout. ${ctx}${historyCtx}${recoveryCtx}${stallCtx}${weekCtx}

Give brief, actionable answers in 1-3 sentences. No fluff. Focus on form cues, substitute exercises, weight adjustments, or technique tips.

When giving advice:
- Reference progression history to identify trends (weight jumps, rep drops, consistency)
- If recovery is poor (low score, low HRV, high RHR, low sleep), recommend reducing intensity or volume
- If the exercise is stalled, suggest technique changes, rep scheme adjustments, or alternative exercises to break through
- Factor in program week: early weeks = build volume, later weeks = peak intensity, deload week = reduce load and focus on form

If the athlete agrees to a concrete program change (swap exercise, adjust weight, change a setting), return JSON with both "answer" and "actions". Otherwise return JSON with just "answer".

Actions schema: {"answer":"your text","actions":[{"type":"settings"|"exercise","action":"update"|"swap"|"add"|"remove",...fields}]}

Exercise update example: {"type":"exercise","action":"update","exerciseId":"bench-press","fields":{"sw":145,"notes":"Push for 150"}}
Exercise swap example: {"type":"exercise","action":"swap","oldExerciseId":"bench-press","newExercise":{"id":"incline-db-press","name":"Incline DB Press","sets":3,"rr":[8,12],"rest":90,"sw":50,"inc":5,"unit":"lbs","notes":"","cue":""}}
Settings example: {"type":"settings","field":"trainingCal","value":2800}

IMPORTANT: Only include actions when the athlete explicitly asks for a change. Never assume. Your ENTIRE response must be a single JSON object — no text before or after the JSON. Example: {"answer":"Your coaching advice here."}`,
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
      const answer = parsed.answer || parsed.response || parsed.text || parsed.message;
      if (answer) {
        return res.status(200).json({ answer, actions: parsed.actions || [] });
      }
      return res.status(200).json({ answer: text, actions: parsed.actions || [] });
    } catch {
      // Claude may return text + JSON — try to extract the JSON object
      const jsonMatch = text.match(/\{[\s\S]*\}$/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const answer = parsed.answer || parsed.response || parsed.text || parsed.message;
          if (answer) return res.status(200).json({ answer, actions: parsed.actions || [] });
        } catch {}
      }
    }
    // Fallback: plain text answer
    return res.status(200).json({ answer: text, actions: [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
