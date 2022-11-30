#!/usr/bin/env bash

psql -d tpz --file=../pg/reset.sql
./setup_database.sh
