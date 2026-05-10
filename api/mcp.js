import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

// ── Supabase config (same as update.js) ──
const SB_URL = process.env.SUPABASE_URL || "https://wszumxewqxkggtevfubb.supabase.co";
const SB_KEY = process.env.SUPABASE_KEY || "sb_publishable_zeAejuFbdtMfoCHudxW6Cw_TJKtbYSJ";
const sbHeaders = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Prefer": "resolution=merge-duplicates",
};

// ── Constants ──
const SETTINGS_FIELDS = ["calories", "protein", "water", "steps", "sleep", "fiber", "trainingCal", "wednesdayCal", "weekendCal"];

const PROGRAM_SNAPSHOT = {
  settings: { calories: 1800, protein: 200, water: 128, steps: 15000, sleep: 7.5, fiber: 30, trainingCal: 1800, wednesdayCal: 900, weekendCal: 1700 },
  days: {
    monday: {
      name: "Upper A — Strength", focus: "Strength",
      exercises: [
        { id: "cable-fly", name: "Cable Fly", sets: 2, rr: [12, 15], sw: 15, unit: "lbs/side" },
        { id: "converging-chest-press", name: "Converging Chest Press", sets: 2, rr: [5, 8], sw: 140, unit: "lbs" },
        { id: "seated-row", name: "Seated Row Machine", sets: 2, rr: [5, 8], sw: 160, unit: "lbs" },
        { id: "smith-ohp", name: "Smith OHP", sets: 2, rr: [5, 8], sw: 85, unit: "lbs" },
        { id: "lat-pulldown", name: "Lat Pulldown", sets: 2, rr: [5, 8], sw: 145, unit: "lbs" },
      ]
    },
    tuesday: {
      name: "Lower A — Strength", focus: "Strength",
      exercises: [
        { id: "front-squat", name: "Front Squat (BB)", sets: 2, rr: [5, 8], sw: 135, unit: "lbs" },
        { id: "rdl", name: "Romanian Deadlift", sets: 2, rr: [5, 8], sw: 125, unit: "lbs" },
        { id: "leg-press", name: "Leg Press", sets: 2, rr: [5, 8], sw: 360, unit: "lbs" },
        { id: "lying-leg-curl", name: "Lying Leg Curl", sets: 2, rr: [5, 8], sw: 130, unit: "lbs" },
        { id: "standing-calf", name: "Standing Calf Raise", sets: 2, rr: [5, 8], sw: 290, unit: "lbs" },
      ]
    },
    wednesday: {
      name: "Mobility + Arms", focus: "Core",
      exercises: [
        { id: "incline-db-curl", name: "Incline DB Curl", sets: 2, rr: [10, 12], sw: 15, unit: "lbs" },
        { id: "oh-tricep-ext", name: "Overhead Tricep Extension", sets: 2, rr: [10, 12], sw: 40, unit: "lbs" },
        { id: "cable-hammer-curl", name: "Cable Hammer Curl (Rope)", sets: 2, rr: [10, 12], sw: 30, unit: "lbs" },
        { id: "tricep-pushdown", name: "Tricep Pushdown", sets: 2, rr: [10, 12], sw: 50, unit: "lbs" },
        { id: "reverse-curl", name: "Reverse Curl", sets: 2, rr: [12, 15], sw: 40, unit: "lbs" },
        { id: "wrist-curl", name: "Wrist Curl", sets: 2, rr: [12, 15], sw: 20, unit: "lbs" },
      ]
    },
    thursday: {
      name: "Upper B — Hypertrophy", focus: "Hypertrophy",
      exercises: [
        { id: "low-high-cable-fly", name: "Low-to-High Cable Fly", sets: 2, rr: [12, 15], sw: 15, unit: "lbs/side" },
        { id: "db-incline-press", name: "DB Incline Press", sets: 2, rr: [10, 12], sw: 40, unit: "lbs/hand" },
        { id: "overhand-cable-row", name: "Overhand Cable Row", sets: 2, rr: [10, 12], sw: 110, unit: "lbs" },
        { id: "lateral-raise", name: "Cable Lateral Raise", sets: 2, rr: [10, 12], sw: 12.5, unit: "lbs" },
        { id: "reverse-fly", name: "Reverse Fly", sets: 2, rr: [10, 12], sw: 25, unit: "lbs" },
      ]
    },
    friday: {
      name: "Lower B — Hypertrophy", focus: "Hypertrophy",
      exercises: [
        { id: "leg-press", name: "Leg Press", sets: 2, rr: [10, 12], sw: 300, unit: "lbs" },
        { id: "bulgarian-split-squat", name: "Bulgarian Split Squat (DB)", sets: 2, rr: [10, 12], sw: 25, unit: "lbs/hand" },
        { id: "rdl", name: "Romanian Deadlift", sets: 2, rr: [10, 12], sw: 125, unit: "lbs" },
        { id: "lying-leg-curl", name: "Lying Leg Curl", sets: 2, rr: [10, 12], sw: 130, unit: "lbs" },
        { id: "leg-extension", name: "Leg Extension", sets: 2, rr: [10, 12], sw: 120, unit: "lbs" },
        { id: "seated-calf", name: "Seated Calf Raise", sets: 2, rr: [10, 12], sw: 90, unit: "lbs" },
      ]
    }
  }
};

// ── Supabase write ──
async function pushChange(change, reason) {
  const row = {
    type: change.type,
    action: change.action || null,
    payload: JSON.stringify(change),
    reason: reason || null,
    applied: false,
  };
  const r = await fetch(`${SB_URL}/rest/v1/program_updates`, {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`Supabase error: ${await r.text()}`);
  return true;
}

// ── Exercise field schemas ──
const exerciseSchema = z.object({
  id: z.string(), name: z.string(), sets: z.number(),
  rr: z.array(z.number()), rest: z.number().optional(),
  sw: z.number(), inc: z.number().optional(),
  unit: z.string(), notes: z.string().optional(), cue: z.string().optional(),
});

const exerciseFieldsSchema = z.object({
  name: z.string().optional(), sets: z.number().optional(),
  rr: z.array(z.number()).optional(), rest: z.number().optional(),
  sw: z.number().optional(), inc: z.number().optional(),
  unit: z.string().optional(), notes: z.string().optional(), cue: z.string().optional(),
});

// ── MCP Handler (Web API Request → Response) ──
const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_program",
      {
        title: "Get Program",
        description: "View the current workout program structure — all days, exercises, IDs, weights, settings, and live progression data (currentWeight, lastReps, lastDate, progressed, PR). Call this before making changes so you know what exists.",
        inputSchema: z.object({}),
      },
      async () => {
        // Fetch live progression data from Supabase
        let progression = {};
        try {
          const res = await fetch(`${SB_URL}/rest/v1/progression?select=*`, {
            headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
          });
          if (res.ok) {
            const rows = await res.json();
            for (const r of rows) {
              progression[r.exercise_id] = {
                currentWeight: r.current_weight,
                lastReps: r.last_reps,
                lastDate: r.last_date,
                progressed: r.progressed,
                pr: r.pr,
              };
            }
          }
        } catch (e) { /* progression fetch failed, return snapshot without it */ }

        const result = { ...PROGRAM_SNAPSHOT, progression };
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    server.registerTool(
      "update_settings",
      {
        title: "Update Settings",
        description: "Update a health/nutrition target. Valid fields: calories, protein (g), water (oz), steps, sleep (hrs), fiber (g), trainingCal (Mon-Fri except Wed), wednesdayCal (fast day), weekendCal. Changes apply on next app load.",
        inputSchema: z.object({
          field: z.enum(SETTINGS_FIELDS),
          value: z.number().describe("New target value"),
          reason: z.string().describe("Why this change is being made"),
        }),
      },
      async ({ field, value, reason }) => {
        await pushChange({ type: "settings", field, value }, reason);
        return {
          content: [{ type: "text", text: `Done — ${field} updated to ${value}. Change will apply on next app load.` }],
        };
      }
    );

    server.registerTool(
      "update_exercise",
      {
        title: "Update Exercise",
        description: "Modify the workout program. Actions: 'update' (change fields on existing exercise), 'swap' (replace exercise), 'add' (add to a day), 'remove' (remove from a day). Use get_program first to see current exercise IDs.",
        inputSchema: z.object({
          action: z.enum(["add", "remove", "swap", "update"]).describe("What to do"),
          day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday"]).optional().describe("Day (for add/remove)"),
          exerciseId: z.string().optional().describe("Exercise ID to modify/remove/swap"),
          fields: exerciseFieldsSchema.optional().describe("Fields to update (for 'update' action)"),
          newExercise: exerciseSchema.optional().describe("Replacement exercise (for 'swap' action)"),
          exercise: exerciseSchema.optional().describe("Exercise to add (for 'add' action)"),
          reason: z.string().describe("Why this change is being made"),
        }),
      },
      async (args) => {
        const { action, reason } = args;
        let change;

        if (action === "update") {
          if (!args.exerciseId || !args.fields) {
            return { content: [{ type: "text", text: "Error: 'update' requires exerciseId and fields" }], isError: true };
          }
          change = { type: "exercise", action: "update", exerciseId: args.exerciseId, fields: args.fields };
        } else if (action === "swap") {
          if (!args.exerciseId || !args.newExercise) {
            return { content: [{ type: "text", text: "Error: 'swap' requires exerciseId and newExercise" }], isError: true };
          }
          change = { type: "exercise", action: "swap", oldExerciseId: args.exerciseId, newExercise: args.newExercise };
        } else if (action === "add") {
          if (!args.day || !args.exercise) {
            return { content: [{ type: "text", text: "Error: 'add' requires day and exercise" }], isError: true };
          }
          change = { type: "exercise", action: "add", day: args.day, exercise: args.exercise };
        } else if (action === "remove") {
          if (!args.day || !args.exerciseId) {
            return { content: [{ type: "text", text: "Error: 'remove' requires day and exerciseId" }], isError: true };
          }
          change = { type: "exercise", action: "remove", day: args.day, exerciseId: args.exerciseId };
        } else {
          return { content: [{ type: "text", text: `Error: unknown action "${action}"` }], isError: true };
        }

        await pushChange(change, reason);
        return {
          content: [{ type: "text", text: `Done — exercise ${action} applied. Change will appear on next app load.` }],
        };
      }
    );
  },
  {},
  {
    basePath: "/api",
    disableSse: true,
    maxDuration: 60,
    verboseLogs: true,
  }
);

// ── Vercel adapter: convert Express-like (req, res) to Web API (Request → Response) ──
export default async function handler(req, res) {
  try {
    // Build the full URL
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const url = new URL(req.url, `${proto}://${host}`);

    // Build Web API Request from Vercel's Express-like request
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : undefined,
      duplex: hasBody ? "half" : undefined,
    });

    // Call mcp-handler
    const webResponse = await mcpHandler(webRequest);

    // Convert Web API Response back to Vercel's Express-like response
    res.status(webResponse.status);
    for (const [key, value] of webResponse.headers.entries()) {
      res.setHeader(key, value);
    }

    // Handle streaming (SSE) vs regular responses
    const contentType = webResponse.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream") && webResponse.body) {
      // Stream SSE response
      const reader = webResponse.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } finally {
        res.end();
      }
    } else {
      const body = await webResponse.text();
      res.end(body);
    }
  } catch (err) {
    console.error("MCP handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
}
