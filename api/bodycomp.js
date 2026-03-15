export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { image, context } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const systemPrompt = `You are a body composition analyst for a male strength athlete doing body recomposition. Analyze progress photos with an honest, coach-like eye.

ANALYSIS RULES:
1. Estimate body fat percentage as a range (e.g. "16-18%"). Use visible landmarks:
   - <10%: Deep muscle striations, veins everywhere, very dry
   - 10-12%: Visible abs, clear vascularity, muscle separation
   - 13-15%: Top abs visible, some vascularity, decent definition
   - 16-18%: Faint upper abs, muscle outlines visible, soft midsection
   - 19-22%: No abs, smooth but muscular shape, love handles starting
   - 23%+: Rounded midsection, little muscle definition
2. Note visible muscle groups and their development (e.g. "shoulders are capping nicely", "lats showing good width")
3. Identify areas of progress if previous assessment is provided
4. Be direct and honest — sugar-coating doesn't help recomp
5. Keep it concise and actionable

${context?.previousAssessment ? `PREVIOUS ASSESSMENT (${context.previousDate}):
Body fat: ${context.previousAssessment.bodyFatRange}
Notes: ${context.previousAssessment.notes}
Compare current photo to this baseline and note specific changes.` : 'This is the first assessment — establish a baseline.'}

${context?.currentWeight ? `Current weight: ${context.currentWeight} lbs` : ''}

Return ONLY valid JSON (no markdown, no backticks):
{"bodyFatRange":"e.g. 16-18%","muscleDevelopment":["observation 1","observation 2","observation 3"],"areasOfProgress":["change 1","change 2"],"focusAreas":["suggestion 1","suggestion 2"],"notes":"brief overall assessment"}`;

    const content = [
      { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
      { type: 'text', text: 'Analyze this progress photo for body composition. Estimate body fat % and note muscle development.' }
    ];

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
        messages: [{ role: 'user', content }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });

    const text = data.content?.[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
