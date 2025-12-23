psql -U postgres --file=../pg/setup_db.sql
psql -U postgres -d tpz --file=../pg/config.sql
psql -U tpzadmin -d tpz --file=../pg/competition.sql