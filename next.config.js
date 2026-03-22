-- ============================================================
-- IronHQ Migration 00002 — RLS & Policies
-- Run after 00001_schema.sql
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- All are SECURITY DEFINER with fixed search_path.
-- Explicitly REVOKED from PUBLIC, GRANTED to authenticated.
-- These avoid recursive self-lookups inside policies.
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND primary_role = 'admin'
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- -------------------------------------------------------
-- is_active_coach: returns true if the current user is
-- an active coach, assistant_coach, or manager in the
-- specified club.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION is_active_coach(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_memberships
    WHERE profile_id = auth.uid()
      AND club_id    = p_club_id
      AND role       IN ('coach', 'assistant_coach', 'manager')
      AND status     = 'active'
  );
$$;

REVOKE ALL ON FUNCTION is_active_coach(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_active_coach(UUID) TO authenticated;

-- -------------------------------------------------------
-- is_active_member: returns true if the current user has
-- any active membership in the specified club.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION is_active_member(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_memberships
    WHERE profile_id = auth.uid()
      AND club_id    = p_club_id
      AND status     = 'active'
  );
$$;

REVOKE ALL ON FUNCTION is_active_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_active_member(UUID) TO authenticated;

-- ============================================================
-- ENABLE RLS ON ALL BUSINESS TABLES
-- ============================================================
ALTER TABLE profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_memberships            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_template_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_weeks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_week_slots          ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_max_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_assignments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_workouts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_workout_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_log_exercises       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_log_sets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_acknowledgements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox         ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_branding               ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

-- Users see their own profile. Admins see all.
CREATE POLICY "profiles_select"
ON profiles FOR SELECT
USING (id = auth.uid() OR is_admin());

-- Users update only their own profile.
CREATE POLICY "profiles_update"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- ============================================================
-- ATHLETE PROFILES POLICIES
-- ============================================================

-- Athletes see their own. Coaches see athletes in shared club.
-- Admins see all.
CREATE POLICY "athlete_profiles_select"
ON athlete_profiles FOR SELECT
USING (
  profile_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM club_memberships cm_coach
    JOIN club_memberships cm_athlete
      ON cm_coach.club_id = cm_athlete.club_id
    WHERE cm_coach.profile_id = auth.uid()
      AND cm_coach.role IN ('coach', 'assistant_coach', 'manager')
      AND cm_coach.status = 'active'
      AND cm_athlete.profile_id = athlete_profiles.profile_id
      AND cm_athlete.status = 'active'
  )
);

-- Athletes update only their own.
CREATE POLICY "athlete_profiles_update"
ON athlete_profiles FOR UPDATE
USING (profile_id = auth.uid());

-- ============================================================
-- CLUBS POLICIES
-- ============================================================

-- Any active member of a club can see that club's row.
CREATE POLICY "clubs_select"
ON clubs FOR SELECT
USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM club_memberships
    WHERE club_id   = clubs.id
      AND profile_id = auth.uid()
      AND status    = 'active'
  )
);

-- ============================================================
-- CLUB MEMBERSHIPS POLICIES
-- ============================================================

-- Users see their own row.
-- Coaches see all rows in their clubs (needed for roster).
CREATE POLICY "club_memberships_select"
ON club_memberships FOR SELECT
USING (
  profile_id = auth.uid()
  OR is_admin()
  OR is_active_coach(club_id)
);

-- Coaches update billing status and membership status for their club.
-- Direct writes for other fields go through RPCs.
CREATE POLICY "club_memberships_update_coach"
ON club_memberships FOR UPDATE
USING (is_active_coach(club_id))
WITH CHECK (is_active_coach(club_id));

-- ============================================================
-- INVITES POLICIES
-- ============================================================

-- Coaches see invites they created or for their club.
CREATE POLICY "invites_select"
ON invites FOR SELECT
USING (
  invited_by_profile_id = auth.uid()
  OR is_active_coach(club_id)
  OR is_admin()
);

-- Coaches create invites for their clubs.
CREATE POLICY "invites_insert"
ON invites FOR INSERT
WITH CHECK (is_active_coach(club_id));

-- ============================================================
-- EXERCISES POLICIES
-- ============================================================

-- Any active member can see system defaults and their club exercises.
CREATE POLICY "exercises_select"
ON exercises FOR SELECT
USING (
  is_system_default = true
  OR is_admin()
  OR (club_id IS NOT NULL AND is_active_member(club_id))
);

-- Coaches manage their club exercises.
CREATE POLICY "exercises_insert"
ON exercises FOR INSERT
WITH CHECK (club_id IS NOT NULL AND is_active_coach(club_id));

CREATE POLICY "exercises_update"
ON exercises FOR UPDATE
USING (club_id IS NOT NULL AND is_active_coach(club_id));

-- ============================================================
-- WORKOUT TEMPLATES POLICIES
-- ============================================================
CREATE POLICY "workout_templates_select"
ON workout_templates FOR SELECT
USING (is_active_member(club_id) OR is_admin());

CREATE POLICY "workout_templates_insert"
ON workout_templates FOR INSERT
WITH CHECK (is_active_coach(club_id));

CREATE POLICY "workout_template_exercises_select"
ON workout_template_exercises FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workout_templates wt
    WHERE wt.id = workout_template_id
      AND is_active_member(wt.club_id)
  )
);

-- ============================================================
-- PROGRAM TEMPLATES POLICIES
-- ============================================================
CREATE POLICY "program_templates_select"
ON program_templates FOR SELECT
USING (is_active_member(club_id) OR is_admin());

CREATE POLICY "program_templates_insert"
ON program_templates FOR INSERT
WITH CHECK (is_active_coach(club_id));

CREATE POLICY "program_templates_update"
ON program_templates FOR UPDATE
USING (is_active_coach(club_id));

CREATE POLICY "program_weeks_select"
ON program_weeks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM program_templates pt
    WHERE pt.id = program_template_id
      AND is_active_member(pt.club_id)
  )
);

CREATE POLICY "program_week_slots_select"
ON program_week_slots FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM program_weeks pw
    JOIN program_templates pt ON pw.program_template_id = pt.id
    WHERE pw.id = program_week_id
      AND is_active_member(pt.club_id)
  )
);

-- ============================================================
-- ATHLETE MAX PROFILES POLICIES
-- ============================================================

-- Athlete sees their own. Coach sees their athletes'.
CREATE POLICY "athlete_max_profiles_select"
ON athlete_max_profiles FOR SELECT
USING (
  profile_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM club_memberships cm_coach
    JOIN club_memberships cm_athlete
      ON cm_coach.club_id = cm_athlete.club_id
    WHERE cm_coach.profile_id = auth.uid()
      AND cm_coach.role IN ('coach', 'assistant_coach', 'manager')
      AND cm_coach.status = 'active'
      AND cm_athlete.profile_id = athlete_max_profiles.profile_id
      AND cm_athlete.status = 'active'
  )
);

-- ============================================================
-- PROGRAM ASSIGNMENTS POLICIES
-- All writes go through RPCs — only read policies here.
-- ============================================================
CREATE POLICY "program_assignments_select_athlete"
ON program_assignments FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "program_assignments_select_coach"
ON program_assignments FOR SELECT
USING (is_active_coach(club_id));

-- ============================================================
-- ASSIGNED WORKOUTS POLICIES — PLANNED SIDE
-- ============================================================

-- Athletes see their own assigned workouts.
CREATE POLICY "assigned_workouts_select_athlete"
ON assigned_workouts FOR SELECT
USING (profile_id = auth.uid());

-- Active coaches see all workouts in their club.
CREATE POLICY "assigned_workouts_select_coach"
ON assigned_workouts FOR SELECT
USING (is_active_coach(club_id));

-- ============================================================
-- ASSIGNED WORKOUT EXERCISES POLICIES — PLANNED SIDE
-- ============================================================
CREATE POLICY "assigned_workout_exercises_select_athlete"
ON assigned_workout_exercises FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assigned_workouts aw
    WHERE aw.id = assigned_workout_id
      AND aw.profile_id = auth.uid()
  )
);

CREATE POLICY "assigned_workout_exercises_select_coach"
ON assigned_workout_exercises FOR SELECT
USING (is_active_coach(club_id));

-- ============================================================
-- WORKOUT LOGS POLICIES — ACTUAL SIDE
-- ============================================================

-- Athletes manage their own logs.
CREATE POLICY "workout_logs_all_athlete"
ON workout_logs FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Coaches read logs in their club.
CREATE POLICY "workout_logs_select_coach"
ON workout_logs FOR SELECT
USING (is_active_coach(club_id));

-- ============================================================
-- WORKOUT LOG EXERCISES POLICIES — ACTUAL SIDE
-- ============================================================
CREATE POLICY "workout_log_exercises_all_athlete"
ON workout_log_exercises FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workout_logs wl
    WHERE wl.id = workout_log_id
      AND wl.profile_id = auth.uid()
  )
);

CREATE POLICY "workout_log_exercises_select_coach"
ON workout_log_exercises FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workout_logs wl
    WHERE wl.id = workout_log_id
      AND is_active_coach(wl.club_id)
  )
);

-- ============================================================
-- WORKOUT LOG SETS POLICIES — ACTUAL SIDE
-- ============================================================
CREATE POLICY "workout_log_sets_all_athlete"
ON workout_log_sets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workout_log_exercises wle
    JOIN workout_logs wl ON wle.workout_log_id = wl.id
    WHERE wle.id = workout_log_exercise_id
      AND wl.profile_id = auth.uid()
  )
);

CREATE POLICY "workout_log_sets_select_coach"
ON workout_log_sets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workout_log_exercises wle
    JOIN workout_logs wl ON wle.workout_log_id = wl.id
    WHERE wle.id = workout_log_exercise_id
      AND is_active_coach(wl.club_id)
  )
);

-- ============================================================
-- PERSONAL RECORDS POLICIES
-- ============================================================
CREATE POLICY "personal_records_select_athlete"
ON personal_records FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "personal_records_select_coach"
ON personal_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM club_memberships cm_coach
    JOIN club_memberships cm_athlete
      ON cm_coach.club_id = cm_athlete.club_id
    WHERE cm_coach.profile_id = auth.uid()
      AND cm_coach.role IN ('coach', 'assistant_coach', 'manager')
      AND cm_coach.status = 'active'
      AND cm_athlete.profile_id = personal_records.profile_id
      AND cm_athlete.status = 'active'
  )
);

-- ============================================================
-- NOTICES + ACKNOWLEDGEMENTS POLICIES
-- ============================================================
CREATE POLICY "notices_select"
ON notices FOR SELECT
USING (is_active_member(club_id) OR is_admin());

CREATE POLICY "notices_insert"
ON notices FOR INSERT
WITH CHECK (is_active_coach(club_id));

CREATE POLICY "notice_acknowledgements_all_athlete"
ON notice_acknowledgements FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "notice_acknowledgements_select_coach"
ON notice_acknowledgements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM notices n
    WHERE n.id = notice_id
      AND is_active_coach(n.club_id)
  )
);

-- ============================================================
-- CONVERSATIONS + MESSAGES POLICIES
-- ============================================================
CREATE POLICY "conversations_select"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
      AND profile_id = auth.uid()
  )
);

CREATE POLICY "conversation_participants_select"
ON conversation_participants FOR SELECT
USING (profile_id = auth.uid() OR is_active_coach(
  (SELECT club_id FROM conversations WHERE id = conversation_id)
));

CREATE POLICY "messages_select"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
  )
);

CREATE POLICY "messages_insert"
ON messages FOR INSERT
WITH CHECK (
  sender_profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
  )
);

-- ============================================================
-- NOTIFICATION OUTBOX POLICIES
-- Only the system (via SECURITY DEFINER functions) writes here.
-- Coaches read their own notifications.
-- ============================================================
CREATE POLICY "notification_outbox_select"
ON notification_outbox FOR SELECT
USING (target_profile_id = auth.uid() OR is_admin());

-- ============================================================
-- CLUB BRANDING POLICIES
-- ============================================================
CREATE POLICY "club_branding_select"
ON club_branding FOR SELECT
USING (is_active_member(club_id) OR is_admin());

CREATE POLICY "club_branding_upsert"
ON club_branding FOR ALL
USING (is_active_coach(club_id))
WITH CHECK (is_active_coach(club_id));
