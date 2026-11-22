-- 서재 이름(가입 때) · 서재 성향 칭호 · 꾸미기 모양/색 선택 · 장르 판정 출처 · 번역자
-- Supabase → SQL Editor 에 통째로 붙여 넣고 Run (여러 번 실행해도 괜찮다)

alter table public.profiles add column if not exists picks jsonb not null default '{}';
alter table public.profiles add column if not exists title text check (title is null or char_length(title) <= 30);
grant update (room_name, hair, outfit, items_off, picks, title) on public.profiles to authenticated;

alter table public.books add column if not exists translators text;
alter table public.books drop constraint if exists books_genre_source_check;
alter table public.books add constraint books_genre_source_check
  check (genre_source in ('addcode', 'subject', 'guess', 'ai', 'default'));

-- 가입 때 적은 서재 이름을 넣는다(비우면 기본값)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c public.invite_codes;
  v_code text := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
  v_name text := left(trim(coalesce(new.raw_user_meta_data ->> 'room_name', '')), 20);
begin
  select * into c from public.invite_codes where code = v_code for update;
  if not found or c.uses >= c.max_uses or (c.expires_at is not null and c.expires_at < now()) then
    raise exception '초대 코드가 맞지 않아요' using errcode = 'P0001';
  end if;
  update public.invite_codes set uses = uses + 1 where code = v_code;
  insert into public.profiles (id, invited_by, cohort, room_name)
  values (new.id, c.created_by, c.cohort, coalesce(nullif(v_name, ''), '나의 서재'));
  return new;
end $$;

-- 서재산책 목록에 칭호도 돌려준다
drop function if exists public.room_list();
create function public.room_list()
returns table (id uuid, room_name text, hair smallint, outfit smallint, books int, brag int, last_added timestamptz, is_me boolean, cohort text, title text)
language sql stable security invoker set search_path = public as $$
  select p.id, p.room_name, p.hair, p.outfit,
         count(ub.id)::int, count(ub.brag_at)::int, max(ub.created_at), p.id = auth.uid(), p.cohort, p.title
  from public.profiles p
  left join public.user_books ub on ub.user_id = p.id
  group by p.id
  order by (p.id = auth.uid()) desc, max(ub.created_at) desc nulls last;
$$;
revoke execute on function public.room_list() from public, anon;
grant execute on function public.room_list() to authenticated;
