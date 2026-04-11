/**
 * lib/cronometer.js — Cronometer data helpers
 *
 * Authenticates via Cronometer's internal GWT-RPC protocol and fetches
 * nutrition data using the CSV export endpoint. Accesses the authenticated
 * user's own data only. Zero npm dependencies — native fetch throughout.
 *
 * Auth flow:
 *   1. GET /login/ → extract anticsrf token
 *   2. POST /login  → get sesnonce cookie
 *   3. POST GWT app → authenticate, get userId
 *   4. POST GWT app → generateAuthorizationToken, get export token
 *   5. GET /export  → download CSV
 *
 * ⚠ The GWT_PERMUTATION and GWT_HASH constants are tied to Cronometer's
 *   compiled frontend. If they update their app, update these two values
 *   by inspecting network requests in browser devtools on cronometer.com.
 */

const LOGIN_PAGE_URL  = 'https://cronometer.com/login/';
const LOGIN_API_URL   = 'https://cronometer.com/login';
const GWT_URL         = 'https://cronometer.com/cronometer/app';
const EXPORT_URL      = 'https://cronometer.com/export';

const GWT_MODULE_BASE  = 'https://cronometer.com/cronometer/';
const GWT_PERMUTATION  = '7B121DC5483BF272B1BC1916DA9FA963';
const GWT_CONTENT_TYPE = 'text/x-gwt-rpc; charset=UTF-8';

// Browser-like headers required — Cronometer blocks headless/server requests without them
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-User': '?1',
  'Sec-Fetch-Dest': 'document',
  'Upgrade-Insecure-Requests': '1',
};

// Serialized GWT-RPC call bodies sourced from Cronometer's web app
// (reverse-engineered from open-source gocronometer, github.com/jrmycanady/gocronometer)
const GWT_AUTHENTICATE =
  '7|0|5|https://cronometer.com/cronometer/|2D6A926E3729946302DC68073CB0D550|' +
  'com.cronometer.shared.rpc.CronometerService|authenticate|' +
  'java.lang.Integer/3438268394|1|2|3|4|1|5|5|-300|';

function gwtGenerateAuthToken(nonce, userId) {
  return (
    '7|0|8|https://cronometer.com/cronometer/|2D6A926E3729946302DC68073CB0D550|' +
    'com.cronometer.shared.rpc.CronometerService|generateAuthorizationToken|' +
    `java.lang.String/2004016611|I|com.cronometer.shared.user.AuthScope/2065601159|${nonce}|` +
    `1|2|3|4|4|5|6|6|7|8|${userId}|3600|7|2|`
  );
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

function getSetCookieHeaders(response) {
  // Node 18+ has getSetCookie(); fall back to single header for older runtimes
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}

function extractCookieValue(setCookieHeaders, name) {
  for (const header of setCookieHeaders) {
    const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

function mergeCookies(...headerArrays) {
  const map = new Map();
  for (const headers of headerArrays) {
    for (const header of headers) {
      const kv = header.split(';')[0].trim();
      const [key] = kv.split('=');
      map.set(key, kv);
    }
  }
  return [...map.values()].join('; ');
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Authenticate with Cronometer using username + password.
 * Returns { authToken, cookieHeader } to pass to fetchServings().
 */
export async function login(username, password) {
  // Step 1 — fetch login page, manually following redirects to capture all cookies
  const pageCookies = [];
  let pageHtml = '';
  let currentUrl = LOGIN_PAGE_URL;

  for (let i = 0; i < 5; i++) {
    const res = await fetch(currentUrl, {
      redirect: 'manual',
      headers: { ...BROWSER_HEADERS, Cookie: mergeCookies(pageCookies) },
    });
    pageCookies.push(...getSetCookieHeaders(res));

    const loc = res.headers.get('location');
    if (loc && (res.status >= 301 && res.status <= 308)) {
      currentUrl = new URL(loc, currentUrl).toString();
      continue;
    }
    pageHtml = await res.text();
    break;
  }

  // Extract anticsrf token
  const csrfMatch = pageHtml.match(/name="anticsrf"\s+value="([^"]+)"/);
  if (!csrfMatch) throw new Error('Cronometer: could not extract anticsrf token');
  const anticsrf = csrfMatch[1];

  // Extract ALL hidden form fields so we don't miss anything
  const formFields = { username, password };
  const hiddenRe = /<input[^>]+type="hidden"[^>]*>/gi;
  let m;
  while ((m = hiddenRe.exec(pageHtml)) !== null) {
    const nameM = m[0].match(/name="([^"]+)"/);
    const valM  = m[0].match(/value="([^"]*)"/);
    if (nameM) formFields[nameM[1]] = valM ? valM[1] : '';
  }

  // Extract form action (fallback to LOGIN_API_URL)
  const actionMatch = pageHtml.match(/<form[^>]+action="([^"]+)"/i);
  const postUrl = actionMatch
    ? new URL(actionMatch[1], 'https://cronometer.com').toString()
    : LOGIN_API_URL;

  // Step 2 — login with credentials
  const loginRes = await fetch(postUrl, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': currentUrl,
      'Origin': 'https://cronometer.com',
      Cookie: mergeCookies(pageCookies),
    },
    body: new URLSearchParams(formFields),
    redirect: 'manual',
  });
  const loginCookies = getSetCookieHeaders(loginRes);
  const nonce = extractCookieValue(loginCookies, 'sesnonce');
  if (!nonce) {
    const body = await loginRes.text();
    throw new Error(`Cronometer: login failed (HTTP ${loginRes.status} → ${postUrl}). Body snippet: ${body.slice(0, 400)}`);
  }

  let cookieHeader = mergeCookies(pageCookies, loginCookies);

  // Step 3 — GWT authenticate to get userId
  const authRes = await fetch(GWT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': GWT_CONTENT_TYPE,
      'X-GWT-Module-Base': GWT_MODULE_BASE,
      'X-GWT-Permutation': GWT_PERMUTATION,
      Cookie: cookieHeader,
    },
    body: GWT_AUTHENTICATE,
  });
  const authText = await authRes.text();
  const userIdMatch = authText.match(/OK\[(\d+),/);
  if (!userIdMatch) {
    throw new Error(
      `Cronometer: GWT authenticate failed — GWT permutation may be stale. Response: ${authText.slice(0, 200)}`
    );
  }
  const userId = userIdMatch[1];
  cookieHeader = mergeCookies(pageCookies, loginCookies, getSetCookieHeaders(authRes));

  // Step 4 — generate export auth token
  const freshNonce = extractCookieValue(getSetCookieHeaders(authRes), 'sesnonce') ?? nonce;
  const tokenRes = await fetch(GWT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': GWT_CONTENT_TYPE,
      'X-GWT-Module-Base': GWT_MODULE_BASE,
      'X-GWT-Permutation': GWT_PERMUTATION,
      Cookie: cookieHeader,
    },
    body: gwtGenerateAuthToken(freshNonce, userId),
  });
  const tokenText = await tokenRes.text();
  const tokenMatch = tokenText.match(/OK\["([^"]+)"/);
  if (!tokenMatch) {
    throw new Error(`Cronometer: token generation failed. Response: ${tokenText.slice(0, 200)}`);
  }
  const authToken = tokenMatch[1];
  cookieHeader = mergeCookies(
    pageCookies, loginCookies,
    getSetCookieHeaders(authRes), getSetCookieHeaders(tokenRes),
  );

  return { authToken, cookieHeader };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Fetch the Cronometer servings CSV for a date range.
 * @param {string} authToken   – from login()
 * @param {string} cookieHeader – from login()
 * @param {string} startDate   – YYYY-MM-DD
 * @param {string} endDate     – YYYY-MM-DD
 */
export async function fetchServings(authToken, cookieHeader, startDate, endDate) {
  const url = new URL(EXPORT_URL);
  url.searchParams.set('nonce', authToken);
  url.searchParams.set('generate', 'servings');
  url.searchParams.set('start', startDate);
  url.searchParams.set('end', endDate);

  const res = await fetch(url.toString(), {
    headers: {
      Cookie: cookieHeader,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
    },
  });
  if (!res.ok) throw new Error(`Cronometer export failed (${res.status})`);
  return res.text();
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/** Handle quoted fields in CSV */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse Cronometer servings CSV into per-day nutrition data.
 *
 * @param {string} csv
 * @returns {{ [date: string]: { totalCal, totalProtein, totalCarbs, totalFat, totalFiber, meals } }}
 */
export function parseServings(csv) {
  const lines = csv.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return {};

  const headers = parseCSVLine(lines[0]);

  // Resolve column indices — Cronometer has changed column names across versions
  const col = (...names) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h === name);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const dayCol      = col('Day');
  const nameCol     = col('Name', 'Food Name');
  const qtyCol      = col('Quantity', 'Amount');
  const unitCol     = col('Unit', 'Serving');
  const calCol      = col('Calories', 'Energy (kcal)');
  const fatCol      = col('Fat (g)');
  const proteinCol  = col('Protein (g)');
  const carbsCol    = col('Carbohydrates (g)');
  const fiberCol    = col('Fiber (g)');
  const categoryCol = col('Category', 'Group', 'Meal');

  const days = {};

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const date = row[dayCol];
    if (!date) continue;

    if (!days[date]) {
      days[date] = { totalCal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0, meals: {} };
    }

    const d = days[date];
    const cal     = parseFloat(row[calCol])     || 0;
    const protein = parseFloat(row[proteinCol]) || 0;
    const carbs   = parseFloat(row[carbsCol])   || 0;
    const fat     = parseFloat(row[fatCol])     || 0;
    const fiber   = parseFloat(row[fiberCol])   || 0;
    const meal    = (row[categoryCol] || 'Other');
    const name    = row[nameCol] || '';
    const qty     = row[qtyCol]  || '';
    const unit    = row[unitCol] || '';

    d.totalCal     += cal;
    d.totalProtein += protein;
    d.totalCarbs   += carbs;
    d.totalFat     += fat;
    d.totalFiber   += fiber;

    if (!d.meals[meal]) d.meals[meal] = [];
    d.meals[meal].push({ name, qty, unit, cal, protein, carbs, fat, fiber });
  }

  // Finalise: round totals, convert meals map to array
  for (const date of Object.keys(days)) {
    const d = days[date];
    d.totalCal     = Math.round(d.totalCal);
    d.totalProtein = Math.round(d.totalProtein * 10) / 10;
    d.totalCarbs   = Math.round(d.totalCarbs   * 10) / 10;
    d.totalFat     = Math.round(d.totalFat     * 10) / 10;
    d.totalFiber   = Math.round(d.totalFiber   * 10) / 10;
    d.meals        = Object.entries(d.meals).map(([m, foods]) => ({ meal: m, foods }));
  }

  return days;
}
