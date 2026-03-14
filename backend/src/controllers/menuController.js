const { supabase } = require('../config/supabase');
const { analyzeMenuImage } = require('../services/geminiService');
const { extractTextFromImage, parseMenuText } = require('../services/ocrService');
const { logger } = require('../utils/logger');
const sharp = require('sharp');

const preprocessImage = async (buffer) => {
  try {
    return await sharp(buffer)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch {
    return buffer;
  }
};

const scanMenu = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Menu image required' });
  }

  const { diet_preference } = req.body;

  try {
    // Get user health profile for personalized recommendations
    const { data: userProfile } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    const imageBuffer = await preprocessImage(req.file.buffer);
    const base64Image = imageBuffer.toString('base64');

    // Run both OCR and AI analysis in parallel
    const [ocrResult, aiResult] = await Promise.allSettled([
      extractTextFromImage(base64Image, imageBuffer),
      analyzeMenuImage(base64Image, 'image/jpeg', userProfile, diet_preference || null)
    ]);

    let menuItems = [];
    let recommendations = [];
    let rawText = '';
    let confidence = 0;

    // Process AI result (primary)
    if (aiResult.status === 'fulfilled' && aiResult.value?.menu_items) {
      const ai = aiResult.value;
      menuItems = ai.menu_items || [];
      confidence = ai.ocr_confidence || 0.8;

      // Apply diet filter if specified
      if (diet_preference && diet_preference !== 'none') {
        menuItems = filterByDiet(menuItems, diet_preference);
      }

      // Also filter by user allergies
      if (userProfile?.allergies?.length > 0) {
        menuItems = menuItems.map(item => ({
          ...item,
          has_allergen: userProfile.allergies.some(a =>
            item.allergens?.includes(a.toLowerCase()) ||
            item.name?.toLowerCase().includes(a.toLowerCase())
          )
        }));
      }

      // Generate top recommendations
      recommendations = generateRecommendations(menuItems, userProfile, diet_preference);
    }

    // Use OCR text as fallback or supplement
    if (ocrResult.status === 'fulfilled' && ocrResult.value) {
      rawText = ocrResult.value.text;

      // If AI gave no items, parse OCR text
      if (menuItems.length === 0) {
        const parsedDishes = parseMenuText(rawText);
        menuItems = parsedDishes.map(name => ({
          name,
          category: 'unknown',
          calories_estimate: null,
          health_score: 5,
          is_vegetarian: null
        }));
        confidence = ocrResult.value.confidence * 0.7; // Lower confidence for OCR-only
      }
    }

    if (menuItems.length === 0) {
      return res.status(422).json({
        error: 'Could not extract menu items from image',
        suggestion: 'Please ensure the menu text is clearly visible and well-lit'
      });
    }

    const scanData = {
      menu_items: menuItems,
      recommendations,
      raw_text: rawText,
      ocr_confidence: confidence,
      total_items: menuItems.length,
      restaurant_type: aiResult.value?.restaurant_type || 'unknown',
      diet_filter: diet_preference || 'none',
      scanned_at: new Date().toISOString()
    };

    // Save scan to DB
    const { data: saved, error: saveError } = await supabase
      .from('menu_scans')
      .insert({
        user_id: req.user.id,
        menu_items: menuItems,
        recommendations,
        ocr_confidence: confidence,
        raw_text: rawText.substring(0, 5000), // Limit text storage
        diet_filter: diet_preference,
        scanned_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (saveError) {
      logger.error('Menu scan save error:', saveError);
    }

    res.json({
      success: true,
      scan_id: saved?.id,
      ...scanData
    });
  } catch (err) {
    logger.error('Menu scan error:', err);
    res.status(500).json({ error: 'Failed to analyze menu. Please try again.' });
  }
};

const scanMenuBase64 = async (req, res) => {
  const { image, diet_preference, mimeType = 'image/jpeg' } = req.body;
  if (!image) return res.status(400).json({ error: 'Image data required' });

  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  req.file = { buffer, mimetype: mimeType };
  req.body.diet_preference = diet_preference;
  return scanMenu(req, res);
};

const getMenuHistory = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('menu_scans')
      .select('id, recommendations, total_items, restaurant_type, diet_filter, scanned_at')
      .eq('user_id', req.user.id)
      .order('scanned_at', { ascending: false })
      .limit(10);

    if (error) return res.status(500).json({ error: 'Failed to fetch history' });
    res.json({ scans: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const filterByDiet = (items, diet) => {
  const filters = {
    vegan:        item => item.is_vegan === true,
    vegetarian:   item => item.is_vegetarian === true || item.is_vegan === true,
    keto:         item => item.is_keto_friendly === true || (item.carbs_g != null && item.carbs_g < 15),
    gluten_free:  item => item.is_gluten_free === true,
    low_carb:     item => item.carbs_g != null && item.carbs_g < 30,
    high_protein: item => item.protein_g != null && item.protein_g >= 20
  };

  const filterFn = filters[diet];
  if (!filterFn) return items;
  return items.filter(filterFn);
};

const generateRecommendations = (items, userProfile, dietPreference) => {
  const scored = items.map(item => {
    let score = item.health_score || 5;

    // Boost based on diet goal
    if (userProfile?.diet_goal === 'weight_loss') {
      if (item.calories_estimate < 400) score += 2;
      if (item.fiber_g > 5) score += 1;
    } else if (userProfile?.diet_goal === 'muscle_gain') {
      if (item.protein_g > 25) score += 2;
    }

    // Penalize allergens
    if (item.has_allergen) score -= 5;

    return { ...item, recommendation_score: score };
  });

  return scored
    .sort((a, b) => b.recommendation_score - a.recommendation_score)
    .slice(0, 10)
    .map(item => item.name);
};

module.exports = { scanMenu, scanMenuBase64, getMenuHistory };
