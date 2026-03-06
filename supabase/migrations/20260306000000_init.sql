-- Chakravyuh Event — Supabase migration
-- This creates the exact tables and columns used by both server/index.js and api/index.js.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

BEGIN;

-- ── Teams ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  cash INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  heist_status TEXT NOT NULL DEFAULT 'none'
    CHECK (heist_status IN ('none', 'attacking', 'defending')),
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  last_active TIMESTAMPTZ,
  fullscreen_violations INTEGER NOT NULL DEFAULT 0,
  disqualified BOOLEAN NOT NULL DEFAULT FALSE,
  completed_challenges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_cash_desc ON teams (cash DESC);
CREATE INDEX IF NOT EXISTS idx_teams_access_code ON teams (access_code);

-- ── Single-row global event config ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_config (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_level INTEGER NOT NULL DEFAULT 1,
  is_event_active BOOLEAN NOT NULL DEFAULT TRUE,
  heist_time_limit INTEGER NOT NULL DEFAULT 600 CHECK (heist_time_limit > 0),
  difficulty_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.000 CHECK (difficulty_multiplier > 0),
  level1_timer INTEGER NOT NULL DEFAULT 1200 CHECK (level1_timer > 0),
  level2_timer INTEGER NOT NULL DEFAULT 1800 CHECK (level2_timer > 0),
  level3_timer INTEGER NOT NULL DEFAULT 1800 CHECK (level3_timer > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO event_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── Team power-ups inventory ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_powerups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  powerup_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_powerups_team ON team_powerups (team_id);
CREATE INDEX IF NOT EXISTS idx_team_powerups_lookup ON team_powerups (team_id, powerup_id);

-- ── Level progress (one row per completed challenge) ────────────────────────
CREATE TABLE IF NOT EXISTS level_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  level_key TEXT NOT NULL,
  zone TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_level_progress_unique
  ON level_progress (team_id, level_key, zone, challenge_id);
CREATE INDEX IF NOT EXISTS idx_level_progress_team ON level_progress (team_id);

-- ── Heists ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS heists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  target_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'compound' CHECK (stage IN ('compound', 'safe')),
  compound_progress JSONB NOT NULL DEFAULT '[]'::jsonb,
  compound_wrong_answers INTEGER NOT NULL DEFAULT 0,
  compound_challenge_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  safe_attempts INTEGER NOT NULL DEFAULT 0,
  safe_challenge_index INTEGER,
  guardian_angel_stacks INTEGER NOT NULL DEFAULT 0,
  time_limit INTEGER NOT NULL DEFAULT 600,
  start_time BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'success', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_heists_diff CHECK (attacker_id <> target_team_id)
);

CREATE INDEX IF NOT EXISTS idx_heists_status ON heists (status);
CREATE INDEX IF NOT EXISTS idx_heists_attacker ON heists (attacker_id);
CREATE INDEX IF NOT EXISTS idx_heists_target ON heists (target_team_id);

-- ── Announcements ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements (created_at DESC);

-- ── Auto-update updated_at trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_teams_updated_at') THEN
    CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_event_config_updated_at') THEN
    CREATE TRIGGER trg_event_config_updated_at BEFORE UPDATE ON event_config FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_heists_updated_at') THEN
    CREATE TRIGGER trg_heists_updated_at BEFORE UPDATE ON heists FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ── Row Level Security (allow service_role full access) ─────────────────────
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_powerups ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE heists ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Service-role bypass policies (the backend uses service_role key)
DO $$ BEGIN
  -- teams
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_teams') THEN
    CREATE POLICY service_role_teams ON teams FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- event_config
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_event_config') THEN
    CREATE POLICY service_role_event_config ON event_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- team_powerups
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_team_powerups') THEN
    CREATE POLICY service_role_team_powerups ON team_powerups FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- level_progress
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_level_progress') THEN
    CREATE POLICY service_role_level_progress ON level_progress FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- heists
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_heists') THEN
    CREATE POLICY service_role_heists ON heists FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- announcements
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_announcements') THEN
    CREATE POLICY service_role_announcements ON announcements FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;
