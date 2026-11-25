-- 도서관숲 규칙: 관리자 지정 · 대여 1주일 · 연장 1회 · 장소 · 반납 전날 알림 기록
-- Supabase → SQL Editor 에 통째로 붙여 넣고 Run (여러 번 실행해도 괜찮다)

update public.libraries set loan_days = 7, place = '그린팩토리 5F 입구' where slug = 'forest';

-- 관리자: riotlunar@gmail.com 계정만(관리자가 한 명이라도 있으면 태초가족 자동 관리는 꺼진다)
insert into public.library_admins (library_id, user_id)
select l.id, u.id from public.libraries l, auth.users u
where l.slug = 'forest' and lower(u.email) = 'riotlunar@gmail.com'
on conflict do nothing;
do $$ begin
  if not exists (select 1 from public.library_admins a join public.libraries l on l.id = a.library_id where l.slug = 'forest') then
    raise notice '관리자 계정을 찾지 못했어요. riotlunar@gmail.com 으로 가입했는지 확인해 주세요';
  end if;
end $$;

alter table public.loans add column if not exists extended smallint not null default 0;
alter table public.loans add column if not exists reminded_at timestamptz;

-- 연장: 한 번만, 반납 예정일 기준 대여 기간만큼
create or replace function public.forest_extend(p_loan uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare l public.loans; days int; d timestamptz;
begin
  select * into l from public.loans where id = p_loan and returned_at is null and user_id = auth.uid();
  if not found then raise exception '연장할 대여 기록이 없어요'; end if;
  if l.extended >= 1 then raise exception '연장은 한 번만 할 수 있어요'; end if;
  select li.loan_days into days from public.library_books b join public.libraries li on li.id = b.library_id where b.id = l.library_book_id;
  update public.loans set due_at = greatest(due_at, now()) + make_interval(days => days), extended = extended + 1, reminded_at = null
  where id = l.id returning due_at into d;
  return d;
end $$;
revoke execute on function public.forest_extend(uuid) from public, anon;
grant execute on function public.forest_extend(uuid) to authenticated;
