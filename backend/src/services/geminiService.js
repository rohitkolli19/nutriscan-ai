const axios = require('axios');
const { logger } = require('../utils/logger');

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Extract JSON from Gemini response text.
 * Gemini 2.5-flash wraps JSON in ```json ... ``` markdown blocks.
 */
const extractJSON = (text) => {
  // Strip markdown code fences first
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Find first { and last } to extract JSON object
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  const jsonStr = stripped.slice(start, end + 1);
  return JSON.parse(jsonStr);
};

/**
 * Analyze food image using Google Gemini Vision API
 * Returns food classification, portion estimate, nutrition, and toxicity score
 */
const analyzeFoodImage = async (base64Image, mimeType = 'image/jpeg') => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('Google AI API key not configured');

  const prompt = `You are a nutritionist AI. Analyze the food in this image and respond with ONLY a JSON object (no markdown, no explanation).

JSON schema:
{"detected":bool,"confidence":float,"foods":[{"name":str,"category":str,"portion_g":num,"portion_description":str,"calories":num,"protein_g":num,"carbs_g":num,"fat_g":num,"fiber_g":num,"sugar_g":num,"sodium_mg":num,"glycemic_index":num,"is_processed":bool,"additives":[],"inflammatory_score":num}],"total_nutrition":{"calories":num,"protein_g":num,"carbs_g":num,"fat_g":num,"fiber_g":num,"sugar_g":num,"sodium_mg":num},"toxicity_score":num,"toxicity_reasons":[],"health_benefits":[],"health_warnings":[],"meal_type":str,"cuisine":str,"is_vegetarian":bool,"is_vegan":bool,"is_gluten_free":bool,"allergens":[],"ai_recommendation":str}

Rules: toxicity_score 1-10 (1=healthy,10=toxic). If no food detected set detected=false. Sum totals across all foods. All numbers must be numeric types.`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192
        }
      },
      { timeout: 45000 }
    );

    const candidate = response.data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini');

    if (candidate?.finishReason === 'MAX_TOKENS') {
      logger.warn('Gemini response truncated (MAX_TOKENS) - attempting partial parse');
    }

    // Extract JSON from response
    const result = extractJSON(text);
    return { source: 'gemini', ...result };
  } catch (err) {
    const detail = err.response?.data || err.message;
    logger.error('Gemini Vision error:', JSON.stringify(detail));
    throw err;
  }
};

/**
 * Analyze menu image using Gemini - extract dishes and nutritional estimates
 */
const analyzeMenuImage = async (base64Image, mimeType = 'image/jpeg', userProfile = null, dietPreference = null) => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('Google AI API key not configured');

  const profileCtx = userProfile
    ? `User: goal=${userProfile.diet_goal || 'maintenance'}, allergies=${(userProfile.allergies || []).join(',') || 'none'}, calories_goal=${userProfile.daily_calorie_goal || 2000}`
    : '';
  const dietCtx = dietPreference ? `Preferred diet filter: ${dietPreference}` : '';

  const prompt = `You are a menu analysis AI. Read this restaurant menu image and respond with ONLY a JSON object (no markdown, no explanation).

JSON schema:
{"restaurant_type":str,"menu_items":[{"name":str,"description":str,"category":str,"cuisine":str,"calories_estimate":num,"protein_g":num,"carbs_g":num,"fat_g":num,"fiber_g":num,"is_vegetarian":bool,"is_vegan":bool,"is_gluten_free":bool,"is_keto_friendly":bool,"allergens":[str],"health_score":num,"toxicity_score":num,"why_recommended":str}],"recommended_dishes":[str],"dishes_to_avoid":[str],"ocr_confidence":float,"total_items_found":num}

Rules:
- Extract EVERY visible menu item from the image
- health_score 1-10 (10=healthiest), toxicity_score 1-10 (1=safest)
- ALL boolean fields (is_vegetarian, is_vegan, is_gluten_free, is_keto_friendly) MUST be true or false — NEVER null or omitted
- calories_estimate, protein_g, carbs_g, fat_g MUST be numeric estimates — use your nutritional knowledge to estimate if not stated
- is_vegetarian: true if no meat/fish; is_vegan: true if no animal products; is_keto_friendly: true if carbs_g < 15; is_gluten_free: true if no wheat/barley/rye
- recommended_dishes: top 5-10 healthy dish names from the menu
- All numbers must be numeric types, never strings
${profileCtx}
${dietCtx}`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Image } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 8192
        }
      },
      { timeout: 60000 }
    );

    const candidate = response.data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini');

    if (candidate?.finishReason === 'MAX_TOKENS') {
      logger.warn('Gemini menu response truncated (MAX_TOKENS)');
    }

    return extractJSON(text);
  } catch (err) {
    const detail = err.response?.data || err.message;
    logger.error('Gemini menu analysis error:', JSON.stringify(detail));
    throw err;
  }
};

/**
 * Get AI health recommendations based on food log
 */
const getHealthInsights = async (foodLog, userProfile) => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('Google AI API key not configured');

  const prompt = `As a nutritionist AI, analyze this user's food log and provide personalized health insights.

User Profile: ${JSON.stringify(userProfile)}
Food Log (last 7 days): ${JSON.stringify(foodLog)}

Respond with JSON:
{
  "daily_summary": "Brief assessment of today's nutrition",
  "weekly_trend": "positive/negative/neutral",
  "insights": [
    {"type": "warning", "message": "Your sodium intake is 40% above recommended levels"},
    {"type": "success", "message": "Great protein intake this week!"},
    {"type": "tip", "message": "Consider adding more fiber-rich foods"}
  ],
  "nutrient_gaps": ["vitamin D", "omega-3"],
  "recommended_foods": ["salmon", "broccoli", "quinoa"],
  "risk_factors": ["high sodium", "low fiber"],
  "overall_score": 72
}`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
      },
      { timeout: 20000 }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    try { return extractJSON(text || ''); } catch { return null; }
  } catch (err) {
    const detail = err.response?.data || err.message;
    logger.error('Health insights error:', JSON.stringify(detail));
    return null;
  }
};

module.exports = { analyzeFoodImage, analyzeMenuImage, getHealthInsights };
