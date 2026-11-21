import { describe, expect, it, vi } from 'vitest';
import { genreFromCategories, googleSearch, normalizeVolume } from '@/lib/books/google';

const vol = {
  id: 'x', volumeInfo: {
    title: '채식주의자', authors: ['한강'], publisher: '창비', publishedDate: '2007-10-30', pageCount: 247,
    industryIdentifiers: [{ type: 'ISBN_10', identifier: '8936433598' }, { type: 'ISBN_13', identifier: '9788936433598' }],
    categories: ['Fiction'], imageLinks: { thumbnail: 'http://books.google.com/books/content?id=x&printsec=frontcover&img=1&zoom=1&edge=curl' }, language: 'ko',
  },
};
describe('구글 북스 정리', () => {
  it('기본 필드', () => {
    expect(normalizeVolume(vol)).toMatchObject({ isbn: '9788936433598', title: '채식주의자', author: '한강', pages: 247, pubDate: '2007-10-30',
      genre: 'lit', genreSource: 'subject', coverUrl: 'https://books.google.com/books/content?id=x&printsec=frontcover&img=1&zoom=1' });
  });
  it('ISBN-10만 있어도 13으로, ISBN이 없으면 버림', () => {
    expect(normalizeVolume({ volumeInfo: { ...vol.volumeInfo, industryIdentifiers: [{ type: 'ISBN_10', identifier: '8936433598' }] } })!.isbn).toBe('9788936433598');
    expect(normalizeVolume({ volumeInfo: { title: 'x', industryIdentifiers: [{ type: 'OTHER', identifier: 'UOM:39015' }] } })).toBeNull();
  });
  it('분류가 없으면 문학(근거 없음), 쪽수 0은 모름', () => {
    expect(normalizeVolume({ volumeInfo: { ...vol.volumeInfo, categories: undefined, pageCount: 0 } })).toMatchObject({ genre: 'lit', genreSource: 'default', pages: null });
  });
  it.each([
    [['Comics & Graphic Novels'], 'manga'], [['Fiction / Science Fiction / General'], 'sf'], [['Fiction'], 'lit'],
    [['History'], 'hum'], [['Science'], 'hum'], [[], null],
  ])('%j → %s', (c, g) => expect(genreFromCategories(c as string[])).toBe(g));
});
describe('googleSearch', () => {
  it('isbn 질의, 키는 있을 때만, 중복 ISBN 제거', async () => {
    const f = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ items: [vol, vol, { volumeInfo: { title: 'no isbn' } }] })));
    const r = await googleSearch({ isbn: '9788936433598' }, undefined, f);
    expect(r).toHaveLength(1);
    const u = String(f.mock.calls[0][0]);
    expect(u).toContain('q=isbn%3A9788936433598');
    expect(u).not.toContain('key=');
    await googleSearch({ title: '채식' }, 'K', f);
    expect(String(f.mock.calls[1][0])).toContain('langRestrict=ko');
    expect(String(f.mock.calls[1][0])).toContain('key=K');
  });
  it('사용량 초과(429)는 한국어 오류', async () => {
    const f = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }));
    await expect(googleSearch({ isbn: '1' }, undefined, f)).rejects.toThrow('사용량');
  });
  it('결과 없음', async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ totalItems: 0 })));
    expect(await googleSearch({ isbn: '9788936433598' }, undefined, f)).toEqual([]);
  });
});
