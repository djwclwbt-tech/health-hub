/**
 * api/whoop-auth.js — Vercel serverless function for the Whoop OAuth2 flow.
 *
 * Two modes controlled by the query string:
 *
 *   GET /api/whoop-auth
 *       → Redirects the browser to Whoop's OAuth consent screen.
 *
 *   GET /api/whoop-auth?code=…&state=…
 *       → Callback from Whoop. Exchanges the authorization code for tokens
 *         and persists them in Supabase.
 *
 * Environment variables:
 *   WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_REDIRECT_URI,
 *   SUPABASE_URL (or hardcoded below), SUPABASE_KEY
 */

import { getAuthUrl, exchangeCode } from '../lib/whoop.js';

// ---------------------------------------------------------------------------
// Supabase REST helper (native fetch, no SDK)
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wszumxewqxkggtevfubb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

/**
 * Upsert Whoop OAuth tokens into the `whoop_tokens` table.
 * The table should have columns: id (text PK), access_token, refresh_token,
 * expires_at (timestamptz), updated_at.
 */
async function upsertTokens(userId, accessToken, refreshToken, expiresIn) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/whoop_tokens`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',   // upsert on PK conflict
    },
    body: JSON.stringify({
      id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert failed (${res.status}): ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error: oauthError } = req.query;

  // ------------------------------------------------------------------
  // 1. If there's no `code` param this is the initial redirect request
  // ------------------------------------------------------------------
  if (!code) {
    const scopes = ['offline', 'read:recovery', 'read:sleep', 'read:profile'];
    // Generate a random state token to guard against CSRF
    const csrfState = crypto.randomUUID();
    const url = getAuthUrl(
      process.env.WHOOP_CLIENT_ID,
      process.env.WHOOP_REDIRECT_URI,
      scopes,
      csrfState,
    );
    // In production you'd store csrfState in a session cookie and verify it
    // on callback. Keeping this simple for now.
    return res.redirect(302, url);
  }

  // ------------------------------------------------------------------
  // 2. Whoop redirected back with an error
  // ------------------------------------------------------------------
  if (oauthError) {
    console.error('Whoop OAuth error:', oauthError);
    return res.status(400).json({ error: `Whoop denied access: ${oauthError}` });
  }

  // ------------------------------------------------------------------
  // 3. Callback — exchange code for tokens and store in Supabase
  // ------------------------------------------------------------------
  try {
    const tokens = await exchangeCode(
      code,
      process.env.WHOOP_CLIENT_ID,
      process.env.WHOOP_CLIENT_SECRET,
      process.env.WHOOP_REDIRECT_URI,
    );

    // Fetch the user's Whoop profile to get a stable user ID
    const profileRes = await fetch(
      'https://api.prod.whoop.com/developer/v2/user/profile/basic',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const profile = await profileRes.json();
    const userId = String(profile.user_id);

    // Persist tokens
    await upsertTokens(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
    );

    return res.status(200).json({
      ok: true,
      message: 'Whoop connected successfully.',
      whoop_user_id: userId,
    });
  } catch (err) {
    console.error('Token exchange error:', err);
    return res.status(500).json({ error: err.message });
  }
}
