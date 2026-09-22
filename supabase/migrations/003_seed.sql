-- IncidentHub Sample Data
-- Creates sample departments (run after 001_schema.sql and 002_rls.sql)
-- Note: User accounts must be created through Supabase Auth (signup flow or admin dashboard)

-- ── Sample Departments ───────────────────────────────────────────
INSERT INTO departments (name, description, code) VALUES
  ('Information Technology', 'IT infrastructure, systems, and software support', 'IT'),
  ('Retail Operations',      'In-store operations, POS, and customer service',    'RT'),
  ('Maintenance',            'Facilities, equipment, and building maintenance',    'MX'),
  ('Human Resources',        'Personnel, recruitment, and employee welfare',       'HR'),
  ('Finance',                'Accounting, payroll, and financial reporting',       'FN'),
  ('Operations',             'Supply chain, logistics, and general operations',    'OP'),
  ('Security',               'Physical security and access control',               'SC'),
  ('Administration',         'Executive support and company administration',       'AD')
ON CONFLICT (name) DO NOTHING;

-- ── Sample Incident Categories reference ─────────────────────────
-- Categories are constrained in the schema:
-- 'Equipment Failure','Software Issue','Maintenance','Safety',
-- 'Process','HR','Facility','Security','Other'

-- ── Test Account Setup Instructions ─────────────────────────────
-- Create these accounts in Supabase Auth dashboard:
--
-- 1. admin@incidenthub.com    / Admin@123456   → set role='admin' in profiles
-- 2. head.it@incidenthub.com  / Head@123456    → set role='department_head', department_id=IT dept UUID
-- 3. user.retail@incidenthub.com / User@123456 → set role='user', department_id=Retail dept UUID
-- 4. user.maintenance@incidenthub.com / User@123456 → set role='user', department_id=Maintenance UUID
--
-- After creating accounts, run:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@incidenthub.com';
-- UPDATE profiles SET role = 'department_head', department_id = (
--   SELECT id FROM departments WHERE code = 'IT'
-- ) WHERE email = 'head.it@incidenthub.com';
-- UPDATE profiles SET department_id = (
--   SELECT id FROM departments WHERE code = 'RT'
-- ) WHERE email = 'user.retail@incidenthub.com';
