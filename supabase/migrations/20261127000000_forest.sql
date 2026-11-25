-- 도서관숲: 실제로 함께 쓰는 책장. 책 목록 · 대여/반납 기록을 로그인한 모두가 함께 본다.
-- Supabase → SQL Editor 에 통째로 붙여 넣고 Run (여러 번 실행해도 괜찮다)

create table if not exists public.libraries (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9-]{2,30}$'),
  name       text not null check (char_length(name) between 1 and 30),
  place      text check (char_length(place) <= 60),
  loan_days  int  not null default 14 check (loan_days between 1 and 90),
  created_at timestamptz not null default now()
);
insert into public.libraries (slug, name) values ('forest', '도서관숲') on conflict (slug) do nothing;

-- 관리자: 책을 등록·정리할 수 있는 사람. 비어 있으면 태초가족이 관리한다
create table if not exists public.library_admins (
  library_id uuid not null references public.libraries (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  primary key (library_id, user_id)
);

create table if not exists public.library_books (
  id         uuid primary key default gen_random_uuid(),
  library_id uuid not null references public.libraries (id) on delete cascade,
  isbn       text not null references public.books (isbn),
  copies     int  not null default 1 check (copies between 1 and 20),
  shelf      text check (char_length(shelf) <= 30),      -- 놓인 칸(예: '2층 왼쪽')
  added_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (library_id, isbn)
);
create index if not exists library_books_lib on public.library_books (library_id);

create table if not exists public.loans (
  id              uuid primary key default gen_random_uuid(),
  library_book_id uuid not null references public.library_books (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  borrowed_at     timestamptz not null default now(),
  due_at          timestamptz not null,
  returned_at     timestamptz,
  returned_by     uuid references public.profiles (id) on delete set null
);
create index if not exists loans_book on public.loans (library_book_id) where returned_at is null;
create index if not exists loans_recent on public.loans (borrowed_at desc);

create or replace function public.library_manager(lib uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.library_admins where library_id = lib and user_id = auth.uid())
    or (not exists (select 1 from public.library_admins where library_id = lib)
        and exists (select 1 from public.profiles where id = auth.uid() and cohort = 'founding'));
$$;

alter table public.libraries enable row level security;
alter table public.library_admins enable row level security;
alter table public.library_books enable row level security;
alter table public.loans enable row level security;
drop policy if exists lib_read on public.libraries;
drop policy if exists libadm_read on public.library_admins;
drop policy if exists lb_read on public.library_books;
drop policy if exists lb_write on public.library_books;
drop policy if exists lb_update on public.library_books;
drop policy if exists lb_delete on public.library_books;
drop policy if exists loans_read on public.loans;
create policy lib_read    on public.libraries for select to authenticated using (true);
create policy libadm_read on public.library_admins for select to authenticated using (true);
create policy lb_read     on public.library_books for select to authenticated using (true);
create policy lb_write    on public.library_books for insert to authenticated with check (public.library_manager(library_id));
create policy lb_update   on public.library_books for update to authenticated using (public.library_manager(library_id)) with check (public.library_manager(library_id));
create policy lb_delete   on public.library_books for delete to authenticated using (public.library_manager(library_id));
create policy loans_read  on public.loans for select to authenticated using (true);      -- 대여 기록은 모두가 본다
grant select on public.libraries, public.library_admins, public.library_books, public.loans to authenticated;
grant insert (library_id, isbn, copies, shelf) on public.library_books to authenticated;
grant update (copies, shelf) on public.library_books to authenticated;
grant delete on public.library_books to authenticated;
grant all on public.libraries, public.library_admins, public.library_books, public.loans to service_role;

-- 빌리기: 남은 권수가 있을 때만. 같은 책을 이미 빌렸으면 막는다
create or replace function public.forest_borrow(p_isbn text, p_lib text default 'forest') returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); lib public.libraries; lb public.library_books; out_n int; lid uuid;
begin
  if me is null then raise exception 'login required'; end if;
  select * into lib from public.libraries where slug = p_lib;
  if not found then raise exception '도서관을 찾을 수 없어요'; end if;
  select * into lb from public.library_books where library_id = lib.id and isbn = p_isbn for update;
  if not found then raise exception '이 도서관에 없는 책이에요'; end if;
  if exists (select 1 from public.loans where library_book_id = lb.id and user_id = me and returned_at is null) then
    raise exception '이미 빌린 책이에요';
  end if;
  select count(*) into out_n from public.loans where library_book_id = lb.id and returned_at is null;
  if out_n >= lb.copies then raise exception '지금은 모두 대여 중이에요'; end if;
  insert into public.loans (library_book_id, user_id, due_at) values (lb.id, me, now() + make_interval(days => lib.loan_days)) returning id into lid;
  return lid;
end $$;

-- 반납: 빌린 사람 본인 또는 관리자. ISBN으로 내 대여를 찾아 반납하거나, 대여 id로 반납
create or replace function public.forest_return(p_isbn text default null, p_loan uuid default null, p_lib text default 'forest') returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); l public.loans; lib_id uuid;
begin
  if me is null then raise exception 'login required'; end if;
  if p_loan is not null then
    select l2.* into l from public.loans l2 where l2.id = p_loan and l2.returned_at is null;
  else
    select l2.* into l from public.loans l2 join public.library_books b on b.id = l2.library_book_id join public.libraries li on li.id = b.library_id
    where li.slug = p_lib and b.isbn = p_isbn and l2.user_id = me and l2.returned_at is null order by l2.borrowed_at limit 1;
  end if;
  if not found then raise exception '반납할 대여 기록이 없어요'; end if;
  select library_id into lib_id from public.library_books where id = l.library_book_id;
  if l.user_id <> me and not public.library_manager(lib_id) then raise exception '빌린 사람만 반납할 수 있어요'; end if;
  update public.loans set returned_at = now(), returned_by = me where id = l.id;
  return l.id;
end $$;

-- 대여를 2주 더(한 번만은 아니고, 반납 예정일 기준으로 연장)
create or replace function public.forest_extend(p_loan uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare l public.loans; days int; d timestamptz;
begin
  select * into l from public.loans where id = p_loan and returned_at is null and user_id = auth.uid();
  if not found then raise exception '연장할 대여 기록이 없어요'; end if;
  select li.loan_days into days from public.library_books b join public.libraries li on li.id = b.library_id where b.id = l.library_book_id;
  update public.loans set due_at = greatest(due_at, now()) + make_interval(days => days) where id = l.id returning due_at into d;
  return d;
end $$;

revoke execute on function public.library_manager(uuid), public.forest_borrow(text, text), public.forest_return(text, uuid, text), public.forest_extend(uuid) from public, anon;
grant execute on function public.library_manager(uuid), public.forest_borrow(text, text), public.forest_return(text, uuid, text), public.forest_extend(uuid) to authenticated;
