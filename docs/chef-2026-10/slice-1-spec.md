# Chef slice 1: tonight's dinner

!!! warning "Superseded"
    Not built. On 2026-11-09 Dylan chose a T3 project instead: `~/.t3/projects/chef/`, output to Discord #coach. Its recipe, thaw, food-safety and asking rules came from this spec.

Status: spec v2, 2026-11-09. Revised after a second-model review (findings folded in below). Not built. Needs Dylan's yes on the plain-words plan first, then step 0.

## What slice 1 does

Dylan opens a chat with the Chef on his phone and asks "what's for dinner?" The Chef answers in the chat with one full teaching recipe for tonight. The recipe fits what is in the house, what is left of his day's macros, Danielle's heart rules, and the time they eat. It comes with a timeline that counts back from dinner. If a dinner in the next 3 days needs something from the freezer, the Chef says when to move it, and a push reaches his phone that evening if it has not moved.

Out of scope: shopping lists, trend finds, weekly plans, cost, in-app cook mode, the Sunday photo reset, recipe rating as a loop (raw feedback is saved only).

## Step 0: prove the connector before any build

Unverified: how Claude.ai scopes a second remote MCP connector. Connectors are likely account-wide, so both the Coach's and the Chef's tools and server `instructions` may load in every chat, mixing the two personas.

Test first, with a stub `api/chef/mcp.js` (one `ping` tool, its own `instructions`):

1. Add it as a connector in Claude.ai. Open it from the iPhone.
2. Check in a "Chef" project and in a plain chat: which tools load, whether the server `instructions` arrive, whether a Coach chat can see Chef tools.
3. Decide from the result. If personas mix, the Chef's tool descriptions and `instructions` must name the Chef explicitly, and each project's text says which tools to use. Project text is a short pointer, never a copy of the persona (copies drift; the Coach already fixed that).

Code note: mcp-handler builds the path as `basePath + "/mcp"`, so the Chef lives at `api/chef/mcp.js` with `basePath: "/api/chef"`.

## Where the Chef lives

A folder inside health-hub, not a new repo.

- `lib/chef/*.mjs`: persona (`chefInstructions()`), rules, and pure functions (`macrosLeft`, `thawPlan`, `useBy`). It imports the engine read-only. The engine never imports the Chef.
- `api/chef/mcp.js`: the Chef's MCP server. Same auth as the Coach (`MCP_TOKEN`, Bearer or `?key=`), same `lib/http.mjs` plumbing.

Why not a new repo: the Chef needs the engine's day targets, Cronometer data and push, which live here. It is still its own agent: own persona, tools, connector and project.

## Data (no new tables)

All Chef stores are `VIRTUAL` rows in the `program` table, each with its own prefix so list reads do not overlap. None go into `LOAD_PLAN`, so the app never loads them.

| Store | Row id | What it holds |
|---|---|---|
| `chef_inv` | `inv:<batchId>` | One batch, not one food: one purchase, one freeze, or one cooked batch. Name, food kind, place (fridge, freezer, pantry, counter), `exact`, amount in grams for exact items (or count plus `gPerUnit`), presence only for the rest, bought, frozen on, use by, last confirmed, source |
| `chef_meals` | `meal:<date>` | One dinner: name, status (planned, cooking, cooked, skipped, moved), dinner time, the full recipe text as given, both plates in grams, Dylan's calories, protein, carbs and fat, thaw step (`batchId`, method, `moveBy` date and time, done), amounts used, feedback |
| `chef_kitchen` | `kitchen:main` | Appliances, pans, tools, seasonings. "Unknown" where unknown |
| `chef_people` | `people:<name>` | Goals, likes, limits, standing defaults (dinner time, eats with Dylan) |
| `chef_asks` | `ask:<id>` | One open question per row: the question, why it matters, blocking or waiting, asked on, answer |
| `chef_log` | `chef_log:<time>` | One line per Chef write (what, source). Kept out of `program_updates`, which feeds the Coach's change list and the app's launch toasts |

Dates are Austin local (`td()` in the engine). A meal moved to another day sets status `moved` with the new date, and its thaw step moves with it.

## How the Chef reads the Coach's numbers

The Chef server runs `loadAll()` and calls the engine directly.

- **Day target:** `getDayCalTarget`, `getDayProTarget` (training, Wednesday fast, weekend, travel). Plus his 70 to 85 g fat floor.
- **Eaten so far:** `nut[today]` from Cronometer.
- **Freshness:** Cronometer syncs at 2 AM, noon, 7 PM and 9 PM Central standard time (an hour later in daylight time; crons are UTC). At 5 PM the last sync is noon, and nothing records when it ran. Fix: move the sync body from `api/cronometer-sync.js` into `lib/cronometer.mjs`, have it write `cronosync:last` with the time, and let `get_tonight` run a sync when the last one is over 60 minutes old (one login, a few seconds). If it fails, the Chef says "as of noon" and asks what he ate since.
- **Phase and trend:** `PROG` block, end and goal; `getTrend()` rate when reliable; `paceVerdict`.
- **Context:** today's lift, recovery, travel day.

The Coach reads the Chef: `get_snapshot` gains a `chef` field from its own `select` of the last 7 `meal:` rows (name, status, Dylan's plate macros, feedback). That is the only Coach change.

## Tools

| Tool | Does |
|---|---|
| `get_tonight` | One call: macros left with sync time, day type, lift, recovery, people defaults, inventory with use-by and "probably" flags, kitchen, open asks, meal rows for today through 3 days out |
| `update_inventory` | Add, change, move, remove or confirm one or many batches. Each needs a source. Moving freezer to fridge resets use-by (below) |
| `plan_meal` | Save a `meal:<date>` row up to 3 days ahead, with the thaw step |
| `cook_meal` | Mark cooked with the amounts actually used, subtract them from exact batches, add leftovers as a cooked batch |
| `log_feedback` | Perfect, Dry or Underdone, plus a note |
| `ask` / `answer` | Add or settle one `ask:` row |
| `update_kitchen` | Change a kitchen fact |

Cut from slice 1: a separate `get_inventory` (covered by `get_tonight`), editing people from tools beyond standing defaults.

## Getting food in: seed and grocery trips

- **Seed** (`scripts/chef-seed.mjs`): run with Dylan in the chat. It reads `kitchen.md` and `profile.md`, then the Chef confirms the perishables and proteins with him before writing (Nov 9 facts go stale fast: the fresh thighs were due Nov 10). Every "check" item becomes an `ask:` row, never a fact. After the seed, rows are the truth and the `.md` files are history.
- **Grocery trip:** Dylan pastes the Sam's app order screens or a receipt photo into the chat. The Chef reads it, shows the batch list, and writes it only after he says yes. Paper receipt codes are never trusted alone.

## The recipe

Written by the model from `chefInstructions()`. No recipe library in slice 1. The full text is saved on the meal row.

Every recipe has, in this order:

1. The pick in one line, two fallbacks in one line each (one quick, one from the freezer).
2. Timeline counted back from dinner: thaw (days before), marinate, preheat, each cook step, rest, plate.
3. Ingredients in grams for the whole pot, from inventory only.
4. Steps: pan or appliance, heat or temperature, time, what done looks and feels like, internal temperature, one "why" line per step.
5. Plates in grams for both. Dylan's with calories, protein, carbs, fat, fitted to what is left of his day. Danielle's with calories, protein and saturated fat.
6. The Cronometer line for Dylan's plate.
7. The next thaw line, if any.
8. After dinner: ask Perfect, Dry or Underdone.

The Egg White Grill page is the minimum detail level.

## The thaw reminder

- `thawPlan` sets `moveBy` back from the dinner: fridge thaw for a flat 1.5 lb bag about 24 hours, for the whole 5.5 lb block about 48 hours. Cold water is the backup: sealed bag, water changed every 30 minutes, about 1 hour for a flat bag, cook right after.
- The Chef says the thaw line in chat when it plans the meal.
- Watchdog `nudge` job (7:30 PM Central standard time): before the food check, which returns early when food is logged, look for any meal row whose thaw step is due by tomorrow and not done. If found, one push with its own tag (`hh-thaw`): "Move the chicken thighs to the fridge tonight." The text carries the whole action. Tapping opens Health Hub, nothing more: a push cannot open a Claude chat (`sw.js` focuses the app or opens its own URL).
- Dylan marks it done by telling the Chef, which moves the batch and resets its use-by.
- No meal row, no push. Slice 1 never nags to plan. No new cron.

## Use-by rules (food safety)

- Fridge-thawed raw poultry or ground meat: 1 to 2 days. Cold-water thawed: cook the same day.
- Cooked leftovers and batches: 3 to 4 days in the fridge.
- A planned meal skipped after its thaw gets a "cook or freeze it by" line the next time Dylan opens the Chef.
- Doneness: chicken 165°F safe; thighs are best at 175 to 185°F. Ground meat 160°F. Fish 145°F.
- Without a thermometer, chicken and ground meat recipes give times and visual checks, say they are less sure, and recommend the $15 thermometer once. It is not a permanent fallback.

## Asking without nagging

The rule stays: the Chef never fills a gap with a guess. A default Dylan confirmed once is not a guess.

- **Asked once, then standing defaults:** usual dinner time, whether Danielle usually eats with him, Danielle's allergies and medicines (Lite Salt is potassium chloride and conflicts with some blood pressure and kidney medicines), whether he has a meat thermometer.
- **Folded into the pick, not a separate round:** "Planning the thighs and potatoes for 6:30. Thighs still in the fridge?" Only asked when the pick depends on a batch not confirmed in 7 days, marked "check", or needing a thaw.
- **Stale sync:** "Cronometer shows 1,050 calories as of noon. Anything since?" only when the live sync failed.
- **Waiting questions** (air fryer model, spices, meatball brand, Goodles count, La Costeña item) go into `ask:` rows and come up one at a time when relevant. Until then, recipes use only known settings (plain Air Fry and Roast at given temperatures).
- At most two questions per message.

## Danielle's numbers

- Saturated fat: under 6% of calories (American Heart Association), about 9 g a day on 1,350 calories. Counted per day, not per dinner, so salmon (about 4.5 g in a 150 g raw farmed portion) stays in. Fatty fish is what the AHA recommends.
- Protein about 105 g a day; her plate shows calories and protein.
- Mild heat. Chili oil at the table.
- A doctor's target, if one is set, wins.

## Tests

- `test/chef.test.mjs`: `macrosLeft` (fresh, stale, Wednesday, travel, fat floor), `thawPlan` (flat bag, two-day block, water), `useBy` after a thaw, the nudge thaw check runs on a logged-food day, `cook_meal` subtract and leftover batch, VIRTUAL prefixes do not overlap.
- `test/api.test.mjs`: `api/chef/mcp.js` auth and each tool, network mocked.
- Eval: one synthetic fixture (no real figures) graded for recipe shape: timeline, grams, done signals, both plates, nothing outside inventory, asks instead of guessing on an unconfirmed batch.

## Build order

0. Connector test (above). Stop if Claude.ai cannot keep the two agents apart well enough.
1. `lib/chef` pure functions and tests. VIRTUAL stores.
2. `lib/cronometer.mjs` move, `cronosync:last`.
3. `api/chef/mcp.js` tools.
4. Seed with Dylan in chat.
5. Nudge thaw check, Coach `chef` field.
6. First real dinner. Fix what it shows.

## Decided in this spec (Dylan can overrule)

- Its own connector and Claude.ai project, pending step 0.
- No start-time push ("start the potatoes now"). Thaw push only.
- Dylan logs dinner in Cronometer from the Chef's line. Cronometer has no write access.
