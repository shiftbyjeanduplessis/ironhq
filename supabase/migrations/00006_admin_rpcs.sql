-- ============================================================
-- IronHQ Migration 00006 — Admin RPCs
-- Run after 00005_program_rpcs.sql
-- Admin functions bypass RLS via SECURITY DEFINER.
-- Only callable by profiles with primary_role = 'admin'.
-- ============================================================

-- ============================================================
-- RPC: admin_list_clubs
-- Returns all clubs with member counts and activity summary.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_list_clubs()
RETURNS TABLE (
  club_id          UUID,
  club_name        TEXT,
  club_slug        TEXT,
  is_active        BOOLEAN,
  athlete_count    BIGINT,
  coach_count      BIGINT,
  total_members    BIGINT,
  created_at       TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id                                                              AS club_id,
    c.name                                                            AS club_name,
    c.slug                                                            AS club_slug,
    c.is_active,
    COUNT(cm.id) FILTER (WHERE cm.role = 'athlete' AND cm.status = 'active')  AS athlete_count,
    COUNT(cm.id) FILTER (WHERE cm.role IN ('coach','assistant_coach','manager') AND cm.status = 'active') AS coach_count,
    COUNT(cm.id) FILTER (WHERE cm.status = 'active')                AS total_members,
    c.created_at
  FROM clubs c
  LEFT JOIN club_memberships cm ON cm.club_id = c.id
  GROUP BY c.id, c.name, c.slug, c.is_active, c.created_at
  ORDER BY c.created_at DESC;
$$;

REVOKE ALL ON FUNCTION admin_list_clubs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_clubs() TO authenticated;

-- ============================================================
-- RPC: admin_toggle_club
-- Activates or deactivates a club.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_toggle_club(p_club_id UUID, p_active BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE clubs SET is_active = p_active WHERE id = p_club_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Club not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION admin_toggle_club(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_toggle_club(UUID, BOOLEAN) TO authenticated;

-- ============================================================
-- RPC: admin_list_profiles
-- Returns all profiles with their club memberships.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_list_profiles(
  p_limit  INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  profile_id    UUID,
  email         TEXT,
  display_name  TEXT,
  primary_role  TEXT,
  is_active     BOOLEAN,
  club_count    BIGINT,
  created_at    TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id                                  AS profile_id,
    p.email::TEXT,
    p.display_name,
    p.primary_role,
    p.is_active,
    COUNT(cm.id) FILTER (WHERE cm.status = 'active') AS club_count,
    p.created_at
  FROM profiles p
  LEFT JOIN club_memberships cm ON cm.profile_id = p.id
  WHERE p.primary_role != 'admin'
  GROUP BY p.id, p.email, p.display_name, p.primary_role, p.is_active, p.created_at
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

REVOKE ALL ON FUNCTION admin_list_profiles(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_profiles(INT, INT) TO authenticated;

-- ============================================================
-- RPC: admin_toggle_profile
-- Activates or deactivates a user profile.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_toggle_profile(p_profile_id UUID, p_active BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE profiles
  SET is_active = p_active
  WHERE id = p_profile_id
    AND primary_role != 'admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or cannot deactivate another admin';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION admin_toggle_profile(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_toggle_profile(UUID, BOOLEAN) TO authenticated;

-- ============================================================
-- RPC: admin_platform_stats
-- Returns platform-wide aggregate statistics.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_platform_stats()
RETURNS TABLE (
  total_clubs           BIGINT,
  active_clubs          BIGINT,
  total_athletes        BIGINT,
  total_coaches         BIGINT,
  total_workout_logs    BIGINT,
  completed_logs        BIGINT,
  total_prs             BIGINT,
  logs_last_7_days      BIGINT,
  logs_last_30_days     BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM clubs)                                                  AS total_clubs,
    (SELECT COUNT(*) FROM clubs WHERE is_active = true)                           AS active_clubs,
    (SELECT COUNT(*) FROM club_memberships WHERE role = 'athlete' AND status = 'active') AS total_athletes,
    (SELECT COUNT(*) FROM club_memberships WHERE role IN ('coach','assistant_coach','manager') AND status = 'active') AS total_coaches,
    (SELECT COUNT(*) FROM workout_logs)                                            AS total_workout_logs,
    (SELECT COUNT(*) FROM workout_logs WHERE status = 'completed')                 AS completed_logs,
    (SELECT COUNT(*) FROM personal_records)                                        AS total_prs,
    (SELECT COUNT(*) FROM workout_logs WHERE completed_at >= NOW() - INTERVAL '7 days') AS logs_last_7_days,
    (SELECT COUNT(*) FROM workout_logs WHERE completed_at >= NOW() - INTERVAL '30 days') AS logs_last_30_days;
$$;

REVOKE ALL ON FUNCTION admin_platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_platform_stats() TO authenticated;
