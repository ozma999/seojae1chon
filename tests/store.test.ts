import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ supabaseService: () => null }));
import { clearLookupCache, lookupBooks, seriesVolumes } from '@/lib/books/store';

const g = (items: unknown[]) => new Response(JSON.stringify({ items }));
const vol = { volumeInfo: { title: '진짜 책', pageCount: 300, industryIdentifiers: [{ type: 'ISBN_13', identifier: '9788936433598' }] } };
afterEach(() => { vi.unstubAllGlobals(); delete process.env.NL_API_KEY; clearLookupCache(); });

describe('lookupBooks 순서', () => {
  it('키가 없으면 구글 북스', async () => {
    const f = vi.fn().mockResolvedValue(g([vol])); vi.stubGlobal('fetch', f);
    expect(await lookupBooks({ isbn: '9788936433598' })).toMatchObject({ source: 'google', books: [{ title: '진짜 책' }] });
    expect(String(f.mock.calls[0][0])).toContain('googleapis.com');
  });
  it('국립중앙도서관 키가 있으면 먼저, 결과 없으면 구글로', async () => {
    process.env.NL_API_KEY = 'k';
    const f = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ docs: [] }))).mockResolvedValueOnce(g([vol]));
    vi.stubGlobal('fetch', f);
    expect((await lookupBooks({ isbn: '9788936433598' })).source).toBe('google');
    expect(String(f.mock.calls[0][0])).toContain('nl.go.kr');
  });
  it('구글에 없으면 데모 목록(임시 ISBN)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(g([])));
    expect((await lookupBooks({ title: '헤일메리' })).source).toBe('demo');
  });
  it('네트워크 오류이고 데모에도 없으면 오류', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    await expect(lookupBooks({ isbn: '9788936433598' })).rejects.toThrow('down');
  });
});

const V = (title: string, isbn: string, publisher = '대원') => ({ volumeInfo: { title, publisher, industryIdentifiers: [{ type: 'ISBN_13', identifier: isbn }] } });
// 체크 숫자가 맞는 ISBN 만들기
const isbn = (n: number) => { const b = '978893600' + String(n).padStart(3, '0'); const s = [...b].reduce((a, c, i) => a + Number(c) * (i % 2 ? 3 : 1), 0); return b + ((10 - (s % 10)) % 10); };
describe('제목 검색 다듬기', () => {
  it('무관한 책 제외, 1권이 없으면 따로 찾아 맨 위에', async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(g([V('원피스 3', isbn(3)), V('해적 이야기', isbn(90)), V('원피스 2', isbn(2))]))
      .mockResolvedValueOnce(g([V('원피스 1', isbn(1)), V('원피스 10', isbn(10))]));
    vi.stubGlobal('fetch', f);
    const r = await lookupBooks({ title: '원피스' });
    expect(r.books.map((b) => b.title)).toEqual(['원피스 1', '원피스 2', '원피스 3']);
    expect(decodeURIComponent(String(f.mock.calls[0][0]))).toContain('q=intitle:원피스');
    expect(decodeURIComponent(String(f.mock.calls[1][0]))).toContain('intitle:원피스+intitle:1');
  });
  it('같은 검색어는 30분 동안 다시 묻지 않음', async () => {
    const f = vi.fn().mockImplementation(async () => g([V('채식주의자', isbn(5))])); vi.stubGlobal('fetch', f);
    await lookupBooks({ title: '채식' }); await lookupBooks({ title: '채식' });
    expect(f).toHaveBeenCalledTimes(1);
  });
});
describe('시리즈 전체', () => {
  it('권마다 하나, 1권부터, 다른 시리즈 제외', async () => {
    const page = [V('원피스 2', isbn(2)), V('원피스 1', isbn(1), '다른출판'), V('원피스 1', isbn(11)), V('원피스 파티 1', isbn(50)), V('원피스 3', isbn(3))];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(g(page)));
    const r = await seriesVolumes('원피스', '대원');
    expect(r.map((b) => [b.vol, b.isbn])).toEqual([[1, isbn(11)], [2, isbn(2)], [3, isbn(3)]]);
  });
});
