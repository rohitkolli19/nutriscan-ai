// ─── Auth ────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  created_at?: string
  last_login?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

// ─── Health Profile ──────────────────────────────────────────

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active'

export type DietGoal = 'weight_loss' | 'muscle_gain' | 'maintenance'
export type Gender = 'male' | 'female' | 'other'

export interface HealthProfile {
  id?: string
  user_id?: string
  age?: number
  gender?: Gender
  height?: number          // cm
  weight?: number          // kg
  bmi?: number
  tdee?: number            // kcal
  activity_level?: ActivityLevel
  medical_conditions?: string[]
  allergies?: string[]
  diet_goal?: DietGoal
  daily_calorie_goal?: number
  created_at?: string
  updated_at?: string
}

// ─── Food / Nutrition ────────────────────────────────────────

export interface FoodItem {
  name: string
  category: string
  portion_g: number
  portion_description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugar_g: number
  sodium_mg: number
  glycemic_index?: number
  is_processed?: boolean
  additives?: string[]
  inflammatory_score?: number
}

export interface NutritionTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugar_g: number
  sodium_mg: number
}

export interface FoodScanResult {
  detected: boolean
  confidence: number
  foods: FoodItem[]
  total_nutrition: NutritionTotals
  toxicity_score: number
  toxicity_reasons: string[]
  health_benefits: string[]
  health_warnings: string[]
  meal_type: string
  cuisine: string
  is_vegetarian: boolean
  is_vegan: boolean
  is_gluten_free: boolean
  allergens: string[]
  ai_recommendation: string
  source: string
  scanned_at: string
}

// ─── Food Log ────────────────────────────────────────────────

export interface FoodLog {
  id: string
  user_id: string
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugar_g: number
  sodium_mg: number
  portion_g?: number
  portion_description?: string
  toxicity_score?: number
  meal_type: string
  scan_type: string
  ai_confidence?: number
  logged_at: string
}

// ─── Menu Scan ───────────────────────────────────────────────

export interface MenuItem {
  name: string
  description?: string
  category: string
  cuisine: string
  calories_estimate: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  is_vegetarian: boolean
  is_vegan: boolean
  is_gluten_free: boolean
  is_keto_friendly: boolean
  allergens: string[]
  health_score: number
  toxicity_score: number
  recommendation_rank: number
  why_recommended?: string
}

export interface MenuScanResult {
  restaurant_type: string
  menu_items: MenuItem[]
  recommended_dishes: string[]
  dishes_to_avoid: string[]
  ocr_confidence: number
  total_items_found: number
}

// ─── Analytics ───────────────────────────────────────────────

export interface DailyAnalytics {
  date: string
  totals: NutritionTotals
  macro_pct: { protein: number; carbs: number; fat: number }
  calorie_goal: number
  calorie_remaining: number
  calorie_pct: number
  water_ml: number
  exercise_min: number
  meals: FoodLog[]
  meal_count: number
}

export interface WeeklyDay {
  date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml: number
  exercise_min: number
}

export interface WeeklyAnalytics {
  days: WeeklyDay[]
  avg_calories: number
  total_exercise_min: number
  total_water_ml: number
}

export interface AnalyticsSummary {
  today: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    calorie_goal: number
    calorie_pct: number
    calorie_remaining: number
    meal_count: number
    avg_toxicity_score: number
  }
  total_scans: number
  profile_complete: boolean
  diet_goal: string
}

export interface AIInsight {
  type: 'warning' | 'success' | 'tip' | 'info'
  message: string
}

export interface AIInsights {
  daily_summary?: string
  weekly_trend?: 'positive' | 'negative' | 'neutral'
  insights: AIInsight[]
  nutrient_gaps?: string[]
  recommended_foods?: string[]
  risk_factors?: string[]
  overall_score?: number
}

// ─── Activity ────────────────────────────────────────────────

export type ActivityType = 'water' | 'exercise' | 'weight' | 'mood' | 'sleep'

export interface ActivityLog {
  id: string
  user_id: string
  type: ActivityType
  value: number
  unit: string
  notes?: string
  logged_at: string
}

// ─── API Response ────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success?: boolean
  message?: string
  error?: string
  data?: T
}
