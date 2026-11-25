-- 읽기 기록 · 빌려주기 · 일촌 관계 · 방명록
-- Supabase → SQL Editor 에 통째로 붙여 넣고 Run (여러 번 실행해도 괜찮다)

-- ---------- 1) 읽기 기록·빌려주기 (내 책마다) ----------
alter table public.user_books add column if not exists read_status text check (read_status in ('want', 'reading', 'done'));
alter table public.user_books add column if not exists rating smallint check (rating between 1 and 5);
alter table public.user_books add column if not exists lendable boolean not null default false;
grant update (format, genre, comment, brag_at, brag_text, read_status, rating, lendable) on public.user_books to authenticated;

-- ---------- 2) 일촌 관계 ----------
-- 일촌 = ① 서로 초대한 사이 ② 둘 다 태초가족 ③ 일촌 신청을 수락한 사이
create table if not exists public.ilchon (
  a            uuid not null references public.profiles (id) on delete cascade,
  b            uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  requested_by uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
alter table public.ilchon enable row level security;
drop policy if exists ilchon_read on public.ilchon;
create policy ilchon_read on public.ilchon for select to authenticated using (auth.uid() in (a, b));
grant select on public.ilchon to authenticated;
grant all on public.ilchon to service_role;

create or replace function public.is_ilchon(x uuid, y uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select x = y
    or exists (select 1 from public.ilchon where a = least(x, y) and b = greatest(x, y) and status = 'accepted')
    or exists (select 1 from public.profiles p where (p.id = x and p.invited_by = y) or (p.id = y and p.invited_by = x))
    or (select count(*) from public.profiles where id in (x, y) and cohort = 'founding') = 2;
$$;

-- 상대와의 관계: self / ilchon / sent(내가 신청함) / received(나에게 신청함) / none
create or replace function public.ilchon_state(other uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() = other then 'self'
    when public.is_ilchon(auth.uid(), other) then 'ilchon'
    when exists (select 1 from public.ilchon where a = least(auth.uid(), other) and b = greatest(auth.uid(), other) and requested_by = auth.uid()) then 'sent'
    when exists (select 1 from public.ilchon where a = least(auth.uid(), other) and b = greatest(auth.uid(), other)) then 'received'
    else 'none' end;
$$;

-- 일촌 신청(상대가 이미 나에게 신청했으면 바로 수락)
create or replace function public.ilchon_request(other uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r public.ilchon;
begin
  if me is null then raise exception 'login required'; end if;
  if me = other then raise exception '나 자신과는 일촌이 될 수 없어요'; end if;
  if public.is_ilchon(me, other) then return 'ilchon'; end if;
  select * into r from public.ilchon where a = least(me, other) and b = greatest(me, other);
  if found and r.requested_by <> me then
    update public.ilchon set status = 'accepted' where a = r.a and b = r.b; return 'ilchon';
  end if;
  insert into public.ilchon (a, b, requested_by) values (least(me, other), greatest(me, other), me) on conflict do nothing;
  return 'sent';
end $$;

create or replace function public.ilchon_accept(other uuid) returns void
language sql security definer set search_path = public as $$
  update public.ilchon set status = 'accepted'
  where a = least(auth.uid(), other) and b = greatest(auth.uid(), other) and requested_by = other;
$$;
-- 신청 거절·취소·일촌 끊기(초대·태초가족 관계는 끊을 수 없다)
create or replace function public.ilchon_remove(other uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.ilchon where a = least(auth.uid(), other) and b = greatest(auth.uid(), other);
$$;
-- 나에게 온 일촌 신청
create or replace function public.ilchon_requests() returns table (id uuid, room_name text, hair smallint, outfit smallint, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.room_name, p.hair, p.outfit, i.created_at
  from public.ilchon i join public.profiles p on p.id = i.requested_by
  where auth.uid() in (i.a, i.b) and i.requested_by <> auth.uid() and i.status = 'pending'
  order by i.created_at desc;
$$;

-- 서재산책 목록: 나 + 일촌만
drop function if exists public.room_list();
create function public.room_list()
returns table (id uuid, room_name text, hair smallint, outfit smallint, books int, brag int, last_added timestamptz, is_me boolean, cohort text, title text)
language sql stable security invoker set search_path = public as $$
  select p.id, p.room_name, p.hair, p.outfit,
         count(ub.id)::int, count(ub.brag_at)::int, max(ub.created_at), p.id = auth.uid(), p.cohort, p.title
  from public.profiles p
  left join public.user_books ub on ub.user_id = p.id
  where public.is_ilchon(auth.uid(), p.id)
  group by p.id
  order by (p.id = auth.uid()) desc, max(ub.created_at) desc nulls last;
$$;

-- ---------- 3) 방명록(일촌평) ----------
create table if not exists public.guestbook (
  id         bigserial primary key,
  host       uuid not null references public.profiles (id) on delete cascade,
  author     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 200),
  kind       text not null default 'note' check (kind in ('note', 'borrow')),
  isbn       text references public.books (isbn),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists guestbook_host_idx on public.guestbook (host, created_at desc);
alter table public.guestbook enable row level security;
drop policy if exists gb_read on public.guestbook;
drop policy if exists gb_insert on public.guestbook;
drop policy if exists gb_delete on public.guestbook;
drop policy if exists gb_update on public.guestbook;
-- 읽기: 주인·글쓴이·주인의 일촌 / 쓰기: 주인의 일촌만(내 방명록엔 못 씀) / 지우기: 주인·글쓴이 / 읽음 표시: 주인
create policy gb_read   on public.guestbook for select to authenticated using (auth.uid() in (host, author) or public.is_ilchon(auth.uid(), host));
create policy gb_insert on public.guestbook for insert to authenticated with check (author = auth.uid() and host <> auth.uid() and public.is_ilchon(auth.uid(), host));
create policy gb_delete on public.guestbook for delete to authenticated using (auth.uid() in (host, author));
create policy gb_update on public.guestbook for update to authenticated using (host = auth.uid()) with check (host = auth.uid());
grant select, delete on public.guestbook to authenticated;
grant insert (host, body, kind, isbn) on public.guestbook to authenticated;
grant update (read_at) on public.guestbook to authenticated;
grant usage, select on sequence public.guestbook_id_seq to authenticated;
grant all on public.guestbook to service_role;

-- 실행 권한
revoke execute on function public.is_ilchon(uuid, uuid), public.ilchon_state(uuid), public.ilchon_request(uuid),
  public.ilchon_accept(uuid), public.ilchon_remove(uuid), public.ilchon_requests(), public.room_list() from public, anon;
grant execute on function public.is_ilchon(uuid, uuid), public.ilchon_state(uuid), public.ilchon_request(uuid),
  public.ilchon_accept(uuid), public.ilchon_remove(uuid), public.ilchon_requests(), public.room_list() to authenticated;
