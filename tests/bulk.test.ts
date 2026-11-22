import { describe, expect, it } from 'vitest';
import { cleanLines, pickBest } from '@/lib/books/bulk';
import type { BookInfo } from '@/lib/books/nl';

const B = (title: string, o: Partial<BookInfo> = {}): BookInfo => ({
  isbn: '9780000000000', title, author: null, publisher: null, pubDate: null, pages: null, size: 'mid', heightMm: null, hardcover: false,
  format: 'paper', series: null, vol: null, setIsbn: null, coverUrl: null, addCode: null, genre: 'lit', genreSource: 'default', ...o,
});
describe('붙여 넣은 글 정리', () => {
  it('글머리표·번호·따옴표 제거, 짧은 줄·숫자 줄·중복 제외, ISBN 정리', () => {
    const t = `1. 채식주의자\n- 소년이 온다\n• "아몬드"\n247쪽\n12,000원\n가\n채식주의자\n978-89-364-3412-0\n\n원피스 1`;
    expect(cleanLines(t)).toEqual(['채식주의자', '소년이 온다', '아몬드', '9788936434120', '원피스 1']);
  });
  it('최대 줄 수', () => expect(cleanLines(Array.from({ length: 150 }, (_, i) => `책 제목 ${i}`).join('\n')).length).toBe(100));
});
describe('가장 맞는 책 고르기', () => {
  it('같은 제목 → 확실, 엉뚱하면 불확실', () => {
    expect(pickBest('채식주의자', [B('채식주의자 읽기 가이드'), B('채식주의자')])).toMatchObject({ book: { title: '채식주의자' }, confident: true });
    expect(pickBest('돌다리', [B('완전히 다른 책')]).confident).toBe(false);
    expect(pickBest('없는 책', [])).toEqual({ book: null, confident: false });
  });
  it('ISBN 줄은 같은 ISBN', () => {
    expect(pickBest('9788936434120', [B('x', { isbn: '9788936434120' })]).confident).toBe(true);
  });
  it('띄어쓰기 달라도', () => expect(pickBest('소년이온다', [B('소년이 온다')]).confident).toBe(true));
});
