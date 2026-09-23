-- ════════════════════════════════════════════════════════════════
-- LABIANCA DESK — Functions & Triggers
-- ════════════════════════════════════════════════════════════════

-- ── updated_at maintenance ───────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_departments_touch ON departments;
CREATE TRIGGER trg_departments_touch BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_profiles_touch ON profiles;
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_requests_touch ON requests;
CREATE TRIGGER trg_requests_touch BEFORE UPDATE ON requests FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_activity_touch ON request_activity;
CREATE TRIGGER trg_activity_touch BEFORE UPDATE ON request_activity FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── Auto-create profile on signup ────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Generate request number (LBD-YYYYMMDD-0001) ──────────────────
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
DECLARE v_date TEXT; v_seq INTEGER;
BEGIN
  v_date := to_char(now(),'YYYYMMDD');
  INSERT INTO request_number_seq (date_key,last_seq) VALUES (v_date,1)
  ON CONFLICT (date_key) DO UPDATE SET last_seq = request_number_seq.last_seq + 1
  RETURNING last_seq INTO v_seq;
  NEW.request_number := 'LBD-'||v_date||'-'||lpad(v_seq::text,4,'0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_request_number ON requests;
CREATE TRIGGER trg_request_number
  BEFORE INSERT ON requests
  FOR EACH ROW WHEN (NEW.request_number IS NULL OR NEW.request_number = '')
  EXECUTE FUNCTION generate_request_number();

-- ── Role escalation guard ────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active
          OR OLD.department_id IS DISTINCT FROM NEW.department_id)
     AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  THEN
    RAISE EXCEPTION 'Unauthorized: only admins can change role, department, or active status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- ── Notify: request assigned ─────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_request_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP='INSERT' AND NEW.assigned_to IS NOT NULL)
  OR (TG_OP='UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    INSERT INTO notifications (user_id,type,title,body,link,entity_id)
    VALUES (NEW.assigned_to,'request_assigned','Request assigned to you',
            NEW.request_number||' — '||NEW.title,'/requests/'||NEW.id::text,NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

DROP TRIGGER IF EXISTS trg_notify_assigned ON requests;
CREATE TRIGGER trg_notify_assigned
  AFTER INSERT OR UPDATE OF assigned_to ON requests
  FOR EACH ROW EXECUTE FUNCTION notify_request_assigned();

-- ── Notify: status change (raiser + assignee) ────────────────────
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER AS $$
DECLARE v_actor UUID := auth.uid();
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.raised_by IS NOT NULL AND NEW.raised_by <> COALESCE(v_actor,'00000000-0000-0000-0000-000000000000') THEN
      INSERT INTO notifications (user_id,type,title,body,link,entity_id)
      VALUES (NEW.raised_by,'status_update',
              CASE WHEN NEW.status='resolved' THEN 'Your request was resolved' ELSE 'Request status updated' END,
              NEW.request_number||' → '||replace(NEW.status,'_',' '),
              '/requests/'||NEW.id::text,NEW.id);
    END IF;
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to IS DISTINCT FROM NEW.raised_by
       AND NEW.assigned_to <> COALESCE(v_actor,'00000000-0000-0000-0000-000000000000') THEN
      INSERT INTO notifications (user_id,type,title,body,link,entity_id)
      VALUES (NEW.assigned_to,'status_update','Request status updated',
              NEW.request_number||' → '||replace(NEW.status,'_',' '),
              '/requests/'||NEW.id::text,NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

DROP TRIGGER IF EXISTS trg_notify_status ON requests;
CREATE TRIGGER trg_notify_status
  AFTER UPDATE OF status ON requests
  FOR EACH ROW EXECUTE FUNCTION notify_status_change();

-- ── Notify: new comment on request ───────────────────────────────
CREATE OR REPLACE FUNCTION notify_request_comment()
RETURNS TRIGGER AS $$
DECLARE v_req requests%ROWTYPE;
BEGIN
  IF NEW.type <> 'comment' THEN RETURN NEW; END IF;
  SELECT * INTO v_req FROM requests WHERE id = NEW.request_id;
  IF v_req.raised_by IS NOT NULL AND v_req.raised_by <> NEW.actor_id THEN
    INSERT INTO notifications (user_id,type,title,body,link,entity_id)
    VALUES (v_req.raised_by,'request_comment','New reply on your request',
            v_req.request_number||' — '||v_req.title,'/requests/'||v_req.id::text,v_req.id);
  END IF;
  IF v_req.assigned_to IS NOT NULL AND v_req.assigned_to <> NEW.actor_id
     AND v_req.assigned_to IS DISTINCT FROM v_req.raised_by THEN
    INSERT INTO notifications (user_id,type,title,body,link,entity_id)
    VALUES (v_req.assigned_to,'request_comment','New reply on assigned request',
            v_req.request_number||' — '||v_req.title,'/requests/'||v_req.id::text,v_req.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

DROP TRIGGER IF EXISTS trg_notify_comment ON request_activity;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON request_activity
  FOR EACH ROW EXECUTE FUNCTION notify_request_comment();

-- ── Messaging: bump conversation + notify members on new message ─
CREATE OR REPLACE FUNCTION on_new_message()
RETURNS TRIGGER AS $$
DECLARE v_sender TEXT; m RECORD;
BEGIN
  UPDATE conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = left(NEW.body,120),
        updated_at = now()
    WHERE id = NEW.conversation_id;

  SELECT full_name INTO v_sender FROM profiles WHERE id = NEW.sender_id;

  FOR m IN
    SELECT user_id FROM conversation_members
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO notifications (user_id,type,title,body,link,entity_id)
    VALUES (m.user_id,'message','New message from '||COALESCE(v_sender,'a colleague'),
            left(NEW.body,120),'/chat/'||NEW.conversation_id::text,NEW.conversation_id);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

DROP TRIGGER IF EXISTS trg_on_new_message ON messages;
CREATE TRIGGER trg_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION on_new_message();
