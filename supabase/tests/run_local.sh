#!/usr/bin/env bash
# 로컬 Postgres 16으로 마이그레이션 + RLS 테스트. 사용: bash supabase/tests/run_local.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
BIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
D=$(mktemp -d); PORT=${PORT:-55432}
chown postgres "$D" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "$BIN/initdb -D $D/data -A trust -U postgres >/dev/null"
run "$BIN/pg_ctl -D $D/data -o '-p $PORT -k $D' -l $D/log start >/dev/null"
trap 'run "$BIN/pg_ctl -D $D/data stop -m fast >/dev/null"; rm -rf "$D"' EXIT
P="psql -h $D -p $PORT -U postgres -v ON_ERROR_STOP=1 -q -t -o /dev/null"
$P -c 'create database t' >/dev/null
$P -d t -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/*.sql; do $P -d t -f "$f"; done
$P -d t -f supabase/tests/rls_test.sql
