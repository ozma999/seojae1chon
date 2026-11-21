import { describe, expect, it } from 'vitest';
import { passwordRules } from '@/lib/auth/password';

const all = (e: string, p: string) => Object.values(passwordRules(e, p, p)).every(Boolean);
describe('비밀번호 규칙(Supabase 설정과 동일)', () => {
  it('소문자·대문자·숫자·기호·8자', () => {
    expect(all('kim@x.com', 'Seojae#2026')).toBe(true);
    expect(all('kim@x.com', 'seojae#2026')).toBe(false); // 대문자 없음
    expect(all('kim@x.com', 'SEOJAE#2026')).toBe(false); // 소문자 없음
    expect(all('kim@x.com', 'Seojae2026')).toBe(false); // 기호 없음
    expect(all('kim@x.com', 'Seojae#!')).toBe(false); // 숫자 없음
    expect(all('kim@x.com', 'Sj#1')).toBe(false); // 짧음
  });
  it('이메일 아이디 포함 금지, 확인 일치', () => {
    expect(all('hyunwoo@x.com', 'Hyunwoo#2026')).toBe(false);
    expect(passwordRules('a@x', 'Seojae#2026', 'Seojae#2025').same).toBe(false);
  });
});
