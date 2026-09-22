-- IncidentHub Schema v1.0
-- Run in Supabase SQL editor

-- ── Extensions ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Profiles (mirrors auth.users) ───────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'user'
              CHECK (role IN ('admin', 'department_head', 'user')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  avatar_url  TEXT,
  department_id UUID,  -- primary department for scoped queries
  must_change_password BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Departments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  code        TEXT UNIQUE,            -- short 2-4 char code e.g. "IT", "HR"
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── User-Department junction ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_head       BOOLEAN NOT NULL DEFAULT false,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, department_id)
);

-- ── Incidents ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number  TEXT UNIQUE NOT NULL,  -- INC-YYYYMMDD-00001
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'Other'
                   CHECK (category IN (
                     'Equipment Failure','Software Issue','Maintenance',
                     'Safety','Process','HR','Facility','Security','Other'
                   )),
  priority         TEXT NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low','medium','high','critical')),
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','in_progress','resolved','closed')),
  reported_by      UUID NOT NULL REFERENCES profiles(id),
  assigned_to      UUID REFERENCES profiles(id),
  department_id    UUID NOT NULL REFERENCES departments(id),
  affected_systems TEXT,
  location         TEXT,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ
);

-- ── Incident counter per day (for auto-numbering) ────────────────
CREATE TABLE IF NOT EXISTS incident_number_seq (
  date_key TEXT PRIMARY KEY,           -- YYYYMMDD
  last_seq  INTEGER NOT NULL DEFAULT 0
);

-- ── Incident Photos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incident_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,
  file_name   TEXT,
  file_size   INTEGER,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Incident Comments ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incident_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  is_deleted  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Status History (audit trail) ────────────────────────────────
CREATE TABLE IF NOT EXISTS incident_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID NOT NULL REFERENCES profiles(id),
  reason      TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Notifications ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,  -- 'incident_assigned','status_update','comment','mentioned','resolved'
  title       TEXT NOT NULL,
  body        TEXT,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
  link        TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Notification preferences ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_assigned       BOOLEAN NOT NULL DEFAULT true,
  email_status_change  BOOLEAN NOT NULL DEFAULT true,
  email_comment        BOOLEAN NOT NULL DEFAULT true,
  email_mentioned      BOOLEAN NOT NULL DEFAULT true,
  email_resolved       BOOLEAN NOT NULL DEFAULT true,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_incidents_department   ON incidents(department_id);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to  ON incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_by  ON incidents(reported_by);
CREATE INDEX IF NOT EXISTS idx_incidents_status       ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority     ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at   ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_depts_user        ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_depts_dept        ON user_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_comments_incident      ON incident_comments(incident_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read     ON notifications(user_id, read);

-- ── Auto-update updated_at trigger ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON departments  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_incidents_updated   BEFORE UPDATE ON incidents    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_comments_updated    BEFORE UPDATE ON incident_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Auto-create profile on signup ────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Auto-generate incident numbers ───────────────────────────────
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
  v_date TEXT;
  v_seq  INTEGER;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  INSERT INTO incident_number_seq (date_key, last_seq)
  VALUES (v_date, 1)
  ON CONFLICT (date_key) DO UPDATE
  SET last_seq = incident_number_seq.last_seq + 1
  RETURNING last_seq INTO v_seq;
  NEW.incident_number := 'INC-' || v_date || '-' || lpad(v_seq::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_incident_number
  BEFORE INSERT ON incidents
  FOR EACH ROW
  WHEN (NEW.incident_number IS NULL OR NEW.incident_number = '')
  EXECUTE FUNCTION generate_incident_number();

-- ── Default notification preferences on new profile ──────────────
CREATE OR REPLACE FUNCTION create_default_notif_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_default_notif_prefs
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_notif_prefs();
