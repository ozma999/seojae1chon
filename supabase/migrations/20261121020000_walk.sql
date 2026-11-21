-- 서재산책: 둘러볼 서재 목록(로그인한 사용자 = 초대받은 지인). 호출한 사용자 권한(RLS)으로 동작한다.
create function public.room_list()
returns table (id uuid, room_name text, hair smallint, outfit smallint, books int, brag int, last_added timestamptz, is_me boolean)
language sql stable security invoker set search_path = public as $$
  select p.id, p.room_name, p.hair, p.outfit,
         count(ub.id)::int, count(ub.brag_at)::int, max(ub.created_at), p.id = auth.uid()
  from public.profiles p
  left join public.user_books ub on ub.user_id = p.id
  group by p.id
  order by (p.id = auth.uid()) desc, max(ub.created_at) desc nulls last;
$$;
revoke execute on function public.room_list() from public, anon;
grant execute on function public.room_list() to authenticated;
