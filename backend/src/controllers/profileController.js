const { validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');

const getProfile = async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Get profile error:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', req.user.id)
      .single();

    res.json({ profile: profile || null, user });
  } catch (err) {
    logger.error('GetProfile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const saveProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    age, gender, height, weight, activity_level,
    medical_conditions, allergies, diet_goal, daily_calorie_goal
  } = req.body;

  // Calculate BMI and TDEE
  let bmi = null;
  let tdee = null;

  if (height && weight) {
    const heightM = height / 100;
    bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
  }

  if (age && weight && height && gender && activity_level) {
    // Mifflin-St Jeor BMR
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };

    tdee = Math.round(bmr * (activityMultipliers[activity_level] || 1.55));
  }

  try {
    const profileData = {
      user_id: req.user.id,
      age: age || null,
      gender: gender || null,
      height: height || null,
      weight: weight || null,
      bmi,
      tdee,
      activity_level: activity_level || null,
      medical_conditions: medical_conditions || [],
      allergies: allergies || [],
      diet_goal: diet_goal || 'maintenance',
      daily_calorie_goal: daily_calorie_goal || tdee,
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase
      .from('health_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('health_profiles')
        .update(profileData)
        .eq('user_id', req.user.id)
        .select()
        .single();
    } else {
      profileData.created_at = new Date().toISOString();
      result = await supabase
        .from('health_profiles')
        .insert(profileData)
        .select()
        .single();
    }

    if (result.error) {
      logger.error('Save profile error:', result.error);
      return res.status(500).json({ error: 'Failed to save profile' });
    }

    res.json({
      message: 'Profile saved successfully',
      profile: result.data
    });
  } catch (err) {
    logger.error('SaveProfile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getProfile, saveProfile };
