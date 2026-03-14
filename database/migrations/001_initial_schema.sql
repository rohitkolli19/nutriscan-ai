-- ============================================================
-- NutriScan AI - Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          VARCHAR(100) NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ─── HEALTH PROFILES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  age                 INTEGER CHECK (age > 0 AND age < 150),
  gender              VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  height              DECIMAL(5,2),  -- cm
  weight              DECIMAL(5,2),  -- kg
  bmi                 DECIMAL(4,1),
  tdee                INTEGER,       -- Total Daily Energy Expenditure (kcal)
  activity_level      VARCHAR(30) DEFAULT 'moderately_active',
  medical_conditions  JSONB DEFAULT '[]',
  allergies           JSONB DEFAULT '[]',
  diet_goal           VARCHAR(30) DEFAULT 'maintenance',
  daily_calorie_goal  INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_health_profiles_user_id ON health_profiles(user_id);

-- ─── FOOD LOGS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_name           VARCHAR(255) NOT NULL,
  calories            DECIMAL(8,2) DEFAULT 0,
  protein_g           DECIMAL(6,2) DEFAULT 0,
  carbs_g             DECIMAL(6,2) DEFAULT 0,
  fat_g               DECIMAL(6,2) DEFAULT 0,
  fiber_g             DECIMAL(6,2) DEFAULT 0,
  sugar_g             DECIMAL(6,2) DEFAULT 0,
  sodium_mg           DECIMAL(8,2) DEFAULT 0,
  portion_g           DECIMAL(7,2),
  portion_description VARCHAR(100),
  toxicity_score      INTEGER CHECK (toxicity_score BETWEEN 1 AND 10),
  meal_type           VARCHAR(20) DEFAULT 'snack',
  scan_type           VARCHAR(30) DEFAULT 'food_image',
  ai_confidence       DECIMAL(3,2),
  image_url           TEXT,
  notes               TEXT,
  logged_at           TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_food_logs_user_id ON food_logs(user_id);
CREATE INDEX idx_food_logs_logged_at ON food_logs(logged_at DESC);
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, logged_at DESC);

-- ─── MENU SCANS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_scans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  menu_items      JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  raw_text        TEXT,
  ocr_confidence  DECIMAL(3,2),
  restaurant_type VARCHAR(100),
  diet_filter     VARCHAR(30),
  image_url       TEXT,
  scanned_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_scans_user_id ON menu_scans(user_id);
CREATE INDEX idx_menu_scans_scanned_at ON menu_scans(scanned_at DESC);

-- ─── ACTIVITY LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(30) NOT NULL, -- water, exercise, weight, mood, sleep
  value       DECIMAL(8,2) NOT NULL,
  unit        VARCHAR(20),          -- ml, min, kg, etc.
  notes       TEXT,
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(type);
CREATE INDEX idx_activity_logs_logged_at ON activity_logs(logged_at DESC);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- NOTE: Since we use service role key in backend, RLS policies are for
-- direct client access security. Backend bypasses RLS via service key.

-- ─── UPDATED_AT TRIGGER ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_profiles_updated_at
  BEFORE UPDATE ON health_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── VIEWS ──────────────────────────────────────────────────

-- Daily nutrition summary view
CREATE OR REPLACE VIEW daily_nutrition_summary AS
SELECT
  user_id,
  DATE(logged_at) as date,
  ROUND(SUM(calories), 2) as total_calories,
  ROUND(SUM(protein_g), 2) as total_protein_g,
  ROUND(SUM(carbs_g), 2) as total_carbs_g,
  ROUND(SUM(fat_g), 2) as total_fat_g,
  ROUND(SUM(fiber_g), 2) as total_fiber_g,
  COUNT(*) as meal_count,
  ROUND(AVG(toxicity_score), 1) as avg_toxicity_score
FROM food_logs
GROUP BY user_id, DATE(logged_at);

-- ─── SAMPLE DATA (Optional - remove in production) ──────────
-- INSERT INTO users (email, password_hash, name)
-- VALUES ('demo@nutriscan.ai', '$2b$12$...', 'Demo User');
