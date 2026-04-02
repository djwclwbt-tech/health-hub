export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });
  try {
    const { input, image, context } = req.body;
    if (!input && !image) return res.status(400).json({ error: 'No input or image provided' });

    const systemPrompt = buildSystemPrompt(context);
    const content = buildMessageContent(input, image);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'API error' });
    const text = data.content?.[0]?.text || '';

    // Try to parse as JSON directly
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    } catch {
      // Try to extract JSON object from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.status(200).json(parsed);
        } catch {}
      }
    }
    return res.status(500).json({ error: 'Failed to parse nutrition estimate', raw: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function buildSystemPrompt(context) {
  let prompt = `You are a precise nutrition estimator for a strength athlete tracking body recomposition.

CRITICAL RULES:
1. BRANDED/PACKAGED PRODUCTS: When the user names a specific brand (e.g., "Fairlife Core Power Elite 42g", "Quest bar"), use EXACT nutrition facts from that product's label. Set confidence to "low" if you don't recognize the brand.
2. PORTIONS: Estimate on the HIGHER end of realistic. People underestimate. A restaurant chicken breast is 8-10oz, not 4oz.
3. HIDDEN CALORIES: Always account for cooking oils (1 tbsp = 120 cal), butter, sauces, dressings, marinades, cheese.
4. DEFAULT PORTIONS (adult male strength athlete): Meat 8oz raw (6oz cooked), Rice/pasta 1.5 cups cooked, Pizza slice ~300 cal cheese + 50-100 per topping, Burrito/bowl 800-1100 cal restaurant.
5. USDA REFERENCE per 100g: Chicken breast cooked 165cal/31gP, White rice cooked 130cal/2.7gP, 80/20 ground beef cooked 254cal/26gP, Salmon cooked 208cal/20gP, Egg 72cal/6gP, Olive oil 119cal/tbsp.
6. CROSS-CHECK: calories must ≈ (protein×4 + carbs×4 + fat×9). Fix if mismatched.
7. PHOTO ANALYSIS: If image provided, identify all visible food items. Use visual references: plate ~10in, fork ~7in. Estimate weights in grams. Note sauces, glazes, oils.
8. COOKING METHODS: Fried foods absorb 8-15% weight in oil. Grilled/baked lose ~25% weight.
9. HIDDEN CALORIE CHECKLIST: For every meal, consider: cooking oil/butter? sauce/dressing? cheese? cream/milk? sugar/honey? nuts/seeds? bread/wrap?

Return ONLY valid JSON:
{"description":"concise meal name","cal":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"components":[{"item":"item with portion","cal":number,"protein":number,"carbs":number,"fat":number}],"confidence":"high|medium|low","notes":"brief note if portion assumed"}`;

  if (context) {
    if (context.calories || context.protein) {
      prompt += `\n\nUser's daily targets: ${context.calories ? context.calories + ' cal' : ''}${context.calories && context.protein ? ', ' : ''}${context.protein ? context.protein + 'g protein' : ''}.`;
    }

    if (context.corrections && context.corrections.length > 0) {
      prompt += '\n\nPAST CORRECTIONS (calibrate to this user\'s actual portions and preferences):\n';
      prompt += context.corrections.map(c => `- ${c}`).join('\n');
    }

    if (context.recentMeals && context.recentMeals.length > 0) {
      prompt += '\n\nRECENT MEALS (for portion pattern context):\n';
      prompt += context.recentMeals.map(m => `- ${m}`).join('\n');
    }
  }

  return prompt;
}

function buildMessageContent(input, image) {
  const content = [];

  if (image && image.data && image.mediaType) {
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
  } else if (content.length > 0) {
    // Image only — prompt Claude to analyze it
    content.push({ type: 'text', text: 'Estimate the nutrition for this meal.' });
  }

  return content;
}
