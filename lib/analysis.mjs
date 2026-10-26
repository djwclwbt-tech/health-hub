// ═══ ANALYSIS · the weekly analysis model call ═══ Server only (fetch, API key).
// api/analyze.js (button in the app) and api/watchdog.js (Sunday review) both use it,
// so the prompt eval/coach.mjs scores is the prompt that runs.
import { ANALYSIS_SYSTEM, briefText, groundingCheck } from './engine.mjs';

export const MODEL = () => process.env.AI_MODEL || 'claude-opus-5-5';

const call = (apiKey, body, fallback) => fetch('https://api.anthropic.com/v1/messages', {
  signal: AbortSignal.timeout(50000),
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', ...(fallback ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}) },
  body: JSON.stringify(fallback ? { ...body, fallbacks: 'default' } : body),
}).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: { message: e.message } }) }));

// → { ok:true, result } | { ok:false, status: 502 (upstream) | 422 (unreadable reply) }
export const runAnalysis = async (brief, apiKey = process.env.ANTHROPIC_API_KEY) => {
  const body = {
    model: MODEL(),
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
  if (!response.ok) { console.error('[analysis] API error:', response.status, data.error?.message); return { ok: false, status: 502 }; }

  // Thinking blocks come first on Opus 5.5: read the text block, not content[0].
  const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('') || '{}';
  let parsed;
  try { const m = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/); parsed = JSON.parse(m ? m[0] : raw); }
  catch { console.error('[analysis] unreadable reply:', raw.slice(0, 500)); return { ok: false, status: 422 }; }

  const prose = [parsed.summary, ...(parsed.dataGaps || []), ...(parsed.wins || []), ...(parsed.gaps || []), ...(parsed.trends || []), ...(parsed.recommendations || []), parsed.nextWeekFocus].filter(Boolean).join(' ');
  const ungrounded = groundingCheck(prose, brief);
  if (ungrounded.length) console.warn('[analysis] numbers not in the brief:', ungrounded.join(', '));
  return { ok: true, result: { ...parsed, ungrounded, model: data.model || MODEL() } };
};
