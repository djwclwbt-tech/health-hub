const FD="'Barlow Condensed','Barlow',sans-serif";
const C={bg:"var(--bg)",cd:"var(--surface)",bd:"var(--line)",bl:"var(--line)",
  p:"var(--accent)",pl:"var(--accent-soft)",g:"var(--good)",gl:"var(--good-soft)",r:"var(--danger)",rl:"var(--danger-soft)",
  v:"var(--accent)",vl:"var(--accent-soft)",
  t:"var(--ink)",t2:"var(--ink-2)",t3:"var(--muted)",oa:"var(--on-accent)",scrim:"var(--scrim)",
  sh:"var(--shadow)",sh2:"var(--shadow-2)"};

const APP_VERSION=typeof __BUILD__!=="undefined"?__BUILD__:"dev";

export { FD, C, APP_VERSION };
