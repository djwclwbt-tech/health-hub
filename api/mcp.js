// ── Supabase config (same as update.js) ──
const SB_URL = process.env.SUPABASE_URL || "https://wszumxewqxkggtevfubb.supabase.co";
const SB_KEY = process.env.SUPABASE_KEY || "sb_publishable_zeAejuFbdtMfoCHudxW6Cw_TJKtbYSJ";
const sbHeaders = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Prefer": "resolution=merge-duplicates",
};

// ── Tool definitions ──
const SETTINGS_FIELDS = ["calories", "protein", "water", "steps", "sleep", "fiber", "mondayCal", "trainingCal", "weekendCal"];

const TOOLS = [
  {
    name: "update_settings",
    description: "Update a health/nutrition target. Valid fields: calories, protein (g), water (oz), steps, sleep (hrs), fiber (g), mondayCal, trainingCal, weekendCal. Changes apply on next app load.",
    inputSchema: {
      type: "object",
      properties: {
        field: { type: "string", enum: SETTINGS_FIELDS, description: "Setting to change" },
        value: { type: "number", description: "New target value" },
        reason: { type: "string", description: "Why this change is being made" }
      },
      required: ["field", "value", "reason"]
    }
  },
  {
    name: "update_exercise",
    description: "Modify the workout program. Actions: 'update' (change fields on existing exercise), 'swap' (replace exercise), 'add' (add to a day), 'remove' (remove from a day). Use get_program first to see current exercise IDs.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["add", "remove", "swap", "update"], description: "What to do" },
        day: { type: "string", enum: ["monday", "tuesday", "wednesday", "thursday", "friday"], description: "Day (for add/remove)" },
        exerciseId: { type: "string", description: "Exercise ID to modify/remove/swap (for update/remove/swap)" },
        fields: {
          type: "object",
          description: "Fields to update: {name, sets, rr:[min,max], rest, sw, inc, unit, notes, cue}",
          properties: {
            name: { type: "string" }, sets: { type: "number" },
            rr: { type: "array", items: { type: "number" } },
            rest: { type: "number" }, sw: { type: "number" },
            inc: { type: "number" }, unit: { type: "string" },
            notes: { type: "string" }, cue: { type: "string" }
          }
        },
        newExercise: {
          type: "object",
          description: "Replacement exercise (for swap). Must include: id, name, sets, rr, rest, sw, inc, unit",
          properties: {
            id: { type: "string" }, name: { type: "string" },
            sets: { type: "number" }, rr: { type: "array", items: { type: "number" } },
            rest: { type: "number" }, sw: { type: "number" },
            inc: { type: "number" }, unit: { type: "string" },
            notes: { type: "string" }, cue: { type: "string" }
          }
        },
        exercise: {
          type: "object",
          description: "Exercise to add (for add). Must include: id, name, sets, rr, rest, sw, inc, unit",
          properties: {
            id: { type: "string" }, name: { type: "string" },
            sets: { type: "number" }, rr: { type: "array", items: { type: "number" } },
            rest: { type: "number" }, sw: { type: "number" },
            inc: { type: "number" }, unit: { type: "string" },
            notes: { type: "string" }, cue: { type: "string" }
          }
        },
        reason: { type: "string", description: "Why this change is being made" }
      },
      required: ["action", "reason"]
    }
  },
  {
    name: "get_program",
    description: "View the current workout program structure — all days, exercises, IDs, weights, and settings. Call this before making changes so you know what exists.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

// ── Current program snapshot (for get_program tool) ──
const PROGRAM_SNAPSHOT = {
  settings: { calories: 2430, protein: 200, water: 128, steps: 10000, sleep: 7.5, fiber: 30 },
  days: {
    monday: {
      name: "Abs + Mobility", focus: "Core",
      exercises: [
        { id: "cable-crunch", name: "Cable Crunch", sets: 3, rr: [10, 15], sw: 70, unit: "lbs" },
        { id: "hanging-leg-raise", name: "Hanging Leg Raise", sets: 3, rr: [10, 15], sw: 0, unit: "BW" },
        { id: "pallof-press", name: "Pallof Press", sets: 2, rr: [10, 10], sw: 25, unit: "lbs" },
      ]
    },
    tuesday: {
      name: "Upper A — Strength", focus: "Strength",
      exercises: [
        { id: "smith-flat-bench", name: "Smith Flat Bench", sets: 3, rr: [5, 8], sw: 135, unit: "lbs" },
        { id: "seated-row", name: "Seated Row Machine", sets: 3, rr: [5, 8], sw: 160, unit: "lbs" },
        { id: "smith-ohp", name: "Smith OHP", sets: 3, rr: [5, 8], sw: 85, unit: "lbs" },
        { id: "lat-pulldown", name: "Lat Pulldown", sets: 3, rr: [5, 8], sw: 145, unit: "lbs" },
        { id: "preacher-curl", name: "Preacher Curl Machine", sets: 3, rr: [5, 8], sw: 70, unit: "lbs" },
        { id: "tricep-dips", name: "Tricep Dips", sets: 3, rr: [5, 8], sw: 0, unit: "BW" },
      ]
    },
    wednesday: {
      name: "Lower A — Strength", focus: "Strength",
      exercises: [
        { id: "leg-press", name: "Leg Press", sets: 3, rr: [5, 8], sw: 360, unit: "lbs" },
        { id: "rdl", name: "Romanian Deadlift", sets: 3, rr: [5, 8], sw: 125, unit: "lbs" },
        { id: "hack-squat-a", name: "Hack Squat", sets: 3, rr: [5, 8], sw: 180, unit: "lbs" },
        { id: "seated-leg-curl", name: "Seated Leg Curl", sets: 3, rr: [5, 8], sw: 130, unit: "lbs" },
        { id: "standing-calf", name: "Standing Calf Raise", sets: 3, rr: [5, 8], sw: 290, unit: "lbs" },
      ]
    },
    thursday: {
      name: "Upper B — Hypertrophy", focus: "Hypertrophy",
      exercises: [
        { id: "smith-incline", name: "Smith Incline Press", sets: 3, rr: [10, 12], sw: 105, unit: "lbs" },
        { id: "overhand-cable-row", name: "Overhand Cable Row", sets: 3, rr: [10, 12], sw: 110, unit: "lbs" },
        { id: "lateral-raise", name: "Cable Lateral Raise", sets: 3, rr: [10, 12], sw: 12.5, unit: "lbs" },
        { id: "reverse-fly", name: "Reverse Fly", sets: 3, rr: [10, 12], sw: 25, unit: "lbs" },
        { id: "incline-db-curl", name: "Incline DB Curl", sets: 3, rr: [10, 12], sw: 15, unit: "lbs" },
        { id: "oh-tricep-ext", name: "OH Cable Rope Ext", sets: 3, rr: [10, 12], sw: 50, unit: "lbs" },
      ]
    },
    friday: {
      name: "Lower B — Hypertrophy", focus: "Hypertrophy",
      exercises: [
        { id: "hack-squat-b", name: "Hack Squat", sets: 3, rr: [10, 12], sw: 140, unit: "lbs" },
        { id: "walking-lunges", name: "Walking Lunges DB", sets: 3, rr: [10, 12], sw: 25, unit: "lbs/hand" },
        { id: "sldl", name: "Stiff-Leg Deadlift", sets: 3, rr: [10, 12], sw: 95, unit: "lbs" },
        { id: "leg-extension", name: "Leg Extension", sets: 3, rr: [10, 12], sw: 120, unit: "lbs" },
        { id: "hip-thrust", name: "Hip Thrust BB", sets: 3, rr: [10, 12], sw: 160, unit: "lbs" },
        { id: "seated-calf", name: "Seated Calf Raise", sets: 3, rr: [10, 12], sw: 90, unit: "lbs" },
      ]
    }
  }
};

// ── Supabase write (same logic as update.js) ──
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

// ── Tool execution ──
async function executeTool(name, args) {
  if (name === "get_program") {
    return { content: [{ type: "text", text: JSON.stringify(PROGRAM_SNAPSHOT, null, 2) }] };
  }

  if (name === "update_settings") {
    const { field, value, reason } = args;
    if (!SETTINGS_FIELDS.includes(field)) {
      return { content: [{ type: "text", text: `Error: invalid field "${field}". Valid: ${SETTINGS_FIELDS.join(", ")}` }], isError: true };
    }
    if (typeof value !== "number") {
      return { content: [{ type: "text", text: `Error: value must be a number` }], isError: true };
    }
    await pushChange({ type: "settings", field, value }, reason);
    return { content: [{ type: "text", text: `Done — ${field} updated to ${value}. Change will apply on next app load.` }] };
  }

  if (name === "update_exercise") {
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
    return { content: [{ type: "text", text: `Done — exercise ${action} applied. Change will appear on next app load.` }] };
  }

  return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
}

// ── JSON-RPC helpers ──
function jsonrpc(id, result) {
  return { jsonrpc: "2.0", id, result };
}
function jsonrpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// ── Main handler ──
export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "DELETE") return res.status(200).end(); // session termination
  if (req.method === "HEAD") {
    res.setHeader("MCP-Protocol-Version", "2025-06-18");
    return res.status(200).end();
  }
  if (req.method === "GET") {
    res.setHeader("Allow", "POST, HEAD, OPTIONS, DELETE");
    return res.status(405).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, HEAD, OPTIONS, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth — require UPDATE_TOKEN as bearer token
  const token = process.env.UPDATE_TOKEN;
  if (token) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${token}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const message = req.body;

    // Handle batch requests (array of messages)
    if (Array.isArray(message)) {
      const results = [];
      for (const msg of message) {
        const result = await handleMessage(msg, req, res);
        if (result) results.push(result);
      }
      if (results.length === 0) return res.status(202).end();
      return res.status(200).json(results.length === 1 ? results[0] : results);
    }

    const result = await handleMessage(message, req, res);
    if (!result) return res.status(202).end(); // notification
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json(jsonrpcError(null, -32603, err.message));
  }
}

async function handleMessage(message, req, res) {
  const { method, id, params = {} } = message;

  // Notifications (no id) — just acknowledge
  if (id === undefined || id === null) {
    return null;
  }

  switch (method) {
    case "initialize": {
      const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      res.setHeader("Mcp-Session-Id", sessionId);
      return jsonrpc(id, {
        protocolVersion: "2025-06-18",
        capabilities: {
          tools: { listChanged: false }
        },
        serverInfo: {
          name: "Health Hub",
          version: "1.0.0"
        },
        instructions: "Health & fitness tracker for a strength athlete doing body recomposition. Use get_program to see the current workout program and settings before making changes. Use update_settings to change nutrition/health targets. Use update_exercise to modify the workout program."
      });
    }

    case "tools/list":
      return jsonrpc(id, { tools: TOOLS });

    case "tools/call": {
      const { name, arguments: args = {} } = params;
      try {
        const result = await executeTool(name, args);
        return jsonrpc(id, result);
      } catch (err) {
        return jsonrpc(id, { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true });
      }
    }

    case "resources/list":
      return jsonrpc(id, { resources: [] });

    case "prompts/list":
      return jsonrpc(id, { prompts: [] });

    case "ping":
      return jsonrpc(id, {});

    default:
      return jsonrpcError(id, -32601, `Method not found: ${method}`);
  }
}
