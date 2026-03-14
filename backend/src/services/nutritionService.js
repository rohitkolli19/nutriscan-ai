const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * Look up nutrition from Edamam API
 */
const lookupEdamam = async (foodName, quantity = '1 serving') => {
  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;

  if (!appId || !appKey) {
    logger.warn('Edamam API not configured');
    return null;
  }

  try {
    const response = await axios.get('https://api.edamam.com/api/nutrition-data', {
      params: {
        app_id: appId,
        app_key: appKey,
        ingr: `${quantity} ${foodName}`
      },
      timeout: 10000
    });

    const data = response.data;
    if (!data.calories) return null;

    return {
      source: 'edamam',
      calories: Math.round(data.calories),
      protein_g: parseFloat((data.totalNutrients?.PROCNT?.quantity || 0).toFixed(1)),
      carbs_g: parseFloat((data.totalNutrients?.CHOCDF?.quantity || 0).toFixed(1)),
      fat_g: parseFloat((data.totalNutrients?.FAT?.quantity || 0).toFixed(1)),
      fiber_g: parseFloat((data.totalNutrients?.FIBTG?.quantity || 0).toFixed(1)),
      sugar_g: parseFloat((data.totalNutrients?.SUGAR?.quantity || 0).toFixed(1)),
      sodium_mg: parseFloat((data.totalNutrients?.NA?.quantity || 0).toFixed(1)),
      cholesterol_mg: parseFloat((data.totalNutrients?.CHOLE?.quantity || 0).toFixed(1)),
      vitamin_c_mg: parseFloat((data.totalNutrients?.VITC?.quantity || 0).toFixed(1)),
      iron_mg: parseFloat((data.totalNutrients?.FE?.quantity || 0).toFixed(1)),
      calcium_mg: parseFloat((data.totalNutrients?.CA?.quantity || 0).toFixed(1))
    };
  } catch (err) {
    logger.error('Edamam API error:', err.message);
    return null;
  }
};

/**
 * Look up nutrition from USDA FoodData Central
 */
const lookupUSDA = async (foodName) => {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    logger.warn('USDA API not configured');
    return null;
  }

  try {
    // Search for the food
    const searchResponse = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
      params: {
        api_key: apiKey,
        query: foodName,
        pageSize: 3,
        dataType: 'Foundation,SR Legacy'
      },
      timeout: 10000
    });

    const foods = searchResponse.data.foods;
    if (!foods || foods.length === 0) return null;

    const food = foods[0];
    const nutrients = {};
    food.foodNutrients?.forEach(n => {
      nutrients[n.nutrientId] = n.value;
    });

    return {
      source: 'usda',
      food_name: food.description,
      calories: Math.round(nutrients[1008] || 0),
      protein_g: parseFloat((nutrients[1003] || 0).toFixed(1)),
      carbs_g: parseFloat((nutrients[1005] || 0).toFixed(1)),
      fat_g: parseFloat((nutrients[1004] || 0).toFixed(1)),
      fiber_g: parseFloat((nutrients[1079] || 0).toFixed(1)),
      sugar_g: parseFloat((nutrients[2000] || 0).toFixed(1)),
      sodium_mg: parseFloat((nutrients[1093] || 0).toFixed(1))
    };
  } catch (err) {
    logger.error('USDA API error:', err.message);
    return null;
  }
};

/**
 * Look up Open Food Facts (good for packaged foods)
 */
const lookupOpenFoodFacts = async (barcode) => {
  try {
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { timeout: 10000 }
    );

    if (response.data.status !== 1) return null;
    const product = response.data.product;
    const n = product.nutriments || {};

    return {
      source: 'open_food_facts',
      food_name: product.product_name,
      brand: product.brands,
      calories: Math.round(n['energy-kcal_100g'] || 0),
      protein_g: parseFloat((n.proteins_100g || 0).toFixed(1)),
      carbs_g: parseFloat((n.carbohydrates_100g || 0).toFixed(1)),
      fat_g: parseFloat((n.fat_100g || 0).toFixed(1)),
      fiber_g: parseFloat((n.fiber_100g || 0).toFixed(1)),
      sugar_g: parseFloat((n.sugars_100g || 0).toFixed(1)),
      sodium_mg: parseFloat(((n.sodium_100g || 0) * 1000).toFixed(1)),
      nutriscore: product.nutriscore_grade,
      additives: product.additives_tags || []
    };
  } catch (err) {
    logger.error('Open Food Facts error:', err.message);
    return null;
  }
};

/**
 * Merge nutrition data from multiple sources with AI data taking priority
 */
const mergeNutritionData = (aiData, apiData) => {
  if (!apiData) return aiData;

  // Use API data as ground truth for calories/macros if available
  return {
    ...aiData,
    calories: apiData.calories || aiData.calories,
    protein_g: apiData.protein_g || aiData.protein_g,
    carbs_g: apiData.carbs_g || aiData.carbs_g,
    fat_g: apiData.fat_g || aiData.fat_g,
    fiber_g: apiData.fiber_g || aiData.fiber_g,
    sugar_g: apiData.sugar_g || aiData.sugar_g,
    sodium_mg: apiData.sodium_mg || aiData.sodium_mg,
    nutrition_source: apiData.source
  };
};

module.exports = { lookupEdamam, lookupUSDA, lookupOpenFoodFacts, mergeNutritionData };
