-- ════════════════════════════════════════════════════════════════
-- LABIANCA DESK — Schema v1.0
-- Centralized inter-departmental request & messaging platform
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Drop legacy incident-app objects ────────────────────────────
DROP TABLE IF EXISTS incident_status_history CASCADE;
DROP TABLE IF EXISTS incident_comments       CASCADE;
DROP TABLE IF EXISTS incident_photos         CASCADE;
DROP TABLE IF EXISTS incident_number_seq     CASCADE;
DROP TABLE IF EXISTS incidents               CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications           CASCADE;
DROP TABLE IF EXISTS user_departments        CASCADE;
-- departments & profiles are recreated below (drop to reset shape)
DROP TABLE IF EXISTS request_activity        CASCADE;
DROP TABLE IF EXISTS request_attachments     CASCADE;
DROP TABLE IF EXISTS requests                CASCADE;
DROP TABLE IF EXISTS messages                CASCADE;
DROP TABLE IF EXISTS conversation_members    CASCADE;
DROP TABLE IF EXISTS conversations           CASCADE;
DROP TABLE IF EXISTS request_number_seq      CASCADE;
DROP TABLE IF EXISTS profiles                CASCADE;
DROP TABLE IF EXISTS departments             CASCADE;

-- ── Departments ──────────────────────────────────────────────────
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  code        TEXT UNIQUE NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#015198',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Profiles (mirror of auth.users) ──────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  job_title     TEXT,
  role          TEXT NOT NULL DEFAULT 'staff'
                CHECK (role IN ('admin','head','staff')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Request numbering sequence (per day) ─────────────────────────
CREATE TABLE request_number_seq (
  date_key TEXT PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);

-- ── Requests ─────────────────────────────────────────────────────
-- A department/person logs a problem or request that is routed to
-- a target department and (optionally) a specific person to resolve.
CREATE TABLE requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number  TEXT UNIQUE NOT NULL,   -- LBD-YYYYMMDD-0001
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'General'
                  CHECK (category IN (
                    'Cold Chain & Equipment','IT & Systems','Facilities & Maintenance',
                    'Procurement','Logistics & Fleet','Inventory & Supplies',
                    'HR & Personnel','Finance & Payments','Safety & Security','General'
                  )),
  priority        TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low','medium','high','urgent')),
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','on_hold','resolved','closed')),
  raised_by       UUID NOT NULL REFERENCES profiles(id),
  raised_dept     UUID REFERENCES departments(id),        -- originating dept
  target_dept     UUID NOT NULL REFERENCES departments(id), -- dept expected to resolve
  assigned_to     UUID REFERENCES profiles(id),           -- specific owner
  location        TEXT,
  resolution_notes TEXT,
  due_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

-- ── Request activity (unified timeline: comments + status changes) ─
CREATE TABLE request_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES profiles(id),
  type        TEXT NOT NULL CHECK (type IN ('comment','status_change','assignment','created')),
  body        TEXT,
  from_status TEXT,
  to_status   TEXT,
  is_deleted  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Request attachments ──────────────────────────────────────────
CREATE TABLE request_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  file_name   TEXT,
  file_size   INTEGER,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Conversations (messaging) ────────────────────────────────────
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL DEFAULT 'direct'
              CHECK (type IN ('direct','group')),
  title       TEXT,                                   -- for group chats
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),     -- bumped on new message
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT
);

CREATE TABLE conversation_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id),
  body            TEXT NOT NULL,
  attachment_url  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Notifications ────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- request_assigned, status_update, request_comment, message, mention
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  entity_id   UUID,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX idx_profiles_dept        ON profiles(department_id);
CREATE INDEX idx_requests_target      ON requests(target_dept);
CREATE INDEX idx_requests_raised      ON requests(raised_by);
CREATE INDEX idx_requests_assigned    ON requests(assigned_to);
CREATE INDEX idx_requests_status      ON requests(status);
CREATE INDEX idx_requests_created     ON requests(created_at DESC);
CREATE INDEX idx_activity_request     ON request_activity(request_id);
CREATE INDEX idx_conv_members_user    ON conversation_members(user_id);
CREATE INDEX idx_conv_members_conv    ON conversation_members(conversation_id);
CREATE INDEX idx_messages_conv        ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_notifications_user   ON notifications(user_id, is_read);
CREATE INDEX idx_conversations_last   ON conversations(last_message_at DESC);
