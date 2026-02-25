-- ============================================================================
-- LEVEL UP / Chakravyuh Event — Supabase Setup
-- Run this ENTIRE script in the Supabase SQL Editor (one shot).
-- It is safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

BEGIN;

-- ── 0. Extensions ───────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 0.5 Drop existing tables (reverse dependency order) ────────────────────
DROP TABLE IF EXISTS announcements  CASCADE;
DROP TABLE IF EXISTS heists         CASCADE;
DROP TABLE IF EXISTS level_progress CASCADE;
DROP TABLE IF EXISTS team_powerups  CASCADE;
DROP TABLE IF EXISTS teams          CASCADE;
DROP TABLE IF EXISTS event_config   CASCADE;

-- ── 1. Helper: auto-update updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. Event Config (single-row) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_config (
  id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_level       INT     NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 3),
  is_event_active     BOOLEAN NOT NULL DEFAULT TRUE,
  heist_time_limit    INT     NOT NULL DEFAULT 180 CHECK (heist_time_limit > 0),
  difficulty_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.000 CHECK (difficulty_multiplier > 0),
  level1_timer        INT     NOT NULL DEFAULT 2700 CHECK (level1_timer > 0),
  level2_timer        INT     NOT NULL DEFAULT 3600 CHECK (level2_timer > 0),
  level3_timer        INT     NOT NULL DEFAULT 2700 CHECK (level3_timer > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_event_config_updated_at ON event_config;
CREATE TRIGGER trg_event_config_updated_at
  BEFORE UPDATE ON event_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO event_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── 3. Teams ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT    NOT NULL,
  access_code   TEXT    NOT NULL UNIQUE,
  cash          INT     NOT NULL DEFAULT 0,
  current_level INT     NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 3),
  completed_challenges TEXT[] NOT NULL DEFAULT '{}',
  heist_status  TEXT    NOT NULL DEFAULT 'none' CHECK (heist_status IN ('none','attacking','defending')),
  is_online     BOOLEAN NOT NULL DEFAULT FALSE,
  last_active   TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_cash_desc ON teams (cash DESC);
CREATE INDEX IF NOT EXISTS idx_teams_access_code ON teams (access_code);

DROP TRIGGER IF EXISTS trg_teams_updated_at ON teams;
CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. Team Power-ups ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_powerups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  powerup_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_powerups_team ON team_powerups (team_id);

-- ── 5. Level Progress (completed challenge IDs per team/level/zone) ────────
CREATE TABLE IF NOT EXISTS level_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  level_key    TEXT NOT NULL,   -- 'level1', 'level2', 'level3'
  zone         TEXT NOT NULL,   -- 'logic', 'ai', 'tech', 'brain', etc.
  challenge_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, level_key, zone, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_level_progress_team ON level_progress (team_id);

-- ── 6. Heists ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS heists (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  target_team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  stage             TEXT NOT NULL DEFAULT 'compound' CHECK (stage IN ('compound','safe','completed')),
  compound_progress TEXT[] NOT NULL DEFAULT '{}',
  safe_attempts     INT  NOT NULL DEFAULT 0,
  safe_challenge_index INT,
  time_limit        INT  NOT NULL DEFAULT 180,
  start_time        BIGINT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','success','failed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_heists_diff CHECK (attacker_id <> target_team_id)
);

CREATE INDEX IF NOT EXISTS idx_heists_status ON heists (status);
CREATE INDEX IF NOT EXISTS idx_heists_attacker ON heists (attacker_id);
CREATE INDEX IF NOT EXISTS idx_heists_target ON heists (target_team_id);

DROP TRIGGER IF EXISTS trg_heists_updated_at ON heists;
CREATE TRIGGER trg_heists_updated_at
  BEFORE UPDATE ON heists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 7. Announcements ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','success','error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_time ON announcements (created_at DESC);

-- ── 8. Seed 5 default teams ────────────────────────────────────────────────
INSERT INTO teams (name, access_code) VALUES
  ('Cyber Wolves',   'TEAM001'),
  ('Digital Pirates', 'TEAM002'),
  ('Neon Raiders',   'TEAM003'),
  ('Shadow Coders',  'TEAM004'),
  ('Quantum Thieves','TEAM005')
ON CONFLICT (access_code) DO NOTHING;

-- ── 9. Row Level Security — allow service role full access ─────────────────
-- (The API uses the service_role key, so RLS is bypassed automatically.
--  These policies are here in case you expose tables via Supabase client.)

ALTER TABLE event_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_powerups  ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE heists         ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements  ENABLE ROW LEVEL SECURITY;

-- Service role bypass is automatic. Add read-only anon policies if needed:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_teams') THEN
    CREATE POLICY anon_read_teams ON teams FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_announcements') THEN
    CREATE POLICY anon_read_announcements ON announcements FOR SELECT TO anon USING (true);
  END IF;
END $$;

COMMIT;
