import { preflight, requireToken, sameOrigin, bodyOf } from '../lib/http.mjs';
import { ANALYSIS_SYSTEM, briefText, groundingCheck } from '../lib/engine.mjs';

// Weekly analysis. The app builds the brief with the engine (coachBrief) and posts it;
// the model may only cite numbers in it (groundingCheck reports any that are not).
// eval/coach.mjs scores this exact prompt; change both together.
const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';

const call = (apiKey, body, fallback) => fetch('https://api.anthropic.com/v1/messages', {
  signal: AbortSignal.timeout(50000),
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', ...(fallback ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}) },
  body: JSON.stringify(fallback ? { ...body, fallbacks: 'default' } : body),
}).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: { message: e.message } }) })); // network/timeout → 502 below

export default async function handler(req, res) {
  if (preflight(req, res, 'POST', 'Content-Type, x-sync-token')) return;
  // Spends Anthropic credit: when SYNC_TOKEN is set, an outside caller must send it as
  // x-sync-token, unless the request comes from the app's own page. See SECURITY.md.
  if (!sameOrigin(req) && !requireToken(req, res, 'SYNC_TOKEN', { optional: true, header: 'x-sync-token' })) return;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { brief } = bodyOf(req);
    if (!brief || typeof brief !== 'object' || !brief.block || !brief.food) return res.status(400).json({ error: 'Update the app to run the analysis.' });

    const body = {
      model: MODEL,
      max_tokens: 16000,
      // Opus 5.5 always thinks; effort sets how hard. Medium is its default, said out loud.
      output_config: { effort: 'medium' },
      system: ANALYSIS_SYSTEM,
      messages: [{ role: 'user', content: briefText(brief) }],
    };
    // Server-side refusal fallback first; if the API rejects the beta, retry once plain.
    let response = await call(apiKey, body, true);
    if (response.status === 400) response = await call(apiKey, body, false);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[analyze] API error:', response.status, data.error?.message);
      return res.status(502).json({ error: 'Analysis unavailable.' });
    }

    // Thinking blocks come first on Opus 5.5: read the text block, not content[0].
    const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('') || '{}';
    let parsed;
    try {
      const m = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : raw);
    } catch (e) {
      console.error('[analyze] Failed to parse analysis:', raw.slice(0, 500));
      return res.status(422).json({ error: 'Analysis unavailable.' });
    }

    const prose = [parsed.summary, ...(parsed.dataGaps || []), ...(parsed.wins || []), ...(parsed.gaps || []), ...(parsed.trends || []), ...(parsed.recommendations || []), parsed.nextWeekFocus].filter(Boolean).join(' ');
    const ungrounded = groundingCheck(prose, brief);
    if (ungrounded.length) console.warn('[analyze] numbers not in the brief:', ungrounded.join(', '));
    return res.status(200).json({ ...parsed, ungrounded, model: data.model || MODEL });
  } catch (err) {
    console.error('[analyze] Handler error:', err);
    return res.status(500).json({ error: 'Analysis unavailable.' });
  }
}
