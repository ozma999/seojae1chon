-- 로컬 검증용: Supabase의 역할·auth 스키마 흉내(실제 Supabase에는 적용하지 않는다)
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
-- Supabase처럼 pgcrypto는 extensions 스키마에 있다(public 검색 경로 밖)
create schema extensions; create extension pgcrypto schema extensions;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
-- 최근 Supabase 프로젝트처럼 새 표에 자동 권한을 주지 않는다(마이그레이션이 직접 grant 해야 함).
-- 함수는 Postgres 기본대로 PUBLIC에 실행 권한이 있다.
