// /api/wrist · the Garmin gym app's server half. The watch calls it through Garmin
// Connect on the iPhone (Communications.makeWebRequest). Mounted inside
// api/sync-steps.js (vercel.json rewrite) because the Hobby plan allows 12 functions.
//   GET  ?date=&day=   → today's plan as JSON (lib/engine/wrist.mjs)
//   POST <log JSON>    → applies the watch log once; a resent log is acknowledged, not reapplied
// Auth: Bearer wristToken(SYNC_TOKEN). The watch build carries only this derived
// token, so a lost watch can log sets but cannot reach any other SYNC_TOKEN route.
import { createHmac } from 'node:crypto';
import { wristPlan, applyWristLog, parseWristLog, td } from './engine.mjs';
import { makeClient, loadAll, toRow } from './supabase.mjs';
import { queryOf, bodyOf, bearer, safeEqual, supabaseEnv } from './http.mjs';

export const wristToken = (secret) => createHmac('sha256', secret).update('health-hub wrist v1').digest('hex').slice(0, 32);

// Never build a plan or a workout on top of defaults: these must have loaded.
const NEEDED = ['prog', 'wk', 'program'];
const loadOrNull = async (client) => {
  const data = await loadAll(client);
  return NEEDED.some(k => data.__failed.includes(k)) ? null : data;
};

export default async function wristRoute(req, res) {
  const secret = process.env.SYNC_TOKEN;
  if (!secret) return res.status(500).json({ error: 'SYNC_TOKEN not configured' });
  if (!safeEqual(bearer(req), wristToken(secret))) return res.status(401).json({ error: 'Unauthorized' });
  const client = makeClient(supabaseEnv());
  try {
    if (req.method === 'GET') {
      const q = queryOf(req);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(q.date || '') ? q.date : td();
      const day = /^[a-z]+$/.test(q.day || '') ? q.day : null;
      const data = await loadOrNull(client);
      if (!data) return res.status(503).json({ error: 'Health Hub data did not load. Try again.' });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(wristPlan(data, { date, day }).plan);
    }

    const body = bodyOf(req);
    let parsed;
    try { parsed = parseWristLog(body); } catch (e) { return res.status(400).json({ error: e.message }); }
    const data = await loadOrNull(client);
    if (!data) return res.status(503).json({ error: 'Health Hub data did not load. Try again.' });
    let out;
    try { out = applyWristLog(data, body); } catch (e) { return res.status(400).json({ error: e.message }); }
    if (out.duplicate || out.empty) return res.status(200).json({ ok: true, id: parsed.logId, sets: 0, duplicate: !!out.duplicate });
    // Progression first, the workout last: the workout row carries the log id, so if
    // anything fails the watch resends and the whole log applies again.
    if (out.touched.length) await client.upsert('progression', out.touched.map(k => toRow.progression(k, out.data.prog[k])), 'exercise_id');
    await client.upsert('workouts', toRow.workout(out.parsed.date, out.data.wk[out.parsed.date]));
    const sets = out.workout.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
    return res.status(200).json({ ok: true, id: parsed.logId, sets, prs: out.prs.length, dropped: out.dropped });
  } catch (err) {
    console.error('[wrist]', err);
    return res.status(500).json({ error: 'Wrist sync failed' });
  }
}
