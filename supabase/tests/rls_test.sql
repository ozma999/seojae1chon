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
-- 여러 권 한 번에 꽂기: 이미 있는 책은 건너뛰고(ON CONFLICT DO NOTHING) 새 책만 돌려준다
do $$ declare n int; begin
  with ins as (insert into public.user_books (isbn) values ('9788936434120'), ('9788901234567')
               on conflict (user_id, isbn, format) do nothing returning id)
  select count(*) into n from ins;
  assert n = 0, '둘 다 이미 있음';
end $$;
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
-- 서재산책 목록: 나 먼저, 책 수 집계(A·B를 일촌으로 맺어 둔다)
reset role;
insert into public.ilchon (a, b, status, requested_by) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'accepted', '00000000-0000-0000-0000-00000000000a');
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ declare r record; begin
  select * into r from public.room_list() limit 1;
  assert r.is_me and r.books = 0, '첫 줄은 나(B, 책 0권)';
  assert (select books from public.room_list() where not is_me) = 2, 'A의 책 2권';
end $$;
-- 같은 날 두 번 방문은 무시(ON CONFLICT DO NOTHING)
insert into public.visits (host) values ('00000000-0000-0000-0000-00000000000a') on conflict do nothing;

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

-- 태초가족: FAMILY 코드로 가입하면 cohort = founding, 사용자는 못 바꿈, 일반 코드는 표시 없음
reset role;
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000f', 'f@x', '{"invite_code":"family"}');
insert into public.invite_codes (code) values ('PLAIN2');
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000e', 'e@x', '{"invite_code":"PLAIN2"}');
do $$ begin
  assert (select cohort from public.profiles where id = '00000000-0000-0000-0000-00000000000f') = 'founding', 'FAMILY → founding';
  assert (select cohort from public.profiles where id = '00000000-0000-0000-0000-00000000000e') is null, '일반 코드 → 표시 없음';
  assert (select max_uses - uses from public.invite_codes where code = 'FAMILY') = 9, 'FAMILY 9자리 남음';
end $$;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.expect_fail($$update public.profiles set cohort = 'founding' where id = auth.uid()$$, '태초가족 표시 위조');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
do $$ begin assert (select cohort from public.room_list() where id = '00000000-0000-0000-0000-00000000000f') = 'founding', 'room_list에 cohort'; end $$;
reset role;
-- 로그인 안 한 사용자(anon)는 아무것도 못 본다
reset role; set role anon; select pg_temp.as_user(null);
select pg_temp.expect_fail($$select count(*) from public.user_books$$, 'anon 서재 읽기');
select pg_temp.expect_fail($$select count(*) from public.profiles$$, 'anon 프로필 읽기');
select pg_temp.expect_fail($$select public.create_invite()$$, 'anon 초대 코드 만들기');
select pg_temp.expect_fail($$select * from public.room_list()$$, 'anon 서재 목록');
do $$ begin assert public.check_invite('ZZZZZZ') = false; end $$;
reset role;

-- ===== 읽기 기록·일촌·방명록 =====
reset role;
insert into public.invite_codes (code, max_uses) values ('ZZZ234', 5);
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-00000000000c', 'c@x', '{"invite_code":"ZZZ234"}');
set role authenticated;
-- A: 읽기 기록은 쓸 수 있고, 실물 인증은 여전히 못 바꾼다
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update public.user_books set read_status = 'done', rating = 5, lendable = true where isbn = '9788936434120';
do $$ begin assert (select rating from public.user_books where isbn = '9788936434120' and user_id = auth.uid()) = 5, '별점 저장'; end $$;
-- A와 C는 일촌이 아니다(같은 초대 코드여도 초대자가 없음)
do $$ begin assert public.ilchon_state('00000000-0000-0000-0000-00000000000c') = 'none', 'A-C 일촌 아님'; end $$;
select pg_temp.expect_fail($$insert into public.guestbook (host, body) values ('00000000-0000-0000-0000-00000000000c', '안녕')$$, '일촌 아닌 방명록 쓰기');
do $$ begin assert not exists (select 1 from public.room_list() where id = '00000000-0000-0000-0000-00000000000c'), '목록에 C 없음'; end $$;
-- A가 신청 → C가 수락
do $$ begin assert public.ilchon_request('00000000-0000-0000-0000-00000000000c') = 'sent', '신청'; end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin assert public.ilchon_state('00000000-0000-0000-0000-00000000000a') = 'received', '받은 신청'; end $$;
do $$ begin assert (select count(*) from public.ilchon_requests()) = 1, '받은 신청 목록'; end $$;
select public.ilchon_accept('00000000-0000-0000-0000-00000000000a');
do $$ begin assert exists (select 1 from public.room_list() where id = '00000000-0000-0000-0000-00000000000a'), '수락 후 목록에 A'; end $$;
-- C가 A의 방명록에 글 → A만 읽음 표시 가능, B(일촌 아님)는 못 읽음
insert into public.guestbook (host, body) values ('00000000-0000-0000-0000-00000000000a', '서재 멋져요');
insert into public.guestbook (host, body, kind, isbn) values ('00000000-0000-0000-0000-00000000000a', '이 책 빌려줄 수 있어?', 'borrow', '9788936434120');
select pg_temp.expect_fail($$insert into public.guestbook (host, body) values ('00000000-0000-0000-0000-00000000000c', '셀프')$$, '내 방명록에 쓰기');
select pg_temp.expect_fail($$insert into public.guestbook (host, author, body) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '사칭')$$, '남인 척 쓰기');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin assert (select count(*) from public.guestbook where host = '00000000-0000-0000-0000-00000000000a') = 0 or public.is_ilchon(auth.uid(), '00000000-0000-0000-0000-00000000000a'), '일촌 아니면 방명록 안 보임'; end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin assert (select count(*) from public.guestbook where host = auth.uid() and read_at is null) = 2, '새 글 2개'; end $$;
update public.guestbook set read_at = now() where host = auth.uid();
do $$ begin assert (select count(*) from public.guestbook where host = auth.uid() and read_at is null) = 0, '읽음 표시'; end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_fail($$update public.guestbook set body = '수정' where host = '00000000-0000-0000-0000-00000000000a'$$, '방명록 글 고치기');
do $$ begin assert not exists (select 1 from public.guestbook where body = '수정'), '남의 글 수정 불가'; end $$;
reset role;
\o
\echo ALL RLS TESTS PASSED

-- ===== 도서관숲 =====
-- F(태초가족)는 관리자 없이도 책을 등록할 수 있다, E(일반)는 못 한다
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
insert into public.library_books (library_id, isbn, copies) select id, '9788936434120', 1 from public.libraries where slug = 'forest';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.expect_fail($$insert into public.library_books (library_id, isbn) select id, '9788901234567' from public.libraries where slug = 'forest'$$, '일반 사용자 책 등록');
-- E가 빌림 → 한 권뿐이라 A는 못 빌림 → 기록은 모두 보임
do $$ begin assert public.forest_borrow('9788936434120') is not null, 'E 대여'; end $$;
select pg_temp.expect_fail($$select public.forest_borrow('9788936434120')$$, '같은 책 두 번 빌리기');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_fail($$select public.forest_borrow('9788936434120')$$, '모두 대여 중');
do $$ begin assert (select count(*) from public.loans where returned_at is null) = 1, 'A도 대여 기록이 보임'; end $$;
select pg_temp.expect_fail($$select public.forest_return(null, (select id from public.loans limit 1))$$, '남의 대여 반납');
select pg_temp.expect_fail($$insert into public.loans (library_book_id, user_id, due_at) select id, auth.uid(), now() from public.library_books limit 1$$, '대여 기록 직접 쓰기');
-- E가 반납 → A가 빌릴 수 있음
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
do $$ begin assert public.forest_return('9788936434120') is not null, 'E 반납'; end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin assert public.forest_borrow('9788936434120') is not null, 'A 대여'; end $$;
do $$ declare d timestamptz; begin d := public.forest_extend((select id from public.loans where user_id = auth.uid() and returned_at is null)); assert d > now() + interval '20 days', '연장'; end $$;
reset role;
\echo FOREST TESTS PASSED
