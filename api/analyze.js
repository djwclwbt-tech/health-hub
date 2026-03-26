export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { range, days, workouts, nutrition, recovery, weight, steps, habits, water, program, targets, bodyComp } = req.body;

    // Build a compact but data-rich summary for the prompt
    const lines = [];
    lines.push(`Program: ${program?.name || 'Upper/Lower v2'}, Week ${program?.week || '?'}/${program?.totalWeeks || 8}`);
    lines.push(`Analysis window: ${range} (${days} days)`);
    lines.push(`Goals: recomp, ~${targets?.calories || 2430} cal/day, ${targets?.protein || 180}g+ protein, ${targets?.steps || 10000} steps/day, ${targets?.water || 128}oz water, ${targets?.sleep || 7.5}h sleep`);

    if (workouts) {
      lines.push(`\nWORKOUTS: ${workouts.count} sessions logged, days: ${(workouts.days || []).join(', ') || 'none'}, progressions this period: ${workouts.progressions}`);
    } else {
      lines.push(`\nWORKOUTS: None logged in this period`);
    }

    if (nutrition) {
      lines.push(`\nNUTRITION (${nutrition.days} days avg): ${nutrition.cal} cal/day (target ${targets?.calories}), ${nutrition.protein}g protein (target ${targets?.protein}g+), ${nutrition.carbs}g carbs, ${nutrition.fat}g fat, ${nutrition.fiber}g fiber`);
    } else {
      lines.push(`\nNUTRITION: No data in this period`);
    }

    if (recovery) {
      lines.push(`\nRECOVERY (${recovery.days} days): avg score ${recovery.recovery}%, HRV ${recovery.hrv}ms, RHR ${recovery.rhr}bpm, sleep ${recovery.sleep}h (target ${targets?.sleep}h)`);
    } else {
      lines.push(`\nRECOVERY: No data in this period`);
    }

    if (weight) {
      if (weight.change !== undefined) {
        lines.push(`\nWEIGHT: ${weight.start} → ${weight.end} lbs (${weight.change > 0 ? '+' : ''}${weight.change} lbs over ${range}), ${weight.entries} entries`);
      } else if (weight.current) {
        lines.push(`\nWEIGHT: ${weight.current} lbs (1 entry)`);
      }
    } else {
      lines.push(`\nWEIGHT: No data in this period`);
    }

    lines.push(`\nSTEPS: ${steps ? `avg ${steps.toLocaleString()}/day (target ${(targets?.steps || 10000).toLocaleString()})` : 'No data'}`);
    lines.push(`WATER: ${water ? `avg ${water}oz/day (target ${targets?.water || 128}oz)` : 'No data'}`);
    lines.push(`HABITS (7-day score): ${habits != null ? `${habits}%` : 'No data'} — tracked: alcohol-free, cannabis-free, screens off by 10pm, morning sunlight, bed by 10:30, read before bed`);

    if (bodyComp && bodyComp.assessments && bodyComp.assessments.length > 0) {
      lines.push(`\nBODY COMPOSITION (${bodyComp.count} photo(s) in period):`);
      bodyComp.assessments.forEach((a, i) => {
        lines.push(`${i === 0 ? '[Latest] ' : ''}${a.date}: BF ${a.bfRange} — Progress: ${(a.progress || []).join('; ')} — Focus: ${(a.focus || []).join('; ')}`);
      });
      lines.push(`Last photo: ${bodyComp.daysSincePhoto} days ago`);
    } else {
      lines.push(`\nBODY COMPOSITION: No photos in this period.`);
    }

    const dataStr = lines.join('\n');

    const systemPrompt = `You are a health data analyst for a strength athlete doing body recomposition. Analyze the provided data and return ONLY a valid JSON object with this exact structure:
{
  "scores": {
    "overall": <0-100>,
    "training": <0-100 or null if no data>,
    "nutrition": <0-100 or null if no data>,
    "recovery": <0-100 or null if no data>,
    "habits": <0-100 or null if no data>
  },
  "summary": "<2-3 sentence honest assessment of the period>",
  "wins": ["<specific win 1>", "<specific win 2>"],
  "gaps": ["<specific gap 1>", "<specific gap 2>"],
  "trends": ["<trend observation 1>", "<trend observation 2>"],
  "correlations": ["<correlation between metrics>"],
  "recommendations": ["<actionable rec 1>", "<actionable rec 2>", "<actionable rec 3>"],
  "nextWeekFocus": "<1-2 sentence priority focus for next 7 days>",
  "bodyComposition": {"bfTrend":"direction or stable","recompSignal":"yes/no with reasoning","muscleQuality":"brief observation","photoReminder":"only if >14 days since last photo, else null"}
}
Scoring guide: 100=perfect execution, 70+=solid, 45-70=inconsistent, <45=needs attention. Base scores strictly on data vs targets. Be direct — do not sugarcoat gaps. No markdown, no explanation, JSON only.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: dataStr }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });

    const raw = data.content?.[0]?.text || '{}';
    let parsed;
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(422).json({ error: 'Failed to parse analysis', raw });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
