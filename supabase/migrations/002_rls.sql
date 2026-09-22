-- IncidentHub Row Level Security v1.0
-- Run after 001_schema.sql

-- ── Enable RLS ───────────────────────────────────────────────────
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_departments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_photos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- ── Helper: get caller role ──────────────────────────────────────
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_department()
RETURNS UUID AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() = 'admin'
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_dept_head()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() IN ('admin', 'department_head')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Profiles ─────────────────────────────────────────────────────
CREATE POLICY "profiles_self_read"    ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_self_update"  ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all"    ON profiles FOR ALL    USING (is_admin());
CREATE POLICY "profiles_head_read"    ON profiles FOR SELECT USING (is_dept_head());

-- ── Departments ──────────────────────────────────────────────────
CREATE POLICY "departments_read_all"  ON departments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "departments_admin_cud" ON departments FOR ALL    USING (is_admin());

-- ── User-Departments ─────────────────────────────────────────────
CREATE POLICY "user_depts_self_read"  ON user_departments FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "user_depts_admin_all"  ON user_departments FOR ALL    USING (is_admin());
CREATE POLICY "user_depts_head_read"  ON user_departments FOR SELECT USING (
  department_id IN (
    SELECT department_id FROM user_departments WHERE user_id = auth.uid() AND is_head = true
  )
);

-- ── Incidents ────────────────────────────────────────────────────
-- Admins: all. Dept heads: their department. Users: their own + assigned to them.
CREATE POLICY "incidents_admin_all" ON incidents FOR ALL USING (is_admin());

CREATE POLICY "incidents_dept_head_read" ON incidents FOR SELECT USING (
  department_id = current_user_department()
  AND current_user_role() = 'department_head'
);
CREATE POLICY "incidents_dept_head_update" ON incidents FOR UPDATE USING (
  department_id = current_user_department()
  AND current_user_role() = 'department_head'
);

CREATE POLICY "incidents_user_read" ON incidents FOR SELECT USING (
  reported_by = auth.uid() OR assigned_to = auth.uid()
);
CREATE POLICY "incidents_user_insert" ON incidents FOR INSERT WITH CHECK (
  reported_by = auth.uid()
);

-- ── Incident Photos ──────────────────────────────────────────────
CREATE POLICY "photos_read_incident_access" ON incident_photos FOR SELECT USING (
  incident_id IN (SELECT id FROM incidents)
);
CREATE POLICY "photos_insert_reporter" ON incident_photos FOR INSERT WITH CHECK (
  uploaded_by = auth.uid()
);
CREATE POLICY "photos_admin_all" ON incident_photos FOR ALL USING (is_admin());

-- ── Incident Comments ────────────────────────────────────────────
CREATE POLICY "comments_read_incident_access" ON incident_comments FOR SELECT USING (
  incident_id IN (SELECT id FROM incidents)
);
CREATE POLICY "comments_insert_self" ON incident_comments FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "comments_update_self" ON incident_comments FOR UPDATE USING (
  user_id = auth.uid()
);
CREATE POLICY "comments_admin_all" ON incident_comments FOR ALL USING (is_admin());

-- ── Status History ────────────────────────────────────────────────
CREATE POLICY "history_read_incident_access" ON incident_status_history FOR SELECT USING (
  incident_id IN (SELECT id FROM incidents)
);
CREATE POLICY "history_insert_auth" ON incident_status_history FOR INSERT WITH CHECK (
  changed_by = auth.uid()
);

-- ── Notifications ────────────────────────────────────────────────
CREATE POLICY "notifs_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- ── Notification Preferences ─────────────────────────────────────
CREATE POLICY "notif_prefs_own" ON notification_preferences FOR ALL USING (user_id = auth.uid());

-- ── Storage bucket for incident photos ───────────────────────────
-- Run this in Supabase dashboard or via CLI:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('incident-photos', 'incident-photos', false);

-- Storage policies (run separately):
-- CREATE POLICY "photos_upload" ON storage.objects FOR INSERT WITH CHECK (
--   bucket_id = 'incident-photos' AND auth.uid() IS NOT NULL
-- );
-- CREATE POLICY "photos_read" ON storage.objects FOR SELECT USING (
--   bucket_id = 'incident-photos' AND auth.uid() IS NOT NULL
-- );
