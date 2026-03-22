-- ============================================================
-- IronHQ Seed Data — Local Development
-- Run AFTER all migrations.
--
-- HOW TO USE:
-- 1. Run: npx supabase start
-- 2. Open http://localhost:54323 (Supabase Studio)
-- 3. Go to Authentication → Users → Create user
--    Create: coach@ironhq.local (this will be the head coach)
--    Create: athlete@ironhq.local (this will be the test athlete)
-- 4. Copy their UUIDs from the Users table
-- 5. Paste them below where indicated
-- 6. Run this script in the SQL Editor
-- ============================================================

DO $$
DECLARE
  -- ⚠️  REPLACE THESE with real UUIDs from your local auth.users
  v_coach_id   UUID := '00000000-0000-0000-0000-000000000001';
  v_athlete_id UUID := '00000000-0000-0000-0000-000000000002';

  v_club_id         UUID := gen_random_uuid();
  v_program_id      UUID := gen_random_uuid();
  v_week_id         UUID := gen_random_uuid();
  v_workout_tmpl_id UUID := gen_random_uuid();
  v_slot_id         UUID := gen_random_uuid();
  v_squat_id        UUID;
  v_bench_id        UUID;
  v_deadlift_id     UUID;
BEGIN

  -- ── Club ──────────────────────────────────────────────────
  INSERT INTO clubs (id, name, slug, is_active)
  VALUES (v_club_id, 'IronHQ Demo Club', 'ironhq-demo', true)
  ON CONFLICT (slug) DO UPDATE SET id = v_club_id
  RETURNING id INTO v_club_id;

  -- ── Profiles ──────────────────────────────────────────────
  ALTER TABLE profiles DISABLE TRIGGER ALL;

  INSERT INTO profiles (id, email, first_name, last_name, display_name, primary_role, is_active)
  VALUES
    (v_coach_id,   'coach@ironhq.local',   'Demo',   'Coach',   'Demo Coach',   'coach',   true),
    (v_athlete_id, 'athlete@ironhq.local', 'Demo',   'Athlete', 'Demo Athlete', 'athlete', true)
  ON CONFLICT (id) DO UPDATE SET
    first_name   = EXCLUDED.first_name,
    last_name    = EXCLUDED.last_name,
    display_name = EXCLUDED.display_name,
    primary_role = EXCLUDED.primary_role,
    is_active    = EXCLUDED.is_active;

  ALTER TABLE profiles ENABLE TRIGGER ALL;

  -- ── Athlete extension ─────────────────────────────────────
  INSERT INTO athlete_profiles (profile_id, primary_club_id, sport, onboarding_complete)
  VALUES (v_athlete_id, v_club_id, 'Powerlifting', true)
  ON CONFLICT (profile_id) DO NOTHING;

  -- ── Memberships ───────────────────────────────────────────
  INSERT INTO club_memberships (club_id, profile_id, role, status, billing_status)
  VALUES
    (v_club_id, v_coach_id,   'coach',   'active', 'paid'),
    (v_club_id, v_athlete_id, 'athlete', 'active', 'paid')
  ON CONFLICT (club_id, profile_id) DO UPDATE SET
    status = 'active';

  -- ── System exercises ──────────────────────────────────────
  INSERT INTO exercises (name, category, method, is_system_default)
  VALUES
    ('Back Squat',              'squat',        'percent_of_max',  true),
    ('Front Squat',             'squat',        'rpe_based',        true),
    ('Competition Bench Press', 'bench',        'percent_of_max',  true),
    ('Close Grip Bench Press',  'bench',        'fixed_load',       true),
    ('Conventional Deadlift',   'hinge',        'percent_of_max',  true),
    ('Romanian Deadlift',       'hinge',        'rpe_based',        true),
    ('Strict Overhead Press',   'press',        'percent_of_max',  true),
    ('Push Press',              'press',        'fixed_load',       true),
    ('Weighted Pull-Up',        'pull',         'reps_only',        true),
    ('Barbell Row',             'pull',         'fixed_load',       true),
    ('Power Clean',             'olympic_lift', 'percent_of_max',  true),
    ('Hang Power Snatch',       'olympic_lift', 'percent_of_max',  true),
    ('Box Jump',                'power',        'reps_only',        true),
    ('Assault Bike Sprint',     'conditioning', 'time_based',       true),
    ('Bicep Curl',              'accessory',    'coach_manual',     true),
    ('Tricep Pushdown',         'accessory',    'coach_manual',     true)
  ON CONFLICT DO NOTHING;

  -- Get exercise IDs for use in workout template
  SELECT id INTO v_squat_id    FROM exercises WHERE name = 'Back Squat' LIMIT 1;
  SELECT id INTO v_bench_id    FROM exercises WHERE name = 'Competition Bench Press' LIMIT 1;
  SELECT id INTO v_deadlift_id FROM exercises WHERE name = 'Conventional Deadlift' LIMIT 1;

  -- ── Workout template ──────────────────────────────────────
  INSERT INTO workout_templates (id, club_id, created_by_profile_id, name)
  VALUES (v_workout_tmpl_id, v_club_id, v_coach_id, 'Day A — Squat / Bench / Deadlift')
  ON CONFLICT DO NOTHING;

  INSERT INTO workout_template_exercises
    (workout_template_id, exercise_id, sort_order, planned_sets, planned_reps, planned_load_value)
  VALUES
    (v_workout_tmpl_id, v_squat_id,    1, 5, 5, 100),
    (v_workout_tmpl_id, v_bench_id,    2, 5, 5, 80),
    (v_workout_tmpl_id, v_deadlift_id, 3, 3, 5, 120)
  ON CONFLICT DO NOTHING;

  -- ── Program template ──────────────────────────────────────
  INSERT INTO program_templates (id, club_id, created_by_profile_id, name, total_weeks)
  VALUES (v_program_id, v_club_id, v_coach_id, 'Demo 4-Week Block', 1)
  ON CONFLICT DO NOTHING;

  INSERT INTO program_weeks (id, program_template_id, week_number, phase_name)
  VALUES (v_week_id, v_program_id, 1, 'Week 1 — Introduction')
  ON CONFLICT DO NOTHING;

  INSERT INTO program_week_slots (id, program_week_id, workout_template_id, day_index)
  VALUES (v_slot_id, v_week_id, v_workout_tmpl_id, 1)
  ON CONFLICT DO NOTHING;

  -- ── Athlete max profile ───────────────────────────────────
  INSERT INTO athlete_max_profiles (profile_id, squat_max, bench_max, deadlift_max, effective_date)
  VALUES (v_athlete_id, 160, 100, 200, CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Seed complete. Club: %, Coach: %, Athlete: %',
    v_club_id, v_coach_id, v_athlete_id;

END $$;
