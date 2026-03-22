-- ============================================================
-- IronHQ Migration 00007 — Auth, Visibility & Squad Board
-- Run after 00006_admin_rpcs.sql
-- ============================================================

-- ============================================================
-- 1. CLUBS — add visibility defaults and squad board toggle
-- ============================================================
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS default_athlete_visibility TEXT
    CHECK (default_athlete_visibility IN ('name_only', 'basic_stats', 'full_stats'))
    DEFAULT 'basic_stats',
  ADD COLUMN IF NOT EXISTS squad_board_enabled        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS squad_pr_feed_enabled      BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS squad_compliance_visible   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS athlete_self_compliance    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_weight_unit        TEXT CHECK (default_weight_unit IN ('kg', 'lb')) DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS sport                      TEXT,
  ADD COLUMN IF NOT EXISTS default_rounding_increment NUMERIC DEFAULT 2.5;

-- ============================================================
-- 2. CLUB_MEMBERSHIPS — per-athlete visibility override
-- NULL means "use club default"
-- ============================================================
ALTER TABLE club_memberships
  ADD COLUMN IF NOT EXISTS visibility_override TEXT
    CHECK (visibility_override IN ('name_only', 'basic_stats', 'full_stats')),
  ADD COLUMN IF NOT EXISTS squad_board_visible BOOLEAN DEFAULT true;

-- ============================================================
-- 3. PROFILES — add auth provider tracking
-- Supabase handles OAuth internally via auth.users.
-- We track the primary provider here for display/support purposes.
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auth_provider TEXT
    CHECK (auth_provider IN ('email', 'google', 'apple'))
    DEFAULT 'email';

-- ============================================================
-- 4. HELPER: effective_visibility
-- Returns the effective visibility for an athlete in a club,
-- respecting per-athlete override over club default.
-- ============================================================
CREATE OR REPLACE FUNCTION effective_visibility(
  p_club_id    UUID,
  p_profile_id UUID
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    cm.visibility_override,
    c.default_athlete_visibility,
    'basic_stats'
  )
  FROM club_memberships cm
  JOIN clubs c ON c.id = cm.club_id
  WHERE cm.club_id    = p_club_id
    AND cm.profile_id = p_profile_id
    AND cm.status     = 'active';
$$;

REVOKE ALL ON FUNCTION effective_visibility(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION effective_visibility(UUID, UUID) TO authenticated;

-- ============================================================
-- 5. RPC: get_squad_board
-- Returns the squad board for a given club, honouring each
-- athlete's effective visibility setting.
-- Only callable by active members of the club.
-- Only returns athletes where squad_board_visible = true.
-- ============================================================
CREATE OR REPLACE FUNCTION get_squad_board(p_club_id UUID)
RETURNS TABLE (
  profile_id    UUID,
  display_name  TEXT,
  visibility    TEXT,
  program_name  TEXT,
  workouts_done BIGINT,
  compliance    NUMERIC,
  top_e1rm      NUMERIC,
  top_exercise  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is active member of this club
  IF NOT is_active_member(p_club_id) THEN
    RAISE EXCEPTION 'Unauthorized: not a member of this club';
  END IF;

  -- Verify squad board is enabled for this club
  IF NOT EXISTS (
    SELECT 1 FROM clubs WHERE id = p_club_id AND squad_board_enabled = true
  ) THEN
    RAISE EXCEPTION 'Squad board is not enabled for this club';
  END IF;

  RETURN QUERY
  SELECT
    p.id                                                      AS profile_id,
    p.display_name,
    effective_visibility(p_club_id, p.id)                     AS visibility,
    -- Program name (most recent active assignment)
    (SELECT pt.name FROM program_assignments pa
     JOIN program_templates pt ON pa.program_template_id = pt.id
     WHERE pa.profile_id = p.id AND pa.status = 'active'
     ORDER BY pa.created_at DESC LIMIT 1)                     AS program_name,
    -- Workouts done
    COUNT(wl.id) FILTER (WHERE wl.status = 'completed')       AS workouts_done,
    -- Compliance rate
    CASE
      WHEN COUNT(aw.id) FILTER (
        WHERE aw.status IN ('completed','missed','skipped')
      ) = 0 THEN NULL
      ELSE ROUND(
        COUNT(aw.id) FILTER (WHERE aw.status = 'completed')::NUMERIC
        / NULLIF(COUNT(aw.id) FILTER (
            WHERE aw.status IN ('completed','missed','skipped')
          )::NUMERIC, 0) * 100
      )
    END                                                        AS compliance,
    -- Top e1RM value (only if visibility allows)
    CASE
      WHEN effective_visibility(p_club_id, p.id) = 'full_stats'
      THEN (SELECT pr.value FROM personal_records pr
            WHERE pr.profile_id = p.id AND pr.pr_type = 'e1RM'
            ORDER BY pr.value DESC LIMIT 1)
      ELSE NULL
    END                                                        AS top_e1rm,
    -- Exercise for that PR
    CASE
      WHEN effective_visibility(p_club_id, p.id) = 'full_stats'
      THEN (SELECT pr.exercise_name_snapshot FROM personal_records pr
            WHERE pr.profile_id = p.id AND pr.pr_type = 'e1RM'
            ORDER BY pr.value DESC LIMIT 1)
      ELSE NULL
    END                                                        AS top_exercise
  FROM club_memberships cm
  JOIN profiles p         ON cm.profile_id = p.id
  LEFT JOIN assigned_workouts aw
    ON aw.profile_id = p.id AND aw.club_id = p_club_id
  LEFT JOIN workout_logs wl
    ON wl.assigned_workout_id = aw.id
  WHERE cm.club_id             = p_club_id
    AND cm.role                = 'athlete'
    AND cm.status              = 'active'
    AND cm.squad_board_visible = true
  GROUP BY p.id, p.display_name
  ORDER BY p.display_name;
END;
$$;

REVOKE ALL ON FUNCTION get_squad_board(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_squad_board(UUID) TO authenticated;

-- ============================================================
-- 6. RPC: update_club_settings
-- Coach updates club-level settings in one call.
-- ============================================================
CREATE OR REPLACE FUNCTION update_club_settings(
  p_club_id                   UUID,
  p_default_visibility        TEXT DEFAULT NULL,
  p_squad_board_enabled       BOOLEAN DEFAULT NULL,
  p_squad_pr_feed             BOOLEAN DEFAULT NULL,
  p_squad_compliance_visible  BOOLEAN DEFAULT NULL,
  p_athlete_self_compliance   BOOLEAN DEFAULT NULL,
  p_sport                     TEXT DEFAULT NULL,
  p_default_weight_unit       TEXT DEFAULT NULL,
  p_default_rounding          NUMERIC DEFAULT NULL,
  p_accent_color              TEXT DEFAULT NULL,
  p_logo_url                  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_active_coach(p_club_id) THEN
    RAISE EXCEPTION 'Unauthorized: not an active coach in this club';
  END IF;

  UPDATE clubs SET
    default_athlete_visibility  = COALESCE(p_default_visibility, default_athlete_visibility),
    squad_board_enabled         = COALESCE(p_squad_board_enabled, squad_board_enabled),
    squad_pr_feed_enabled       = COALESCE(p_squad_pr_feed, squad_pr_feed_enabled),
    squad_compliance_visible    = COALESCE(p_squad_compliance_visible, squad_compliance_visible),
    athlete_self_compliance     = COALESCE(p_athlete_self_compliance, athlete_self_compliance),
    sport                       = COALESCE(p_sport, sport),
    default_weight_unit         = COALESCE(p_default_weight_unit, default_weight_unit),
    default_rounding_increment  = COALESCE(p_default_rounding, default_rounding_increment)
  WHERE id = p_club_id;

  -- Update branding if provided
  IF p_accent_color IS NOT NULL OR p_logo_url IS NOT NULL THEN
    INSERT INTO club_branding (club_id, accent_color, logo_url)
    VALUES (p_club_id, p_accent_color, p_logo_url)
    ON CONFLICT (club_id) DO UPDATE SET
      accent_color = COALESCE(EXCLUDED.accent_color, club_branding.accent_color),
      logo_url     = COALESCE(EXCLUDED.logo_url, club_branding.logo_url);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION update_club_settings(UUID,TEXT,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,TEXT,TEXT,NUMERIC,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_club_settings(UUID,TEXT,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,TEXT,TEXT,NUMERIC,TEXT,TEXT) TO authenticated;

-- ============================================================
-- 7. RPC: update_athlete_visibility
-- Coach sets per-athlete visibility override.
-- ============================================================
CREATE OR REPLACE FUNCTION update_athlete_visibility(
  p_club_id            UUID,
  p_athlete_profile_id UUID,
  p_visibility         TEXT DEFAULT NULL,
  p_squad_visible      BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_active_coach(p_club_id) THEN
    RAISE EXCEPTION 'Unauthorized: not an active coach in this club';
  END IF;

  IF p_visibility IS NOT NULL AND p_visibility NOT IN ('name_only','basic_stats','full_stats') THEN
    RAISE EXCEPTION 'Invalid visibility value';
  END IF;

  UPDATE club_memberships SET
    visibility_override  = COALESCE(p_visibility, visibility_override),
    squad_board_visible  = COALESCE(p_squad_visible, squad_board_visible)
  WHERE club_id    = p_club_id
    AND profile_id = p_athlete_profile_id
    AND role       = 'athlete';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Athlete not found in this club';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION update_athlete_visibility(UUID,UUID,TEXT,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_athlete_visibility(UUID,UUID,TEXT,BOOLEAN) TO authenticated;
