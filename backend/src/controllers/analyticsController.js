const { supabase } = require('../config/supabase');
const { getHealthInsights } = require('../services/geminiService');
const { logger } = require('../utils/logger');

const getDailyAnalytics = async (req, res) => {
  const { date = new Date().toISOString().split('T')[0] } = req.query;

  try {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const { data: foodLogs } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('logged_at', startDate.toISOString())
      .lte('logged_at', endDate.toISOString())
      .order('logged_at', { ascending: true });

    const { data: activityLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('logged_at', startDate.toISOString())
      .lte('logged_at', endDate.toISOString());

    const { data: profile } = await supabase
      .from('health_profiles')
      .select('daily_calorie_goal, tdee')
      .eq('user_id', req.user.id)
      .single();

    const totals = (foodLogs || []).reduce((acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein_g: acc.protein_g + (log.protein_g || 0),
      carbs_g: acc.carbs_g + (log.carbs_g || 0),
      fat_g: acc.fat_g + (log.fat_g || 0),
      fiber_g: acc.fiber_g + (log.fiber_g || 0),
      sugar_g: acc.sugar_g + (log.sugar_g || 0),
      sodium_mg: acc.sodium_mg + (log.sodium_mg || 0)
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 });

    const water_ml = activityLogs?.filter(l => l.type === 'water')
      .reduce((acc, l) => acc + (l.value || 0), 0) || 0;

    const exercise_min = activityLogs?.filter(l => l.type === 'exercise')
      .reduce((acc, l) => acc + (l.value || 0), 0) || 0;

    const calorie_goal = profile?.daily_calorie_goal || profile?.tdee || 2000;
    const calorie_remaining = Math.max(0, calorie_goal - totals.calories);

    // Macro distribution percentages
    const total_macro_cal = (totals.protein_g * 4) + (totals.carbs_g * 4) + (totals.fat_g * 9);
    const macro_pct = total_macro_cal > 0 ? {
      protein: Math.round((totals.protein_g * 4 / total_macro_cal) * 100),
      carbs: Math.round((totals.carbs_g * 4 / total_macro_cal) * 100),
      fat: Math.round((totals.fat_g * 9 / total_macro_cal) * 100)
    } : { protein: 0, carbs: 0, fat: 0 };

    res.json({
      date,
      totals,
      macro_pct,
      calorie_goal,
      calorie_remaining,
      water_ml,
      exercise_min,
      meals: foodLogs || [],
      meal_count: (foodLogs || []).length
    });
  } catch (err) {
    logger.error('GetDailyAnalytics error:', err);
    res.status(500).json({ error: 'Failed to fetch daily analytics' });
  }
};

const getWeeklyAnalytics = async (req, res) => {
  const { end_date = new Date().toISOString().split('T')[0] } = req.query;

  try {
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const { data: foodLogs } = await supabase
      .from('food_logs')
      .select('calories, protein_g, carbs_g, fat_g, logged_at')
      .eq('user_id', req.user.id)
      .gte('logged_at', startDate.toISOString())
      .lte('logged_at', endDate.toISOString());

    const { data: activityLogs } = await supabase
      .from('activity_logs')
      .select('type, value, logged_at')
      .eq('user_id', req.user.id)
      .gte('logged_at', startDate.toISOString())
      .lte('logged_at', endDate.toISOString());

    // Group by day
    const dailyData = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyData[key] = {
        date: key,
        calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
        water_ml: 0, exercise_min: 0
      };
    }

    (foodLogs || []).forEach(log => {
      const key = log.logged_at.split('T')[0];
      if (dailyData[key]) {
        dailyData[key].calories += log.calories || 0;
        dailyData[key].protein_g += log.protein_g || 0;
        dailyData[key].carbs_g += log.carbs_g || 0;
        dailyData[key].fat_g += log.fat_g || 0;
      }
    });

    (activityLogs || []).forEach(log => {
      const key = log.logged_at.split('T')[0];
      if (dailyData[key]) {
        if (log.type === 'water') dailyData[key].water_ml += log.value || 0;
        if (log.type === 'exercise') dailyData[key].exercise_min += log.value || 0;
      }
    });

    const days = Object.values(dailyData);
    const avgCalories = Math.round(days.reduce((s, d) => s + d.calories, 0) / 7);

    res.json({
      days,
      avg_calories: avgCalories,
      total_exercise_min: days.reduce((s, d) => s + d.exercise_min, 0),
      total_water_ml: days.reduce((s, d) => s + d.water_ml, 0)
    });
  } catch (err) {
    logger.error('GetWeeklyAnalytics error:', err);
    res.status(500).json({ error: 'Failed to fetch weekly analytics' });
  }
};

const getMonthlyAnalytics = async (req, res) => {
  const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data: foodLogs } = await supabase
      .from('food_logs')
      .select('calories, logged_at')
      .eq('user_id', req.user.id)
      .gte('logged_at', startDate.toISOString())
      .lte('logged_at', endDate.toISOString());

    const { data: weightLogs } = await supabase
      .from('activity_logs')
      .select('value, logged_at')
      .eq('user_id', req.user.id)
      .eq('type', 'weight')
      .gte('logged_at', startDate.toISOString())
      .lte('logged_at', endDate.toISOString())
      .order('logged_at');

    // Group calories by day
    const calsByDay = {};
    (foodLogs || []).forEach(log => {
      const day = parseInt(log.logged_at.split('T')[0].split('-')[2]);
      calsByDay[day] = (calsByDay[day] || 0) + (log.calories || 0);
    });

    const calendarData = Object.entries(calsByDay).map(([day, calories]) => ({
      day: parseInt(day),
      calories
    }));

    res.json({
      year,
      month,
      calendar_data: calendarData,
      weight_trend: weightLogs || [],
      total_calories: (foodLogs || []).reduce((s, l) => s + (l.calories || 0), 0),
      avg_daily_calories: Math.round(
        (foodLogs || []).reduce((s, l) => s + (l.calories || 0), 0) /
        (new Date(year, month, 0).getDate())
      )
    });
  } catch (err) {
    logger.error('GetMonthlyAnalytics error:', err);
    res.status(500).json({ error: 'Failed to fetch monthly analytics' });
  }
};

const getSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayLogs } = await supabase
      .from('food_logs')
      .select('calories, protein_g, carbs_g, fat_g, toxicity_score')
      .eq('user_id', req.user.id)
      .gte('logged_at', today.toISOString());

    const { data: totalLogs } = await supabase
      .from('food_logs')
      .select('id', { count: 'exact' })
      .eq('user_id', req.user.id);

    const { data: profile } = await supabase
      .from('health_profiles')
      .select('daily_calorie_goal, tdee, weight, diet_goal')
      .eq('user_id', req.user.id)
      .single();

    const todayTotals = (todayLogs || []).reduce((acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein_g: acc.protein_g + (log.protein_g || 0),
      carbs_g: acc.carbs_g + (log.carbs_g || 0),
      fat_g: acc.fat_g + (log.fat_g || 0)
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    const calorie_goal = profile?.daily_calorie_goal || profile?.tdee || 2000;
    const calorie_pct = Math.min(100, Math.round((todayTotals.calories / calorie_goal) * 100));

    const avg_toxicity = todayLogs?.length > 0
      ? (todayLogs.reduce((s, l) => s + (l.toxicity_score || 5), 0) / todayLogs.length).toFixed(1)
      : 0;

    res.json({
      today: {
        ...todayTotals,
        calorie_goal,
        calorie_pct,
        meal_count: (todayLogs || []).length,
        avg_toxicity_score: parseFloat(avg_toxicity)
      },
      total_scans: totalLogs?.length || 0,
      profile_complete: !!profile?.weight,
      diet_goal: profile?.diet_goal || 'maintenance'
    });
  } catch (err) {
    logger.error('GetSummary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
};

const logActivity = async (req, res) => {
  const { type, value, unit, notes } = req.body;
  const validTypes = ['water', 'exercise', 'weight', 'mood', 'sleep'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid activity type. Must be: ${validTypes.join(', ')}` });
  }

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        type,
        value: parseFloat(value),
        unit: unit || '',
        notes: notes || '',
        logged_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to log activity' });
    res.json({ message: 'Activity logged', log: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAIInsights = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: foodLogs } = await supabase
      .from('food_logs')
      .select('food_name, calories, protein_g, carbs_g, fat_g, toxicity_score, logged_at')
      .eq('user_id', req.user.id)
      .gte('logged_at', sevenDaysAgo.toISOString())
      .order('logged_at', { ascending: false });

    const { data: profile } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (!foodLogs || foodLogs.length === 0) {
      return res.json({
        insights: [{
          type: 'info',
          message: 'Start scanning food to get personalized AI health insights!'
        }],
        overall_score: null
      });
    }

    const insights = await getHealthInsights(foodLogs, profile);
    res.json(insights || { insights: [], overall_score: 70 });
  } catch (err) {
    logger.error('GetAIInsights error:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
};

module.exports = {
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getSummary,
  logActivity,
  getAIInsights
};
