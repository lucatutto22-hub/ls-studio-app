#!/usr/bin/env bash
# Lance la migration et les tests d'accès sur un Postgres 16 jetable.
set -euo pipefail
cd "$(dirname "$0")/../.."
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
DIR=$(mktemp -d)
trap '"$PGBIN/pg_ctl" -D "$DIR" stop -m fast >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
"$PGBIN/initdb" -D "$DIR" -U postgres >/dev/null
"$PGBIN/pg_ctl" -D "$DIR" -o "-k $DIR -p 54329 -c listen_addresses=''" -l "$DIR/log" start >/dev/null
PSQL=(psql -h "$DIR" -p 54329 -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f supabase/tests/stub_supabase.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f supabase/tests/rls_test.sql
