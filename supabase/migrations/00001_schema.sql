-- ============================================================
-- IronHQ Migration 00001 — Core Schema
-- Run this first. No dependencies on other migrations.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ============================================================
-- TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- IDENTITY — profiles
-- Must be created before any table that references it.
-- Mapped 1:1 to auth.users. profiles.id IS the user id.
-- primary_role is a coarse UI routing hint only.
-- Real authorization always comes from club_memberships.
-- ============================================================
CREATE TABLE profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           CITEXT      UNIQUE NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  display_name    TEXT,
  primary_role    TEXT        CHECK (primary_role IN ('athlete', 'coach', 'admin')),
  is_active       BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- CLUBS
-- Created before athlete_profiles and memberships (FK deps).
-- ============================================================
CREATE TABLE clubs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       CITEXT      UNIQUE NOT NULL,
  is_active  BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_clubs_updated_at
  BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- ATHLETE PROFILES — 1:1 extension of profiles
-- profile_id IS the primary key. No separate UUID.
-- ============================================================
CREATE TABLE athlete_profiles (
  profile_id          UUID        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  primary_club_id     UUID        REFERENCES clubs(id),
  sport               TEXT,
  bodyweight_value    NUMERIC     CHECK (bodyweight_value > 0),
  bodyweight_unit     TEXT        CHECK (bodyweight_unit IN ('lb', 'kg')),
  onboarding_complete BOOLEAN     DEFAULT false,
  visibility          TEXT        CHECK (visibility IN ('name_only', 'basic_stats', 'full_stats')) DEFAULT 'full_stats',
  athlete_notes       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_athlete_profiles_updated_at
  BEFORE UPDATE ON athlete_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- CLUB MEMBERSHIPS
-- Includes billing placeholder fields.
-- role here is the club-scoped role (the real authorization source).
-- ============================================================
CREATE TABLE club_memberships (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  profile_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role                TEXT        NOT NULL CHECK (role IN ('athlete', 'coach', 'assistant_coach', 'manager')),
  status              TEXT        NOT NULL CHECK (status IN ('invited', 'active', 'suspended', 'left')),
  billing_status      TEXT        CHECK (billing_status IN ('paid', 'unpaid', 'comped', 'past_due')) DEFAULT 'paid',
  next_billing_date   DATE,
  payment_method_note TEXT,
  joined_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (club_id, profile_id)
);

CREATE TRIGGER set_club_memberships_updated_at
  BEFORE UPDATE ON club_memberships
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX idx_club_memberships_access
  ON club_memberships (profile_id, status, club_id);

CREATE INDEX idx_club_memberships_club_roster
  ON club_memberships (club_id, status, role);

-- ============================================================
-- INVITES
-- invited_email is CITEXT for case-insensitive matching.
-- invite_token is unique — used as the redemption URL param.
-- ============================================================
CREATE TABLE invites (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  invited_by_profile_id UUID        REFERENCES profiles(id),
  invited_email         CITEXT      NOT NULL,
  intended_role         TEXT        NOT NULL CHECK (intended_role IN ('athlete', 'coach', 'assistant_coach', 'manager')),
  invite_token          UUID        DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  status                TEXT        NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')) DEFAULT 'pending',
  expires_at            TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_invites_updated_at
  BEFORE UPDATE ON invites
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Partial index — only pending invites need fast token lookup.
CREATE INDEX idx_invites_token
  ON invites (invite_token)
  WHERE status = 'pending';

CREATE INDEX idx_invites_email_status
  ON invites (invited_email, status);

-- ============================================================
-- EXERCISES
-- club_id NULL = system default (available to all clubs).
-- is_system_default = true also signals global availability.
-- Both conditions are used in queries: is_system_default OR club_id = X
-- ============================================================
CREATE TABLE exercises (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID    REFERENCES clubs(id) ON DELETE CASCADE,
  name             TEXT    NOT NULL,
  category         TEXT    CHECK (category IN (
                     'squat', 'bench', 'hinge', 'press', 'pull',
                     'olympic_lift', 'accessory', 'power', 'conditioning'
                   )),
  method           TEXT    CHECK (method IN (
                     'percent_of_max', 'fixed_load', 'reps_only',
                     'rpe_based', 'time_based', 'coach_manual'
                   )),
  is_system_default BOOLEAN DEFAULT false
);

CREATE INDEX idx_exercises_club ON exercises (club_id, name);

-- ============================================================
-- WORKOUT TEMPLATES
-- The reusable planned workout units coaches build.
-- ============================================================
CREATE TABLE workout_templates (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by_profile_id UUID        REFERENCES profiles(id),
  name                  TEXT        NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workout_template_exercises (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_template_id UUID    NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id         UUID    NOT NULL REFERENCES exercises(id),
  sort_order          INT     NOT NULL,
  planned_sets        INT     CHECK (planned_sets > 0),
  planned_reps        INT     CHECK (planned_reps > 0),
  planned_load_value  NUMERIC CHECK (planned_load_value >= 0),
  load_type           TEXT,
  percentage_value    NUMERIC CHECK (percentage_value > 0 AND percentage_value <= 110),
  rpe_target          NUMERIC CHECK (rpe_target >= 5 AND rpe_target <= 10),
  UNIQUE (workout_template_id, sort_order)
);

-- ============================================================
-- PROGRAM TEMPLATES
-- Multi-week training blocks built by coaches.
-- ============================================================
CREATE TABLE program_templates (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id                   UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by_profile_id     UUID        REFERENCES profiles(id),
  name                      TEXT        NOT NULL,
  total_weeks               INT         NOT NULL CHECK (total_weeks > 0),
  default_rounding_increment NUMERIC    DEFAULT 2.5,
  is_archived               BOOLEAN     DEFAULT false,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_program_templates_updated_at
  BEFORE UPDATE ON program_templates
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TABLE program_weeks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_template_id UUID        NOT NULL REFERENCES program_templates(id) ON DELETE CASCADE,
  week_number         INT         NOT NULL CHECK (week_number > 0),
  phase_name          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (program_template_id, week_number)
);

CREATE TABLE program_week_slots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_week_id     UUID NOT NULL REFERENCES program_weeks(id) ON DELETE CASCADE,
  workout_template_id UUID REFERENCES workout_templates(id),
  slot_label          TEXT,
  day_index           INT  CHECK (day_index BETWEEN 0 AND 6),
  UNIQUE (program_week_id, day_index)
);

-- ============================================================
-- ATHLETE MAX PROFILES
-- Snapshots of athlete maxes used during program materialization.
-- effective_date is required — no undated maxes.
-- ============================================================
CREATE TABLE athlete_max_profiles (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  squat_max      NUMERIC CHECK (squat_max >= 0),
  bench_max      NUMERIC CHECK (bench_max >= 0),
  deadlift_max   NUMERIC CHECK (deadlift_max >= 0),
  effective_date DATE    NOT NULL
);

CREATE INDEX idx_athlete_max_profiles_lookup
  ON athlete_max_profiles (profile_id, effective_date DESC);

-- ============================================================
-- PROGRAM ASSIGNMENTS
-- Connects an athlete to a program.
-- UNIQUE (id, profile_id) is the composite anchor used by
-- assigned_workouts to enforce ownership consistency.
-- ============================================================
CREATE TABLE program_assignments (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id              UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  profile_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_template_id  UUID        REFERENCES program_templates(id),
  source_max_profile_id UUID       REFERENCES athlete_max_profiles(id),
  status               TEXT        NOT NULL CHECK (status IN (
                         'draft', 'assigned', 'active', 'completed', 'cancelled', 'paused'
                       )),
  start_date           DATE        NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id, profile_id),
  UNIQUE (id, club_id)
);

CREATE INDEX idx_program_assignments_athlete
  ON program_assignments (profile_id, status);

-- ============================================================
-- ASSIGNED WORKOUTS — PLANNED SIDE
-- Composite FK to program_assignments enforces cross-table
-- ownership consistency: the same athlete must own both rows.
-- UNIQUE (id, profile_id) is the anchor for workout_logs.
-- UNIQUE (id, club_id) is the anchor for assigned_workout_exercises.
-- ============================================================
CREATE TABLE assigned_workouts (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_assignment_id UUID       NOT NULL,
  club_id              UUID        NOT NULL,
  profile_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_name         TEXT,
  scheduled_date       DATE        NOT NULL,
  status               TEXT        NOT NULL CHECK (status IN (
                         'assigned', 'in_progress', 'completed', 'skipped', 'missed', 'archived'
                       )) DEFAULT 'assigned',
  FOREIGN KEY (program_assignment_id, profile_id)
    REFERENCES program_assignments (id, profile_id) ON DELETE CASCADE,
  FOREIGN KEY (program_assignment_id, club_id)
    REFERENCES program_assignments (id, club_id) ON DELETE CASCADE,
  UNIQUE (id, profile_id),
  UNIQUE (id, club_id)
);

CREATE INDEX idx_assigned_workouts_athlete
  ON assigned_workouts (profile_id, scheduled_date, status);

CREATE INDEX idx_assigned_workouts_assignment
  ON assigned_workouts (program_assignment_id, scheduled_date);

-- ============================================================
-- ASSIGNED WORKOUT EXERCISES — PLANNED SIDE
-- Composite FK ensures each exercise row belongs to the same
-- club as its parent workout, sealing the ownership chain.
-- UNIQUE (id, assigned_workout_id) is the anchor for
-- workout_log_exercises to prevent cross-workout exercise linking.
-- ============================================================
CREATE TABLE assigned_workout_exercises (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_workout_id UUID    NOT NULL,
  club_id             UUID    NOT NULL,
  exercise_id         UUID    NOT NULL REFERENCES exercises(id),
  planned_sets        INT     CHECK (planned_sets > 0),
  planned_reps        INT     CHECK (planned_reps > 0),
  planned_load_value  NUMERIC CHECK (planned_load_value >= 0),
  planned_percentage  NUMERIC CHECK (planned_percentage > 0 AND planned_percentage <= 110),
  planned_rpe         NUMERIC CHECK (planned_rpe >= 5 AND planned_rpe <= 10),
  sort_order          INT     NOT NULL,
  FOREIGN KEY (assigned_workout_id, club_id)
    REFERENCES assigned_workouts (id, club_id) ON DELETE CASCADE,
  UNIQUE (id, assigned_workout_id)
);

-- ============================================================
-- WORKOUT LOGS — ACTUAL SIDE
-- UNIQUE on assigned_workout_id = one log per planned workout.
-- Composite FK mirrors assigned_workouts ownership.
-- ============================================================
CREATE TABLE workout_logs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_workout_id  UUID        UNIQUE REFERENCES assigned_workouts(id) ON DELETE SET NULL,
  club_id              UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  profile_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manual_workout_title TEXT,
  log_type             TEXT        NOT NULL CHECK (log_type IN ('assigned', 'manual')),
  total_volume         NUMERIC     DEFAULT 0 CHECK (total_volume >= 0),
  status               TEXT        NOT NULL CHECK (status IN (
                         'in_progress', 'completed', 'saved_draft', 'skipped', 'missed'
                       )) DEFAULT 'in_progress',
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id, assigned_workout_id)
);

CREATE INDEX idx_workout_logs_athlete
  ON workout_logs (profile_id, completed_at DESC)
  WHERE status = 'completed';

CREATE INDEX idx_workout_logs_club
  ON workout_logs (club_id, status, completed_at DESC);

-- ============================================================
-- WORKOUT LOG EXERCISES — ACTUAL SIDE
-- Composite FK (workout_log_id, assigned_workout_id) ensures
-- the logged exercise belongs to the exact workout being logged.
-- Composite FK on source_assigned_exercise_id seals the
-- cross-workout exercise linking vulnerability.
-- ============================================================
CREATE TABLE workout_log_exercises (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id            UUID NOT NULL,
  assigned_workout_id       UUID,
  source_assigned_exercise_id UUID,
  exercise_id               UUID NOT NULL REFERENCES exercises(id),
  sort_order                INT  NOT NULL,
  FOREIGN KEY (workout_log_id, assigned_workout_id)
    REFERENCES workout_logs (id, assigned_workout_id) ON DELETE CASCADE,
  FOREIGN KEY (source_assigned_exercise_id, assigned_workout_id)
    REFERENCES assigned_workout_exercises (id, assigned_workout_id)
);

-- ============================================================
-- WORKOUT LOG SETS — ACTUAL SIDE
-- The leaf node of the actual data model.
-- ============================================================
CREATE TABLE workout_log_sets (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_exercise_id UUID    NOT NULL REFERENCES workout_log_exercises(id) ON DELETE CASCADE,
  actual_reps             INT     CHECK (actual_reps >= 0),
  actual_load             NUMERIC CHECK (actual_load >= 0),
  actual_rpe              NUMERIC CHECK (actual_rpe >= 0 AND actual_rpe <= 10),
  is_completed            BOOLEAN DEFAULT true
);

-- ============================================================
-- PERSONAL RECORDS
-- Written by the PR detection trigger (process_workout_prs).
-- Stores both absolute and estimated (Epley) records.
-- ============================================================
CREATE TABLE personal_records (
  id                     UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id             UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id            UUID    REFERENCES exercises(id),
  exercise_name_snapshot TEXT    NOT NULL,
  pr_type                TEXT    NOT NULL,
  value                  NUMERIC NOT NULL CHECK (value > 0),
  achieved_on            DATE    NOT NULL,
  source_type            TEXT
);

CREATE INDEX idx_personal_records_athlete
  ON personal_records (profile_id, exercise_id, pr_type, achieved_on DESC);

-- ============================================================
-- NOTICES + ACKNOWLEDGEMENTS
-- ============================================================
CREATE TABLE notices (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id                  UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by_profile_id    UUID        REFERENCES profiles(id),
  title                    TEXT        NOT NULL,
  body                     TEXT        NOT NULL,
  priority                 TEXT        CHECK (priority IN ('normal', 'urgent')) DEFAULT 'normal',
  requires_acknowledgement BOOLEAN     DEFAULT false,
  published_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notice_acknowledgements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id       UUID        NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  profile_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (notice_id, profile_id)
);

-- ============================================================
-- CONVERSATIONS + MESSAGES
-- Restricted to club members. Type = direct or group.
-- ============================================================
CREATE TABLE conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('direct', 'group'))
);

CREATE TABLE conversation_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE (conversation_id, profile_id)
);

CREATE TABLE messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_profile_id UUID      NOT NULL REFERENCES profiles(id),
  body            TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation
  ON messages (conversation_id, created_at DESC);

-- ============================================================
-- NOTIFICATION OUTBOX
-- Webhook/edge function events are written here first.
-- UNIQUE on (event_type, reference_id, target_profile_id)
-- ensures one notification per event per recipient.
-- Idempotent: ON CONFLICT DO NOTHING in edge functions.
-- ============================================================
CREATE TABLE notification_outbox (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        TEXT        NOT NULL,
  target_profile_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reference_id      UUID        NOT NULL,
  status            TEXT        DEFAULT 'pending',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_type, reference_id, target_profile_id)
);

-- ============================================================
-- CLUB BRANDING (light personalization layer)
-- Only affects accent color, logo, and theme — not layout.
-- ============================================================
CREATE TABLE club_branding (
  club_id      UUID PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,
  logo_url     TEXT,
  accent_color TEXT,
  theme_preset TEXT CHECK (theme_preset IN ('default', 'dark', 'iron', 'slate'))
);

-- ============================================================
-- PR DETECTION TRIGGER
-- Fires when workout_log.status changes to 'completed'.
-- Uses Epley formula: e1RM = load * (1 + reps/30)
-- ============================================================
CREATE OR REPLACE FUNCTION process_workout_prs()
RETURNS TRIGGER AS $$
DECLARE
  set_record        RECORD;
  calculated_e1rm   NUMERIC;
  existing_pr_value NUMERIC;
  ex_name           TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    FOR set_record IN
      SELECT
        wle.exercise_id,
        e.name AS exercise_name,
        wls.actual_reps,
        wls.actual_load
      FROM workout_log_exercises wle
      JOIN workout_log_sets wls ON wle.id = wls.workout_log_exercise_id
      JOIN exercises e ON wle.exercise_id = e.id
      WHERE wle.workout_log_id = NEW.id
        AND wls.is_completed = true
        AND wls.actual_reps > 0
        AND wls.actual_load > 0
    LOOP
      calculated_e1rm := ROUND(
        set_record.actual_load * (1.0 + (set_record.actual_reps / 30.0))
      );

      SELECT value INTO existing_pr_value
      FROM personal_records
      WHERE profile_id   = NEW.profile_id
        AND exercise_id  = set_record.exercise_id
        AND pr_type      = 'e1RM'
      ORDER BY value DESC
      LIMIT 1;

      IF existing_pr_value IS NULL OR calculated_e1rm > existing_pr_value THEN
        INSERT INTO personal_records (
          profile_id,
          exercise_id,
          exercise_name_snapshot,
          pr_type,
          value,
          achieved_on,
          source_type
        ) VALUES (
          NEW.profile_id,
          set_record.exercise_id,
          set_record.exercise_name,
          'e1RM',
          calculated_e1rm,
          COALESCE(NEW.completed_at::date, CURRENT_DATE),
          'workout_log'
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_process_prs
  AFTER UPDATE ON workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION process_workout_prs();
