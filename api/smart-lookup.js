export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const usdaKey = process.env.USDA_API_KEY;

  try {
    const { input, context } = req.body;
    if (!input) return res.status(400).json({ error: 'No input provided' });

    // Step 1: Use Claude to parse the input into structured items
    let parsed;
    if (anthropicKey) {
      try {
        const parseResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 300,
            system: 'Parse the food description into structured items. Return ONLY valid JSON, no markdown.\n{"items":[{"name":"food name for USDA search","quantity":number,"unit":"g|oz|cups|each|serving","cooking":"raw|grilled|baked|fried|steamed|boiled|none"}],"isRestaurant":false}\nExamples:\n"8oz grilled chicken breast" → {"items":[{"name":"chicken breast","quantity":227,"unit":"g","cooking":"grilled"}],"isRestaurant":false}\n"Chipotle burrito bowl" → {"items":[{"name":"chipotle burrito bowl","quantity":1,"unit":"serving","cooking":"none"}],"isRestaurant":true}\n"2 eggs and toast" → {"items":[{"name":"egg whole","quantity":2,"unit":"each","cooking":"none"},{"name":"bread white toast","quantity":2,"unit":"each","cooking":"none"}],"isRestaurant":false}',
            messages: [{ role: 'user', content: input }],
          }),
        });
        const parseData = await parseResponse.json();
        const parseText = parseData.content?.[0]?.text || '{}';
        parsed = JSON.parse(parseText.replace(/```json|```/g, '').trim());
      } catch {
        parsed = { items: [{ name: input, quantity: 1, unit: 'serving', cooking: 'none' }], isRestaurant: false };
      }
    } else {
      parsed = { items: [{ name: input, quantity: 1, unit: 'serving', cooking: 'none' }], isRestaurant: false };
    }

    const items = parsed.items || [{ name: input, quantity: 1, unit: 'serving', cooking: 'none' }];
    const components = [];
    let method = 'ai'; // default fallback
    let allUsda = true;

    // Step 2: For each item, try USDA first
    for (const item of items) {
      let found = false;

      // Try USDA
      if (usdaKey) {
        try {
          const usdaRes = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: item.name,
              dataType: ['Foundation', 'SR Legacy'],
              pageSize: 3,
            }),
          });
          const usdaData = await usdaRes.json();
          const foods = usdaData.foods || [];

          if (foods.length > 0) {
            const food = foods[0];
            const get = (id) => {
              const n = food.foodNutrients?.find(n => n.nutrientId === id);
              return n ? n.value : 0;
            };

            // Per 100g values from USDA
            const per100g = {
              cal: get(1008), protein: get(1003),
              carbs: get(1005), fat: get(1004), fiber: get(1079),
            };

            // Convert quantity to grams
            let grams = 100; // default
            if (item.unit === 'g') grams = item.quantity;
            else if (item.unit === 'oz') grams = item.quantity * 28.35;
            else if (item.unit === 'cups') grams = item.quantity * 240;
            else if (item.unit === 'each') {
              // Common "each" weights
              const eachWeights = {
                egg: 50, banana: 118, apple: 182, orange: 131,
                'bread': 30, 'toast': 30, 'slice': 30, 'tortilla': 49,
              };
              const key = Object.keys(eachWeights).find(k => item.name.toLowerCase().includes(k));
              grams = (key ? eachWeights[key] : (food.servingSize || 100)) * item.quantity;
            } else if (item.unit === 'serving') {
              grams = (food.servingSize || 100) * item.quantity;
            }

            // Cooking method adjustments
            let cookingMultiplier = 1;
            if (item.cooking === 'grilled' || item.cooking === 'baked') {
              // Cooked meat loses ~25% water weight, so calories per gram increase
              // But if the user specified cooked weight, no adjustment needed
              // USDA data for "chicken breast" is raw; for "chicken breast, cooked" it's cooked
              const isRawData = !food.description?.toLowerCase().includes('cooked');
              if (isRawData) cookingMultiplier = 1.33; // 25% water loss = 1/0.75
            } else if (item.cooking === 'fried') {
              cookingMultiplier = 1.15; // absorbs ~15% weight in oil
            }

            const mult = (grams / 100) * cookingMultiplier;
            components.push({
              item: `${item.name} (${Math.round(grams)}g${item.cooking !== 'none' ? ', ' + item.cooking : ''})`,
              cal: Math.round(per100g.cal * mult),
              protein: Math.round(per100g.protein * mult),
              carbs: Math.round(per100g.carbs * mult),
              fat: Math.round(per100g.fat * mult),
              fiber: Math.round(per100g.fiber * mult),
              source: 'usda',
              usdaName: food.description,
            });
            found = true;
          }
        } catch {}
      }

      // Step 3: Try Open Food Facts if no USDA match
      if (!found) {
        allUsda = false;
        try {
          const offRes = await fetch(
            `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(item.name)}&json=1&page_size=3&fields=product_name,nutriments,serving_size,serving_quantity`
          );
          const offData = await offRes.json();
          const products = (offData.products || []).filter(p => p.product_name);

          if (products.length > 0) {
            const p = products[0];
            const n = p.nutriments || {};
            const suffix = '_100g';
            const per100g = {
              cal: n[`energy-kcal${suffix}`] ?? (n[`energy${suffix}`] ? n[`energy${suffix}`] / 4.184 : 0),
              protein: n[`proteins${suffix}`] || 0,
              carbs: n[`carbohydrates${suffix}`] || 0,
              fat: n[`fat${suffix}`] || 0,
              fiber: n[`fiber${suffix}`] || 0,
            };

            let grams = 100;
            if (item.unit === 'g') grams = item.quantity;
            else if (item.unit === 'oz') grams = item.quantity * 28.35;
            else if (item.unit === 'serving') grams = (p.serving_quantity || 100) * item.quantity;
            else grams = (p.serving_quantity || 100) * item.quantity;

            const mult = grams / 100;
            components.push({
              item: `${item.name} (${Math.round(grams)}g)`,
              cal: Math.round(per100g.cal * mult),
              protein: Math.round(per100g.protein * mult),
              carbs: Math.round(per100g.carbs * mult),
              fat: Math.round(per100g.fat * mult),
              fiber: Math.round(per100g.fiber * mult),
              source: 'off',
            });
            found = true;
          }
        } catch {}
      }

      // Step 4: If nothing found, add as unknown for AI fallback
      if (!found) {
        allUsda = false;
        components.push({
          item: item.name,
          cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
          source: 'unknown',
        });
      }
    }

    // If any component is unknown, fall back to full AI estimation
    const hasUnknown = components.some(c => c.source === 'unknown');

    if (hasUnknown) {
      // Fall back to AI for the whole meal
      if (anthropicKey) {
        try {
          // Forward to estimate endpoint logic
          const estimateRes = await fetch(`https://${req.headers.host}/api/estimate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input, context }),
          });
          const estimateData = await estimateRes.json();
          if (!estimateRes.ok) throw new Error(estimateData.error);
          return res.status(200).json({ ...estimateData, method: 'ai' });
        } catch {
          return res.status(200).json({
            description: input, cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
            method: 'ai', confidence: 'low', components: [],
            notes: 'Could not estimate. Please enter manually.',
          });
        }
      }
      return res.status(200).json({
        description: input, cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
        method: 'manual', confidence: 'low', components: [],
        notes: 'No API keys configured for estimation.',
      });
    }

    // Sum up all components
    const totals = components.reduce((acc, c) => ({
      cal: acc.cal + c.cal, protein: acc.protein + c.protein,
      carbs: acc.carbs + c.carbs, fat: acc.fat + c.fat, fiber: acc.fiber + c.fiber,
    }), { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    // Macro math cross-check
    const computedCal = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
    if (totals.cal > 0 && computedCal > 0) {
      const ratio = totals.cal / computedCal;
      if (ratio < 0.85 || ratio > 1.15) {
        totals.calOriginal = totals.cal;
        totals.cal = computedCal;
        totals.calAdjusted = true;
      }
    }

    method = allUsda ? 'usda' : 'off';

    return res.status(200).json({
      description: input,
      ...totals,
      method,
      confidence: allUsda ? 'high' : 'medium',
      components: components.map(c => ({
        item: c.item, cal: c.cal, protein: c.protein,
        carbs: c.carbs, fat: c.fat, fiber: c.fiber,
      })),
      notes: allUsda ? 'USDA verified data' : 'Mixed database sources',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
