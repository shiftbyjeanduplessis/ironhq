-- ============================================================
-- IronHQ Migration 00005 — Program Template RPCs
-- Run after 00004_views.sql
-- These RPCs power the multi-week Program Builder UI.
-- ============================================================

-- ============================================================
-- RPC: save_program_template
-- Creates or updates a full program template including
-- weeks, slots, and workout template references.
-- Accepts a JSONB payload representing the entire program grid.
-- Idempotent: pass p_template_id to update, NULL to create.
--
-- Payload shape:
-- {
--   name: string,
--   total_weeks: number,
--   default_rounding_increment: number,
--   weeks: [
--     {
--       week_number: number,
--       phase_name: string | null,
--       slots: [
--         { day_index: number, workout_template_id: string | null, slot_label: string | null }
--       ]
--     }
--   ]
-- }
-- ============================================================
CREATE OR REPLACE FUNCTION save_program_template(
  p_club_id       UUID,
  p_template_id   UUID,        -- NULL = create new
  p_payload       JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_week        JSONB;
  v_week_id     UUID;
  v_slot        JSONB;
  v_name        TEXT;
  v_weeks       INT;
  v_increment   NUMERIC;
BEGIN
  -- Auth check
  IF NOT is_active_coach(p_club_id) THEN
    RAISE EXCEPTION 'Unauthorized: not an active coach in this club';
  END IF;

  -- Extract top-level fields
  v_name      := trim(p_payload->>'name');
  v_weeks     := (p_payload->>'total_weeks')::INT;
  v_increment := COALESCE((p_payload->>'default_rounding_increment')::NUMERIC, 2.5);

  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Validation error: program name cannot be blank';
  END IF;

  IF v_weeks IS NULL OR v_weeks < 1 OR v_weeks > 52 THEN
    RAISE EXCEPTION 'Validation error: total_weeks must be between 1 and 52';
  END IF;

  IF p_template_id IS NOT NULL THEN
    -- Update existing — verify it belongs to this club
    UPDATE program_templates
    SET
      name                        = v_name,
      total_weeks                 = v_weeks,
      default_rounding_increment  = v_increment
    WHERE id       = p_template_id
      AND club_id  = p_club_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Program template not found or does not belong to this club';
    END IF;

    v_template_id := p_template_id;

    -- Delete existing weeks (cascades to slots)
    DELETE FROM program_weeks WHERE program_template_id = v_template_id;

  ELSE
    -- Create new
    INSERT INTO program_templates (
      club_id,
      created_by_profile_id,
      name,
      total_weeks,
      default_rounding_increment
    ) VALUES (
      p_club_id,
      auth.uid(),
      v_name,
      v_weeks,
      v_increment
    )
    RETURNING id INTO v_template_id;
  END IF;

  -- Insert weeks and slots from payload
  FOR v_week IN SELECT * FROM jsonb_array_elements(p_payload->'weeks') LOOP
    INSERT INTO program_weeks (
      program_template_id,
      week_number,
      phase_name
    ) VALUES (
      v_template_id,
      (v_week->>'week_number')::INT,
      NULLIF(trim(v_week->>'phase_name'), '')
    )
    RETURNING id INTO v_week_id;

    -- Insert slots for this week
    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_week->'slots') LOOP
      INSERT INTO program_week_slots (
        program_week_id,
        workout_template_id,
        day_index,
        slot_label
      ) VALUES (
        v_week_id,
        NULLIF((v_slot->>'workout_template_id'), '')::UUID,
        (v_slot->>'day_index')::INT,
        NULLIF(trim(v_slot->>'slot_label'), '')
      )
      ON CONFLICT (program_week_id, day_index) DO UPDATE
        SET workout_template_id = EXCLUDED.workout_template_id,
            slot_label          = EXCLUDED.slot_label;
    END LOOP;
  END LOOP;

  RETURN v_template_id;
END;
$$;

REVOKE ALL ON FUNCTION save_program_template(UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_program_template(UUID, UUID, JSONB) TO authenticated;

-- ============================================================
-- RPC: save_workout_template
-- Creates or replaces a named workout template with exercises.
-- Used by the Program Builder to manage the exercise library
-- attached to specific days in the program grid.
-- ============================================================
CREATE OR REPLACE FUNCTION save_workout_template(
  p_club_id     UUID,
  p_template_id UUID,   -- NULL = create new
  p_name        TEXT,
  p_exercises   JSONB   -- [{exercise_id, sort_order, planned_sets, planned_reps, planned_load_value}]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_ex          JSONB;
  v_ex_id       UUID;
BEGIN
  IF NOT is_active_coach(p_club_id) THEN
    RAISE EXCEPTION 'Unauthorized: not an active coach in this club';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Validation error: workout template name cannot be blank';
  END IF;

  IF p_template_id IS NOT NULL THEN
    UPDATE workout_templates
    SET name = trim(p_name)
    WHERE id      = p_template_id
      AND club_id = p_club_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Workout template not found or does not belong to this club';
    END IF;

    v_template_id := p_template_id;

    -- Clear existing exercises and re-insert
    DELETE FROM workout_template_exercises WHERE workout_template_id = v_template_id;
  ELSE
    INSERT INTO workout_templates (club_id, created_by_profile_id, name)
    VALUES (p_club_id, auth.uid(), trim(p_name))
    RETURNING id INTO v_template_id;
  END IF;

  -- Insert exercises
  FOR v_ex IN SELECT * FROM jsonb_array_elements(p_exercises) LOOP
    v_ex_id := (v_ex->>'exercise_id')::UUID;

    -- Validate exercise scope
    IF NOT EXISTS (
      SELECT 1 FROM exercises
      WHERE id = v_ex_id
        AND (is_system_default = true OR club_id = p_club_id)
    ) THEN
      RAISE EXCEPTION 'Exercise % is not available to this club', v_ex_id;
    END IF;

    INSERT INTO workout_template_exercises (
      workout_template_id,
      exercise_id,
      sort_order,
      planned_sets,
      planned_reps,
      planned_load_value
    ) VALUES (
      v_template_id,
      v_ex_id,
      (v_ex->>'sort_order')::INT,
      (v_ex->>'planned_sets')::INT,
      (v_ex->>'planned_reps')::INT,
      (v_ex->>'planned_load_value')::NUMERIC
    );
  END LOOP;

  RETURN v_template_id;
END;
$$;

REVOKE ALL ON FUNCTION save_workout_template(UUID, UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_workout_template(UUID, UUID, TEXT, JSONB) TO authenticated;

-- ============================================================
-- RPC: archive_program_template
-- Soft-deletes a program template by setting is_archived = true.
-- Does not delete data — existing assignments are unaffected.
-- ============================================================
CREATE OR REPLACE FUNCTION archive_program_template(
  p_club_id     UUID,
  p_template_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_active_coach(p_club_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE program_templates
  SET is_archived = true
  WHERE id      = p_template_id
    AND club_id = p_club_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Program template not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION archive_program_template(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION archive_program_template(UUID, UUID) TO authenticated;
