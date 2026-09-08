// Shared Supabase mapping · the same rows must round-trip for the app and the Coach.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../lib/engine.mjs';
import { toRow, fromRows, loadAll, writeProgramChanges, makeClient, LOAD_PLAN } from '../lib/supabase.mjs';

const fakeClient = (tables = {}) => {
  const writes = [];
  return { writes, tables,
    async select(table) { return tables[table] || []; },
    async upsert(table, data, conflict) { writes.push({ table, data, conflict }); return true; },
    async deleteRow(table, col, val) { writes.push({ table, del: [col, val] }); return true; },
    async patch() { return true; } };
};

test('every table in the load plan has a mapper', () => {
  for (const [table] of LOAD_PLAN) assert.equal(typeof fromRows[table], 'function', table);
});

test('rows round-trip through toRow → fromRows', () => {
  const d = E.bl();
  fromRows.weight([toRow.weight('2026-09-08', 188.6)], d);
  fromRows.recovery([{ ...toRow.recovery('2026-09-08', { recoveryScore: 71, hrv: 44, rhr: 49, sleepHours: 7.2, source: 'oura' }), sleeplight: 4.7 }], d);
  fromRows.habits([toRow.habits('2026-09-08', { alcohol: false, cannabis: false, screensOff: true, sunlight: true, bedBy1030: false, readBeforeBed: true, supplements: true })], d);
  fromRows.workouts([toRow.workout('2026-09-08', { day: 'tuesday', exercises: [{ id: 'deadlift', sets: [] }], dur: 52 })], d);
  fromRows.nutrition([toRow.nutrition('2026-09-08', E.sumMeals([{ cal: 435, protein: 52, carbs: 40, fat: 8, fiber: 4 }]))], d);
  fromRows.progression([toRow.progression('deadlift__5-5', { currentWeight: 245, lastReps: [5, 5, 5], lastDate: '2026-09-08', progressed: true, pr: { e1rm: 285 }, e1rmHistory: [{ date: '2026-09-08', e1rm: 285 }] })], d);
  fromRows.cardio([toRow.cardio('2026-09-08', { type: 'stairs', duration: 20, intensity: 'zone2', calories: 210 })], d);
  fromRows.body_measurements([toRow.bodyMeas('2026-09-08', { waist: 34.5, armL: 15.2 })], d);
  fromRows.settings([toRow.settings({ ...E.DEFAULTS, protein: 215 })], d);
  assert.equal(d.wt['2026-09-08'], 188.6);
  assert.equal(d.rec['2026-09-08'].hrv, 44); assert.equal(d.rec['2026-09-08'].source, 'oura'); assert.equal(d.rec['2026-09-08'].sleepLight, 4.7);
  assert.equal(d.habits['2026-09-08'].bedBy1030, false);
  assert.equal(d.wk['2026-09-08'].dur, 52);
  assert.equal(d.nut['2026-09-08'].totalCal, 435);
  assert.equal(d.prog['deadlift__5-5'].exerciseId, 'deadlift'); assert.equal(d.prog['deadlift__5-5'].pr.e1rm, 285);
  assert.equal(d.cardio['2026-09-08'].calories, 210);
  assert.deepEqual(d.bodyMeas['2026-09-08'], { waist: 34.5, armL: 15.2 });
  assert.equal(d.settings.protein, 215); assert.equal(d.settings.trainingCal, 2000);
});

test('program row is trusted only for the current block version (legacy rows by id match)', () => {
  const other = JSON.parse(JSON.stringify(E.PROG.days)); other.monday.exercises.push({ id: 'face-pull', name: 'Face Pull', sets: 2, rr: [12, 15], sw: 40, unit: 'lbs' });
  let d = E.bl(); fromRows.program([toRow.program(other)], d);
  assert.ok(d.program.monday.exercises.some(e => e.id === 'face-pull'), 'current version → coach edit kept');
  d = E.bl(); fromRows.program([{ id: 'user', version: 'old-block', data: other }], d);
  assert.ok(!d.program.monday.exercises.some(e => e.id === 'face-pull'), 'other version → code program');
  d = E.bl(); fromRows.program([{ id: 'user', data: other }], d);
  assert.ok(!d.program.monday.exercises.some(e => e.id === 'face-pull'), 'no version + ids differ → code program');
  d = E.bl(); fromRows.program([{ id: 'user', data: JSON.parse(JSON.stringify(E.PROG.days)) }], d);
  assert.equal(d.programVersion, E.PROG.version);
  // and applyBlockV2 keeps a same-version program instead of resetting it
  const dd = { ...E.bl(), program: other, programVersion: E.PROG.version, blockV2SettingsApplied: true };
  E.applyBlockV2(dd);
  assert.ok(dd.program.monday.exercises.some(e => e.id === 'face-pull'), 'boot normalization keeps the coach edit');
  const stale = { ...E.bl(), program: other, programVersion: 'old', blockV2SettingsApplied: true };
  E.applyBlockV2(stale);
  assert.ok(!stale.program.monday.exercises.some(e => e.id === 'face-pull'));
});

test('loadAll tolerates missing optional tables and builds the app-shaped object', async () => {
  const c = fakeClient({ weight: [{ date: '2026-09-08', value: 190 }], program_updates: [{ id: 1, type: 'settings', reason: 'r', applied: true, applied_at: '2026-09-08T10:00:00Z', payload: '{"type":"settings","field":"protein","value":210}', summary: 'protein: 200 → 210' }] });
  const d = await loadAll(c);
  assert.equal(d.wt['2026-09-08'], 190);
  assert.deepEqual(d.bodyMeas, {}); assert.deepEqual(d.lytes, {});
  assert.equal(d.coachLog.length, 1); assert.equal(d.coachLog[0].payload.field, 'protein');
  assert.equal(d.programVersion, E.PROG.version);
});

test('writeProgramChanges applies to live rows, preserves untouched settings, logs every change', async () => {
  const c = fakeClient({ settings: [toRow.settings({ ...E.DEFAULTS, syncToken: 'abc' })], program: [toRow.program(E.PROG.days)] });
  const r = await writeProgramChanges(c, E.applyChanges, [
    { type: 'settings', field: 'weekendCal', value: 1700 },
    { type: 'exercise', action: 'add', day: 'thursday', exercise: { id: 'face-pull', name: 'Face Pull', sets: 2, rr: [12, 15], rest: 60, sw: 40, inc: 5, unit: 'lbs' } },
    { type: 'settings', field: 'nope', value: 1 },
  ], { reason: 'test', source: 'coach' });
  assert.equal(r.applied.length, 2); assert.equal(r.rejected.length, 1);
  const s = c.writes.find(w => w.table === 'settings'); assert.equal(s.data.weekendCal, 1700); assert.equal(s.data.syncToken, 'abc'); assert.equal(s.conflict, 'id');
  const p = c.writes.find(w => w.table === 'program'); assert.ok(p.data.data.thursday.exercises.some(e => e.id === 'face-pull')); assert.equal(p.data.version, E.PROG.version);
  const audits = c.writes.filter(w => w.table === 'program_updates'); assert.equal(audits.length, 3);
  assert.equal(audits[1].data.summary, 'Added Face Pull to thursday'); assert.equal(audits[2].data.applied, false);
  const none = await writeProgramChanges(fakeClient({}), E.applyChanges, [{ type: 'settings', field: 'nope', value: 1 }]);
  assert.equal(none.applied.length, 0);
});

test('makeClient: retries a dropped request once and reports failure classes', async () => {
  let n = 0; const failures = [];
  const fetchImpl = async () => { n++; if (n === 1) throw new Error('dropped'); return new Response('{}', { status: 201 }); };
  const c = makeClient({ fetchImpl, onFailure: (t, s, b, tr) => failures.push([t, s, tr]), onSuccess: () => {}, retryMs: 1 });
  assert.equal(await c.upsert('weight', { date: '2026-09-08', value: 1 }), true); assert.equal(n, 2);
  const bad = makeClient({ fetchImpl: async () => new Response('column "x" does not exist', { status: 400 }), onFailure: (t, s, b, tr) => failures.push([t, s, tr]), retryMs: 1 });
  assert.equal(await bad.upsert('weight', {}), false); assert.deepEqual(failures.at(-1), ['weight', 400, false]);
  const server = makeClient({ fetchImpl: async () => new Response('nope', { status: 500 }) });
  await assert.rejects(() => server.upsert('weight', {}), /Supabase weight 500/);
});
