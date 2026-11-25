-- 태초가족 '사진으로 책 등록' 사용 기록(월 한도·비용 확인용). 사진 자체는 저장하지 않는다.
create table if not exists public.photo_scans (
  id            bigserial primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  model         text not null,
  photos        int  not null default 1,
  books         int  not null default 0,
  input_tokens  int,
  output_tokens int,
  cost_krw      numeric(10, 2),
  created_at    timestamptz not null default now()
);
create index if not exists photo_scans_user_month on public.photo_scans (user_id, created_at);
alter table public.photo_scans enable row level security;
drop policy if exists photo_scans_read on public.photo_scans;
create policy photo_scans_read on public.photo_scans for select to authenticated using (user_id = auth.uid());
grant select on public.photo_scans to authenticated;
grant all on public.photo_scans to service_role;
grant usage, select on sequence public.photo_scans_id_seq to service_role;
