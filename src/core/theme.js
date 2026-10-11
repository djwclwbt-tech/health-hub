// One family for words and numbers. FD is kept as a name so older call sites
// still compile; it no longer means a condensed display face.
const FD="'Libre Franklin',-apple-system,sans-serif";
const C={bg:"var(--bg)",cd:"var(--surface)",bd:"var(--line)",bl:"var(--line)",
  p:"var(--accent)",pl:"var(--accent-soft)",g:"var(--good)",gl:"var(--good-soft)",r:"var(--danger)",rl:"var(--danger-soft)",
  v:"var(--accent)",vl:"var(--accent-soft)",
  t:"var(--ink)",t2:"var(--ink-2)",t3:"var(--muted)",t4:"var(--faint)",oa:"var(--on-accent)",scrim:"var(--scrim)",
  sh:"var(--shadow)",sh2:"var(--shadow-2)"};

const APP_VERSION=typeof __BUILD__!=="undefined"?__BUILD__:"dev";

export { FD, C, APP_VERSION };
