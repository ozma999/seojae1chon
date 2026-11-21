import { describe, expect, it } from 'vitest';
import { matchesQuery, onePerVolume, parseSeries, sortResults } from '@/lib/books/series';
import type { BookInfo } from '@/lib/books/nl';

describe('parseSeries', () => {
  it.each([
    ['원피스 104', '원피스', 104], ['원피스 1권', '원피스', 1], ['삼국지 3 - 적벽대전', '삼국지', 3], ['해리 포터와 마법사의 돌 (1)', '해리 포터와 마법사의 돌', 1],
    ['슬램덩크 Vol.5', '슬램덩크', 5], ['토지 제1부', '토지', 1], ['진격의 거인 34', '진격의 거인', 34], ['드래곤볼 완전판 12', '드래곤볼 완전판', 12],
    ['삼체 2부: 암흑의 숲', '삼체', 2],
  ])('%s', (t, s, v) => expect(parseSeries(t)).toEqual({ series: s, vol: v }));
  it.each(['1984', '82년생 김지영', '트렌드 코리아 2024', '채식주의자', '7년의 밤'])('시리즈 아님: %s', (t) => expect(parseSeries(t)).toBeNull());
});

const B = (title: string, o: Partial<BookInfo> = {}): BookInfo => ({
  isbn: '9780000000000', title, author: null, publisher: null, pubDate: null, pages: null, size: 'mid', heightMm: null, hardcover: false,
  format: 'paper', series: null, vol: null, setIsbn: null, coverUrl: null, addCode: null, genre: 'lit', genreSource: 'default', ...o,
});
describe('관련성·정렬', () => {
  it('모든 단어가 제목에 있어야 함, 띄어쓰기 무시', () => {
    expect(matchesQuery(B('원피스 12'), '원피스')).toBe(true);
    expect(matchesQuery(B('원 피스'), '원피스')).toBe(true);
    expect(matchesQuery(B('해적 이야기'), '원피스')).toBe(false);
    expect(matchesQuery(B('작별하지 않는다', { author: '한강' }), '한강 작별')).toBe(true);
  });
  it('검색어로 시작하는 시리즈 먼저, 1권부터 오름차순', () => {
    const r = sortResults([B('원피스 해적 가이드북'), B('원피스 3', { series: '원피스', vol: 3 }), B('나의 원피스'), B('원피스 1', { series: '원피스', vol: 1 }), B('원피스 2', { series: '원피스', vol: 2 })], '원피스');
    expect(r.map((b) => b.title)).toEqual(['원피스 1', '원피스 2', '원피스 3', '원피스 해적 가이드북', '나의 원피스']);
  });
  it('권마다 한 판만(기준 출판사 우선)', () => {
    const r = onePerVolume([B('a1', { vol: 1, publisher: 'X' }), B('a1', { vol: 1, publisher: '대원', pages: 200 }), B('a2', { vol: 2, publisher: '대원' })], '대원');
    expect(r.map((b) => [b.vol, b.publisher])).toEqual([[1, '대원'], [2, '대원']]);
  });
});
