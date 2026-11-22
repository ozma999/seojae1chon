import { describe, expect, it } from 'vitest';
import type { LibraryEntry } from '@/lib/data/types';
import { monthCount, persona, seriesProgress, shelfTitle, towerInfo } from '@/lib/room/stats';

const E = (o: Partial<LibraryEntry>): LibraryEntry => ({
  id: Math.random().toString(), isbn: '9780000000000', title: 't', author: null, publisher: null, pubDate: null, pages: 300, size: 'mid',
  heightMm: null, hardcover: false, format: 'paper', series: null, vol: null, setIsbn: null, coverUrl: null, addedAt: 0, addCode: null,
  genre: 'lit', genreSource: 'default', userGenre: null, verified: true, method: 'search', comment: null, bragAt: null, bragText: null, look: null, ...o,
});
describe('대시보드 계산', () => {
  it('책 탑: 300쪽 무선 = 19mm, 100권이면 1.9m → 내 키 위, 다음은 방문', () => {
    const t = towerInfo(Array.from({ length: 100 }, () => E({})));
    expect(t.m).toBeCloseTo(1.9, 2);
    expect(t.below.name).toBe('내 키');
    expect(t.next?.name).toBe('방문');
    expect(t.booksToNext).toBe(22);
  });
  it('전자책은 높이에 안 들어감', () => expect(towerInfo([E({ format: 'ebook' })]).m).toBe(0));
  it('칭호', () => {
    expect(shelfTitle([])).toBe('첫 책을 기다리는 서재');
    expect(shelfTitle(Array.from({ length: 120 }, (_, i) => E({ genre: i < 70 ? 'manga' : 'lit' })))).toBe('만화방 주인');
    expect(shelfTitle(Array.from({ length: 5 }, () => E({ genre: 'sf' })))).toBe('새내기 SF 탐험가');
  });
  it('시리즈 완주: 영문 병기도 같은 시리즈, 빠진 권', () => {
    const r = seriesProgress([E({ series: '원피스', vol: 1 }), E({ series: '원피스 ONE PIECE', vol: 3 }), E({ series: '원피스', vol: 4 }), E({ series: '단권', vol: 1 })]);
    expect(r).toEqual([{ name: '원피스', have: 3, max: 4, missing: [2], publisher: null }]);
  });
  it('이번 달', () => expect(monthCount([E({ addedAt: new Date(2026, 10, 3).getTime() }), E({ addedAt: new Date(2026, 9, 3).getTime() })], new Date(2026, 10, 22))).toBe(1));
});

describe('서재 성향 칭호', () => {
  const now = Date.parse('2026-11-22');
  it('같은 작가 5권 이상 → 덕후(성은 빼고)', () => {
    const es = [...Array.from({ length: 6 }, () => E({ author: '무라카미 하루키, 양억관 (옮긴이)' })), ...Array.from({ length: 6 }, (_, i) => E({ author: `작가${i}` }))];
    expect(persona(es, now)?.name).toBe('하루키 덕후');
  });
  it('시리즈는 한 작품으로 센다', () => {
    const es = Array.from({ length: 20 }, (_, i) => E({ author: '오다 에이치로', series: '원피스', vol: i + 1 }));
    expect(persona(es, now)?.name).not.toBe('에이치로 덕후');
  });
  it('번역서 비율 → 세계여행자, 오래된 책 → 고전파', () => {
    expect(persona(Array.from({ length: 12 }, (_, i) => E({ translators: 'x', author: `a${i}` })), now)?.name).toBe('세계여행자');
    expect(persona(Array.from({ length: 12 }, (_, i) => E({ pubDate: '1985-01-01', author: `a${i}` })), now)?.name).toBe('고전파');
  });
  it('10권 미만이면 없음, 칭호는 장르로', () => {
    expect(persona(Array.from({ length: 9 }, () => E({ translators: 'x' })), now)).toBeNull();
  });
});
