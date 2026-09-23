-- ════════════════════════════════════════════════════════════════
-- LABIANCA DESK — Row Level Security
-- Internal company tool: requests are company-visible for
-- cross-department transparency; messages are private to members.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE departments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_activity     ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;

-- ── Helpers ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_role_is(p_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = p_role)
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$ SELECT current_role_is('admin') $$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- membership check without recursive RLS
CREATE OR REPLACE FUNCTION is_conversation_member(p_conv UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conv AND user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ── Departments: everyone reads, admin writes ────────────────────
DROP POLICY IF EXISTS departments_read ON departments;
CREATE POLICY departments_read ON departments FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS departments_admin ON departments;
CREATE POLICY departments_admin ON departments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ── Profiles: company directory readable by all; self edits; admin all
DROP POLICY IF EXISTS profiles_read ON profiles;
CREATE POLICY profiles_read ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS profiles_self_update ON profiles;
CREATE POLICY profiles_self_update ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS profiles_admin ON profiles;
CREATE POLICY profiles_admin ON profiles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ── Requests: company-wide read; raiser inserts; owner/head/admin update
DROP POLICY IF EXISTS requests_read ON requests;
CREATE POLICY requests_read ON requests FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS requests_insert ON requests;
CREATE POLICY requests_insert ON requests FOR INSERT WITH CHECK (raised_by = auth.uid());
DROP POLICY IF EXISTS requests_update ON requests;
CREATE POLICY requests_update ON requests FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    raised_by = auth.uid()
    OR assigned_to = auth.uid()
    OR is_admin()
    OR target_dept = (SELECT department_id FROM profiles WHERE id = auth.uid())
  )
);
DROP POLICY IF EXISTS requests_admin ON requests;
CREATE POLICY requests_admin ON requests FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ── Request activity: company-wide read; author inserts; author/admin edits
DROP POLICY IF EXISTS activity_read ON request_activity;
CREATE POLICY activity_read ON request_activity FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS activity_insert ON request_activity;
CREATE POLICY activity_insert ON request_activity FOR INSERT WITH CHECK (actor_id = auth.uid());
DROP POLICY IF EXISTS activity_update ON request_activity;
CREATE POLICY activity_update ON request_activity FOR UPDATE USING (actor_id = auth.uid() OR is_admin());

-- ── Attachments ──────────────────────────────────────────────────
DROP POLICY IF EXISTS attach_read ON request_attachments;
CREATE POLICY attach_read ON request_attachments FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS attach_insert ON request_attachments;
CREATE POLICY attach_insert ON request_attachments FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- ── Conversations: members only ──────────────────────────────────
DROP POLICY IF EXISTS conv_read ON conversations;
CREATE POLICY conv_read ON conversations FOR SELECT USING (is_conversation_member(id));
DROP POLICY IF EXISTS conv_insert ON conversations;
CREATE POLICY conv_insert ON conversations FOR INSERT WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS conv_update ON conversations;
CREATE POLICY conv_update ON conversations FOR UPDATE USING (is_conversation_member(id));

-- ── Conversation members: you see rows for convs you belong to ───
DROP POLICY IF EXISTS convmem_read ON conversation_members;
CREATE POLICY convmem_read ON conversation_members FOR SELECT USING (is_conversation_member(conversation_id));
DROP POLICY IF EXISTS convmem_insert ON conversation_members;
CREATE POLICY convmem_insert ON conversation_members FOR INSERT WITH CHECK (
  -- the creator can add members while creating; you can add yourself
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
);
DROP POLICY IF EXISTS convmem_update ON conversation_members;
CREATE POLICY convmem_update ON conversation_members FOR UPDATE USING (user_id = auth.uid());

-- ── Messages: members read + send ────────────────────────────────
DROP POLICY IF EXISTS messages_read ON messages;
CREATE POLICY messages_read ON messages FOR SELECT USING (is_conversation_member(conversation_id));
DROP POLICY IF EXISTS messages_insert ON messages;
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND is_conversation_member(conversation_id)
);

-- ── Notifications: own only ──────────────────────────────────────
DROP POLICY IF EXISTS notifs_own ON notifications;
CREATE POLICY notifs_own ON notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
