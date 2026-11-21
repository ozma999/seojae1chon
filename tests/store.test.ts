import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ supabaseService: () => null }));
import { lookupBooks } from '@/lib/books/store';

const g = (items: unknown[]) => new Response(JSON.stringify({ items }));
const vol = { volumeInfo: { title: '진짜 책', pageCount: 300, industryIdentifiers: [{ type: 'ISBN_13', identifier: '9788936433598' }] } };
afterEach(() => { vi.unstubAllGlobals(); delete process.env.NL_API_KEY; });

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
