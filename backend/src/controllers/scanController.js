const { supabase } = require('../config/supabase');
const { analyzeFoodImage } = require('../services/geminiService');
const { lookupEdamam, lookupUSDA, mergeNutritionData } = require('../services/nutritionService');
const { logger } = require('../utils/logger');
const sharp = require('sharp');

/**
 * Process image: resize and optimize for AI analysis
 */
const preprocessImage = async (buffer) => {
  try {
    const processed = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return processed;
  } catch (err) {
    logger.warn('Image preprocessing failed, using original:', err.message);
    return buffer;
  }
};

const scanFood = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file required' });
  }

  try {
    const imageBuffer = await preprocessImage(req.file.buffer);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg';

    const aiResult = await analyzeFoodImage(base64Image, mimeType);

    if (!aiResult.detected) {
      return res.status(422).json({
        error: 'Could not detect food in image',
        suggestion: 'Please ensure the food is clearly visible and well-lit'
      });
    }

    // Enhance nutrition data with external APIs for primary food item
    let enhancedFoods = aiResult.foods;
    if (aiResult.foods && aiResult.foods.length > 0) {
      const primaryFood = aiResult.foods[0];

      // Try Edamam first, then USDA
      const edamamData = await lookupEdamam(primaryFood.name, `${primaryFood.portion_g}g`);
      const nutritionData = edamamData || await lookupUSDA(primaryFood.name);

      if (nutritionData) {
        enhancedFoods[0] = mergeNutritionData(primaryFood, nutritionData);
      }
    }

    const scanResult = {
      ...aiResult,
      foods: enhancedFoods,
      scanned_at: new Date().toISOString()
    };

    // Save to food logs
    const logEntries = enhancedFoods.map(food => ({
      user_id: req.user.id,
      food_name: food.name,
      calories: food.calories,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      fiber_g: food.fiber_g || 0,
      sugar_g: food.sugar_g || 0,
      sodium_mg: food.sodium_mg || 0,
      portion_g: food.portion_g,
      portion_description: food.portion_description,
      toxicity_score: aiResult.toxicity_score,
      meal_type: aiResult.meal_type || 'snack',
      scan_type: 'food_image',
      ai_confidence: aiResult.confidence,
      logged_at: new Date().toISOString()
    }));

    const { data: logs, error: logError } = await supabase
      .from('food_logs')
      .insert(logEntries)
      .select('id');

    if (logError) {
      logger.error('Food log save error:', logError);
    }

    res.json({
      success: true,
      result: scanResult,
      log_ids: logs?.map(l => l.id) || []
    });
  } catch (err) {
    logger.error('Scan food error:', err);
    if (err.message?.includes('API key')) {
      return res.status(503).json({ error: 'AI service temporarily unavailable' });
    }
    res.status(500).json({ error: 'Failed to analyze food image' });
  }
};

const scanFoodBase64 = async (req, res) => {
  const { image, mimeType = 'image/jpeg' } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Base64 image data required' });
  }

  // Create a fake req.file to reuse the file processing logic
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  req.file = { buffer, mimetype: mimeType };
  return scanFood(req, res);
};

const getScanHistory = async (req, res) => {
  const { limit = 20, offset = 0, date } = req.query;

  try {
    let query = supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .order('logged_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query = query
        .gte('logged_at', startDate.toISOString())
        .lte('logged_at', endDate.toISOString());
    }

    const { data: logs, error, count } = await query;

    if (error) {
      logger.error('Get scan history error:', error);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    // Calculate totals for the queried period
    const totals = logs.reduce((acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein_g: acc.protein_g + (log.protein_g || 0),
      carbs_g: acc.carbs_g + (log.carbs_g || 0),
      fat_g: acc.fat_g + (log.fat_g || 0)
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    res.json({ logs, totals, total_count: count });
  } catch (err) {
    logger.error('GetScanHistory error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteFoodLog = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete log entry' });
    }

    res.json({ message: 'Log entry deleted' });
  } catch (err) {
    logger.error('DeleteFoodLog error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { scanFood, scanFoodBase64, getScanHistory, deleteFoodLog };
