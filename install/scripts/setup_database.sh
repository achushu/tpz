#!/usr/bin/env bash

#chown postgres:postgres ../pg/*.sql
psql --file=../pg/setup_db.sql
psql -d tpz --file=../pg/config.sql
psql -U tpzadmin -d tpz --file=../pg/competition.sql
