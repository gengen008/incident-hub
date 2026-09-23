-- ════════════════════════════════════════════════════════════════
-- LABIANCA DESK — sample data (requests + conversations)
-- Idempotent-ish: safe to run once on a fresh dataset.
-- ════════════════════════════════════════════════════════════════

-- Helper shorthands via inline subqueries
-- Requests --------------------------------------------------------
INSERT INTO requests (title, description, category, priority, status, raised_by, raised_dept, target_dept, assigned_to, location)
VALUES
 ('Cold room 2 compressor not cooling',
  'Cold room 2 temperature has risen to -8°C (should be -18°C). Compressor is running but not cooling. Stock at risk — needs urgent attention.',
  'Cold Chain & Equipment','urgent','open',
  (SELECT id FROM profiles WHERE email='ops.staff@labianca.com'),
  (SELECT id FROM departments WHERE code='OPS'),
  (SELECT id FROM departments WHERE code='CSW'),
  (SELECT id FROM profiles WHERE email='csw.head@labianca.com'),
  'Tema cold store, Room 2'),

 ('Overtime not reflected in payroll',
  'Three warehouse staff worked weekend overtime last month but it was not captured in payroll. Please review and correct.',
  'Finance & Payments','high','in_progress',
  (SELECT id FROM profiles WHERE email='csw.staff@labianca.com'),
  (SELECT id FROM departments WHERE code='CSW'),
  (SELECT id FROM departments WHERE code='FIN'),
  (SELECT id FROM profiles WHERE email='fin.staff@labianca.com'),
  'HR/Finance office'),

 ('POS terminal offline at Spintex outlet',
  'The POS terminal at the Spintex retail point cannot connect. Sales are being recorded manually. Need IT support today.',
  'IT & Systems','high','in_progress',
  (SELECT id FROM profiles WHERE email='sls.staff@labianca.com'),
  (SELECT id FROM departments WHERE code='SLS'),
  (SELECT id FROM departments WHERE code='IT'),
  (SELECT id FROM profiles WHERE email='it.staff@labianca.com'),
  'Spintex outlet'),

 ('Restock cold-room gloves and PPE',
  'We are out of insulated gloves for the cold room. Staff need proper PPE before the next shift.',
  'Safety & Security','medium','open',
  (SELECT id FROM profiles WHERE email='csw.head@labianca.com'),
  (SELECT id FROM departments WHERE code='CSW'),
  (SELECT id FROM departments WHERE code='SSQ'),
  NULL,'Tema cold store'),

 ('Delivery truck GT-4821 due for servicing',
  'Truck GT-4821 is overdue for service. Brakes feel soft. Please schedule maintenance before next long-haul delivery.',
  'Logistics & Fleet','medium','on_hold',
  (SELECT id FROM profiles WHERE email='scl.staff@labianca.com'),
  (SELECT id FROM departments WHERE code='SCL'),
  (SELECT id FROM departments WHERE code='OPS'),
  (SELECT id FROM profiles WHERE email='ops.head@labianca.com'),
  'Transport yard'),

 ('New staff laptop setup',
  'New HR officer starts Monday. Please provision a laptop with email and the HR system installed.',
  'IT & Systems','low','resolved',
  (SELECT id FROM profiles WHERE email='hr.head@labianca.com'),
  (SELECT id FROM departments WHERE code='HR'),
  (SELECT id FROM departments WHERE code='IT'),
  (SELECT id FROM profiles WHERE email='it.staff@labianca.com'),
  'Head office'),

 ('Customer complaint — late delivery to Kumasi',
  'A wholesale customer in Kumasi reported their order arrived a day late and partially thawed. Please investigate the route and cold chain.',
  'Logistics & Fleet','high','open',
  (SELECT id FROM profiles WHERE email='cst.staff@labianca.com'),
  (SELECT id FROM departments WHERE code='CST'),
  (SELECT id FROM departments WHERE code='SCL'),
  NULL,'Kumasi route'),

 ('Stock reconciliation discrepancy — frozen chicken',
  'Physical count of frozen chicken cartons is 42 short against the system. Need warehouse to help reconcile.',
  'Inventory & Supplies','medium','in_progress',
  (SELECT id FROM profiles WHERE email='fin.staff@labianca.com'),
  (SELECT id FROM departments WHERE code='FIN'),
  (SELECT id FROM departments WHERE code='CSW'),
  (SELECT id FROM profiles WHERE email='csw.staff@labianca.com'),
  'Main warehouse'),

 ('CCTV camera down at loading Bay 3',
  'Security camera covering Bay 3 has been offline since yesterday. Blind spot during loading. Please restore.',
  'Safety & Security','high','open',
  (SELECT id FROM profiles WHERE email='ssq.staff@labianca.com'),
  (SELECT id FROM departments WHERE code='SSQ'),
  (SELECT id FROM departments WHERE code='IT'),
  (SELECT id FROM profiles WHERE email='it.head@labianca.com'),
  'Loading Bay 3'),

 ('Supplier onboarding for new fish importer',
  'Business development has a new fish supplier. Need procurement and finance to set up vendor records and payment terms.',
  'Procurement','low','open',
  (SELECT id FROM profiles WHERE email='bdv.head@labianca.com'),
  (SELECT id FROM departments WHERE code='BDV'),
  (SELECT id FROM departments WHERE code='FIN'),
  NULL,'Head office');

-- Resolution note + resolved timestamp for the laptop request
UPDATE requests SET resolution_notes = 'Laptop provisioned, email + HR system installed and tested. Handed over.', resolved_at = now() - interval '1 day'
WHERE title = 'New staff laptop setup';

-- Created activity for every request
INSERT INTO request_activity (request_id, actor_id, type, body)
SELECT id, raised_by, 'created', 'Request created' FROM requests;

-- A couple of comments + a status change for realism
INSERT INTO request_activity (request_id, actor_id, type, body)
SELECT r.id, r.assigned_to, 'comment', 'On my way to check the compressor now. Will move stock to Room 1 as a precaution.'
FROM requests r WHERE r.title = 'Cold room 2 compressor not cooling' AND r.assigned_to IS NOT NULL;

INSERT INTO request_activity (request_id, actor_id, type, body)
SELECT r.id, r.assigned_to, 'comment', 'Confirmed the terminal''s network cable was faulty. Replacement ordered, temporary hotspot in place.'
FROM requests r WHERE r.title = 'POS terminal offline at Spintex outlet' AND r.assigned_to IS NOT NULL;

INSERT INTO request_activity (request_id, actor_id, type, from_status, to_status, body)
SELECT r.id, r.assigned_to, 'status_change', 'open', 'in_progress', 'Picked up and investigating.'
FROM requests r WHERE r.title = 'Overtime not reflected in payroll' AND r.assigned_to IS NOT NULL;
