import { preflight, requireToken, sameOrigin, bodyOf } from '../lib/http.mjs';
import { runAnalysis } from '../lib/analysis.mjs';

// Weekly analysis. The app builds the brief with the engine (coachBrief) and posts it;
// the model may only cite numbers in it (the reply's `ungrounded` lists any that are not).
export default async function handler(req, res) {
  if (preflight(req, res, 'POST', 'Content-Type, x-sync-token')) return;
  // Spends Anthropic credit: when SYNC_TOKEN is set, an outside caller must send it as
  // x-sync-token, unless the request comes from the app's own page. See SECURITY.md.
  if (!sameOrigin(req) && !requireToken(req, res, 'SYNC_TOKEN', { optional: true, header: 'x-sync-token' })) return;
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });
  try {
    const { brief } = bodyOf(req);
    if (!brief || typeof brief !== 'object' || !brief.block || !brief.food) return res.status(400).json({ error: 'Update the app to run the analysis.' });
    const r = await runAnalysis(brief);
    return r.ok ? res.status(200).json(r.result) : res.status(r.status).json({ error: 'Analysis unavailable.' });
  } catch (err) {
    console.error('[analyze] Handler error:', err);
    return res.status(500).json({ error: 'Analysis unavailable.' });
  }
}
