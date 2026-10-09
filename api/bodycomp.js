import { preflight, requireToken, sameOrigin, bodyOf } from '../lib/http.mjs';

const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6';

export default async function handler(req, res) {
  if (preflight(req, res, 'POST', 'Content-Type, x-sync-token')) return;
  // Spends Anthropic credit: when SYNC_TOKEN is set, an outside caller must send it as
  // x-sync-token, unless the request comes from the app's own page. See SECURITY.md.
  if (!sameOrigin(req) && !requireToken(req, res, 'SYNC_TOKEN', { optional: true, header: 'x-sync-token' })) return;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { image, context } = bodyOf(req);
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const systemPrompt = `You are a body composition analyst for a male strength athlete executing a fat-loss cut while preserving muscle. Analyze progress photos with an honest, coach-like eye.

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
4. Be direct and honest — sugar-coating doesn't help cut execution
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
      signal: AbortSignal.timeout(50000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      }),
    }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: { message: e.message } }) })); // network/timeout → 502 below

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[bodycomp] API error:', response.status, data.error?.message);
      return res.status(502).json({ error: 'Analysis unavailable.' });
    }

    const text = data.content?.[0]?.text || '{}';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch {
      console.error('[bodycomp] Failed to parse analysis:', text.slice(0, 500));
      return res.status(422).json({ error: 'Analysis unavailable.' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('[bodycomp] Handler error:', err);
    return res.status(500).json({ error: 'Analysis unavailable.' });
  }
}
