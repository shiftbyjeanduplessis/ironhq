-- ============================================================
-- IronHQ Migration 00003 — RPCs
-- Run after 00002_rls.sql
-- All functions use SECURITY DEFINER + SET search_path = public.
-- All are REVOKED from PUBLIC and GRANTED to authenticated only.
-- ============================================================

-- ============================================================
-- RPC: redeem_invite
-- Called by the onboarding flow after a user signs up.
-- Validates the token, matches email, creates membership,
-- initializes athlete_profile if applicable.
-- Uses FOR UPDATE to prevent race conditions.
-- ============================================================
CREATE OR REPLACE FUNCTION redeem_invite(
  p_token      UUID,
  p_first_name TEXT,
  p_last_name  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite           RECORD;
  v_current_email    CITEXT;
  v_coarse_role      TEXT;
BEGIN
  -- Get the current user's trusted email
  SELECT email INTO v_current_email
  FROM profiles
  WHERE id = auth.uid();

  -- Lock the invite row to prevent concurrent redemptions
  SELECT * INTO v_invite
  FROM invites
  WHERE invite_token = p_token
    AND status       = 'pending'
    AND expires_at   > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite invalid or expired';
  END IF;

  -- Case-insensitive email validation
  IF v_invite.invited_email != v_current_email THEN
    RAISE EXCEPTION 'Unauthorized: email does not match this invite';
  END IF;

  -- Map club role to coarse global role for UI routing
  v_coarse_role := CASE
    WHEN v_invite.intended_role IN ('coach', 'assistant_coach', 'manager') THEN 'coach'
    ELSE 'athlete'
  END;

  -- Update the profile
  UPDATE profiles
  SET
    first_name   = p_first_name,
    last_name    = p_last_name,
    display_name = p_first_name || ' ' || p_last_name,
    primary_role = v_coarse_role,
    is_active    = true
  WHERE id = auth.uid();

  -- Create membership (safe on duplicate)
  INSERT INTO club_memberships (club_id, profile_id, role, status)
  VALUES (v_invite.club_id, auth.uid(), v_invite.intended_role, 'active')
  ON CONFLICT (club_id, profile_id)
  DO UPDATE SET status = 'active', role = EXCLUDED.role;

  -- Initialize athlete extension if needed
  IF v_invite.intended_role = 'athlete' THEN
    INSERT INTO athlete_profiles (profile_id, primary_club_id)
    VALUES (auth.uid(), v_invite.club_id)
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  -- Mark invite accepted
  UPDATE invites
  SET status = 'accepted'
  WHERE id = v_invite.id;
END;
$$;

REVOKE ALL ON FUNCTION redeem_invite(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_invite(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================
-- RPC: assign_custom_workout
-- Called from the Coach Architect UI.
-- Creates one planned workout assignment for a single athlete.
-- This is a one-off assignment (not a reusable template save).
-- For multi-week program materialization, use assign_program_to_athlete.
--
-- Validates:
-- 1. Caller is active coach in the club
-- 2. Target is active athlete in the same club
-- 3. Workout name is not blank
-- 4. Exercise list is not empty
-- 5. Every exercise belongs to the club or is a system default
-- 6. sets > 0, reps > 0, load >= 0 for all exercises
-- ============================================================
CREATE OR REPLACE FUNCTION assign_custom_workout(
  p_club_id        UUID,
  p_profile_id     UUID,
  p_workout_name   TEXT,
  p_scheduled_date DATE,
  p_exercises      JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id UUID;
  v_workout_id    UUID;
  v_exercise      JSONB;
  v_ex_id         UUID;
  v_sets          INT;
  v_reps          INT;
  v_load          NUMERIC;
  v_sort          INT;
BEGIN
  -- 1. Validate caller is active coach in this club
  IF NOT is_active_coach(p_club_id) THEN
    RAISE EXCEPTION 'Unauthorized: you are not an active coach in this club';
  END IF;

  -- 2. Validate workout name
  IF p_workout_name IS NULL OR trim(p_workout_name) = '' THEN
    RAISE EXCEPTION 'Validation error: workout name cannot be blank';
  END IF;

  -- 3. Validate exercise list is not empty
  IF p_exercises IS NULL OR jsonb_array_length(p_exercises) = 0 THEN
    RAISE EXCEPTION 'Validation error: workout must contain at least one exercise';
  END IF;

  -- 4. Validate target athlete is active in the same club
  IF NOT EXISTS (
    SELECT 1 FROM club_memberships
    WHERE club_id    = p_club_id
      AND profile_id = p_profile_id
      AND role       = 'athlete'
      AND status     = 'active'
  ) THEN
    RAISE EXCEPTION 'Validation error: target is not an active athlete in this club';
  END IF;

  -- 5. Validate every exercise in the payload
  FOR v_exercise IN SELECT * FROM jsonb_array_elements(p_exercises) LOOP
    v_ex_id := (v_exercise->>'id')::UUID;
    v_sets  := (v_exercise->>'sets')::INT;
    v_reps  := (v_exercise->>'reps')::INT;
    v_load  := (v_exercise->>'load')::NUMERIC;

    IF v_sets IS NULL OR v_sets <= 0 THEN
      RAISE EXCEPTION 'Validation error: sets must be > 0 for exercise %', v_ex_id;
    END IF;

    IF v_reps IS NULL OR v_reps <= 0 THEN
      RAISE EXCEPTION 'Validation error: reps must be > 0 for exercise %', v_ex_id;
    END IF;

    IF v_load IS NULL OR v_load < 0 THEN
      RAISE EXCEPTION 'Validation error: load must be >= 0 for exercise %', v_ex_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM exercises
      WHERE id = v_ex_id
        AND (is_system_default = true OR club_id = p_club_id)
    ) THEN
      RAISE EXCEPTION 'Validation error: exercise % does not exist or is not available to this club', v_ex_id;
    END IF;
  END LOOP;

  -- 6. Create the assignment anchor
  INSERT INTO program_assignments (
    club_id,
    profile_id,
    status,
    start_date
  ) VALUES (
    p_club_id,
    p_profile_id,
    'assigned',
    p_scheduled_date
  )
  RETURNING id INTO v_assignment_id;

  -- 7. Create the planned workout
  INSERT INTO assigned_workouts (
    program_assignment_id,
    club_id,
    profile_id,
    workout_name,
    scheduled_date
  ) VALUES (
    v_assignment_id,
    p_club_id,
    p_profile_id,
    trim(p_workout_name),
    p_scheduled_date
  )
  RETURNING id INTO v_workout_id;

  -- 8. Insert each planned exercise block
  FOR v_exercise IN SELECT * FROM jsonb_array_elements(p_exercises) LOOP
    v_ex_id := (v_exercise->>'id')::UUID;
    v_sets  := (v_exercise->>'sets')::INT;
    v_reps  := (v_exercise->>'reps')::INT;
    v_load  := (v_exercise->>'load')::NUMERIC;
    v_sort  := (v_exercise->>'sort_order')::INT;

    INSERT INTO assigned_workout_exercises (
      assigned_workout_id,
      club_id,
      exercise_id,
      planned_sets,
      planned_reps,
      planned_load_value,
      sort_order
    ) VALUES (
      v_workout_id,
      p_club_id,
      v_ex_id,
      v_sets,
      v_reps,
      v_load,
      v_sort
    );
  END LOOP;

  RETURN v_workout_id;
END;
$$;

REVOKE ALL ON FUNCTION assign_custom_workout(UUID, UUID, TEXT, DATE, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION assign_custom_workout(UUID, UUID, TEXT, DATE, JSONB) TO authenticated;

-- ============================================================
-- RPC: assign_program_to_athlete
-- Materializes a multi-week program_template into individual
-- assigned_workouts for a specific athlete.
-- Uses the athlete's most recent max profile for load calc.
-- Date math: (week_number - 1) * 7 + day_index
-- ============================================================
CREATE OR REPLACE FUNCTION assign_program_to_athlete(
  p_club_id    UUID,
  p_profile_id UUID,
  p_program_id UUID,
  p_start_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id       UUID;
  v_max_profile_id      UUID;
  v_increment           NUMERIC;
  v_program_club_id     UUID;
BEGIN
  -- Validate caller
  IF NOT is_active_coach(p_club_id) THEN
    RAISE EXCEPTION 'Unauthorized: you are not an active coach in this club';
  END IF;

  -- Validate the program belongs to the same club
  SELECT club_id, default_rounding_increment
  INTO v_program_club_id, v_increment
  FROM program_templates
  WHERE id = p_program_id;

  IF v_program_club_id IS DISTINCT FROM p_club_id THEN
    RAISE EXCEPTION 'Validation error: program does not belong to this club';
  END IF;

  -- Validate target athlete
  IF NOT EXISTS (
    SELECT 1 FROM club_memberships
    WHERE club_id    = p_club_id
      AND profile_id = p_profile_id
      AND role       = 'athlete'
      AND status     = 'active'
  ) THEN
    RAISE EXCEPTION 'Validation error: target is not an active athlete in this club';
  END IF;

  -- Get most recent max profile
  SELECT id INTO v_max_profile_id
  FROM athlete_max_profiles
  WHERE profile_id = p_profile_id
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Create the assignment
  INSERT INTO program_assignments (
    club_id,
    profile_id,
    program_template_id,
    source_max_profile_id,
    status,
    start_date
  ) VALUES (
    p_club_id,
    p_profile_id,
    p_program_id,
    v_max_profile_id,
    'active',
    p_start_date
  )
  RETURNING id INTO v_assignment_id;

  -- Materialize workouts: (week_number - 1) * 7 + day_index
  INSERT INTO assigned_workouts (
    program_assignment_id,
    club_id,
    profile_id,
    workout_name,
    scheduled_date
  )
  SELECT
    v_assignment_id,
    p_club_id,
    p_profile_id,
    wt.name,
    p_start_date + ((pw.week_number - 1) * 7) + pws.day_index
  FROM program_week_slots pws
  JOIN program_weeks pw           ON pws.program_week_id     = pw.id
  JOIN workout_templates wt       ON pws.workout_template_id = wt.id
  WHERE pw.program_template_id = p_program_id;

  -- TODO: Inner loop to materialize exercises with % load calculation
  -- ROUND((max * (percent/100)) / increment) * increment

  RETURN v_assignment_id;
END;
$$;

REVOKE ALL ON FUNCTION assign_program_to_athlete(UUID, UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION assign_program_to_athlete(UUID, UUID, UUID, DATE) TO authenticated;

-- ============================================================
-- RPC: complete_workout
-- Called when an athlete finishes logging a workout.
-- Marks the log as completed, sets completed_at,
-- and the process_workout_prs trigger fires automatically.
-- ============================================================
CREATE OR REPLACE FUNCTION complete_workout(
  p_workout_log_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE workout_logs
  SET
    status       = 'completed',
    completed_at = NOW()
  WHERE id         = p_workout_log_id
    AND profile_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workout log not found or not owned by current user';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION complete_workout(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_workout(UUID) TO authenticated;

-- ============================================================
-- RPC: save_log_set
-- Inserts a single set into workout_log_sets.
-- Validates the set belongs to the current user's log.
-- The frontend uses optimistic UI; this is the server truth.
-- ============================================================
CREATE OR REPLACE FUNCTION save_log_set(
  p_workout_log_exercise_id UUID,
  p_actual_reps             INT,
  p_actual_load             NUMERIC,
  p_actual_rpe              NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_set_id UUID;
BEGIN
  -- Validate ownership: the exercise must belong to this user's log
  IF NOT EXISTS (
    SELECT 1
    FROM workout_log_exercises wle
    JOIN workout_logs wl ON wle.workout_log_id = wl.id
    WHERE wle.id       = p_workout_log_exercise_id
      AND wl.profile_id = auth.uid()
      AND wl.status    IN ('in_progress', 'saved_draft')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: log exercise not found or workout is already completed';
  END IF;

  IF p_actual_reps IS NULL OR p_actual_reps < 0 THEN
    RAISE EXCEPTION 'Validation error: reps must be >= 0';
  END IF;

  IF p_actual_load IS NULL OR p_actual_load < 0 THEN
    RAISE EXCEPTION 'Validation error: load must be >= 0';
  END IF;

  INSERT INTO workout_log_sets (
    workout_log_exercise_id,
    actual_reps,
    actual_load,
    actual_rpe,
    is_completed
  ) VALUES (
    p_workout_log_exercise_id,
    p_actual_reps,
    p_actual_load,
    p_actual_rpe,
    true
  )
  RETURNING id INTO v_set_id;

  RETURN v_set_id;
END;
$$;

REVOKE ALL ON FUNCTION save_log_set(UUID, INT, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_log_set(UUID, INT, NUMERIC, NUMERIC) TO authenticated;

-- ============================================================
-- RPC: start_assigned_workout
-- Creates a workout_log from an assigned_workout.
-- Also inserts workout_log_exercise rows from the planned side.
-- Returns the new workout_log id for the frontend to track.
-- ============================================================
CREATE OR REPLACE FUNCTION start_assigned_workout(
  p_assigned_workout_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workout     RECORD;
  v_log_id      UUID;
  v_ex          RECORD;
  v_log_ex_id   UUID;
BEGIN
  -- Validate the assigned workout belongs to this user
  SELECT * INTO v_workout
  FROM assigned_workouts
  WHERE id         = p_assigned_workout_id
    AND profile_id = auth.uid()
    AND status     = 'assigned';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assigned workout not found or already started';
  END IF;

  -- Create the log
  INSERT INTO workout_logs (
    assigned_workout_id,
    club_id,
    profile_id,
    log_type,
    status
  ) VALUES (
    v_workout.id,
    v_workout.club_id,
    auth.uid(),
    'assigned',
    'in_progress'
  )
  RETURNING id INTO v_log_id;

  -- Mirror planned exercises into log exercises
  FOR v_ex IN
    SELECT * FROM assigned_workout_exercises
    WHERE assigned_workout_id = p_assigned_workout_id
    ORDER BY sort_order
  LOOP
    INSERT INTO workout_log_exercises (
      workout_log_id,
      assigned_workout_id,
      source_assigned_exercise_id,
      exercise_id,
      sort_order
    ) VALUES (
      v_log_id,
      p_assigned_workout_id,
      v_ex.id,
      v_ex.exercise_id,
      v_ex.sort_order
    );
  END LOOP;

  -- Update the assigned workout status
  UPDATE assigned_workouts
  SET status = 'in_progress'
  WHERE id = p_assigned_workout_id;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION start_assigned_workout(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_assigned_workout(UUID) TO authenticated;
