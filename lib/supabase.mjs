// ═══ SUPABASE · one column mapping for both delivery vehicles ═══
// The app (src/app.jsx) and the Coach MCP server (api/mcp.js) both read and
// write Supabase through this file, so a column rename happens in exactly one
// place and the coach sees the same data object the phone renders.
import { PROG, DEFAULTS, bl } from './engine.mjs';

export const DEFAULT_URL = 'https://wszumxewqxkggtevfubb.supabase.co';
export const DEFAULT_KEY = 'sb_publishable_zeAejuFbdtMfoCHudxW6Cw_TJKtbYSJ';

// Minimal REST client. `onFailure(table,status,body,transient)` / `onSuccess(table)`
// let the app run its sync-health UI; the server passes nothing and gets throws.
export const makeClient = ({ url = DEFAULT_URL, key = DEFAULT_KEY, fetchImpl, onFailure = null, onSuccess = null, retryMs = 1500 } = {}) => {
  const f = (...a) => (fetchImpl || globalThis.fetch)(...a);
  const h = { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` };
  const report = (table, status, body, transient) => { if (onFailure) onFailure(table, status, body, transient); };
  return {
    url, key, headers: h,
    async upsert(table, data, conflict = 'date') {
      const q = conflict ? `?on_conflict=${encodeURIComponent(conflict)}` : '';
      const send = () => f(`${url}/rest/v1/${table}${q}`, { method: 'POST', headers: { ...h, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(data) });
      try {
        let r;
        try { r = await send(); } catch (e) { await new Promise(res => setTimeout(res, retryMs)); r = await send(); }
        if (r.ok) { if (onSuccess) onSuccess(table); return true; }
        const body = await r.text().catch(() => '');
        report(table, r.status, body, false);
        if (!onFailure) throw new Error(`Supabase ${table} ${r.status}: ${body.slice(0, 200)}`);
        return false;
      } catch (e) {
        if (!onFailure) throw e;
        report(table, 0, String(e), true); return false;
      }
    },
    async select(table, order = 'date', dir = 'desc', limit = 500, filter = '') {
      try {
        const r = await f(`${url}/rest/v1/${table}?select=*&order=${order}.${dir}&limit=${limit}${filter ? '&' + filter : ''}`, { headers: h });
        if (r.ok) return await r.json();
        if (!onFailure) throw new Error(`Supabase ${table} ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
        return [];
      } catch (e) { if (!onFailure) throw e; return []; }
    },
    async patch(table, filter, data) {
      const r = await f(`${url}/rest/v1/${table}?${filter}`, { method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(data) });
      if (!r.ok && !onFailure) throw new Error(`Supabase ${table} patch ${r.status}`);
      return r.ok;
    },
    async deleteRow(table, col, val) {
      try { const r = await f(`${url}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, { method: 'DELETE', headers: h }); return r.ok; } catch { return false; }
    },
    async deleteAll(table) {
      try {
        await f(`${url}/rest/v1/${table}?id=gt.0`, { method: 'DELETE', headers: h });
        await f(`${url}/rest/v1/${table}?date=gt.2000-01-01`, { method: 'DELETE', headers: h });
      } catch {}
    },
  };
};

// ── app object → table row ─────────────────────────────────────────────────
export const toRow = {
  weight: (date, value) => ({ date, value }),
  steps: (date, value) => ({ date, value: Math.round(value) }),
  water: (date, oz) => ({ date, oz: Math.round(Number(oz) || 0) }),
  lytes: (date, l) => ({ date, na: Math.round(l.na || 0), k: Math.round(l.k || 0), mg: Math.round(l.mg || 0) }),
  recovery: (date, r) => ({ date, recovery_score: r.recoveryScore || null, hrv: r.hrv || null, rhr: r.rhr || null,
    respiratory_rate: r.respiratoryRate || null, sleep_hours: r.sleepHours || null, sleep_performance: r.sleepPerformance || null,
    strain: r.strain || null, wake_time: r.wakeTime || null, notes: r.notes || null, ...(r.source ? { source: r.source } : {}) }),
  habits: (date, h) => ({ date, alcohol: h.alcohol, cannabis: h.cannabis, screens_off: h.screensOff,
    sunlight: h.sunlight, bed_by_1030: h.bedBy1030, read_before_bed: h.readBeforeBed, supplements: h.supplements, custom: h.custom || null }),
  workout: (date, w) => ({ date, day_name: w.day, exercises: w.exercises || [], duration_min: w.dur || null }),
  nutrition: (date, n) => ({ date, meals: n.meals || [], total_cal: n.totalCal || 0, total_protein: n.totalProtein || 0,
    total_carbs: n.totalCarbs || 0, total_fat: n.totalFat || 0, total_fiber: n.totalFiber || 0 }),
  progression: (exId, p) => ({ exercise_id: exId, current_weight: p.currentWeight, last_reps: p.lastReps || null,
    last_date: p.lastDate || null, progressed: p.progressed || false, pr: p.pr || null, e1rm_history: p.e1rmHistory || null }),
  debrief: (date) => ({ date, completed: true }),
  mobility: (date, durSecs) => ({ date, completed: true, duration_secs: durSecs || null }),
  stepper: (date) => ({ date, completed: true }),
  cardio: (date, c) => ({ date, type: c.type || 'peloton', duration_min: c.duration || null, intensity: c.intensity || 'zone2',
    distance_mi: c.distance || null, calories: c.calories || null, notes: c.notes || null, done: true }),
  bodyComp: (date, b) => ({ date, photo_taken: true, analysis: b?.analysis || null }),
  bodyMeas: (date, m) => ({ date, chest: m.chest ?? null, waist: m.waist ?? null, arm_l: m.armL ?? null, arm_r: m.armR ?? null, thigh_l: m.thighL ?? null, thigh_r: m.thighR ?? null }),
  travelDay: (date) => ({ date, active: true }),
  tdeeExclude: (date) => ({ date, active: true }),
  settings: (s) => ({ id: 'user', ...s }),
  program: (p, version = PROG.version) => ({ id: 'user', data: p, version }),
  programUpdate: (change, { reason = null, source = 'coach', applied = true, summary = null } = {}) => ({
    type: change.type, action: change.action || null, payload: JSON.stringify(change), reason, applied, source, summary,
    applied_at: applied ? new Date().toISOString() : null }),
};

// Table → primary key column, for writes.
export const KEY_OF = { progression: 'exercise_id', settings: 'id', program: 'id', program_updates: null };
export const TABLE_OF = { weight: 'weight', steps: 'steps', water: 'water', lytes: 'lytes', recovery: 'recovery', habits: 'habits', workout: 'workouts',
  nutrition: 'nutrition', progression: 'progression', debrief: 'debrief', mobility: 'mobility', stepper: 'stepper', cardio: 'cardio', bodyComp: 'body_comp',
  bodyMeas: 'body_measurements', travelDay: 'travel_days', tdeeExclude: 'tdee_exclude', settings: 'settings', program: 'program', programUpdate: 'program_updates' };

// ── table rows → app object ────────────────────────────────────────────────
export const fromRows = {
  weight: (rows, d) => rows.forEach(r => { d.wt[r.date] = Number(r.value); }),
  steps: (rows, d) => rows.forEach(r => { d.steps[r.date] = r.value; }),
  water: (rows, d) => rows.forEach(r => { const oz = Math.round(Number(r.oz) || 0); if (oz > 0) d.water[r.date] = oz; }),
  lytes: (rows, d) => rows.forEach(r => { d.lytes[r.date] = { na: r.na || 0, k: r.k || 0, mg: r.mg || 0 }; }),
  recovery: (rows, d) => rows.forEach(r => { d.rec[r.date] = { recoveryScore: r.recovery_score, hrv: r.hrv, rhr: r.rhr,
    respiratoryRate: r.respiratory_rate, sleepHours: r.sleep_hours, sleepPerformance: r.sleep_performance,
    sleepLight: r.sleeplight, sleepDeep: r.sleepdeep, sleepRem: r.sleeprem, strain: r.strain, wakeTime: r.wake_time, notes: r.notes, source: r.source }; }),
  habits: (rows, d) => rows.forEach(r => { d.habits[r.date] = { alcohol: r.alcohol, cannabis: r.cannabis, screensOff: r.screens_off,
    sunlight: r.sunlight, bedBy1030: r.bed_by_1030, readBeforeBed: r.read_before_bed, supplements: r.supplements, custom: r.custom || null }; }),
  workouts: (rows, d) => rows.forEach(r => { d.wk[r.date] = { day: r.day_name, exercises: r.exercises, dur: r.duration_min }; }),
  nutrition: (rows, d) => rows.forEach(r => { d.nut[r.date] = { meals: r.meals, totalCal: r.total_cal, totalProtein: r.total_protein,
    totalCarbs: r.total_carbs, totalFat: r.total_fat, totalFiber: r.total_fiber }; }),
  progression: (rows, d) => rows.forEach(r => { d.prog[r.exercise_id] = { currentWeight: Number(r.current_weight), lastReps: r.last_reps,
    lastDate: r.last_date, progressed: r.progressed, pr: r.pr || null, e1rmHistory: r.e1rm_history || [], exerciseId: r.exercise_id?.split('__')[0] || r.exercise_id }; }),
  mobility: (rows, d) => rows.forEach(r => { d.mob[r.date] = { done: true, dur: r.duration_secs || null }; }),
  stepper: (rows, d) => rows.forEach(r => { d.stp[r.date] = true; }),
  debrief: (rows, d) => rows.forEach(r => { d.debrief[r.date] = true; }),
  cardio: (rows, d) => rows.forEach(r => { d.cardio[r.date] = { type: r.type || 'peloton', duration: r.duration_min || null, intensity: r.intensity || 'zone2',
    distance: r.distance_mi || null, calories: r.calories || null, notes: r.notes || '', done: true }; }),
  body_comp: (rows, d) => rows.forEach(r => {
    if (!r.analysis) { d.bodyComp[r.date] = true; return; }
    if (typeof r.analysis === 'string') { try { d.bodyComp[r.date] = { photoTaken: true, analysis: JSON.parse(r.analysis) }; } catch { d.bodyComp[r.date] = true; } }
    else d.bodyComp[r.date] = { photoTaken: true, analysis: r.analysis };
  }),
  body_measurements: (rows, d) => rows.forEach(r => { const m = { chest: r.chest, waist: r.waist, armL: r.arm_l, armR: r.arm_r, thighL: r.thigh_l, thighR: r.thigh_r };
    Object.keys(m).forEach(k => { if (m[k] == null) delete m[k]; }); if (Object.keys(m).length) d.bodyMeas[r.date] = m; }),
  travel_days: (rows, d) => rows.forEach(r => { if (r.active) d.travelDays[r.date] = true; }),
  tdee_exclude: (rows, d) => rows.forEach(r => { if (r.active) d.tdeeExclude[r.date] = true; }),
  settings: (rows, d) => { if (!rows.length) return; const s = rows[0];
    const num = (v, fb) => (v == null || v === '' ? fb : Number(v));
    d.settings = { ...DEFAULTS, ...(d.settings || {}),
      calories: num(s.calories, DEFAULTS.calories), protein: num(s.protein, DEFAULTS.protein), water: num(s.water, DEFAULTS.water), steps: num(s.steps, DEFAULTS.steps),
      sleep: num(s.sleep, DEFAULTS.sleep), fiber: num(s.fiber, DEFAULTS.fiber),
      trainingCal: num(s.trainingCal ?? s.training_cal, DEFAULTS.trainingCal), wednesdayCal: num(s.wednesdayCal ?? s.wednesday_cal, DEFAULTS.wednesdayCal), weekendCal: num(s.weekendCal ?? s.weekend_cal, DEFAULTS.weekendCal),
      ...(s.customHabits ? { customHabits: s.customHabits } : {}), ...(s.syncToken ? { syncToken: s.syncToken } : {}), ...(s.notifyToken ? { notifyToken: s.notifyToken } : {}),
      ...(s.notifications && typeof s.notifications === 'object' ? { notifications: { ...DEFAULTS.notifications, ...s.notifications } } : {}) }; },
  // The program row is trusted only if it was written for the block the code
  // ships (PROG.version). Rows without a version (pre-migration) fall back to
  // the old exercise-id equality check so nothing is wiped by accident.
  program: (rows, d) => {
    d.programVersion = PROG.version;
    if (!rows.length) return;
    const raw = rows[0].data;
    const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
    if (rows[0].version) { if (rows[0].version === PROG.version) d.program = parsed; return; }
    const ids = p => Object.values(p).flatMap(dy => (dy && dy.exercises || []).map(e => e.id)).sort().join(',');
    if (ids(PROG.days) === ids(parsed)) d.program = parsed;
  },
  program_updates: (rows, d) => { d.coachLog = rows.map(r => ({ id: r.id, type: r.type, action: r.action, reason: r.reason, summary: r.summary, source: r.source,
    applied: r.applied, at: r.applied_at || r.created_at || null, payload: (() => { try { return typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload; } catch { return null; } })() })); },
};

// Every table the loader reads: [table, order column, direction, limit].
export const LOAD_PLAN = [
  ['weight'], ['steps'], ['water'], ['lytes'], ['recovery'], ['habits'], ['workouts'], ['nutrition'],
  ['progression', 'exercise_id', 'asc'], ['mobility'], ['stepper'], ['debrief'], ['cardio'], ['body_comp'], ['body_measurements'],
  ['travel_days'], ['tdee_exclude'], ['settings', 'id', 'asc', 1], ['program', 'id', 'asc', 1], ['program_updates', 'created_at', 'desc', 30],
];

// Read everything into the app-shaped data object. Optional tables (lytes,
// body_measurements, program_updates) may not exist yet; they simply stay empty.
export const loadAll = async (client, { limit = 500 } = {}) => {
  const d = bl();
  const results = await Promise.all(LOAD_PLAN.map(([table, order = 'date', dir = 'desc', lim = limit]) =>
    client.select(table, order, dir, lim).catch(() => [])));
  LOAD_PLAN.forEach(([table], i) => { const rows = Array.isArray(results[i]) ? results[i] : []; try { fromRows[table](rows, d); } catch (e) { console.error('[SB] map', table, e); } });
  return d;
};

// Server-side write helpers used by the Coach: apply changes to the live rows
// and leave an audit row. Returns what the engine reported.
export const writeProgramChanges = async (client, applyChanges, changes, { reason = null, source = 'coach' } = {}) => {
  const [settingsRows, programRows] = await Promise.all([client.select('settings', 'id', 'asc', 1), client.select('program', 'id', 'asc', 1)]);
  const d = bl();
  fromRows.settings(settingsRows, d); fromRows.program(programRows, d);
  const result = applyChanges(changes, { settings: d.settings, program: d.program });
  const touchesSettings = changes.some(c => c?.type === 'settings');
  const touchesProgram = changes.some(c => c?.type === 'exercise');
  if (result.applied.length) {
    if (touchesSettings) await client.upsert('settings', toRow.settings(result.settings), 'id');
    if (touchesProgram) await client.upsert('program', toRow.program(result.program), 'id');
  }
  for (let i = 0; i < changes.length; i++) {
    const r = result.results[i] || { ok: false, error: 'not evaluated' };
    await client.upsert('program_updates', toRow.programUpdate(changes[i] || {}, { reason, source, applied: r.ok, summary: r.ok ? r.summary : `rejected: ${r.error}` }), null).catch(() => {});
  }
  return result;
};
