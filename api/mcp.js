// ═══ COACH MCP · the second delivery vehicle ═══
// Remote MCP server for Claude.ai (and any MCP client). Every number here comes
// from lib/engine.mjs, the same brain the phone renders, over the same Supabase
// mapping (lib/supabase.mjs). Reads are free; writes land in the live tables and
// leave an audit row in program_updates that the app surfaces on next launch.
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import * as E from "../lib/engine.mjs";
import { makeClient, loadAll, toRow, writeProgramChanges } from "../lib/supabase.mjs";

const client = () => makeClient({ url: process.env.SUPABASE_URL || undefined, key: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || undefined });
const text = (obj) => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }] });
const fail = (msg) => ({ content: [{ type: "text", text: msg }], isError: true });
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD");
const dayOffset = (n, from = E.td()) => { const d = new Date(from + "T12:00:00"); d.setDate(d.getDate() + n); return E.lds(d); };
const hmNow = () => { const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })); return d.getHours() + d.getMinutes() / 60; };
const todayChicago = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

// Full app-shaped data object with the same boot normalization the phone runs.
const loadData = async () => {
  const d = await loadAll(client());
  E.backfillData(d); E.repairDeloadProgression(d); E.applyBlockV2(d); E.pruneProgression(d);
  return d;
};

const snapshot = (d, t) => {
  const st = d.settings || E.DEFAULTS;
  const summary = E.getWeeklyCutSummary(d, t);
  const rec = d.rec?.[t];
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const k = dayOffset(-i, t);
    week.push({ date: k, day: E.dw(k), weight: d.wt?.[k] ?? null, cal: d.nut?.[k]?.totalCal ?? null, protein: d.nut?.[k]?.totalProtein ?? null,
      calTarget: E.getDayCalTarget(k, st, d.travelDays, d.socialWeekend), proteinTarget: E.getDayProTarget(k, st, d.travelDays, d.socialWeekend),
      steps: d.steps?.[k] ?? null, water: d.water?.[k] ?? null, recovery: d.rec?.[k]?.recoveryScore ?? null, sleep: d.rec?.[k]?.sleepHours ?? null,
      lift: d.wk?.[k] ? { day: d.wk[k].day, dur: d.wk[k].dur, volume: d.wk[k].volume } : null, cardio: d.cardio?.[k] ? E.cardioSummary(d.cardio[k]) : null,
      cleanDay: !!d.habits?.[k] && ["alcohol", "cannabis", "screensOff", "bedBy1030", "supplements", "sunlight", "readBeforeBed"].every(f => d.habits[k][f] === (f === "alcohol" || f === "cannabis" ? false : true)) });
  }
  const last = (obj, pred = v => v != null) => Object.keys(obj || {}).filter(k => pred(obj[k])).sort().reverse()[0] || null;
  return {
    date: t, weekday: E.dw(t), programWeek: `${E.wkn(t)}/${E.PROG.weeks}`, deloadWeek: E.wkn(t) === E.PROG.deload, block: { name: E.PROG.name, version: E.PROG.version, start: E.PROG.start, end: E.PROG.end, startWeight: E.PROG.startWeight, targetWeight: E.PROG.targetWeight },
    mode: E.resolveMode(d, t, null, hmNow(), E.dw(t)),
    today: { dayType: E.getDayType(t, d.travelDays), calTarget: E.getDayCalTarget(t, st, d.travelDays, d.socialWeekend), proteinTarget: E.getDayProTarget(t, st, d.travelDays, d.socialWeekend),
      session: d.program?.[E.dw(t)] ? { name: d.program[E.dw(t)].name, exercises: d.program[E.dw(t)].exercises.length, logged: !!d.wk?.[t] } : null,
      weight: d.wt?.[t] ?? null, nutrition: d.nut?.[t] ? { cal: d.nut[t].totalCal, protein: d.nut[t].totalProtein, meals: (d.nut[t].meals || []).length } : null,
      steps: d.steps?.[t] ?? null, water: d.water?.[t] ?? null, recovery: rec || null, autoregulation: { proposal: E.getAutoregProposal(rec), decision: d.autoregLog?.[t] || null } },
    trend: E.getTrend(d.wt, t), tdee: summary.tdee, weekly: { ...summary, adherence: undefined }, recommendation: (({ summary: _s, ...r }) => r)(E.getWeeklyCutRecommendation(d, t, summary)),
    consistency: E.getWeeklyConsistency(d, t, summary), closeout: E.getTonightCloseout(d, t), stalls: summary.stalls, insights: E.getInsights(d), retention: E.getCutRetentionScore(d),
    last7: week, integrations: { cronometerLast: last(d.nut, n => (n?.totalCal || 0) > 0), ouraLast: last(d.rec, r => r?.recoveryScore != null), stepsLast: last(d.steps), weightLast: last(d.wt), lastPhotos: last(d.bodyComp), lastMeasurements: last(d.bodyMeas) },
    settings: st, coachLog: (d.coachLog || []).slice(0, 10),
  };
};

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool("get_snapshot", {
      title: "Get coaching snapshot",
      description: "Everything the phone computes, in one call: today's mode and targets, weight trend (EWMA/OLS, lbs/wk), adaptive TDEE, weekly adherence and the rule-based recommendation, tonight's closeout, auto-regulation proposal, stalls, last 7 days table, integration freshness, recent coach changes. Call this first in any coaching conversation.",
      inputSchema: z.object({ date: DATE.optional().describe("Defaults to today in America/Chicago") }),
    }, async ({ date }) => { try { const d = await loadData(); return text(snapshot(d, date || todayChicago())); } catch (e) { return fail(`snapshot failed: ${e.message}`); } });

    server.registerTool("get_program", {
      title: "Get program",
      description: "Current block: days, exercises (id, sets, rep range, rest, increment, anchor flag, cue) with the resolved working weight the app will load next session, progression rows (current weight, last reps/date, PR, e1RM history) and settings. Use exercise ids from here for update_exercise / get_exercise.",
      inputSchema: z.object({}),
    }, async () => {
      try {
        const d = await loadData();
        const days = Object.fromEntries(Object.entries(d.program || {}).map(([dn, day]) => [dn, { name: day.name, focus: day.focus, warmup: day.warmup, exercises: (day.exercises || []).map(ex => {
          const key = E.progKey(ex, ex); return { ...ex, progKey: key, workingWeight: E.resolveWeight(d, { ...ex, progKey: key }, ex.sw, ex), progression: d.prog?.[key] || null }; }) }]));
        return text({ source: "live", block: { name: E.PROG.name, version: E.PROG.version }, settings: d.settings, days, mobility: E.PROG.mobility, library: E.EXERCISE_LIBRARY.map(e => ({ id: e.id, name: e.name, pattern: e.pattern, region: e.region, unit: e.unit })) });
      } catch (e) { return fail(`get_program failed: ${e.message}`); }
    });

    server.registerTool("get_history", {
      title: "Get history",
      description: "Raw daily rows for one store between two dates (inclusive). kinds: workouts (full set logs), nutrition (meals + totals), weight, recovery (Oura), steps, water, cardio, habits, measurements, photos (AI body-comp analyses), mobility.",
      inputSchema: z.object({ kind: z.enum(["workouts", "nutrition", "weight", "recovery", "steps", "water", "cardio", "habits", "measurements", "photos", "mobility"]), from: DATE.optional().describe("Default: 28 days ago"), to: DATE.optional().describe("Default: today"), limit: z.number().int().min(1).max(400).optional() }),
    }, async ({ kind, from, to, limit = 120 }) => {
      try {
        const d = await loadData();
        const store = { workouts: d.wk, nutrition: d.nut, weight: d.wt, recovery: d.rec, steps: d.steps, water: d.water, cardio: d.cardio, habits: d.habits, measurements: d.bodyMeas, photos: d.bodyComp, mobility: d.mob }[kind] || {};
        const t = to || todayChicago(); const f = from || dayOffset(-28, t);
        const rows = Object.entries(store).filter(([k]) => k >= f && k <= t).sort((a, b) => b[0].localeCompare(a[0])).slice(0, limit).map(([date, v]) => ({ date, ...(typeof v === "object" && v !== null ? v : { value: v }) }));
        return text({ kind, from: f, to: t, count: rows.length, rows });
      } catch (e) { return fail(`get_history failed: ${e.message}`); }
    });

    server.registerTool("get_exercise", {
      title: "Get exercise",
      description: "One lift in depth: every logged session (sets, e1RM, volume), PR, current working weight, and plan-safe substitutions ranked by fit. exerciseId from get_program.",
      inputSchema: z.object({ exerciseId: z.string() }),
    }, async ({ exerciseId }) => {
      try {
        const d = await loadData();
        const slot = Object.values(d.program || {}).flatMap(day => day.exercises || []).find(e => e.id === exerciseId) || E.exLibById[exerciseId];
        if (!slot) return fail(`Unknown exercise ${exerciseId}. Use ids from get_program or the library.`);
        const key = E.progKey(slot, slot);
        const report = E.exerciseReport(d, slot, key);
        const swaps = E.swapOptions(d, null, slot, slot).slice(0, 6).map(o => ({ id: o.id, name: o.name, region: o.region, recommended: o.recommended, startWeight: E.resolveWeight(d, { ...o, progKey: o.progKey }, o.sw, slot) }));
        return text({ ...report, slot, swaps });
      } catch (e) { return fail(`get_exercise failed: ${e.message}`); }
    });

    // ── writes ─────────────────────────────────────────────────────────────
    server.registerTool("update_settings", {
      title: "Update settings",
      description: "Change one target and apply it immediately: calories, protein (g), water (oz), steps, sleep (h), fiber (g), trainingCal (Mon/Tue/Thu/Fri), wednesdayCal (fast day), weekendCal (Sat/Sun average; app renders Sat +100 / Sun −100). The phone picks it up on next launch and shows a toast with your reason.",
      inputSchema: z.object({ field: z.enum(E.SETTINGS_FIELDS), value: z.number(), reason: z.string().describe("One sentence the athlete will read") }),
    }, async ({ field, value, reason }) => {
      try { const r = await writeProgramChanges(client(), E.applyChanges, [{ type: "settings", field, value }], { reason }); return r.rejected.length ? fail(r.rejected[0].error) : text({ ok: true, applied: r.applied, settings: r.settings }); }
      catch (e) { return fail(`update_settings failed: ${e.message}`); }
    });

    const exerciseSchema = z.object({ id: z.string(), name: z.string(), sets: z.number().int().min(1).max(6), rr: z.tuple([z.number().int(), z.number().int()]), rest: z.number().int().optional(), sw: z.number(), inc: z.number().optional(), unit: z.string(), notes: z.string().optional(), cue: z.string().optional(), anchor: z.boolean().optional() });
    server.registerTool("update_exercise", {
      title: "Update exercise",
      description: "Edit the program and apply it immediately. actions: update (fields on an existing exercise: sets, rr, rest, sw, inc, notes, cue), swap (replace exerciseId with newExercise; the slot keeps its anchor flag unless newExercise sets one), add (day + exercise), remove (day + exerciseId). Progression is keyed by lift + rep range, so changing rr starts a fresh progression track for that lift.",
      inputSchema: z.object({ action: z.enum(["update", "swap", "add", "remove"]), day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday"]).optional(), exerciseId: z.string().optional(),
        fields: exerciseSchema.partial().omit({ id: true }).optional(), newExercise: exerciseSchema.optional(), exercise: exerciseSchema.optional(), reason: z.string() }),
    }, async (a) => {
      const change = a.action === "update" ? { type: "exercise", action: "update", exerciseId: a.exerciseId, fields: a.fields }
        : a.action === "swap" ? { type: "exercise", action: "swap", oldExerciseId: a.exerciseId, newExercise: a.newExercise }
        : a.action === "add" ? { type: "exercise", action: "add", day: a.day, exercise: a.exercise }
        : { type: "exercise", action: "remove", day: a.day, exerciseId: a.exerciseId };
      try { const r = await writeProgramChanges(client(), E.applyChanges, [change], { reason: a.reason }); return r.rejected.length ? fail(r.rejected[0].error) : text({ ok: true, applied: r.applied }); }
      catch (e) { return fail(`update_exercise failed: ${e.message}`); }
    });

    server.registerTool("log_weight", { title: "Log weight", description: "Record a morning weigh-in (lbs).", inputSchema: z.object({ date: DATE.optional(), lbs: z.number().min(80).max(500) }) },
      async ({ date, lbs }) => { try { const t = date || todayChicago(); await client().upsert("weight", toRow.weight(t, +lbs.toFixed(1))); return text({ ok: true, date: t, lbs }); } catch (e) { return fail(e.message); } });

    server.registerTool("log_meal", { title: "Log meal", description: "Append a meal to a day (source 'coach'; Cronometer syncs never overwrite it). Totals recompute.", inputSchema: z.object({ date: DATE.optional(), description: z.string(), cal: z.number().min(0), protein: z.number().min(0), carbs: z.number().min(0).optional(), fat: z.number().min(0).optional(), fiber: z.number().min(0).optional(), mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]).optional() }) },
      async ({ date, description, cal, protein, carbs = 0, fat = 0, fiber = 0, mealType = "Snack" }) => {
        try { const c = client(); const t = date || todayChicago(); const rows = await c.select("nutrition", "date", "desc", 1, `date=eq.${t}`);
          const meals = [...(rows[0]?.meals || []), { description, cal, protein, carbs, fat, fiber, mealType, source: "coach" }];
          const n = E.sumMeals(meals); await c.upsert("nutrition", toRow.nutrition(t, n)); return text({ ok: true, date: t, totals: { cal: n.totalCal, protein: n.totalProtein }, meals: meals.length }); } catch (e) { return fail(e.message); } });

    server.registerTool("log_cardio", { title: "Log cardio", description: "Record the day's cardio session.", inputSchema: z.object({ date: DATE.optional(), type: z.enum(E.CARDIO_TYPES), duration: z.number().min(1), intensity: z.enum(["easy", "zone2", "tempo", "hard", "hiit"]).optional(), distance: z.number().optional(), calories: z.number().optional(), notes: z.string().optional() }) },
      async ({ date, ...c }) => { try { const t = date || todayChicago(); await client().upsert("cardio", toRow.cardio(t, { intensity: "zone2", ...c })); return text({ ok: true, date: t, summary: E.cardioSummary({ ...c, done: true }) }); } catch (e) { return fail(e.message); } });

    server.registerTool("log_steps", { title: "Log steps", description: "Set the day's step count.", inputSchema: z.object({ date: DATE.optional(), steps: z.number().int().min(0) }) },
      async ({ date, steps }) => { try { const t = date || todayChicago(); await client().upsert("steps", toRow.steps(t, steps)); return text({ ok: true, date: t, steps }); } catch (e) { return fail(e.message); } });

    server.registerTool("log_water", { title: "Log water", description: "Set the day's water total in oz (or add to it).", inputSchema: z.object({ date: DATE.optional(), oz: z.number().min(0), add: z.boolean().optional().describe("true = add oz to the existing total") }) },
      async ({ date, oz, add }) => { try { const c = client(); const t = date || todayChicago(); let total = oz; if (add) { const rows = await c.select("water", "date", "desc", 1, `date=eq.${t}`); total = (Number(rows[0]?.oz) || 0) + oz; } await c.upsert("water", toRow.water(t, total)); return text({ ok: true, date: t, oz: Math.round(total) }); } catch (e) { return fail(e.message); } });

    server.registerTool("log_habits", { title: "Log habits", description: "Mark the evening clean-day habits. cleanDay:true sets all seven; otherwise pass the individual booleans (alcohol/cannabis true means consumed).", inputSchema: z.object({ date: DATE.optional(), cleanDay: z.boolean().optional(), alcohol: z.boolean().optional(), cannabis: z.boolean().optional(), screensOff: z.boolean().optional(), sunlight: z.boolean().optional(), bedBy1030: z.boolean().optional(), readBeforeBed: z.boolean().optional(), supplements: z.boolean().optional() }) },
      async ({ date, cleanDay, ...h }) => { try { const t = date || todayChicago(); const c = client(); const rows = await c.select("habits", "date", "desc", 1, `date=eq.${t}`); const cur = rows[0] ? { alcohol: rows[0].alcohol, cannabis: rows[0].cannabis, screensOff: rows[0].screens_off, sunlight: rows[0].sunlight, bedBy1030: rows[0].bed_by_1030, readBeforeBed: rows[0].read_before_bed, supplements: rows[0].supplements, custom: rows[0].custom } : {};
        const next = cleanDay ? { ...cur, alcohol: false, cannabis: false, screensOff: true, sunlight: true, bedBy1030: true, readBeforeBed: true, supplements: true } : { ...cur, ...h };
        await c.upsert("habits", toRow.habits(t, next)); return text({ ok: true, date: t, habits: next }); } catch (e) { return fail(e.message); } });

    server.registerTool("log_measurements", { title: "Log measurements", description: "Tape measurements in inches for a day.", inputSchema: z.object({ date: DATE.optional(), chest: z.number().optional(), waist: z.number().optional(), armL: z.number().optional(), armR: z.number().optional(), thighL: z.number().optional(), thighR: z.number().optional() }) },
      async ({ date, ...m }) => { try { const t = date || todayChicago(); const c = client(); const rows = await c.select("body_measurements", "date", "desc", 1, `date=eq.${t}`); const cur = rows[0] ? { chest: rows[0].chest, waist: rows[0].waist, armL: rows[0].arm_l, armR: rows[0].arm_r, thighL: rows[0].thigh_l, thighR: rows[0].thigh_r } : {}; const next = { ...cur, ...m }; await c.upsert("body_measurements", toRow.bodyMeas(t, next)); return text({ ok: true, date: t, measurements: next }); } catch (e) { return fail(e.message); } });

    server.registerTool("set_travel_day", { title: "Set travel day", description: "Flag or clear a travel day (training-day calorie target, travel protocol in Setup).", inputSchema: z.object({ date: DATE.optional(), active: z.boolean() }) },
      async ({ date, active }) => { try { const t = date || todayChicago(); const c = client(); if (active) await c.upsert("travel_days", toRow.travelDay(t)); else await c.deleteRow("travel_days", "date", t); return text({ ok: true, date: t, active }); } catch (e) { return fail(e.message); } });

    server.registerTool("log_note", { title: "Log coach note", description: "Leave a dated note for the athlete (shows under Setup → Coach changes and in get_snapshot.coachLog). Use it for decisions, context, and what to watch next week.", inputSchema: z.object({ note: z.string().min(1).max(600) }) },
      async ({ note }) => { try { await client().upsert("program_updates", toRow.programUpdate({ type: "note" }, { reason: note, source: "coach", applied: true, summary: "Coach note" }), null); return text({ ok: true }); } catch (e) { return fail(e.message); } });
  },
  {},
  { basePath: "/api", disableSse: true, maxDuration: 60, verboseLogs: false },
);

// ── Vercel adapter: Express-like (req, res) → Web API (Request → Response) ──
export default async function handler(req, res) {
  try {
    // Optional shared secret for non-OAuth clients. Claude.ai's connector UI has
    // no place for a static token, so this stays unset for that path (see SECURITY.md).
    const secret = process.env.MCP_TOKEN;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) { res.status(401).json({ error: "Unauthorized" }); return; }
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const url = new URL(req.url, `${proto}://${host}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const webRequest = new Request(url.toString(), { method: req.method, headers, body: hasBody ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body)) : undefined, duplex: hasBody ? "half" : undefined });
    const webResponse = await mcpHandler(webRequest);
    res.status(webResponse.status);
    for (const [key, value] of webResponse.headers.entries()) res.setHeader(key, value);
    const contentType = webResponse.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream") && webResponse.body) {
      const reader = webResponse.body.getReader(); const decoder = new TextDecoder();
      try { while (true) { const { done, value } = await reader.read(); if (done) break; res.write(decoder.decode(value, { stream: true })); } } finally { res.end(); }
    } else res.end(await webResponse.text());
  } catch (err) {
    console.error("MCP handler error:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
}
