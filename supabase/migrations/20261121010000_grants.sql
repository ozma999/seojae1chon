-- 표 권한을 직접 준다.
-- 최근 Supabase 프로젝트는 SQL로 만든 표에 anon/authenticated/service_role 권한을 자동으로 주지 않는다.
-- (없으면 앱에서 "permission denied for table ..." 오류) 행 단위 제한은 여전히 RLS 정책이 맡는다.

grant usage on schema public to anon, authenticated, service_role;

-- 로그인한 사용자
grant select on public.profiles, public.invite_codes, public.books, public.user_books, public.visits to authenticated;
grant update (room_name, hair, outfit, items_off) on public.profiles to authenticated;
grant insert, delete on public.user_books to authenticated;
grant update (format, genre, comment, brag_at, brag_text) on public.user_books to authenticated;
grant insert on public.visits to authenticated;

-- 서버(서지 캐시 쓰기 등). service_role은 RLS를 건너뛰지만 표 권한은 필요하다
grant all on all tables in schema public to service_role;

-- 함수
grant execute on function public.check_invite(text) to anon, authenticated;
grant execute on function public.holders(text) to authenticated;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.today_visits() to authenticated;
