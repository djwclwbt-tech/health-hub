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
 * Called by Vercel cron (hourly) and can be triggered manually.
 *
 * Environment variables:
 *   CRONOMETER_USERNAME   – Cronometer account email
 *   CRONOMETER_PASSWORD   – Cronometer account password
 *   SUPABASE_ANON_KEY     – Supabase anon/service key
 *   CRONOMETER_SYNC_SECRET (optional) – protect the endpoint
 */

import { login, fetchServings, parseServings } from '../lib/cronometer.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wszumxewqxkggtevfubb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

const NUTRITION_COLUMNS = 'date,meals,total_cal,total_protein,total_carbs,total_fat,total_fiber';

async function fetchNutritionRow(date) {
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

function fmt(date) {
  return date.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional endpoint protection
  const syncSecret = process.env.CRONOMETER_SYNC_SECRET;
  if (syncSecret && req.headers['x-sync-secret'] !== syncSecret && req.query.secret !== syncSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const username = process.env.CRONOMETER_USERNAME;
  const password = process.env.CRONOMETER_PASSWORD;
  if (!username || !password) {
    return res.status(500).json({ error: 'CRONOMETER_USERNAME/PASSWORD env vars not set' });
  }

  try {
    // Date range: specific date or yesterday→today
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const startDate = req.query.date ?? fmt(yesterday);
    const endDate   = req.query.date ?? fmt(now);

    // Auth + fetch
    const { authToken, cookieHeader } = await login(username, password);
    const csv = await fetchServings(authToken, cookieHeader, startDate, endDate);
    if (req.query.debug === '1') {
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
