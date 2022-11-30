#!/usr/bin/env bash

# Setup script for Ubuntu 18.04 LTS (Bionic Beaver)

# Check for root privileges
if [ "$(whoami)" != "root" ]; then
    echo "Please rerun this as root"
    exit 1
fi

OSVER=$(grep /etc/lsb-release -e "DISTRIB_RELEASE" | cut -d '=' -f 2)
if [ "$OSVER" != "18.04" ]; then
        echo "unsupported version: $OSVER"
        exit 1
fi

# TODO: Check for the universe repos in /etc/apt/sources.list
# deb http://us.archive.ubuntu.com/ubuntu/ bionic universe
# deb http://us.archive.ubuntu.com/ubuntu/ bionic-updates universe
apt update

# Install the supported versions of the required software
apt install -y \
    postgresql-10 \
    postgresql-server-dev-10

pg_isready

./config_pg.sh