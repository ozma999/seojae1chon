# 서재일촌

책을 등록하면 픽셀아트 서재가 채워지고, 책으로 서재와 아바타를 꾸며 자랑하는 책 아카이빙 웹앱(휴대폰 브라우저용).
기획: `docs/pixel-library-plan.html`(기획서 v0.6 + 클릭 프로토타입), 인수인계: `docs/seojae-handoff.md`.

- Next.js 16(App Router) + TypeScript
- Supabase: 로그인(이메일+비밀번호+초대 코드), Postgres(RLS), 서지 캐시
- 도서 정보: 국립중앙도서관(키가 있을 때) → 카카오 책 검색(주 검색원) → 구글 북스(쪽수 보충·대체). 서버에서만 호출, 결과는 DB에 캐시
- 방 그림: `art/`의 파이썬 렌더러가 만든 PNG를 `public/art/`에서 읽어 캔버스로 합성

## 바로 실행(데모 모드)

Supabase 설정이 없으면 **데모 모드**로 동작합니다. 로그인 없이 샘플 서재가 열리고 이 브라우저(localStorage)에만 저장됩니다.

```bash
npm install
npm run dev        # http://localhost:3000
```

## 확인

```bash
npm test           # 단위 테스트(ISBN, 서지 정리, 장르 추정, 방 단계, 해 뜨고 지는 시각)
npm run test:db    # 로컬 Postgres 16으로 마이그레이션 + 권한(RLS) 테스트
npm run typecheck && npm run lint && npm run build
```

## Supabase 연결(실서비스 모드)

1. supabase.com에서 프로젝트를 만든다(리전: Seoul).
2. SQL Editor에서 `supabase/migrations/`의 SQL 파일을 **이름 순서대로** 모두 실행한다(또는 Supabase CLI `supabase db push`).
3. Authentication 설정
   - Email provider 켜기, 비밀번호 최소 8자, Password requirements = **소문자·대문자·숫자·기호**(앱 규칙 `src/lib/auth/password.ts`와 같아야 함)
   - Confirm email: 지인 테스트 동안은 끔(기본 메일 발송은 팀원 주소로만, 시간당 몇 통). 메일 발송 서비스(SMTP) 연결 뒤 다시 켜기
   - 유출 비밀번호 차단(Leaked password protection) 켜기. 요금제에 따라 제공 여부가 다를 수 있으니 확인
   - URL Configuration: Site URL과 Redirect URL에 `https://<도메인>/auth/callback` 추가
   - 이메일 템플릿(인증·비밀번호 재설정)을 한국어로 바꾸고, 재설정 링크 유효 시간은 30분 권장
   - 로그인 5회 실패 잠금은 Supabase 기본 기능이 아님 → Auth rate limit으로 시작하고, 필요하면 v1에서 추가
4. 첫 초대 코드는 SQL로 만든다: `insert into invite_codes (code, max_uses) values ('ABC234', 10);`
   가입한 사용자는 앱에서 `create_invite()`로 자기 코드를 만들 수 있다(30일, 미사용 5개까지).
5. `.env.local`에 값 넣기(`.env.example` 참고). `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_BOOKS_KEY`, `NL_API_KEY`는 서버 전용.

## 배포(Vercel)

GitHub 저장소를 Vercel에 연결하고 환경 변수 4개를 넣으면 된다. 지인 테스트는 배포 링크 + 초대 코드로.

## 구조

```
src/app/(app)/      서재·등록·검색·꾸미기·공유 화면(하단 메뉴)
src/app/login/      로그인·가입·비밀번호 재설정
src/app/api/        서지 검색(/api/books/lookup), 서재에 추가(/api/library)
src/lib/room/       방 규칙(logic), 시간(time), 캔버스 합성(render), 책 모양(look)
src/lib/books/      ISBN 검증, 국립중앙도서관 응답 정리·장르 추정, 서지 캐시
src/lib/data/       저장소: demo(localStorage) / live(Supabase)
supabase/           마이그레이션, 로컬 RLS 테스트
art/                방·아바타 픽셀 렌더러(Python+Pillow). `npm run art`로 public/art 재생성
```

## 아직 안 한 것(다음 단계)

- 책장 사진 일괄 인식, 공유 카드 이미지(9:16), 서재산책(친구 서재 방문·오늘 방문), 표지 색 추출
- iOS Safari 바코드 인식(BarcodeDetector 미지원 → 라이브러리 필요)
