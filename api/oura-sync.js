/**
 * api/oura-sync.js — Vercel serverless function for Oura Ring data sync.
 *
 * Call via cron (vercel.json) or manually:
 *   GET /api/oura-sync
 *   GET /api/oura-sync?date=2026-05-03    (specific date)
 *   GET /api/oura-sync?start=2026-05-01&end=2026-05-12
 *
 * Flow:
 *   1. Read OURA_PAT from environment
 *   2. Fetch daily readiness + sleep sessions from Oura v2 API
 *   3. Upsert into Health Hub's recovery table in Supabase
 *
 * Environment variables:
 *   OURA_PAT          — Personal Access Token from cloud.ouraring.com
 *   SUPABASE_KEY      — Supabase anon/service key
 *   OURA_SYNC_SECRET  — (optional) protect endpoint from public access
 */

import { getDailyReadiness, getSleepSessions, getDailyActivity, secToHours } from '../lib/oura.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wszumxewqxkggtevfubb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

/**
 * Upsert a recovery row into the Health Hub `recovery` table.
 */
async function upsertRecoveryRow(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recovery?on_conflict=date`, {
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

/**
 * Sync Oura data for a date range.
 */
function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function inRange(day, startDate, endDate) {
  return day >= startDate && day <= endDate;
}

async function syncOura(token, startDate, endDate) {
  // Oura sleep sessions can land on the requested day while ending the next morning,
  // so fetch sleep through end+1 and then filter back to the target day range.
  const sleepEndDate = addDays(endDate, 1);
  const [readinessRecords, sleepRecordsRaw, activityRecords] = await Promise.all([
    getDailyReadiness(token, startDate, endDate),
    getSleepSessions(token, startDate, sleepEndDate),
    getDailyActivity(token, startDate, endDate),
  ]);
  const sleepRecords = sleepRecordsRaw.filter(s => inRange(s.day, startDate, endDate));

  // Index sleep sessions by day — use the longest "long_sleep" session per day
  const sleepByDay = new Map();
  for (const s of sleepRecords) {
    if (s.type !== 'long_sleep') continue;
    const day = s.day;
    const existing = sleepByDay.get(day);
    if (!existing || (s.total_sleep_duration || 0) > (existing.total_sleep_duration || 0)) {
      sleepByDay.set(day, s);
    }
  }

  const results = [];

  for (const rec of readinessRecords) {
    const day = rec.day; // YYYY-MM-DD
    const sleep = sleepByDay.get(day);

    const row = {
      date: day,
      recovery_score: rec.score ?? null,
      hrv: sleep?.average_hrv ?? null,
      rhr: sleep?.lowest_heart_rate ?? null,
      sleep_hours: sleep?.total_sleep_duration ? secToHours(sleep.total_sleep_duration) : null,
      sleeplight: sleep?.light_sleep_duration ? secToHours(sleep.light_sleep_duration) : null,
      sleepdeep: sleep?.deep_sleep_duration ? secToHours(sleep.deep_sleep_duration) : null,
      sleeprem: sleep?.rem_sleep_duration ? secToHours(sleep.rem_sleep_duration) : null,
      respiratory_rate: sleep?.average_breath ?? null,
      sleep_performance: null,
      strain: null,
      wake_time: null,
      notes: null,
      source: 'oura',
    };

    await upsertRecoveryRow(row);
    results.push(row);
  }

  // Also write sleep-only days (days with sleep data but no readiness score yet)
  for (const [day, sleep] of sleepByDay) {
    if (readinessRecords.some(r => r.day === day)) continue; // already handled

    const row = {
      date: day,
      recovery_score: null,
      hrv: sleep.average_hrv ?? null,
      rhr: sleep.lowest_heart_rate ?? null,
      sleep_hours: sleep.total_sleep_duration ? secToHours(sleep.total_sleep_duration) : null,
      sleeplight: sleep.light_sleep_duration ? secToHours(sleep.light_sleep_duration) : null,
      sleepdeep: sleep.deep_sleep_duration ? secToHours(sleep.deep_sleep_duration) : null,
      sleeprem: sleep.rem_sleep_duration ? secToHours(sleep.rem_sleep_duration) : null,
      respiratory_rate: sleep.average_breath ?? null,
      sleep_performance: null,
      strain: null,
      wake_time: null,
      notes: null,
      source: 'oura',
    };

    await upsertRecoveryRow(row);
    results.push(row);
  }

  // Steps from Oura daily activity (replaces the retired Apple Shortcut pipeline)
  const steps = [];
  for (const act of activityRecords) {
    if (!act.day || !(act.steps > 0)) continue;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/steps?on_conflict=date`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ date: act.day, value: Math.round(act.steps) }),
    });
    if (!res.ok) throw new Error(`Supabase steps upsert failed (${res.status}): ${await res.text()}`);
    steps.push({ date: act.day, steps: Math.round(act.steps) });
  }

  return { results, steps };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel cron requests are allowed through; everything else must present the secret.
  const isCron = (req.headers['user-agent'] || '').startsWith('vercel-cron/');
  if (!isCron) {
    const syncSecret = process.env.OURA_SYNC_SECRET;
    if (!syncSecret) return res.status(401).json({ error: 'Unauthorized (OURA_SYNC_SECRET not configured)' });
    if (req.headers['x-sync-secret'] !== syncSecret && req.query.secret !== syncSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const token = process.env.OURA_PAT;
  if (!token) {
    return res.status(500).json({ error: 'OURA_PAT environment variable not set' });
  }

  try {
    const { date, start, end } = req.query;

    // Default: yesterday + today in America/Chicago, so late-night data lands on the right day
    const chi = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const now = new Date();
    const startDate = date || start || chi(new Date(now.getTime() - 86400000));
    const endDate = date || end || chi(now);
    if (endDate < startDate) {
      return res.status(400).json({ error: 'end must be on or after start' });
    }

    const { results, steps } = await syncOura(token, startDate, endDate);

    return res.status(200).json({
      ok: true,
      synced: results,
      steps,
      range: { start: startDate, end: endDate },
    });
  } catch (err) {
    console.error('Oura sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
