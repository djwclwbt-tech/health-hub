/**
 * api/whoop-webhook.js — Vercel serverless function for Whoop webhook events.
 *
 * Whoop sends a POST request whenever new data is available (recovery scored,
 * sleep processed, etc.). This handler:
 *
 *   1. Verifies the HMAC-SHA256 signature to confirm the request came from Whoop
 *   2. Parses the event type
 *   3. Triggers a sync for the relevant user + data type
 *
 * Webhook payload (v2):
 *   {
 *     "user_id": 10129,
 *     "id": "uuid-of-the-resource",
 *     "type": "recovery.updated" | "sleep.updated" | ...
 *     "trace_id": "..."
 *   }
 *
 * Environment variables:
 *   WHOOP_WEBHOOK_SECRET  – HMAC secret from the Whoop developer dashboard
 *   WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, SUPABASE_KEY
 */

import { verifyWebhookSignature, refreshAccessToken, getRecovery, getSleep } from '../lib/whoop.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wszumxewqxkggtevfubb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Event types we care about
const SYNC_EVENTS = new Set([
  'recovery.updated',
  'recovery.created',
  'sleep.updated',
  'sleep.created',
]);

// ---------------------------------------------------------------------------
// Supabase helpers (native fetch)
// ---------------------------------------------------------------------------

async function getTokenForUser(userId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/whoop_tokens?id=eq.${userId}&select=*`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    },
  );
  if (!res.ok) throw new Error(`Failed to read token: ${await res.text()}`);
  const rows = await res.json();
  return rows[0] ?? null;
}

async function updateTokens(userId, accessToken, refreshToken, expiresIn) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/whoop_tokens?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`Failed to update tokens: ${await res.text()}`);
}

async function upsertRecoveryRow(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recovery`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Recovery upsert failed: ${await res.text()}`);
}

// ---------------------------------------------------------------------------
// Token + sync helpers
// ---------------------------------------------------------------------------

async function ensureValidToken(tokenRow) {
  const expiresAt = new Date(tokenRow.expires_at).getTime();
  if (Date.now() + 5 * 60_000 < expiresAt) return tokenRow.access_token;

  const fresh = await refreshAccessToken(
    tokenRow.refresh_token,
    process.env.WHOOP_CLIENT_ID,
    process.env.WHOOP_CLIENT_SECRET,
  );
  await updateTokens(tokenRow.id, fresh.access_token, fresh.refresh_token, fresh.expires_in);
  return fresh.access_token;
}

function msToHours(ms) {
  return Math.round((ms / 3_600_000) * 100) / 100;
}

/**
 * Pull the most recent recovery + sleep data for a user and write to Supabase.
 * Scoped to the last 24 hours so we only grab the freshest record.
 */
async function syncLatestForUser(userId) {
  const tokenRow = await getTokenForUser(userId);
  if (!tokenRow) {
    console.warn(`No token row for Whoop user ${userId}, skipping.`);
    return null;
  }

  const accessToken = await ensureValidToken(tokenRow);

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const [recoveryRecords, sleepRecords] = await Promise.all([
    getRecovery(accessToken, yesterday.toISOString(), now.toISOString()),
    getSleep(accessToken, yesterday.toISOString(), now.toISOString()),
  ]);

  // Index sleep by id
  const sleepById = new Map();
  for (const s of sleepRecords) sleepById.set(s.id, s);

  const results = [];

  for (const rec of recoveryRecords) {
    if (rec.score_state !== 'SCORED') continue;

    const sleep = sleepById.get(rec.sleep_id);
    const dateKey = sleep ? sleep.start.slice(0, 10) : rec.created_at.slice(0, 10);
    const stages = sleep?.score?.stage_summary ?? {};
    const totalSleepMs =
      (stages.total_light_sleep_time_milli ?? 0) +
      (stages.total_slow_wave_sleep_time_milli ?? 0) +
      (stages.total_rem_sleep_time_milli ?? 0);

    const row = {
      date: dateKey,
      recovery_score: rec.score.recovery_score,
      hrv: Math.round(rec.score.hrv_rmssd_milli * 100) / 100,
      rhr: rec.score.resting_heart_rate,
      sleep_hours: msToHours(totalSleepMs),
      sleeplight: msToHours(stages.total_light_sleep_time_milli ?? 0),
      sleepdeep: msToHours(stages.total_slow_wave_sleep_time_milli ?? 0),
      sleeprem: msToHours(stages.total_rem_sleep_time_milli ?? 0),
      source: 'whoop',
    };

    await upsertRecoveryRow(row);
    results.push(row);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  // Whoop webhooks are always POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ---- Signature verification ----
  const secret = process.env.WHOOP_WEBHOOK_SECRET;
  if (secret) {
    const timestamp = req.headers['x-whoop-signature-timestamp'] ?? '';
    const signature = req.headers['x-whoop-signature'] ?? '';

    // Vercel parses the body; we need the raw string for HMAC.
    // If you configured bodyParser: false in vercel.json you'd read from req,
    // but by default Vercel gives us req.body as an object.
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const valid = await verifyWebhookSignature(rawBody, timestamp, signature, secret);
    if (!valid) {
      console.warn('Invalid Whoop webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  // ---- Parse event ----
  const event = req.body;
  const { type, user_id: whoopUserId } = event;

  console.log(`Whoop webhook: type=${type} user=${whoopUserId}`);

  // Only sync on recovery/sleep events
  if (!SYNC_EVENTS.has(type)) {
    return res.status(200).json({ ok: true, action: 'ignored', type });
  }

  // ---- Trigger sync ----
  try {
    const synced = await syncLatestForUser(String(whoopUserId));
    return res.status(200).json({ ok: true, action: 'synced', records: synced });
  } catch (err) {
    console.error('Webhook sync error:', err);
    // Return 200 so Whoop doesn't retry endlessly on app-level errors
    return res.status(200).json({ ok: false, error: err.message });
  }
}
