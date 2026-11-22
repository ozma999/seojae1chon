/** 표지 중계(/api/cover)가 받아도 되는 주소인지: https + 도서 이미지 서버만 */
const HOSTS = [/(^|\.)kakaocdn\.net$/, /(^|\.)daumcdn\.net$/, /^books\.google\.com$/, /^books\.googleusercontent\.com$/, /(^|\.)nl\.go\.kr$/];
export function allowedCover(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!HOSTS.some((h) => h.test(u.hostname))) return null;
    u.protocol = 'https:';
    return u;
  } catch { return null; }
}
