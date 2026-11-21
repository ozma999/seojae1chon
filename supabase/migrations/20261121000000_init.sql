-- 서재일촌 v0 스키마
-- 가입: 이메일 + 비밀번호 + 초대 코드 6자리. 초대 코드는 가입 트리거에서 검증한다(틀리면 가입 자체가 실패).

create extension if not exists pgcrypto;

-- ---------- 프로필(서재 꾸미기 상태) ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  room_name   text not null default '나의 서재' check (char_length(room_name) between 1 and 20),
  hair        smallint not null default 0 check (hair between 0 and 7),
  outfit      smallint not null default 0 check (outfit between 0 and 7),
  items_off   text[] not null default '{}',
  invited_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------- 초대 코드 ----------
create table public.invite_codes (
  code        text primary key check (code ~ '^[A-Z0-9]{6}$'),
  created_by  uuid references public.profiles (id) on delete set null,
  max_uses    int not null default 1 check (max_uses > 0),
  uses        int not null default 0 check (uses >= 0),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------- 서지 캐시(모든 사용자 공용, 쓰기는 서버만) ----------
create table public.books (
  isbn          text primary key check (isbn ~ '^\d{13}$'),
  title         text not null,
  author        text,
  publisher     text,
  pub_date      text,
  pages         int check (pages is null or pages between 1 and 9999),
  height_mm     int,
  size          text not null default 'mid' check (size in ('small', 'mid', 'big')),
  hardcover     boolean not null default false,
  format        text not null default 'paper' check (format in ('paper', 'ebook')),
  series        text,
  vol           int,
  set_isbn      text,
  cover_url     text,
  add_code      text,
  genre         text not null default 'lit' check (genre in ('lit', 'sf', 'manga', 'hum')),
  genre_source  text not null default 'default' check (genre_source in ('addcode', 'subject', 'default')),
  look          jsonb,            -- 표지에서 뽑은 책 모양(null이면 ISBN으로 정한 기본 모양)
  source        text not null default 'seoji',
  fetched_at    timestamptz not null default now()
);

-- ---------- 내 서재 ----------
create table public.user_books (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  isbn        text not null references public.books (isbn),
  format      text not null default 'paper' check (format in ('paper', 'ebook')),
  verified    boolean not null default false,   -- 실물 인증(바코드·책장 사진)
  method      text not null default 'search' check (method in ('barcode', 'photo', 'search', 'manual')),
  genre       text check (genre in ('lit', 'sf', 'manga', 'hum')),   -- 사용자가 고친 장르(null이면 books.genre)
  comment     text check (char_length(comment) <= 140),
  brag_at     timestamptz,                       -- 자랑 책장에 꽂은 시각
  brag_text   text check (char_length(brag_text) <= 80),
  created_at  timestamptz not null default now(),
  unique (user_id, isbn, format)
);
create index user_books_user_idx on public.user_books (user_id);
create index user_books_isbn_idx on public.user_books (isbn);

-- 자랑 책장은 최대 12칸(Lv.4). 방 단계별 칸 수는 앱이 맞춘다.
create function public.limit_brag() returns trigger language plpgsql as $$
begin
  if new.brag_at is not null and (tg_op = 'INSERT' or old.brag_at is null) then
    if (select count(*) from public.user_books where user_id = new.user_id and brag_at is not null and id <> new.id) >= 12 then
      raise exception '자랑 책장은 12칸까지예요' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger user_books_limit_brag before insert or update of brag_at on public.user_books
  for each row execute function public.limit_brag();

-- ---------- 오늘 방문(서재산책) ----------
create table public.visits (
  host     uuid not null references public.profiles (id) on delete cascade,
  visitor  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day      date not null default (now() at time zone 'Asia/Seoul')::date,
  primary key (host, visitor, day),
  check (host <> visitor)
);

-- ---------- 가입 트리거: 초대 코드 확인 + 프로필 생성 ----------
create function public.handle_new_user() returns trigger
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
  insert into public.profiles (id, invited_by) values (new.id, c.created_by);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 가입 화면에서 미리 확인(코드 목록은 노출하지 않음)
create function public.check_invite(p_code text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.invite_codes
    where code = upper(trim(p_code)) and uses < max_uses and (expires_at is null or expires_at > now())
  );
$$;

-- 내 초대 코드 만들기(사용 안 된 코드는 5개까지)
create function public.create_invite() returns text
language plpgsql security definer set search_path = public as $$
declare
  v text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- 헷갈리는 0/O, 1/I 제외
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if (select count(*) from public.invite_codes where created_by = auth.uid() and uses < max_uses) >= 5 then
    raise exception '사용하지 않은 초대 코드가 5개 있어요';
  end if;
  loop
    v := (select string_agg(substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % 32), 1), '') from generate_series(1, 6));
    begin
      insert into public.invite_codes (code, created_by, expires_at) values (v, auth.uid(), now() + interval '30 days');
      return v;
    exception when unique_violation then -- 다시 뽑기
    end;
  end loop;
end $$;

-- 오늘 방문 수(본인 서재만)
create function public.today_visits() returns int
language sql security definer set search_path = public stable as $$
  select count(*)::int from public.visits where host = auth.uid() and day = (now() at time zone 'Asia/Seoul')::date;
$$;

-- 같은 책을 가진 사용자 수
create function public.holders(p_isbn text) returns int
language sql security definer set search_path = public stable as $$
  select count(distinct user_id)::int from public.user_books where isbn = p_isbn;
$$;

-- ---------- 권한(RLS) ----------
alter table public.profiles     enable row level security;
alter table public.invite_codes enable row level security;
alter table public.books        enable row level security;
alter table public.user_books   enable row level security;
alter table public.visits       enable row level security;

-- 서재산책: 로그인한 사용자(초대받은 지인)는 서로의 서재를 볼 수 있다
create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 초대 코드: 내가 만든 코드만 본다. 만들기·사용은 함수로만
create policy invites_read_own on public.invite_codes for select to authenticated using (created_by = auth.uid());

-- 서지: 읽기만(쓰기는 service_role 서버 API)
create policy books_read on public.books for select to authenticated using (true);

create policy ub_read   on public.user_books for select to authenticated using (true);
create policy ub_insert on public.user_books for insert to authenticated with check (user_id = auth.uid());
create policy ub_update on public.user_books for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ub_delete on public.user_books for delete to authenticated using (user_id = auth.uid());

create policy visits_insert on public.visits for insert to authenticated with check (visitor = auth.uid());
create policy visits_read   on public.visits for select to authenticated using (host = auth.uid() or visitor = auth.uid());

-- 열 단위: 프로필의 초대자, 서재 책의 소유자는 바꿀 수 없다
revoke update on public.profiles from authenticated;
grant update (room_name, hair, outfit, items_off) on public.profiles to authenticated;
revoke update on public.user_books from authenticated;
grant update (format, genre, comment, brag_at, brag_text) on public.user_books to authenticated;
revoke execute on function public.create_invite() from public, anon;
revoke execute on function public.today_visits() from public, anon;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.today_visits() to authenticated;
