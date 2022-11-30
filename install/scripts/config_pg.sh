#!/usr/bin/env bash

# Check for root privileges
if [ "$(whoami)" != "root" ]; then
    echo "Please rerun this as root"
    exit 1
fi

echo "Configuring database"
chown postgres:postgres ../pg/pg_hba.conf

cat ../pg/pg_hba.conf >> /etc/postgresql/10/main/pg_hba.conf
service postgresql restart