#!/bin/sh
set -eu
: "${1:?Usage: backup.sh /secure/path/backup.dump}"
umask 077
docker compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$1"
