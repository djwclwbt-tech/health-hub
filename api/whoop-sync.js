/**
 * api/whoop-sync.js — Vercel serverless function for daily Whoop data sync.
 *
 * Call via cron (vercel.json) or manually:
 *   GET /api/whoop-sync
 *   GET /api/whoop-sync?userId=12345          (single user)
 *   GET /api/whoop-sync?date=2026-04-04       (specific date)
 *
 * Flow:
 *   1. Read stored tokens from Supabase (whoop_tokens table)
 *   2. Refresh the access token if it's expired or close to expiry
 *   3. Fetch latest recovery + sleep data from Whoop API v2
 *   4. Upsert into Health Hub's recovery table in Supabase
 *
 * Environment variables:
 *   WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, SUPABASE_KEY,
 *   WHOOP_SYNC_SECRET (optional — protect the endpoint from public access)
 */

import { refreshAccessToken, getRecovery, getSleep } from '../lib/whoop.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wszumxewqxkggtevfubb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

// ---------------------------------------------------------------------------
// Supabase helpers (native fetch)
// ---------------------------------------------------------------------------

/** Read all token rows (or a single user's) from whoop_tokens. */
async function getTokenRows(userId) {
  let url = `${SUPABASE_URL}/rest/v1/whoop_tokens?select=*`;
  if (userId) url += `&id=eq.${userId}`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to read tokens: ${await res.text()}`);
  return res.json();
}

/** Update tokens after a refresh. */
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

/**
 * Upsert a recovery row into the Health Hub `recovery` table.
 * Schema: date (PK), recoveryScore, hrv, rhr, sleepHours,
 *         sleepLight, sleepDeep, sleepRem, source
 */
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase recovery upsert failed (${res.status}): ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Core sync logic
// ---------------------------------------------------------------------------

/**
 * Ensure we have a valid access token. Refreshes proactively if within
 * 5 minutes of expiry.
 */
async function ensureValidToken(tokenRow) {
  // Postgres returns timestamps like "2026-04-11 18:59:29+00" — normalize to ISO 8601
  const normalized = tokenRow.expires_at.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  const expiresAt = new Date(normalized).getTime();
  const buffer = 5 * 60 * 1000; // 5 minutes

  if (Date.now() + buffer < expiresAt) {
    // Token is still fresh
    return tokenRow.access_token;
  }

  // Refresh the token
  console.log(`Refreshing token for user ${tokenRow.id}`);
  const fresh = await refreshAccessToken(
    tokenRow.refresh_token,
    process.env.WHOOP_CLIENT_ID,
    process.env.WHOOP_CLIENT_SECRET,
    process.env.WHOOP_REDIRECT_URI,
  );

  await updateTokens(tokenRow.id, fresh.access_token, fresh.refresh_token, fresh.expires_in);
  return fresh.access_token;
}

/**
 * Convert millis to hours rounded to two decimals.
 */
function msToHours(ms) {
  return Math.round((ms / 3_600_000) * 100) / 100;
}

/**
 * Sync one user's data for a date range.
 */
async function syncUser(tokenRow, startDate, endDate) {
  const accessToken = await ensureValidToken(tokenRow);

  // Fetch recovery and sleep data in parallel
  const [recoveryRecords, sleepRecords] = await Promise.all([
    getRecovery(accessToken, startDate, endDate),
    getSleep(accessToken, startDate, endDate),
  ]);

  // Index sleep records by sleep_id for easy lookup
  const sleepById = new Map();
  for (const s of sleepRecords) {
    sleepById.set(s.id, s);
  }

  const results = [];

  for (const rec of recoveryRecords) {
    if (rec.score_state !== 'SCORED') continue;

    // Determine the date key from the associated sleep's start time
    const sleep = sleepById.get(rec.sleep_id);
    const dateKey = sleep
      ? sleep.start.slice(0, 10)               // YYYY-MM-DD from sleep start
      : rec.created_at.slice(0, 10);            // fallback

    // Build the sleep stage breakdown (if sleep data available)
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: protect this endpoint with a shared secret
  const syncSecret = process.env.WHOOP_SYNC_SECRET;
  if (syncSecret && req.headers['x-sync-secret'] !== syncSecret) {
    // Also accept as query param for Vercel cron convenience
    if (req.query.secret !== syncSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { userId, date } = req.query;

    // Default to yesterday → today range
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const startDate = date
      ? `${date}T00:00:00.000Z`
      : yesterday.toISOString();
    const endDate = now.toISOString();

    // Get stored tokens
    const tokenRows = await getTokenRows(userId);
    if (!tokenRows.length) {
      return res.status(404).json({ error: 'No Whoop tokens found. Run /api/whoop-auth first.' });
    }

    // Sync each user
    const allResults = [];
    for (const row of tokenRows) {
      const synced = await syncUser(row, startDate, endDate);
      allResults.push({ userId: row.id, records: synced });
    }

    return res.status(200).json({
      ok: true,
      synced: allResults,
      range: { start: startDate, end: endDate },
    });
  } catch (err) {
    console.error('Whoop sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
