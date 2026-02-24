-- LEVEL UP / Chakravyuh Event
-- PostgreSQL schema for required backend tables

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Common updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Admin users
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  cash INTEGER NOT NULL DEFAULT 0 CHECK (cash >= 0),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 4),
  heist_status TEXT NOT NULL DEFAULT 'none' CHECK (heist_status IN ('none', 'attacking', 'defending')),
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_cash_desc ON teams (cash DESC);
CREATE INDEX IF NOT EXISTS idx_teams_current_level ON teams (current_level);

CREATE TRIGGER trg_teams_updated_at
BEFORE UPDATE ON teams
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Single-row global event config
CREATE TABLE IF NOT EXISTS event_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 4),
  is_event_active BOOLEAN NOT NULL DEFAULT TRUE,
  heist_time_limit INTEGER NOT NULL DEFAULT 180 CHECK (heist_time_limit > 0),
  difficulty_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.000 CHECK (difficulty_multiplier > 0),
  level1_timer INTEGER NOT NULL DEFAULT 2700 CHECK (level1_timer > 0),
  level2_timer INTEGER NOT NULL DEFAULT 3600 CHECK (level2_timer > 0),
  level3_timer INTEGER NOT NULL DEFAULT 2700 CHECK (level3_timer > 0),
  level4_timer INTEGER NOT NULL DEFAULT 1800 CHECK (level4_timer > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO event_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_event_config_updated_at
BEFORE UPDATE ON event_config
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Power-up master definitions
CREATE TABLE IF NOT EXISTS powerup_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  effect_json JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_powerup_definitions_updated_at
BEFORE UPDATE ON powerup_definitions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO powerup_definitions (id, name, description, effect_json)
VALUES
  ('GUARDIAN_ANGEL', 'Guardian Angel', 'Reduces enemy heist time by 30 seconds', '{"heistTimeReduction": 30}'::jsonb),
  ('DOUBLE_CASH', 'Double Cash', 'Next successful challenge gives 2x cash', '{"cashMultiplier": 2}'::jsonb),
  ('SHIELD', 'Shield', 'Blocks one incoming heist attempt', '{"blockHeist": true}'::jsonb),
  ('HINT_MASTER', 'Hint Master', 'Reveals hint for current challenge', '{"revealHint": true}'::jsonb),
  ('TIME_FREEZE', 'Time Freeze', 'Adds 60 seconds to current timer', '{"addTime": 60}'::jsonb)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    effect_json = EXCLUDED.effect_json,
    is_active = TRUE,
    updated_at = NOW();

-- Per-team inventory of power-ups
CREATE TABLE IF NOT EXISTS team_powerups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  powerup_id TEXT NOT NULL REFERENCES powerup_definitions(id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity BETWEEN 0 AND 2),
  granted_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_team_powerup UNIQUE (team_id, powerup_id)
);

CREATE INDEX IF NOT EXISTS idx_team_powerups_team ON team_powerups (team_id);

CREATE TRIGGER trg_team_powerups_updated_at
BEFORE UPDATE ON team_powerups
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Team progression state (mirrors current in-memory shape)
CREATE TABLE IF NOT EXISTS team_level_progress (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  level1_logic JSONB NOT NULL DEFAULT '[]'::jsonb,
  level1_ai JSONB NOT NULL DEFAULT '[]'::jsonb,
  level1_tech JSONB NOT NULL DEFAULT '[]'::jsonb,
  level2_brain JSONB NOT NULL DEFAULT '[]'::jsonb,
  level2_nocode JSONB NOT NULL DEFAULT '[]'::jsonb,
  level2_prompt JSONB NOT NULL DEFAULT '[]'::jsonb,
  level2_attempted BOOLEAN NOT NULL DEFAULT FALSE,
  level3_compound JSONB NOT NULL DEFAULT '[]'::jsonb,
  level3_heist_target UUID REFERENCES teams(id) ON DELETE SET NULL,
  level3_heist_status TEXT NOT NULL DEFAULT 'none' CHECK (level3_heist_status IN ('none', 'attacking', 'defending')),
  level4_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  level4_score INTEGER NOT NULL DEFAULT 0 CHECK (level4_score >= 0),
  level4_submission TEXT,
  level4_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_team_level_progress_updated_at
BEFORE UPDATE ON team_level_progress
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Heist lifecycle and outcomes
CREATE TABLE IF NOT EXISTS heists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  target_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'compound' CHECK (stage IN ('compound', 'safe', 'completed')),
  compound_progress JSONB NOT NULL DEFAULT '[]'::jsonb,
  safe_attempts INTEGER NOT NULL DEFAULT 0 CHECK (safe_attempts >= 0),
  safe_challenge_index INTEGER,
  time_limit_sec INTEGER NOT NULL CHECK (time_limit_sec > 0),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('active', 'success', 'failed')),
  result_amount INTEGER,
  failure_reason TEXT,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_heists_attacker_target_diff CHECK (attacker_team_id <> target_team_id)
);

CREATE INDEX IF NOT EXISTS idx_heists_attacker ON heists (attacker_team_id);
CREATE INDEX IF NOT EXISTS idx_heists_target ON heists (target_team_id);
CREATE INDEX IF NOT EXISTS idx_heists_status ON heists (status);
CREATE INDEX IF NOT EXISTS idx_heists_start_time ON heists (start_time DESC);

CREATE TRIGGER trg_heists_updated_at
BEFORE UPDATE ON heists
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Broadcast messages
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements (created_at DESC);

-- Per-attempt challenge audit (supports race-safe rewards and analytics)
CREATE TABLE IF NOT EXISTS challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  zone TEXT,
  challenge_id TEXT NOT NULL,
  submitted_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  reward INTEGER NOT NULL DEFAULT 0 CHECK (reward >= 0),
  penalty INTEGER NOT NULL DEFAULT 0 CHECK (penalty >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_attempts_team_time ON challenge_attempts (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_lookup ON challenge_attempts (team_id, level, zone, challenge_id);

-- Level 4 submissions and scoring history
CREATE TABLE IF NOT EXISTS level4_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  submission_text TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score_breakdown JSONB,
  total_score INTEGER CHECK (total_score >= 0),
  cash_reward INTEGER CHECK (cash_reward >= 0),
  scored_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  scored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_level4_submissions_team_time ON level4_submissions (team_id, submitted_at DESC);

CREATE TRIGGER trg_level4_submissions_updated_at
BEFORE UPDATE ON level4_submissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Immutable admin activity log
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_time ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs (action);

COMMIT;
