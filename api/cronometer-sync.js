/**
 * api/cronometer-sync.js — Cronometer nutrition sync
 *
 * Fetches today's (and yesterday's) food diary from Cronometer and upserts
 * nutrition totals + meal breakdown into the Health Hub Supabase `nutrition` table.
 *
 * Endpoints:
 *   GET /api/cronometer-sync                  → sync yesterday + today
 *   GET /api/cronometer-sync?date=2026-04-11  → sync a specific date
 *
 * Called by Vercel cron 3x daily at 08:00, 18:00 and 01:00 UTC (3am / 1pm / 8pm
 * Austin in CDT; 2am / noon / 7pm in CST, since cron runs in UTC) and can be
 * triggered manually with the secret (x-sync-secret header or ?secret=).
 * ?debug=1 (CSV header dump) needs the secret itself; a cron header alone never unlocks it.
 *
 * Environment variables:
 *   CRONOMETER_USERNAME   – Cronometer account email
 *   CRONOMETER_PASSWORD   – Cronometer account password
 *   SUPABASE_KEY          – Supabase key (fallback order in lib/http.mjs supabaseEnv)
 *   CRON_SECRET           – (recommended) Vercel sends it as Bearer on cron calls
 *   CRONOMETER_SYNC_SECRET – manual calls
 */

import { login, fetchServings, parseServings } from '../lib/cronometer.js';
import { isCron, hasToken, requireToken, queryOf, supabaseEnv } from '../lib/http.mjs';

const SECRET_OPTS = { header: 'x-sync-secret', allowQuery: true, queryKey: 'secret' };

const NUTRITION_COLUMNS = 'date,meals,total_cal,total_protein,total_carbs,total_fat,total_fiber';

async function fetchNutritionRow(date) {
  const { url: SUPABASE_URL, key: SUPABASE_KEY } = supabaseEnv();
  const url = `${SUPABASE_URL}/rest/v1/nutrition?date=eq.${encodeURIComponent(date)}&select=${NUTRITION_COLUMNS}&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nutrition fetch failed (${res.status}): ${text}`);
  }
  const rows = await res.json();
  return rows[0] || null;
}

function sourceOf(meal) {
  return String(meal?.source || '').toLowerCase();
}

function isCronometerMeal(meal) {
  return sourceOf(meal) === 'cronometer';
}

function isPreservedManualMeal(meal) {
  const source = sourceOf(meal);
  // The in-app quick/manual logger writes source:"quick". Assistant/manual rows
  // should survive Cronometer refreshes. Historical Cronometer rows were untagged,
  // so untagged rows are not preserved here to avoid duplicating every sync.
  return Boolean(source) && !['cronometer', 'mfp'].includes(source);
}

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function buildNutritionRow(date, cronometerData, existingRow) {
  const preservedMeals = Array.isArray(existingRow?.meals)
    ? existingRow.meals.filter(meal => isPreservedManualMeal(meal) && !isCronometerMeal(meal))
    : [];
  const cronometerMeals = cronometerData.meals.map(meal => ({ ...meal, source: 'cronometer' }));
  const meals = [...preservedMeals, ...cronometerMeals];

  return {
    date,
    meals,
    total_cal: Math.round(meals.reduce((sum, meal) => sum + (Number(meal.cal) || 0), 0)),
    total_protein: round1(meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0)),
    total_carbs: round1(meals.reduce((sum, meal) => sum + (Number(meal.carbs) || 0), 0)),
    total_fat: round1(meals.reduce((sum, meal) => sum + (Number(meal.fat) || 0), 0)),
    total_fiber: round1(meals.reduce((sum, meal) => sum + (Number(meal.fiber) || 0), 0)),
  };
}

async function upsertNutritionRow(row) {
  const { url: SUPABASE_URL, key: SUPABASE_KEY } = supabaseEnv();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/nutrition?on_conflict=date`, {
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
    throw new Error(`Nutrition upsert failed (${res.status}): ${text}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel cron is allowed through; everything else must present CRONOMETER_SYNC_SECRET.
  if (!isCron(req) && !requireToken(req, res, 'CRONOMETER_SYNC_SECRET', { ...SECRET_OPTS, unsetStatus: 401 })) return;
  const query = queryOf(req);
  const debug = query.debug === '1' && hasToken(req, 'CRONOMETER_SYNC_SECRET', SECRET_OPTS);

  const username = process.env.CRONOMETER_USERNAME;
  const password = process.env.CRONOMETER_PASSWORD;
  if (!username || !password) {
    return res.status(500).json({ error: 'CRONOMETER_USERNAME/PASSWORD env vars not set' });
  }

  try {
    // Date range: specific date or yesterday→today in America/Chicago,
    // so post-dinner entries sync to the correct calendar day
    const chi = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    const now = new Date();

    const startDate = query.date ?? chi(new Date(now.getTime() - 86400000));
    const endDate   = query.date ?? chi(now);

    // Auth + fetch
    const { authToken, cookieHeader } = await login(username, password);
    const csv = await fetchServings(authToken, cookieHeader, startDate, endDate);
    if (debug) {
      const headers = csv.split('\n')[0];
      return res.status(200).json({ headers });
    }
    const dayData = parseServings(csv);

    if (!Object.keys(dayData).length) {
      return res.status(200).json({ ok: true, synced: [], note: 'No diary entries found for range', range: { start: startDate, end: endDate } });
    }

    // Upsert each day, replacing Cronometer-sourced meals while preserving
    // manual/quick/assistant meals already stored for that date.
    const results = [];
    for (const [date, data] of Object.entries(dayData)) {
      const existingRow = await fetchNutritionRow(date);
      const row = buildNutritionRow(date, data, existingRow);
      await upsertNutritionRow(row);
      results.push({
        date,
        cal: row.total_cal,
        protein: row.total_protein,
        carbs: row.total_carbs,
        fat: row.total_fat,
        meals: row.meals.length,
        cronometerMeals: data.meals.length,
        preservedMeals: row.meals.length - data.meals.length,
      });
    }

    return res.status(200).json({ ok: true, synced: results, range: { start: startDate, end: endDate } });
  } catch (err) {
    console.error('Cronometer sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
