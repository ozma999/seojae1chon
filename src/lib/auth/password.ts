/** 가입 비밀번호 규칙(입력하면서 하나씩 초록으로 바뀐다). 서버 쪽 최소 길이·유출 비밀번호 차단은 Supabase Auth 설정 */
export function passwordRules(email: string, pw: string, pw2: string) {
  const id = email.split('@')[0].toLowerCase();
  return {
    len: pw.length >= 8,
    mix: /[A-Za-z]/.test(pw) && /\d/.test(pw),
    mail: id.length < 3 || !pw.toLowerCase().includes(id),
    same: pw.length > 0 && pw === pw2,
  };
}
