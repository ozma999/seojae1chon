-- 태초가족: 특별한 초대 코드(FAMILY, 10명)로 가입한 사람에게 'founding' 표시.
-- 나중에 사진 촬영 책 등록 같은 기능을 이분들에게만 먼저 켤 때 쓴다. 사용자는 이 표시를 바꿀 수 없다.

alter table public.invite_codes add column if not exists cohort text;
alter table public.profiles     add column if not exists cohort text;

-- 가입 트리거: 초대 코드의 cohort를 프로필에 옮겨 적는다
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c public.invite_codes;
  v_code text := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
begin
  select * into c from public.invite_codes where code = v_code for update;
  if not found or c.uses >= c.max_uses or (c.expires_at is not null and c.expires_at < now()) then
    raise exception '초대 코드가 맞지 않아요' using errcode = 'P0001';
  end if;
  update public.invite_codes set uses = uses + 1 where code = v_code;
  insert into public.profiles (id, invited_by, cohort) values (new.id, c.created_by, c.cohort);
  return new;
end $$;

-- 서재산책 목록에 cohort도 돌려준다(반환 형태가 바뀌어 다시 만든다)
drop function if exists public.room_list();
create function public.room_list()
returns table (id uuid, room_name text, hair smallint, outfit smallint, books int, brag int, last_added timestamptz, is_me boolean, cohort text)
language sql stable security invoker set search_path = public as $$
  select p.id, p.room_name, p.hair, p.outfit,
         count(ub.id)::int, count(ub.brag_at)::int, max(ub.created_at), p.id = auth.uid(), p.cohort
  from public.profiles p
  left join public.user_books ub on ub.user_id = p.id
  group by p.id
  order by (p.id = auth.uid()) desc, max(ub.created_at) desc nulls last;
$$;
revoke execute on function public.room_list() from public, anon;
grant execute on function public.room_list() to authenticated;

-- 지금까지 가입한 사람(만든 사람과 테스트 계정)도 태초가족
update public.profiles set cohort = 'founding' where cohort is null;

-- 태초가족 초대 코드: FAMILY, 10명, 기한 없음
insert into public.invite_codes (code, max_uses, cohort) values ('FAMILY', 10, 'founding')
on conflict (code) do update set max_uses = 10, cohort = 'founding';
