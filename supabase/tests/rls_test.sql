-- 로컬 Postgres에서: 스텁 → 마이그레이션 → 이 파일. 실패하면 예외로 멈춘다.
\set ON_ERROR_STOP on
create or replace function pg_temp.as_user(u uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', coalesce(u::text, ''), false) $$;
create or replace function pg_temp.expect_fail(sql text, what text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'ok (막힘): % → %', what, sqlerrm; return; end;
  raise exception 'FAIL: 막혀야 함: %', what;
end $$;

insert into public.invite_codes (code, max_uses) values ('ABC234', 2), ('OLD999', 1);
update public.invite_codes set expires_at = now() - interval '1 day' where code = 'OLD999';

-- 가입: 초대 코드 검증
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000a', 'a@x', '{"invite_code":"abc234"}');
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000b', 'b@x', '{"invite_code":"ABC234"}');
select pg_temp.expect_fail($$insert into auth.users (email, raw_user_meta_data) values ('c@x', '{"invite_code":"ABC234"}')$$, '사용 횟수 초과 코드');
select pg_temp.expect_fail($$insert into auth.users (email, raw_user_meta_data) values ('d@x', '{"invite_code":"OLD999"}')$$, '만료 코드');
select pg_temp.expect_fail($$insert into auth.users (email) values ('e@x')$$, '코드 없음');
do $$ begin assert (select count(*) from public.profiles) = 2, 'profiles 2개'; end $$;

-- 서버(서지 캐시): service_role 권한으로 upsert
set role service_role;
insert into public.books (isbn, title, genre) values ('9788936434120', '채식주의자', 'lit'), ('9788901234567', '테스트', 'sf');
insert into public.books (isbn, title) values ('9788936434120', '채식주의자') on conflict (isbn) do update set title = excluded.title;
reset role;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin assert public.check_invite('abc234') = false, '다 쓴 코드'; end $$;
insert into public.user_books (isbn, method, verified) values ('9788936434120', 'barcode', true);
insert into public.user_books (isbn) values ('9788901234567');
update public.user_books set brag_at = now(), brag_text = '최애' where isbn = '9788936434120';
select pg_temp.expect_fail($$insert into public.books (isbn, title) values ('9780000000002', 'x')$$, '사용자가 서지 쓰기');
select pg_temp.expect_fail($$insert into public.user_books (user_id, isbn) values ('00000000-0000-0000-0000-00000000000b', '9788936434120')$$, '남의 서재에 책 넣기');
select pg_temp.expect_fail($$update public.user_books set verified = true$$, '실물 인증 위조');
select pg_temp.expect_fail($$update public.profiles set invited_by = null$$, '초대자 바꾸기');
do $$ begin assert (select count(*) from public.profiles where id = auth.uid()) = 1, '내 프로필 읽기'; end $$;
update public.profiles set room_name = '현우의 서재', hair = 2 where id = auth.uid();
-- 초대 코드 만들기
do $$ declare c text := public.create_invite(); begin assert c ~ '^[A-Z0-9]{6}$', 'code 형식'; assert public.check_invite(c), '새 코드 유효'; end $$;

-- B: A의 서재는 보이지만 고칠 수 없다
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin assert (select count(*) from public.user_books) = 2, 'A의 책 2권 보임'; end $$;
update public.user_books set comment = 'hack' where user_id <> auth.uid();
update public.profiles set room_name = 'hack' where id <> auth.uid();
do $$ begin assert (select count(*) from public.invite_codes) = 0, 'A의 초대 코드는 안 보임'; end $$;
insert into public.visits (host) values ('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_fail($$insert into public.visits (host) values ('00000000-0000-0000-0000-00000000000b')$$, '내 서재 방문');
do $$ begin assert public.holders('9788936434120') = 1; end $$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select count(*) from public.user_books where comment = 'hack') = 0, '남이 내 코멘트 못 고침';
  assert (select room_name from public.profiles where id = auth.uid()) = '현우의 서재', '남이 내 서재 이름 못 고침';
  assert public.today_visits() = 1, '오늘 방문 1';
end $$;
-- 자랑 책장 12칸 제한
reset role;
insert into public.books (isbn, title) select lpad(g::text, 13, '9'), 't' || g from generate_series(1, 13) g;
set role authenticated;
insert into public.user_books (isbn, brag_at) select lpad(g::text, 13, '9'), now() from generate_series(1, 11) g;
select pg_temp.expect_fail($$insert into public.user_books (isbn, brag_at) values (lpad('12', 13, '9'), now())$$, '자랑 책장 13번째');

-- 로그인 안 한 사용자(anon)는 아무것도 못 본다
reset role; set role anon; select pg_temp.as_user(null);
select pg_temp.expect_fail($$select count(*) from public.user_books$$, 'anon 서재 읽기');
select pg_temp.expect_fail($$select count(*) from public.profiles$$, 'anon 프로필 읽기');
select pg_temp.expect_fail($$select public.create_invite()$$, 'anon 초대 코드 만들기');
do $$ begin assert public.check_invite('ZZZZZZ') = false; end $$;
reset role;
\o
\echo ALL RLS TESTS PASSED
