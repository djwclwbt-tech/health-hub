// Synthetic athletes for the scorers. Numbers are invented (seeded), never real,
// so the fixtures can live in git. Each scenario is built relative to `today`
// so the app's own clock (td()) lines up with the data.
import * as E from '../lib/engine.mjs';

const rng = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const day = (t, n) => { const d = new Date(t + 'T12:00:00'); d.setDate(d.getDate() + n); return E.lds(d); };

// What each scenario looks like, and what a good coach must (and must not) do with it.
export const SCENARIOS = {
  'on-track': {
    story: 'Three weeks in, losing about 1.1 lb a week, food logged most days, recovery normal, lifts holding.',
    weightSlope: -1.1, foodDays: 1, recovery: [70, 88], recoveryFeedDaysDown: 0, strengthDrift: 0,
    expect: { must: ['hold calories and protein where they are', 'name the rate as on pace'], mustNot: ['cut calories', 'add cardio', 'change the program'] },
  },
  'stalled-sparse': {
    story: 'Weight flat for three weeks, food logged on about a third of days, the recovery feed has sent nothing for a month.',
    weightSlope: 0, foodDays: 0.33, recovery: [70, 85], recoveryFeedDaysDown: 30, strengthDrift: 0,
    expect: { must: ['say food is logged on too few days to judge calories', 'make logging food daily the first lever', 'say recovery data is missing'], mustNot: ['cut calories', 'quote a TDEE or adherence number as reliable', 'interpret recovery trends'] },
  },
  'overreaching': {
    story: 'Losing 1.4 lb a week, recovery under 45 for the last four days, top sets slipping.',
    weightSlope: -1.4, foodDays: 0.9, recovery: [30, 44], recentLowRecovery: 4, recoveryFeedDaysDown: 0, strengthDrift: -0.04,
    expect: { must: ['reduce training stress this week (fewer accessory sets or a mobility day)', 'protect sleep'], mustNot: ['cut calories', 'add volume or cardio'] },
  },
  'too-fast': {
    story: 'Losing 2.4 lb a week, strength dropping on anchor lifts, protein under target.',
    weightSlope: -2.4, foodDays: 0.95, recovery: [60, 75], recoveryFeedDaysDown: 0, strengthDrift: -0.06, proteinShort: 40,
    expect: { must: ['slow the rate (more calories, or name the cause)', 'raise protein to target'], mustNot: ['cut calories further', 'add cardio'] },
  },
};

export const scenario = (name = 'on-track', today = E.td(), { days = 21, seed = 7 } = {}) => {
  const s = SCENARIOS[name]; if (!s) throw new Error(`unknown scenario ${name}`);
  const r = rng(seed); const d = E.bl();
  d.settings = { ...E.DEFAULTS, calories: 2000, trainingCal: 2000, weekendCal: 2000, sleep: 8 };
  d.programVersion = E.PROG.version;
  const start = 186;
  for (let i = days; i >= 0; i--) {
    const k = day(today, -i); const wd = E.dw(k); const n = days - i;
    if (i > 0 || r() < 0.7) if (r() < 0.85) d.wt[k] = +(start + s.weightSlope * n / 7 + (r() - 0.5) * 2.2).toFixed(1);
    if (i > 0 && wd !== 'wednesday' && r() < s.foodDays) {
      const target = E.getDayCalTarget(k, d.settings, d.travelDays, d.socialWeekend) || 2000;
      const cal = Math.round(target * (0.92 + r() * 0.16)); const protein = Math.round(200 - (s.proteinShort || 0) + (r() - 0.5) * 24);
      d.nut[k] = E.sumMeals([
        { description: 'Greek yogurt, berries', cal: Math.round(cal * 0.25), protein: Math.round(protein * 0.3), carbs: 40, fat: 8, fiber: 6, mealType: 'Breakfast', source: 'cronometer' },
        { description: 'Chicken rice bowl', cal: Math.round(cal * 0.4), protein: Math.round(protein * 0.4), carbs: 80, fat: 18, fiber: 8, mealType: 'Lunch', source: 'cronometer' },
        { description: 'Salmon, potatoes, greens', cal: cal - Math.round(cal * 0.25) - Math.round(cal * 0.4), protein: protein - Math.round(protein * 0.3) - Math.round(protein * 0.4), carbs: 60, fat: 22, fiber: 9, mealType: 'Dinner', source: 'cronometer' },
      ]);
    }
    if (i >= s.recoveryFeedDaysDown && i > 0) {
      const low = s.recentLowRecovery && i <= s.recentLowRecovery;
      const [a, b] = low ? s.recovery : [Math.max(s.recovery[0], 62), Math.max(s.recovery[1], 80)];
      d.rec[k] = { recoveryScore: Math.round(a + r() * (b - a)), hrv: Math.round(55 + r() * 25), rhr: Math.round(42 + r() * 6), sleepHours: +(low ? 5.5 + r() : 6.8 + r() * 1.4).toFixed(2), source: 'oura' };
    }
    if (i > 0) d.steps[k] = Math.round(11000 + r() * 6000);
    const plan = d.program[wd];
    if (plan && i > 0 && r() < 0.92) {
      d.wk[k] = { day: wd, dur: 38 + Math.round(r() * 15), exercises: plan.exercises.map(ex => {
        const w = ex.sw ? Math.round(ex.sw * (1 + s.strengthDrift * n / 7) / 5) * 5 : 0;
        return { id: ex.id, slot: ex, progKey: E.progKey(ex, ex), wu: [], sets: Array.from({ length: ex.sets }, (_, j) => ({ done: true, reps: ex.rr[1] - (j > 0 && s.strengthDrift < 0 ? 1 : 0), weight: w, rir: 2, at: 0 })) };
      }) };
    }
  }
  return d;
};
