/**
 * 메일 링크가 허용 목록 문제 등으로 콜백 대신 다른 주소(보통 홈)로 돌아와도 로그인 코드를 놓치지 않게:
 * ?code= 가 붙어 온 요청은 /auth/callback 으로 넘긴다. 이미 콜백이면 null
 */
export function forwardAuthCode(url: URL): URL | null {
  const code = url.searchParams.get('code');
  if (!code || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) return null;
  const to = new URL('/auth/callback', url);
  to.searchParams.set('code', code);
  const next = url.searchParams.get('next');
  if (next) to.searchParams.set('next', next);
  return to;
}

/** 콜백에서 갈 곳: next가 있으면 그곳, 없으면 최근 1시간 안에 비밀번호 재설정을 요청한 사용자는 새 비밀번호 화면 */
export function afterAuth(next: string | null, recoverySentAt: string | null | undefined, now = Date.now()): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  if (recoverySentAt && now - Date.parse(recoverySentAt) < 60 * 60e3) return '/login/new-password';
  return '/room';
}
