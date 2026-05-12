const callClaude = async ({ apiKey, system, content, maxTokens = 700 }) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const msg = data.error?.message || 'API error';
    const err = new Error(msg);
    err.status = response.status;
    throw err;
  }
  return data.content?.[0]?.text || '';
};

const parseJsonObject = (text) => {
  const clean = (text || '').replace(/```json|```/g, '').trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}$/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
};

const dailyCoachSystem = `You are Claw, Dylan's private Health Hub fitness and nutrition agent.

Use the provided Health Hub context. Do not give generic fitness advice when data is available. If data is missing, say exactly what is missing and make the best decision from available data. Do not treat wearable calorie estimates as reliable. Separate known data from estimates. Do not change settings, logs, workouts, or program data.

Be concise, direct, coach-like, skeptical of bad data, and action-first. Explain only the why that changes the decision.

Return ONLY valid JSON with this exact shape:
{
  "todayPlan": {
    "workout": "string",
    "targetExercises": ["string"],
    "suggestedWeightsReps": ["string"],
    "cardioSteps": "string",
    "mobility": "string",
    "nutritionTarget": "string"
  },
  "keyAdjustment": "single most important adjustment based on the data",
  "watchOuts": ["fatigue/missed lifts/low calories/poor sleep/low steps/soreness/recovery/data issues"],
  "simpleInstruction": "exactly what to do next",
  "missingData": ["missing item"],
  "confidence": "High|Medium|Low"
}

Progression rules: increase load only when recent reps hit target consistently; hold weight if performance is flat, recovery poor, calories low, or reps barely cleared target; reduce weight/volume if performance drops across multiple sessions or recovery is poor; suggest swaps for pain, equipment issues, boredom, or repeated stalls while preserving workout intent.

Nutrition rules: use Cronometer/Health Hub calories/macros when available; compare intake to current goal; for a cut prioritize adherence, protein, steps, and sustainable deficit; restaurant/unlogged food is estimated, not exact.`;

const midWorkoutSystem = ({ ctx, historyCtx, recoveryCtx, stallCtx, weekCtx }) => `You are a concise strength coach mid-workout. ${ctx}${historyCtx}${recoveryCtx}${stallCtx}${weekCtx}

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

IMPORTANT: Only include actions when the athlete explicitly asks for a change. Never assume. Your ENTIRE response must be a single JSON object — no text before or after the JSON. Example: {"answer":"Your coaching advice here."}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
  try {
    const { mode, context, question, exercise, weight, reps, sets, focus, history, recovery, stalled, week } = req.body;

    if (mode === 'daily') {
      if (!context) return res.status(400).json({ error: 'Daily coach context is required' });
      const text = await callClaude({
        apiKey,
        system: dailyCoachSystem,
        content: JSON.stringify(context, null, 2),
        maxTokens: 850,
      });
      const parsed = parseJsonObject(text);
      if (!parsed) return res.status(422).json({ error: 'Failed to parse daily coach response', raw: text });
      return res.status(200).json(parsed);
    }

    if (!question) return res.status(400).json({ error: 'No question provided' });
    const ctx = exercise ? `Current exercise: ${exercise}, ${weight}lbs, ${sets}x${reps}, ${focus} day.` : '';
    const historyCtx = history && history.length ? `\nPROGRESSION HISTORY (last ${history.length} sessions):\n${history.map(h => `${h.date}: ${h.weight}lbs × ${h.reps.join(',')} reps (${h.sets} sets)`).join('\n')}` : '';
    const recoveryCtx = recovery ? `\nTODAY'S RECOVERY: Score ${recovery.score || '?'}%, HRV ${recovery.hrv || '?'}ms, RHR ${recovery.rhr || '?'}bpm, Sleep ${recovery.sleep || '?'}h` : '';
    const stallCtx = stalled ? '\nThis exercise is STALLED (not progressing for 3+ sessions).' : '';
    const weekCtx = week ? `\nProgram week: ${week}` : '';
    const text = await callClaude({
      apiKey,
      system: midWorkoutSystem({ ctx, historyCtx, recoveryCtx, stallCtx, weekCtx }),
      content: question,
      maxTokens: 400,
    });

    const parsed = parseJsonObject(text);
    if (parsed) {
      const answer = parsed.answer || parsed.response || parsed.text || parsed.message;
      if (answer) return res.status(200).json({ answer, actions: parsed.actions || [] });
      return res.status(200).json({ answer: text, actions: parsed.actions || [] });
    }
    return res.status(200).json({ answer: text, actions: [] });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}
