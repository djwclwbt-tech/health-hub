// ═══ HEALTH HUB ENGINE ═══
// One brain, two delivery vehicles. Everything here is pure and isomorphic:
// no window, no localStorage, no fetch. The app (src/app.jsx, bundled by
// esbuild) and the Coach MCP server (api/mcp.js, Node) import this same file,
// so the numbers a coach sees are the numbers the phone shows.
//
// Module map (imports only flow down this list, no cycles):
//   engine/program.mjs     PROG (versioned), library, supersets, poses, dinners, cardio, DEFAULTS, plates
//   engine/dates.mjs       lds, td, dw, fmt, wkn, estTime, fmtElapsed
//   engine/state.mjs       bl, migrate, seed, sumMeals, progKey/repTrack helpers
//   engine/progression.mjs e1RM and set rules, stalls, resolveWeight, buildSession, applyWorkout
//   engine/analytics.mjs   targets, trend, TDEE, weekly summary, closeout, insights, resolveMode
//   engine/migrations.mjs  backfill, prune, deload repair, applyBlockV2 (boot normalizers)
//   engine/changes.mjs     applyChanges, exerciseReport (the Coach's write path)
// Put logic in the matching module. engine.mjs only re-exports.
export * from "./engine/program.mjs";
export * from "./engine/dates.mjs";
export * from "./engine/state.mjs";
export * from "./engine/progression.mjs";
export * from "./engine/analytics.mjs";
export * from "./engine/migrations.mjs";
export * from "./engine/changes.mjs";
