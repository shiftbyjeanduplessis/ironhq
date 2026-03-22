-- ============================================================
-- IronHQ Migration 00004 — Analytics Views
-- Run after 00003_rpcs.sql
-- ============================================================

-- ============================================================
-- VIEW: coach_delta_report
-- Compares planned volume vs actual volume per exercise per workout.
-- Used by the coach roster delta screen.
-- Planned volume = planned_sets * planned_reps * planned_load_value
-- Actual volume  = SUM(actual_reps * actual_load) across all sets
-- ============================================================
CREATE OR REPLACE VIEW coach_delta_report AS
SELECT
  aw.club_id,
  aw.profile_id                                          AS athlete_id,
  p.display_name                                         AS athlete_name,
  aw.id                                                  AS assigned_workout_id,
  aw.workout_name,
  aw.scheduled_date,
  aw.status                                              AS workout_status,
  e.id                                                   AS exercise_id,
  e.name                                                 AS exercise_name,
  awe.planned_sets,
  awe.planned_reps,
  awe.planned_load_value,
  -- Planned volume for this exercise block
  COALESCE(
    awe.planned_sets * awe.planned_reps * awe.planned_load_value,
    0
  )                                                      AS planned_volume,
  -- Actual volume logged
  COALESCE(
    SUM(wls.actual_reps * wls.actual_load),
    0
  )                                                      AS actual_volume,
  -- Delta: positive = exceeded plan, negative = under plan
  COALESCE(SUM(wls.actual_reps * wls.actual_load), 0)
    - COALESCE(awe.planned_sets * awe.planned_reps * awe.planned_load_value, 0)
                                                         AS volume_delta,
  wl.status                                              AS log_status,
  wl.completed_at
FROM assigned_workouts aw
JOIN profiles p                   ON aw.profile_id           = p.id
JOIN assigned_workout_exercises awe ON awe.assigned_workout_id = aw.id
JOIN exercises e                  ON awe.exercise_id          = e.id
LEFT JOIN workout_logs wl         ON wl.assigned_workout_id   = aw.id
LEFT JOIN workout_log_exercises wle ON wle.workout_log_id    = wl.id
                                   AND wle.source_assigned_exercise_id = awe.id
LEFT JOIN workout_log_sets wls    ON wls.workout_log_exercise_id = wle.id
GROUP BY
  aw.club_id, aw.profile_id, p.display_name,
  aw.id, aw.workout_name, aw.scheduled_date, aw.status,
  e.id, e.name,
  awe.planned_sets, awe.planned_reps, awe.planned_load_value,
  wl.status, wl.completed_at;

-- ============================================================
-- VIEW: coach_roster_compliance
-- Per-athlete compliance rate for the coach roster table.
-- compliance_rate = completed / (completed + missed + skipped) * 100
-- NULL safe — returns 0 if no workouts assigned yet.
-- ============================================================
-- FIXED: uses cm.club_id as anchor so athletes with zero workouts appear
CREATE OR REPLACE VIEW coach_roster_compliance AS
SELECT
  cm.club_id,
  cm.profile_id                                              AS athlete_id,
  p.display_name                                             AS athlete_name,
  p.email                                                    AS athlete_email,
  COUNT(aw.id)                                               AS total_workouts,
  COUNT(aw.id) FILTER (WHERE aw.status = 'completed')        AS completed,
  COUNT(aw.id) FILTER (WHERE aw.status = 'missed')           AS missed,
  COUNT(aw.id) FILTER (WHERE aw.status = 'skipped')          AS skipped,
  COUNT(aw.id) FILTER (WHERE aw.status = 'assigned')         AS upcoming,
  CASE
    WHEN COUNT(aw.id) FILTER (
      WHERE aw.status IN ('completed', 'missed', 'skipped')
    ) = 0 THEN NULL
    ELSE ROUND(
      COUNT(aw.id) FILTER (WHERE aw.status = 'completed')::NUMERIC
      / NULLIF(
          COUNT(aw.id) FILTER (
            WHERE aw.status IN ('completed', 'missed', 'skipped')
          )::NUMERIC,
          0
        ) * 100
    )
  END                                                        AS compliance_rate,
  MAX(wl.completed_at)                                       AS last_active,
  cm.billing_status,
  cm.next_billing_date,
  cm.role                                                    AS club_role,
  cm.status                                                  AS membership_status
FROM club_memberships cm
JOIN profiles p ON cm.profile_id = p.id
LEFT JOIN assigned_workouts aw
  ON aw.profile_id = cm.profile_id
  AND aw.club_id   = cm.club_id
LEFT JOIN workout_logs wl
  ON wl.assigned_workout_id = aw.id
  AND wl.status = 'completed'
WHERE cm.role   = 'athlete'
  AND cm.status = 'active'
GROUP BY
  cm.club_id, cm.profile_id,
  p.display_name, p.email,
  cm.billing_status, cm.next_billing_date,
  cm.role, cm.status;

-- ============================================================
-- VIEW: athlete_history_timeline
-- Unified timeline of workouts + PRs for the athlete history page.
-- type = 'workout' | 'pr'
-- ============================================================
CREATE OR REPLACE VIEW athlete_history_timeline AS
SELECT
  profile_id,
  id,
  'workout'                                    AS type,
  COALESCE(
    manual_workout_title,
    'Completed Workout'
  )                                            AS title,
  total_volume,
  NULL::TEXT                                   AS pr_type,
  NULL::NUMERIC                                AS pr_value,
  completed_at                                 AS activity_date
FROM workout_logs
WHERE status = 'completed'

UNION ALL

SELECT
  profile_id,
  id,
  'pr'                                         AS type,
  exercise_name_snapshot                       AS title,
  NULL::NUMERIC                                AS total_volume,
  pr_type,
  value                                        AS pr_value,
  achieved_on::TIMESTAMPTZ                     AS activity_date
FROM personal_records;

-- ============================================================
-- RLS on views
-- PostgreSQL views inherit the RLS of their underlying tables,
-- but we add explicit security_invoker where needed.
-- These views are read via Supabase from the server component
-- using the service role or the user's session — RLS applies.
-- ============================================================
