/**
 * api/oura-sync.js — Vercel serverless function for Oura Ring data sync.
 *
 * Call via cron (vercel.json: 11:30, 14:00 and 04:00 UTC = 6:30am, 9am and 11pm
 * Austin in CDT; an hour earlier in CST) or manually with the secret:
 *   GET /api/oura-sync                      (yesterday + today, Chicago)
 *   GET /api/oura-sync?date=2026-05-03      (specific date)
 *   GET /api/oura-sync?start=2026-05-01&end=2026-05-12
 *
 * Flow:
 *   1. Read OURA_PAT from environment
 *   2. Fetch daily readiness + sleep sessions from Oura v2 API
 *   3. Upsert into Health Hub's recovery table in Supabase. Only the columns
 *      Oura has values for are sent, so manual notes / wake_time survive.
 *
 * Environment variables:
 *   OURA_PAT          — Personal Access Token from cloud.ouraring.com
 *   SUPABASE_KEY      — Supabase key (fallback order in lib/http.mjs supabaseEnv)
 *   CRON_SECRET       — (recommended) Vercel sends it as Bearer on cron calls
 *   OURA_SYNC_SECRET  — manual calls: x-sync-secret header or ?secret=
 */

import { getDailyReadiness, getSleepSessions, secToHours } from '../lib/oura.js';
import { makeClient } from '../lib/supabase.mjs';
import { isCron, requireToken, queryOf, supabaseEnv } from '../lib/http.mjs';

// Drop null/undefined so the upsert never overwrites a column Oura doesn't own
// (notes, wake_time, strain, sleep_performance) or a value it has no data for.
const present = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null));
const hours = (sec) => (sec ? secToHours(sec) : null);
const recoveryRow = (day, score, sleep) => present({
  date: day,
  recovery_score: score,
  hrv: sleep?.average_hrv,
  rhr: sleep?.lowest_heart_rate,
  sleep_hours: hours(sleep?.total_sleep_duration),
  sleeplight: hours(sleep?.light_sleep_duration),
  sleepdeep: hours(sleep?.deep_sleep_duration),
  sleeprem: hours(sleep?.rem_sleep_duration),
  respiratory_rate: sleep?.average_breath,
  source: 'oura',
});

function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function inRange(day, startDate, endDate) {
  return day >= startDate && day <= endDate;
}

/**
 * Sync Oura data for a date range.
 */
async function syncOura(token, startDate, endDate) {
  // Oura sleep sessions can land on the requested day while ending the next morning,
  // so fetch sleep through end+1 and then filter back to the target day range.
  const sleepEndDate = addDays(endDate, 1);
  const [readinessRecords, sleepRecordsRaw] = await Promise.all([
    getDailyReadiness(token, startDate, endDate),
    getSleepSessions(token, startDate, sleepEndDate),
  ]);
  const sleepRecords = sleepRecordsRaw.filter(s => inRange(s.day, startDate, endDate));

  // Index sleep sessions by day — use the longest "long_sleep" session per day
  const sleepByDay = new Map();
  for (const s of sleepRecords) {
    if (s.type !== 'long_sleep') continue;
    const existing = sleepByDay.get(s.day);
    if (!existing || (s.total_sleep_duration || 0) > (existing.total_sleep_duration || 0)) sleepByDay.set(s.day, s);
  }

  const results = [];
  for (const rec of readinessRecords) results.push(recoveryRow(rec.day, rec.score, sleepByDay.get(rec.day)));
  // Also write sleep-only days (sleep data but no readiness score yet)
  for (const [day, sleep] of sleepByDay) if (!readinessRecords.some(r => r.day === day)) results.push(recoveryRow(day, null, sleep));

  const client = makeClient(supabaseEnv());
  for (const row of results) await client.upsert('recovery', row);
  return results;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel cron is allowed through; everything else must present OURA_SYNC_SECRET.
  if (!isCron(req) && !requireToken(req, res, 'OURA_SYNC_SECRET', { header: 'x-sync-secret', allowQuery: true, queryKey: 'secret', unsetStatus: 401 })) return;

  const token = process.env.OURA_PAT;
  if (!token) {
    return res.status(500).json({ error: 'OURA_PAT environment variable not set' });
  }

  try {
    const { date, start, end } = queryOf(req);

    // Default: yesterday + today in America/Chicago, so late-night data lands on the right day
    const chi = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const now = new Date();
    const startDate = date || start || chi(new Date(now.getTime() - 86400000));
    const endDate = date || end || chi(now);
    if (endDate < startDate) {
      return res.status(400).json({ error: 'end must be on or after start' });
    }

    const results = await syncOura(token, startDate, endDate);

    return res.status(200).json({
      ok: true,
      synced: results,
      range: { start: startDate, end: endDate },
    });
  } catch (err) {
    console.error('Oura sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
