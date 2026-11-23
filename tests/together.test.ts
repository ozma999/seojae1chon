import { describe, expect, it } from 'vitest';
import type { LibraryEntry } from '@/lib/data/types';
import { together } from '@/lib/room/together';

let n = 0;
const E = (o: Partial<LibraryEntry>): LibraryEntry => ({
  id: String(n++), isbn: String(9780000000000 + n), title: 't' + n, author: null, publisher: null, pubDate: null, pages: 300, size: 'mid',
  heightMm: null, hardcover: false, format: 'paper', series: null, vol: null, setIsbn: null, coverUrl: null, addedAt: n, addCode: null,
  genre: 'lit', genreSource: 'default', userGenre: null, verified: true, method: 'search', comment: null, bragAt: null, bragText: null, look: null, ...o,
});
describe('우리 사이', () => {
  it('같이 가진 책과 겹침 %, 추천은 내게 없는 작품만', () => {
    const a = E({ isbn: '9781111111111', author: '하루키' });
    const host = [a, E({ author: '하루키', bragAt: 5 }), E({ series: '원피스', vol: 2 }), E({ series: '원피스', vol: 1 }), E({ author: '김영하' })];
    const mine = [{ ...a, id: 'm1' }, E({ author: '하루키' })];
    const t = together(host, mine);
    expect(t.shared.length).toBe(1);
    expect(t.pct).toBeGreaterThan(0);
    expect(t.recs[0].bragAt).toBe(5);                     // 자랑 책장 먼저
    expect(t.recs.some((e) => e.isbn === a.isbn)).toBe(false);
    const op = t.recs.find((e) => e.series === '원피스');
    expect(op?.vol).toBe(1);                               // 시리즈는 1권
  });
  it('빈 서재는 0%', () => expect(together([], [E({})]).pct).toBe(0));
});
