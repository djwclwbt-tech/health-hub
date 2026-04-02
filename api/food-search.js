export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, barcode } = req.body || {};
    if (!query && !barcode) {
      return res.status(400).json({ error: 'Provide query or barcode' });
    }

    const usdaKey = process.env.USDA_API_KEY;

    if (barcode) {
      const results = await searchByBarcode(barcode, usdaKey);
      return res.status(200).json({ results });
    }

    // Text search: run OFF and USDA in parallel
    const promises = [searchOFF(query)];
    if (usdaKey) promises.push(searchUSDA(query, usdaKey));
    const settled = await Promise.allSettled(promises);

    const offResults = settled[0].status === 'fulfilled' ? settled[0].value : [];
    const usdaResults = settled.length > 1 && settled[1].status === 'fulfilled' ? settled[1].value : [];

    const merged = deduplicateResults([...offResults, ...usdaResults]);
    return res.status(200).json({ results: merged });
  } catch (err) {
    console.error('food-search error:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
}

// --- Open Food Facts ---

async function searchOFF(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10&fields=product_name,brands,nutriments,serving_size,code`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.products || []).filter(p => p.product_name).map(normalizeOFF);
}

async function lookupOFFBarcode(barcode) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,nutriments,serving_size,code`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data.status !== 1 || !data.product?.product_name) return null;
  return normalizeOFF(data.product);
}

function normalizeOFF(p) {
  const n = p.nutriments || {};
  const per100g = {
    cal: round(n['energy-kcal_100g']),
    protein: round(n.proteins_100g),
    carbs: round(n.carbohydrates_100g),
    fat: round(n.fat_100g),
    fiber: round(n.fiber_100g),
  };

  const hasServing = n['energy-kcal_serving'] != null;
  const perServing = hasServing ? {
    cal: round(n['energy-kcal_serving']),
    protein: round(n.proteins_serving),
    carbs: round(n.carbohydrates_serving),
    fat: round(n.fat_serving),
    fiber: round(n.fiber_serving),
  } : null;

  return {
    name: p.product_name,
    brand: p.brands || null,
    barcode: p.code || null,
    source: 'off',
    per100g,
    servingSize: p.serving_size || '100g',
    perServing,
  };
}

// --- USDA FoodData Central ---

async function searchUSDA(query, apiKey) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, dataType: ['Foundation', 'SR Legacy'], pageSize: 5 }),
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.foods || []).map(normalizeUSDA);
}

function normalizeUSDA(food) {
  const nutrients = {};
  for (const n of food.foodNutrients || []) {
    nutrients[n.nutrientId] = n.value;
  }
  return {
    name: food.description || 'Unknown',
    brand: food.brandName || food.brandOwner || null,
    barcode: food.gtinUpc || null,
    source: 'usda',
    per100g: {
      cal: round(nutrients[1008]),
      protein: round(nutrients[1003]),
      carbs: round(nutrients[1005]),
      fat: round(nutrients[1004]),
      fiber: round(nutrients[1079]),
    },
    servingSize: food.servingSize ? `${food.servingSize}${food.servingSizeUnit || 'g'}` : '100g',
    perServing: null,
  };
}

// --- Barcode flow ---

async function searchByBarcode(barcode, usdaKey) {
  const offResult = await lookupOFFBarcode(barcode);
  if (offResult) return [offResult];

  // Fallback to USDA text search with barcode if available
  if (usdaKey) {
    const usdaResults = await searchUSDA(barcode, usdaKey);
    if (usdaResults.length) return usdaResults;
  }

  return [];
}

// --- Helpers ---

function round(val) {
  if (val == null || isNaN(val)) return 0;
  return Math.round(val * 10) / 10;
}

function deduplicateResults(results) {
  const seen = new Set();
  return results.filter(r => {
    const key = normalizeName(r.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
}
