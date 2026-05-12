#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDailyReadiness, getSleepSessions, secToHours } from '../lib/oura.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv(path.join(root, '.env.local'));

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://wszumxewqxkggtevfubb.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const OURA_PAT = process.env.OURA_PAT;
if (!SUPABASE_KEY) throw new Error('Missing Supabase key');
if (!OURA_PAT) throw new Error('Missing OURA_PAT');

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const today = new Date().toISOString().slice(0, 10);
const startDate = process.argv[2] || '2026-02-01';
const endDate = process.argv[3] || today;

async function sb(method, query, body, extraHeaders = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recovery${query}`, { method, headers: { ...headers, ...extraHeaders }, body: body == null ? undefined : JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${query} failed ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
function minDate(a, b) { return a < b ? a : b; }

async function fetchOuraRange(start, end) {
  const readiness = [];
  const sleeps = [];
  for (let s = start; s <= end;) {
    const e = minDate(addDays(s, 29), end);
    const [r, sl] = await Promise.all([getDailyReadiness(OURA_PAT, s, e), getSleepSessions(OURA_PAT, s, e)]);
    readiness.push(...r); sleeps.push(...sl);
    s = addDays(e, 1);
  }
  return { readiness, sleeps };
}

function buildRows(readinessRecords, sleepRecords) {
  const sleepByDay = new Map();
  for (const s of sleepRecords) {
    if (s.type !== 'long_sleep') continue;
    const existing = sleepByDay.get(s.day);
    if (!existing || (s.total_sleep_duration || 0) > (existing.total_sleep_duration || 0)) sleepByDay.set(s.day, s);
  }
  const readinessByDay = new Map(readinessRecords.map(r => [r.day, r]));
  const days = [...new Set([...readinessByDay.keys(), ...sleepByDay.keys()])].sort();
  return days.map(day => {
    const rec = readinessByDay.get(day) || {};
    const sleep = sleepByDay.get(day) || {};
    return {
      date: day,
      recovery_score: rec.score ?? null,
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
  });
}

const existing = await sb('GET', '?select=*&order=date.asc');
fs.mkdirSync(path.join(root, 'backups'), { recursive: true });
const backup = path.join(root, 'backups', `recovery-before-oura-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(backup, JSON.stringify(existing, null, 2));

const { readiness, sleeps } = await fetchOuraRange(startDate, endDate);
const rows = buildRows(readiness, sleeps);
if (!rows.length) throw new Error(`Oura returned no recovery/sleep rows for ${startDate}..${endDate}`);

// Remove existing rows in the rebuilt range so stale Whoop/manual fields cannot survive partial upserts.
await sb('DELETE', `?date=gte.${encodeURIComponent(startDate)}&date=lte.${encodeURIComponent(endDate)}`, null, { Prefer: '' });

for (let i = 0; i < rows.length; i += 100) {
  const chunk = rows.slice(i, i + 100);
  await sb('POST', '?on_conflict=date', chunk, { Prefer: 'resolution=merge-duplicates' });
}

const after = await sb('GET', `?select=date,recovery_score,hrv,rhr,sleep_hours,source&date=gte.${encodeURIComponent(startDate)}&date=lte.${encodeURIComponent(endDate)}&order=date.asc`);
const sourceCounts = after.reduce((m, r) => (m[r.source || 'null'] = (m[r.source || 'null'] || 0) + 1, m), {});
console.log(JSON.stringify({ ok: true, range: { startDate, endDate }, backup, fetched: { readiness: readiness.length, sleeps: sleeps.length }, written: rows.length, sourceCounts, first: after[0], last: after[after.length - 1] }, null, 2));
