/**
 * lib/whoop.js — Whoop API v2 helper functions
 *
 * Pure utility module: no side effects, no Supabase dependency.
 * Every function uses native fetch — zero npm packages required.
 */

const AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const API_BASE = 'https://api.prod.whoop.com/developer/v2';

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

/**
 * Build the Whoop OAuth2 authorization URL the user should be redirected to.
 *
 * @param {string} clientId      – Whoop app client ID
 * @param {string} redirectUri   – Registered redirect URI
 * @param {string[]} scopes      – e.g. ['offline', 'read:recovery', 'read:sleep']
 * @param {string} [state]       – Opaque CSRF / session token
 * @returns {string} Full authorization URL
 */
export function getAuthUrl(clientId, redirectUri, scopes, state) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
  });
  if (state) params.set('state', state);
  return `${AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access + refresh token pair.
 *
 * @param {string} code
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string} redirectUri
 * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number}>}
 */
export async function exchangeCode(code, clientId, clientSecret, redirectUri) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whoop token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Use a refresh token to obtain a new access token.
 *
 * @param {string} refreshToken
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number}>}
 */
export async function refreshAccessToken(refreshToken, clientId, clientSecret, redirectUri) {
  const params = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  };
  if (redirectUri) params.redirect_uri = redirectUri;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whoop token refresh failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

/**
 * Fetch recovery records from Whoop.
 *
 * @param {string} accessToken
 * @param {string} [startDate]  – ISO 8601 date, e.g. '2026-04-01T00:00:00.000Z'
 * @param {string} [endDate]    – ISO 8601 date
 * @returns {Promise<Array>} Array of recovery record objects
 */
export async function getRecovery(accessToken, startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.set('start', startDate);
  if (endDate) params.set('end', endDate);

  const url = `${API_BASE}/recovery${params.toString() ? '?' + params : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whoop GET /v2/recovery failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.records ?? [];
}

/**
 * Fetch sleep records from Whoop.
 *
 * @param {string} accessToken
 * @param {string} [startDate]  – ISO 8601 date
 * @param {string} [endDate]    – ISO 8601 date
 * @returns {Promise<Array>} Array of sleep record objects
 */
export async function getSleep(accessToken, startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.set('start', startDate);
  if (endDate) params.set('end', endDate);

  const url = `${API_BASE}/activity/sleep${params.toString() ? '?' + params : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whoop GET /v2/activity/sleep failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.records ?? [];
}

/**
 * Fetch cycle records from Whoop (day strain lives here).
 *
 * @param {string} accessToken
 * @param {string} [startDate]  – ISO 8601 date
 * @param {string} [endDate]    – ISO 8601 date
 * @returns {Promise<Array>} Array of cycle record objects
 */
export async function getCycles(accessToken, startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.set('start', startDate);
  if (endDate) params.set('end', endDate);

  const url = `${API_BASE}/cycle${params.toString() ? '?' + params : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whoop GET /v2/cycle failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.records ?? [];
}

// ---------------------------------------------------------------------------
// Supabase helpers (shared between whoop-sync and whoop-webhook)
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wszumxewqxkggtevfubb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

/** Convert milliseconds to hours rounded to two decimals. */
export function msToHours(ms) {
  return Math.round((ms / 3_600_000) * 100) / 100;
}

/** Update stored tokens in Supabase after a refresh. */
export async function updateTokens(userId, accessToken, refreshToken, expiresIn) {
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
 * Schema: date (PK), recovery_score, hrv, rhr, sleep_hours,
 *         sleeplight, sleepdeep, sleeprem, source
 */
export async function upsertRecoveryRow(row) {
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
 * Ensure we have a valid access token. Refreshes proactively if within
 * 5 minutes of expiry.
 */
export async function ensureValidToken(tokenRow) {
  // Postgres returns timestamps like "2026-04-11 18:59:29+00" — normalize to ISO 8601
  const normalized = tokenRow.expires_at.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  const expiresAt = new Date(normalized).getTime();
  if (Date.now() + 5 * 60_000 < expiresAt) return tokenRow.access_token;

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

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/**
 * Verify that a webhook payload was signed by Whoop.
 *
 * Whoop signs webhooks by prepending the timestamp header value to the raw
 * request body, then generating a SHA-256 HMAC with the app's webhook secret.
 *
 * @param {string} rawBody      – The raw request body string
 * @param {string} timestamp    – Value of the x-whoop-signature-timestamp header
 * @param {string} signature    – Value of the x-whoop-signature header
 * @param {string} secret       – Your app's webhook secret (from Whoop dashboard)
 * @returns {Promise<boolean>}
 */
export async function verifyWebhookSignature(rawBody, timestamp, signature, secret) {
  // Use Node.js built-in crypto (available in Vercel runtime)
  const { createHmac } = await import('node:crypto');
  const expected = createHmac('sha256', secret)
    .update(timestamp + rawBody)
    .digest('hex');
  return expected === signature;
}
