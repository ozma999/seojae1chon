# 인증 메일 템플릿(한국어)

Supabase → Authentication → **Emails → Templates**에서 종류별로 **Subject**와 **Body**(HTML)를 바꾼다.
각 파일 첫 줄 주석에 제목이 적혀 있다. `{{ .ConfirmationURL }}`은 Supabase가 링크로 바꿔 넣는다(지우지 말 것).

| 템플릿 | 파일 |
|---|---|
| Confirm signup | confirm-signup.html |
| Reset password | reset-password.html |
| Change email address | change-email.html |

비밀번호 재설정 링크 유효 시간 30분: Authentication → Providers(Sign In / Providers) → Email → Email OTP Expiration = 1800.
