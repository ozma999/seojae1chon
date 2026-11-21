/**
 * 가입 비밀번호 규칙(입력하면서 하나씩 초록으로 바뀐다).
 * Supabase Auth 설정과 같아야 한다: 최소 8자, 소문자·대문자·숫자·기호 각 1개 이상.
 * 유출 비밀번호 차단은 서버(Supabase) 쪽 설정.
 */
export const SYMBOLS = '!@#$%^&*()_+-=[]{};\':"|<>?,./`~';
export function passwordRules(email: string, pw: string, pw2: string) {
  const id = email.split('@')[0].toLowerCase();
  return {
    len: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /\d/.test(pw),
    symbol: [...pw].some((c) => SYMBOLS.includes(c)),
    mail: id.length < 3 || !pw.toLowerCase().includes(id),
    same: pw.length > 0 && pw === pw2,
  };
}
export type PasswordRule = keyof ReturnType<typeof passwordRules>;
export const RULE_TEXT: [PasswordRule, string][] = [
  ['len', '8자 이상'], ['lower', '영문 소문자'], ['upper', '영문 대문자'], ['digit', '숫자'],
  ['symbol', '기호(예: ! @ # $ %)'], ['mail', '이메일 아이디를 넣지 않기'], ['same', '비밀번호 확인과 같음'],
];
