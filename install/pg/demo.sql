INSERT INTO rings (id, name) VALUES
  (10000, 'TEST RING 1'),
  (10001, 'TEST RING 2');

INSERT INTO events (id, ring_id, name, ruleset_id, event_order, style, experience_id) VALUES
  (20000, 10000, 'Test Event 1 M', 1, 1, 0, 3),
  (20001, 10000, 'Test Event 1 F', 1, 2, 0, 3),
  (20002, 10001, 'Test Event 2 M', 1, 1, 0, 3),
  (20003, 10001, 'Test Event 2 F', 1, 2, 0, 3);

INSERT INTO competitors (id, last_name, first_name, gender_id, experience_id) VALUES
  (30000, 'Chung', 'Allen', 2, 3),
  (30001, 'Hong', 'Henry', 2, 3),
  (30002, 'Benedik', 'Justin', 2, 3),
  (30003, 'Feng', 'Sherry', 1, 3),
  (30004, 'Zhang', 'Tina', 1, 3);

INSERT INTO routines (event_id, competitor_id, event_order) VALUES
  (20000, 30000, 1),
  (20000, 30001, 2),
  (20000, 30002, 3),
  (20001, 30003, 1),
  (20001, 30004, 2),
  (20002, 30000, 1),
  (20002, 30001, 2),
  (20002, 30002, 3),
  (20003, 30003, 1),
  (20003, 30004, 1);