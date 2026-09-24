-- ════════════════════════════════════════════════════════════════
-- LABIANCA DESK — realtime wiring + chat RLS fix
-- ════════════════════════════════════════════════════════════════

-- Let a conversation's creator read it back immediately after insert
-- (before members exist), so `.insert().select()` works from the client.
DROP POLICY IF EXISTS conv_read ON conversations;
CREATE POLICY conv_read ON conversations FOR SELECT
  USING (created_by = auth.uid() OR is_conversation_member(id));

-- Enable Supabase Realtime on the tables the app subscribes to.
-- (Publication starts empty on a fresh project — without this, no
--  realtime events are delivered.)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;

-- FULL replica identity so RLS-filtered realtime has all columns on UPDATE/DELETE.
ALTER TABLE notifications        REPLICA IDENTITY FULL;
ALTER TABLE messages             REPLICA IDENTITY FULL;
ALTER TABLE conversations        REPLICA IDENTITY FULL;
ALTER TABLE conversation_members REPLICA IDENTITY FULL;
