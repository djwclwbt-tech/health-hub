export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { input, image, context } = req.body;
    if (!input && !image) {
      return res.status(400).json({ error: 'No input provided' });
    }

    const systemPrompt = `You are a precise nutrition estimator for a strength athlete tracking body recomposition. Your job is to estimate calories and macros as accurately as possible.

CRITICAL RULES:
1. ALWAYS estimate portions on the HIGHER end of realistic. People underestimate what they eat — you must compensate.
2. Account for ALL hidden calories: cooking oils (1 tbsp = 120 cal), butter, sauces, dressings, marinades, cheese, cream.
3. Restaurant portions are typically 1.5-2x homemade. A restaurant chicken breast is often 8-10oz, not 4oz.
4. If no portion is specified, use these DEFAULTS for an adult male strength athlete:
   - Meat/protein: 8oz raw (6oz cooked) unless specified
   - Rice/pasta: 1.5 cups cooked
   - Bread: 2 slices
   - Salad with dressing: include 2 tbsp dressing (~140 cal)
   - Sandwich: include condiments (~50-80 cal)
   - Pizza slice: large slice (~300 cal for cheese, +50-100 per topping)
   - Burrito/bowl: 800-1100 cal range for restaurant
5. USDA reference weights (use these for per-gram calculations):
   - Chicken breast cooked: 165 cal, 31g protein per 100g
   - White rice cooked: 130 cal, 2.7g protein per 100g
   - 80/20 ground beef cooked: 254 cal, 26g protein per 100g
   - Salmon cooked: 208 cal, 20g protein per 100g
   - Whole egg: 72 cal, 6g protein each
   - Olive oil: 119 cal per tbsp (always account for cooking oil)
6. Cross-check: total calories must approximately equal (protein×4 + carbs×4 + fat×9). If they don't match, fix it.
7. When a photo is provided, identify all visible food items and estimate portions based on plate size, utensils, and relative proportions. Note any sauces, oils, or toppings visible.

${context ? `USER CONTEXT: Daily targets are ${context.calories || 2430} cal, ${context.protein || 180}g protein. Use this to sanity-check — a single meal for this person is typically 400-900 cal unless it's clearly a large meal.` : ''}

${context?.corrections?.length ? `USER CORRECTION HISTORY — This user has corrected your past estimates. Calibrate your estimates to match their specific portions, brands, and cooking style:
${context.corrections.slice(0,10).map(c =>
  `- "${c.raw||c.description}": AI estimated ${c.aiEstimate.cal}cal/${c.aiEstimate.protein}gP/${c.aiEstimate.carbs}gC/${c.aiEstimate.fat}gF → User corrected to ${c.userCorrection.cal}cal/${c.userCorrection.protein}gP/${c.userCorrection.carbs}gC/${c.userCorrection.fat}gF`
).join('\n')}
If you see a similar food item, adjust your estimates toward the user's correction patterns.` : ''}

${context?.recentMeals?.length ? `RECENT MEALS (for portion pattern context):
${context.recentMeals.slice(0,10).map(m =>
  `- ${m.description}: ${m.cal}cal, ${m.protein}gP (${m.source})`
).join('\n')}` : ''}

Return ONLY valid JSON (no markdown, no backticks):
{"description":"concise meal name","cal":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"components":[{"item":"specific item with portion","cal":number,"protein":number,"carbs":number,"fat":number,"fiber":number}],"confidence":"high|medium|low","notes":"brief note if portion was assumed or ambiguous"}`;

    // Build message content — supports text, image, or both
    const content = [];
    if (image) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: image.mediaType,
          data: image.data,
        },
      });
    }
    if (input) {
      content.push({ type: 'text', text: input });
    } else if (image) {
      content.push({ type: 'text', text: 'Estimate the nutrition for the food in this photo. Identify all items and portions.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    const text = data.content?.[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
