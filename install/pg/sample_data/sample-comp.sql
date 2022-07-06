DO $$
DECLARE uswu CONSTANT integer := 1;
DECLARE iwuf2005 CONSTANT integer := 10;
DECLARE iwufab2005 CONSTANT integer := 11;
DECLARE iwuf2018 CONSTANT integer := 20;
DECLARE iwufab2018 CONSTANT integer := 21;

DECLARE N CONSTANT integer := 0;
DECLARE S CONSTANT integer := 1;
DECLARE TJ CONSTANT integer := 2;

DECLARE F CONSTANT integer := 1;
DECLARE M CONSTANT integer := 2;

DECLARE BEG CONSTANT integer := 1;
DECLARE INTR CONSTANT integer := 2;
DECLARE ADV CONSTANT integer := 3;

DECLARE ADULT CONSTANT integer := 6;

BEGIN
INSERT INTO events (ring_id, name, ruleset_id, style, event_order) VALUES
  (2, 'Int Changquan F', uswu, N, 1),
  (2, 'Int Changquan M', uswu, N, 2),
  (2, 'Int Nanquan F', uswu, S, 3),
  (2, 'Int Nanquan M', uswu, S, 4),
  (2, 'Beg Changquan F', uswu, N, 10),
  (2, 'Beg Changquan M', uswu, N, 11),
  (2, 'Beg Nanquan F', uswu, S, 12),
  (2, 'Beg Nanquan M', uswu, S, 12);

INSERT INTO competitors (bib, last_name, first_name, gender_id, experience_id, age_group_id, team) VALUES
  ('1000', 'Tran', 'M', M, ADV, ADULT, 'TPZ'),
  ('1001', 'Li', 'C', M, ADV, ADULT, 'TPZ'),
  ('1002', 'Yang', 'J', M, ADV, ADULT, 'TPZ'),
  ('1003', 'Chung', 'B', F, ADV, ADULT, 'TPZ'),
  ('1004', 'Tang', 'K', F, ADV, ADULT, 'TPZ'),
  ('1005', 'Liang', 'S', F, ADV, ADULT, 'TPZ'),
  ('1006', 'Sanchez', 'M', M, ADV, ADULT, 'TPZ'),
  ('1007', 'Chai', 'A', M, ADV, ADULT, 'TPZ'),
  ('1008', 'Chen', 'J', F, ADV, ADULT, 'TPZ'),
  ('1009', 'Kim', 'P', M, ADV, ADULT, 'TPZ'),
  ('', 'Zhong', 'D', M, ADV, ADULT, 'TPZ'),
  ('', 'Huang', 'S', M, ADV, ADULT, 'TPZ'),
  ('', 'Anderson', 'P', F, ADV, ADULT, 'TPZ'),
  ('', 'Wu', 'R', F, ADV, ADULT, 'TPZ');

/*
  ('', 'Sanchez', 'N', 1, 3, 6, 'TPZ'),
  ('', 'Nam', 'M', 1, 3, 6, 'TPZ'),
  ('', 'Oh', 'P', G, E, 6, 'TPZ'),
  ('', 'Wang', 'M', G, E, 6, 'TPZ'),
  ('', 'Whitley', 'J', G, E, 6, 'TPZ'),
  ('', 'Chan', 'C', G, E, 6, 'TPZ'),
  ('', 'Cheung', 'J', G, E, 6, 'TPZ'),
  ('', 'Ma', 'C', G, E, 6, 'TPZ'),
  ('', 'Solomon', 'L', G, E, 6, 'TPZ'),
  ('', 'Chang', 'A', G, E, 6, 'TPZ');
*/

INSERT INTO routines (event_id, competitor_id, event_order) VALUES
  (1, 1, 1),
  (1, 2, 2),
  (1, 3, 3),
  (2, 4, 4),
  (2, 5, 5),
  (2, 6, 1),
  (3, 7, 2),
  (3, 8, 3),
  (4, 9, 4),
  (4, 5, 5),
  (5, 1, 1),
  (6, 10, 2),
  (7, 11, 1),
  (7, 12, 2),
  (8, 13, 1),
  (8, 14, 2);

END $$