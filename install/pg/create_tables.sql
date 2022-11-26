CREATE TABLE users (
	id serial primary key,
	name varchar unique not null,
	password varchar not null
);

CREATE TABLE sessions (
	key varchar primary key,
	username varchar,
	created timestamp,
	expires timestamp
);

CREATE TABLE rings (
	id serial primary key,
	name varchar
);

CREATE TABLE rulesets (
	id serial primary key,
	name varchar unique not null
);

CREATE TABLE event_types (
	id serial primary key,
	name varchar unique not null
);

CREATE TABLE gender (
	id serial primary key,
	name varchar unique not null,
	abbreviation varchar unique not null
);

CREATE TABLE experience (
	id serial primary key,
	name varchar unique not null,
	abbreviation varchar unique not null
);

CREATE TABLE age_group (
	id serial primary key,
	name varchar unique not null
);

CREATE TABLE events (
	id serial primary key,
	ring_id integer references rings (id) on delete cascade,
	name varchar,
	event_order integer,
	age_group_id integer references age_group (id),
	experience_id integer references experience (id),
	gender_id integer references gender (id),
	ruleset_id integer references rulesets (id),
	style integer
);

CREATE TABLE competitors (
	id serial primary key,
	bib varchar,
	first_name varchar,
	last_name varchar,
	gender_id integer references gender (id),
	experience_id integer references experience (id),
	age_group_id integer references age_group (id),
	team varchar,
	email varchar
);

CREATE TABLE routines (
	id serial primary key,
	event_id integer references events (id) on delete cascade,
	competitor_id integer references competitors (id) on delete cascade,
	event_order integer,
	final_score decimal (4,2) default 0.00,
	total_score decimal (4,2) default 0.00,
	duration varchar default '0:00'
);

CREATE TABLE scores (
	id serial primary key,
	routine_id integer references routines (id) on delete cascade,
	judge_tag varchar,
	score decimal (4,2) not null
);

CREATE TABLE adjustments (
	id serial primary key,
	routine_id integer references routines (id) on delete cascade,
	judge_tag varchar,
	amount decimal (3,2) not null,
	reason varchar default ''
);

CREATE TABLE deductions (
	id integer primary key,
	routine_id integer references routines (id) on delete cascade,
	judge_tag varchar,
	ts bigint,
	code varchar not null
);