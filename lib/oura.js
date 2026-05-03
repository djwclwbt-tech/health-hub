/**
 * lib/oura.js — Oura Ring v2 API helper functions
 *
 * Uses Personal Access Token (PAT) auth — no OAuth refresh needed.
 * Pulls sleep and recovery data only (no strain, no steps).
 */

const API_BASE = 'https://api.ouraring.com/v2/usercollection';

/**
 * Fetch daily readiness scores from Oura.
 * Returns recovery/readiness score + contributor details.
 *
 * @param {string} token - Personal Access Token
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export async function getDailyReadiness(token, startDate, endDate) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  const res = await fetch(`${API_BASE}/daily_readiness?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oura daily_readiness failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.data ?? [];
}

/**
 * Fetch daily sleep summaries from Oura.
 * Returns sleep score + total sleep duration.
 *
 * @param {string} token - Personal Access Token
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export async function getDailySleep(token, startDate, endDate) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  const res = await fetch(`${API_BASE}/daily_sleep?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oura daily_sleep failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.data ?? [];
}

/**
 * Fetch detailed sleep sessions from Oura.
 * Returns HRV, lowest HR, and sleep stage durations.
 *
 * @param {string} token - Personal Access Token
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export async function getSleepSessions(token, startDate, endDate) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  const res = await fetch(`${API_BASE}/sleep?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oura sleep sessions failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.data ?? [];
}

/** Convert seconds to hours rounded to two decimals. */
export function secToHours(sec) {
  return Math.round((sec / 3600) * 100) / 100;
}
