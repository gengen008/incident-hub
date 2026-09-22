-- IncidentHub v2 Fixes
-- Run in Supabase SQL Editor AFTER 001_schema.sql, 002_rls.sql, 003_seed.sql
-- Safe to run multiple times (idempotent)

-- ── 1. Fix notifications column: rename 'read' → 'is_read' ──────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'read'
  ) THEN
    ALTER TABLE notifications RENAME COLUMN read TO is_read;
  END IF;
END $$;

-- Update index to use new column name
DROP INDEX IF EXISTS idx_notifications_read;
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);

-- ── 2. Fix notification_preferences columns ──────────────────────────
-- Add new columns that match the UI (email_on_assign etc.)
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_on_assign       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_on_status_change BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_on_comment       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_on_critical      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_on_assign         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_on_status_change  BOOLEAN NOT NULL DEFAULT true;

-- Migrate existing data from old column names if they still exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'email_assigned'
  ) THEN
    UPDATE notification_preferences SET
      email_on_assign        = COALESCE(email_assigned, true),
      email_on_status_change = COALESCE(email_status_change, true),
      email_on_comment       = COALESCE(email_comment, true);
    ALTER TABLE notification_preferences
      DROP COLUMN IF EXISTS email_assigned,
      DROP COLUMN IF EXISTS email_status_change,
      DROP COLUMN IF EXISTS email_comment,
      DROP COLUMN IF EXISTS email_mentioned,
      DROP COLUMN IF EXISTS email_resolved;
  END IF;
END $$;

-- ── 3. Update default notif prefs trigger to use new columns ─────────
CREATE OR REPLACE FUNCTION create_default_notif_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (
    user_id,
    email_on_assign, email_on_status_change, email_on_comment,
    email_on_critical, push_on_assign, push_on_status_change
  )
  VALUES (NEW.id, true, true, true, true, true, true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, auth, extensions;

-- Backfill missing notification_preferences rows for existing users
INSERT INTO notification_preferences (
  user_id,
  email_on_assign, email_on_status_change, email_on_comment,
  email_on_critical, push_on_assign, push_on_status_change
)
SELECT id, true, true, true, true, true, true
FROM profiles
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT DO NOTHING;

-- ── 4. Notification auto-generation triggers (SECURITY DEFINER) ──────
-- Trigger: notify assignee when incident is assigned or reassigned
CREATE OR REPLACE FUNCTION notify_on_incident_assign()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL)
  OR (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL)
  THEN
    INSERT INTO notifications (user_id, type, title, body, incident_id, link)
    VALUES (
      NEW.assigned_to,
      'incident_assigned',
      'Incident Assigned to You',
      NEW.title,
      NEW.id,
      '/incidents/' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

DROP TRIGGER IF EXISTS trg_notify_incident_assign ON incidents;
CREATE TRIGGER trg_notify_incident_assign
  AFTER INSERT OR UPDATE OF assigned_to ON incidents
  FOR EACH ROW EXECUTE FUNCTION notify_on_incident_assign();

-- Trigger: notify reporter + assignee when status changes
CREATE OR REPLACE FUNCTION notify_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Notify reporter
    IF NEW.reported_by IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, incident_id, link)
      VALUES (
        NEW.reported_by,
        CASE WHEN NEW.status = 'resolved' THEN 'resolved' ELSE 'status_update' END,
        CASE WHEN NEW.status = 'resolved' THEN 'Your Incident Has Been Resolved'
             ELSE 'Incident Status Updated' END,
        NEW.title || ' → ' || replace(NEW.status, '_', ' '),
        NEW.id,
        '/incidents/' || NEW.id::text
      );
    END IF;
    -- Notify assignee (if different from reporter)
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM NEW.reported_by THEN
      INSERT INTO notifications (user_id, type, title, body, incident_id, link)
      VALUES (
        NEW.assigned_to,
        CASE WHEN NEW.status = 'resolved' THEN 'resolved' ELSE 'status_update' END,
        CASE WHEN NEW.status = 'resolved' THEN 'Incident Resolved'
             ELSE 'Incident Status Updated' END,
        NEW.title || ' → ' || replace(NEW.status, '_', ' '),
        NEW.id,
        '/incidents/' || NEW.id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

DROP TRIGGER IF EXISTS trg_notify_status_change ON incidents;
CREATE TRIGGER trg_notify_status_change
  AFTER UPDATE OF status ON incidents
  FOR EACH ROW EXECUTE FUNCTION notify_on_status_change();

-- Trigger: notify reporter + assignee when a comment is added
CREATE OR REPLACE FUNCTION notify_on_incident_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_inc incidents%ROWTYPE;
BEGIN
  SELECT * INTO v_inc FROM incidents WHERE id = NEW.incident_id;

  -- Notify reporter (unless they wrote the comment)
  IF v_inc.reported_by IS NOT NULL AND v_inc.reported_by != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, body, incident_id, link)
    VALUES (
      v_inc.reported_by, 'comment',
      'New Comment on Your Incident',
      v_inc.title,
      NEW.incident_id,
      '/incidents/' || NEW.incident_id::text
    );
  END IF;

  -- Notify assignee (unless they wrote it or are also the reporter)
  IF v_inc.assigned_to IS NOT NULL
     AND v_inc.assigned_to != NEW.user_id
     AND v_inc.assigned_to IS DISTINCT FROM v_inc.reported_by THEN
    INSERT INTO notifications (user_id, type, title, body, incident_id, link)
    VALUES (
      v_inc.assigned_to, 'comment',
      'New Comment on Assigned Incident',
      v_inc.title,
      NEW.incident_id,
      '/incidents/' || NEW.incident_id::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

DROP TRIGGER IF EXISTS trg_notify_comment ON incident_comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON incident_comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_incident_comment();

-- ── 5. Harden profiles RLS: prevent role/active escalation ──────────
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active)
     AND NOT EXISTS (
       SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
     )
  THEN
    RAISE EXCEPTION 'Unauthorized: only admins can change role or active status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- ── 6. Fix corrupted seed data (phone = email, missing full_name) ───
UPDATE profiles SET
  full_name = CASE email
    WHEN 'admin@incidenthub.com'           THEN 'System Admin'
    WHEN 'head.it@incidenthub.com'         THEN 'Alex Chen'
    WHEN 'head.hr@incidenthub.com'         THEN 'Maria Santos'
    WHEN 'user.retail@incidenthub.com'     THEN 'Jordan Lee'
    WHEN 'user.maintenance@incidenthub.com' THEN 'Sam Rivera'
    ELSE full_name
  END
WHERE full_name = '' OR full_name IS NULL
   OR full_name IN ('admin', 'head', 'user');

-- Fix phone field accidentally set to email
UPDATE profiles SET phone = NULL WHERE phone = email;
