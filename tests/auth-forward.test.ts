import { describe, expect, it } from 'vitest';
import { afterAuth, forwardAuthCode } from '@/lib/auth/forward';

describe('메일 링크 코드 넘기기', () => {
  it('홈에 코드가 붙어 오면 콜백으로', () => {
    expect(forwardAuthCode(new URL('https://a.app/?code=abc'))!.toString()).toBe('https://a.app/auth/callback?code=abc');
    expect(forwardAuthCode(new URL('https://a.app/room?code=x&next=/login/new-password'))!.searchParams.get('next')).toBe('/login/new-password');
  });
  it('이미 콜백이거나 코드가 없으면 그대로', () => {
    expect(forwardAuthCode(new URL('https://a.app/auth/callback?code=abc'))).toBeNull();
    expect(forwardAuthCode(new URL('https://a.app/room'))).toBeNull();
    expect(forwardAuthCode(new URL('https://a.app/api/books/lookup?code=1'))).toBeNull();
  });
});
describe('콜백 뒤 갈 곳', () => {
  const now = Date.parse('2026-11-22T12:00:00Z');
  it('next 우선, 외부 주소는 무시', () => {
    expect(afterAuth('/login/new-password', null, now)).toBe('/login/new-password');
    expect(afterAuth('//evil.com', null, now)).toBe('/room');
  });
  it('최근 재설정 요청이면 새 비밀번호 화면, 오래됐으면 서재', () => {
    expect(afterAuth(null, '2026-11-22T11:40:00Z', now)).toBe('/login/new-password');
    expect(afterAuth(null, '2026-11-22T09:00:00Z', now)).toBe('/room');
    expect(afterAuth(null, null, now)).toBe('/room');
  });
});
