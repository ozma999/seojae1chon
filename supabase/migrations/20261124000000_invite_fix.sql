-- 초대 코드 만들기 고치기
-- 1) Supabase는 pgcrypto(gen_random_bytes)가 extensions 스키마에 있어 함수에서 못 찾았다
--    → 확장 없이 쓰는 gen_random_uuid()의 무작위 바이트로 코드를 뽑는다
-- 2) 기한이 지난 안 쓴 코드도 '5개 제한'에 세던 것 → 유효한 것만 센다
create or replace function public.create_invite() returns text
language plpgsql security definer set search_path = public as $$
declare
  v text;
  b bytea;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- 헷갈리는 0/O, 1/I 제외
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if (select count(*) from public.invite_codes
      where created_by = auth.uid() and uses < max_uses and (expires_at is null or expires_at > now())) >= 5 then
    raise exception '아직 안 쓴 초대 코드가 5개 있어요. 먼저 보내 주세요';
  end if;
  loop
    b := uuid_send(gen_random_uuid());
    v := (select string_agg(substr(alphabet, 1 + (get_byte(b, i) % 32), 1), '') from generate_series(0, 5) as i);
    begin
      insert into public.invite_codes (code, created_by, expires_at) values (v, auth.uid(), now() + interval '30 days');
      return v;
    exception when unique_violation then -- 다시 뽑기
    end;
  end loop;
end $$;
revoke execute on function public.create_invite() from public, anon;
grant execute on function public.create_invite() to authenticated;
