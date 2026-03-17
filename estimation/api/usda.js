export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'USDA API key not configured' });

  try {
    const { query, barcode } = req.body;
    if (!query && !barcode) return res.status(400).json({ error: 'No query or barcode provided' });

    let url, body;
    if (barcode) {
      // Search by barcode (GTIN/UPC) in Branded Foods
      url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`;
      body = JSON.stringify({
        query: barcode,
        dataType: ['Branded'],
        pageSize: 3,
      });
    } else {
      // Search by name — prioritize Foundation and SR Legacy (whole foods)
      url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`;
      body = JSON.stringify({
        query,
        dataType: ['Foundation', 'SR Legacy'],
        pageSize: 8,
        sortBy: 'dataType.keyword',
        sortOrder: 'asc',
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.message || 'USDA API error' });

    // Nutrient IDs: Energy=1008, Protein=1003, Carbs=1005, Fat=1004, Fiber=1079
    const results = (data.foods || []).map(food => {
      const get = (id) => {
        const n = food.foodNutrients?.find(n => n.nutrientId === id);
        return n ? Math.round(n.value * 10) / 10 : 0;
      };
      return {
        fdcId: food.fdcId,
        name: food.description,
        brand: food.brandName || food.brandOwner || null,
        dataType: food.dataType,
        // Per 100g values
        cal: get(1008),
        protein: get(1003),
        carbs: get(1005),
        fat: get(1004),
        fiber: get(1079),
        servingSize: food.servingSize || 100,
        servingUnit: food.servingSizeUnit || 'g',
        source: 'usda',
      };
    }).filter(r => r.cal > 0 || r.protein > 0);

    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
