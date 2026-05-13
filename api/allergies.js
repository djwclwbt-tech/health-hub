const SOURCE_URLS = {
  pollen: 'https://austinpollen.com/pollens.html',
  mold: 'https://austinpollen.com/moldpage.html',
};

const decode = (text = '') => text
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  .replace(/\\n/g, '\n')
  .replace(/\\'/g, "'")
  .replace(/\\\\/g, '\\')
  .trim();

const parseTooltip = (name, tooltip = '') => {
  const clean = decode(tooltip).replace(/\r/g, '');
  const levelMatch = clean.match(/\n\n([A-Za-z ]+)\s*~\s*([^\n]+)/);
  const trendMatch = clean.match(/Trending\s+([^\n]+)/i);
  const sourceLines = [...clean.matchAll(/^-([^\n]+)$/gm)].map(m => m[1].trim());
  return {
    name,
    level: levelMatch?.[1]?.trim() || null,
    count: levelMatch?.[2]?.trim() || null,
    trend: trendMatch?.[1]?.trim() || null,
    sources: sourceLines,
    detail: clean,
  };
};

const parseAustinPollenPage = (html = '') => {
  const rows = [];
  const rowRe = /\[\s*'([^']+)'\s*,\s*([0-9.]+)\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'([^']*)'/g;
  let match;
  while ((match = rowRe.exec(html))) {
    const name = decode(match[1]);
    if (name === 'Factor') continue;
    rows.push({
      ...parseTooltip(name, match[3]),
      scale: Number(match[2]),
      sourceCount: Number((decode(match[4]).match(/\((\d+)\)/) || [])[1]) || null,
    });
  }

  // Mold is published as a dated trend chart instead of the category bar table above.
  const moldRows = [];
  const moldRe = /\[new Date\([^)]+\)\s*,\s*([0-9.]+)\s*,\s*true\s*,\s*(?:null|'[^']*')\s*,\s*'((?:\\'|[^'])*)'/g;
  while ((match = moldRe.exec(html))) {
    const parsed = parseTooltip('Molds', match[2]);
    if (parsed.level || parsed.count) moldRows.push({ ...parsed, scale: Number(match[1]), sourceCount: parsed.sources.length || null });
  }
  if (moldRows.length) rows.push(moldRows.find(r => r.trend) || moldRows[moldRows.length - 1]);

  return rows;
};

const fetchRows = async (kind) => {
  const response = await fetch(SOURCE_URLS[kind], {
    headers: { 'User-Agent': 'Health Hub allergy summary (https://health-hub.vercel.app)' },
  });
  if (!response.ok) throw new Error(`AustinPollen ${kind} fetch failed: ${response.status}`);
  return parseAustinPollenPage(await response.text());
};

const severityRank = (level) => ({ low: 1, moderate: 2, high: 3, very: 4 }[(level || '').toLowerCase().split(/\s+/)[0]] || 0);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const [pollen, mold] = await Promise.all([fetchRows('pollen'), fetchRows('mold')]);
    const items = [...pollen, ...mold]
      .filter(item => item.level || item.count)
      .sort((a, b) => (severityRank(b.level) - severityRank(a.level)) || ((b.scale || 0) - (a.scale || 0)));
    return res.status(200).json({
      source: 'AustinPollen.com',
      sourceUrl: 'https://austinpollen.com/',
      fetchedAt: new Date().toISOString(),
      summary: items.slice(0, 5),
      pollen,
      mold,
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
