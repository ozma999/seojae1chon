-- 도서관숲으로 옮기기: riotlunar@gmail.com 서재의 '종이책'을 도서관숲에 등록한다.
-- 제외: 맛의 달인 · 드래곤볼 · 아빠는 요리사 (제목·시리즈 이름에서 띄어쓰기 무시하고 찾음)
-- 이미 도서관숲에 있는 책은 건너뛴다. 여러 번 실행해도 괜찮다.

-- ① 미리 보기: 옮길 책 수 / 제외될 책 수
with src as (
  select b.isbn, b.title, coalesce(b.series, '') as series
  from public.user_books ub
  join public.books b on b.isbn = ub.isbn
  join auth.users u on u.id = ub.user_id
  where lower(u.email) = 'riotlunar@gmail.com' and ub.format = 'paper'
), tagged as (
  select *, (replace(title || series, ' ', '') ~* '(맛의달인|드래곤볼|dragonball|아빠는요리사)') as skip from src
)
select count(*) filter (where not skip) as "옮길 책", count(*) filter (where skip) as "제외할 책" from tagged;

-- ② 옮기기
insert into public.library_books (library_id, isbn, added_by)
select l.id, b.isbn, u.id
from public.user_books ub
join public.books b on b.isbn = ub.isbn
join auth.users u on u.id = ub.user_id
cross join public.libraries l
where l.slug = 'forest'
  and lower(u.email) = 'riotlunar@gmail.com'
  and ub.format = 'paper'
  and not (replace(b.title || coalesce(b.series, ''), ' ', '') ~* '(맛의달인|드래곤볼|dragonball|아빠는요리사)')
on conflict (library_id, isbn) do nothing;

-- ③ 결과: 도서관숲 전체 권수
select count(*) as "도서관숲 책" from public.library_books lb join public.libraries l on l.id = lb.library_id where l.slug = 'forest';
