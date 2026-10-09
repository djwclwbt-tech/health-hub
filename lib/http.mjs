// ═══ HTTP · shared request plumbing for every /api/* route ═══
// CORS + preflight, constant-time secret checks, cron detection and the one
// Supabase env fallback order. Routes stay thin; a policy change happens here.
import { createHash, timingSafeEqual } from 'node:crypto';
import { DEFAULT_URL, DEFAULT_KEY } from './supabase.mjs';

// Sets CORS headers. `methods` is the list the route serves (OPTIONS is added).
export const cors = (res, methods = 'GET', headers = 'Content-Type, Authorization') => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', `${methods}, OPTIONS`);
  res.setHeader('Access-Control-Allow-Headers', headers);
};

// CORS + OPTIONS 200 + 405 for anything not in `methods`. True means "response sent, return".
export const preflight = (req, res, methods = 'GET', headers) => {
  cors(res, methods, headers);
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  if (!methods.split(/\s*,\s*/).includes(req.method)) { res.status(405).json({ error: 'Method not allowed' }); return true; }
  return false;
};

// Constant-time string compare. Hashing first equalizes lengths, so neither the
// content nor the length of the secret leaks through timing.
export const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const h = (s) => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(a), h(b));
};

export const bearer = (req) => (req.headers?.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;

// req.query when the platform parsed it, else the query string of req.url.
export const queryOf = (req) => ({ ...Object.fromEntries(new URL(req.url || '/', 'http://x').searchParams), ...(req.query || {}) });

// Parsed JSON body, or {} for empty / unparseable bodies (never throws).
export const bodyOf = (req) => {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string' && b.trim()) { try { const p = JSON.parse(b); return p && typeof p === 'object' ? p : {}; } catch { return {}; } }
  return {};
};

// Does the request carry process.env[envName]? Sources, in order: Bearer header,
// a named header, ?<queryKey>= (allowQuery), body.token (allowBody).
export const hasToken = (req, envName, { header = null, allowQuery = false, queryKey = 'token', allowBody = false } = {}) => {
  const secret = process.env[envName];
  if (!secret) return false;
  const candidates = [bearer(req), header ? req.headers?.[header] : null, allowQuery ? queryOf(req)[queryKey] : null, allowBody ? bodyOf(req).token : null];
  return candidates.some((c) => safeEqual(typeof c === 'string' ? c : null, secret));
};

// The browser sent this request from the app's own page. Browsers set Origin
// themselves, so other websites cannot borrow the endpoint. A script can still
// fake the header; that residual risk is documented in SECURITY.md.
export const sameOrigin = (req) => {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  const from = req.headers?.origin || req.headers?.referer;
  if (!host || !from) return false;
  try { return new URL(from).host === host; } catch { return false; }
};

// Gate a route on a shared secret. Returns true when the caller may proceed;
// otherwise the response is already sent. `optional`: an unset env var lets
// everyone through (Coach, AI routes). Otherwise an unset var refuses with `unsetStatus`.
export const requireToken = (req, res, envName, { optional = false, unsetStatus = 500, ...opts } = {}) => {
  if (!process.env[envName]) {
    if (optional) return true;
    res.status(unsetStatus).json({ error: `${envName} not configured` }); return false;
  }
  if (hasToken(req, envName, opts)) return true;
  res.status(401).json({ error: 'Unauthorized' }); return false;
};

// Vercel cron. With CRON_SECRET set, Vercel sends `Authorization: Bearer $CRON_SECRET`
// and that is the only proof accepted. Without it, fall back to the (spoofable)
// vercel-cron/ User-Agent so production crons keep running until the owner sets it.
export const isCron = (req) => {
  const secret = process.env.CRON_SECRET;
  if (secret) return safeEqual(bearer(req), secret);
  return (req.headers?.['user-agent'] || '').startsWith('vercel-cron/');
};

// One Supabase env fallback order for every route.
export const supabaseEnv = () => ({
  url: process.env.SUPABASE_URL || DEFAULT_URL,
  key: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_KEY,
});
