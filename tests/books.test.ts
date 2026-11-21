import { describe, expect, it, vi } from 'vitest';
import { normalizeIsbn } from '@/lib/books/isbn';
import { genreFromAddCode, normalizeDoc, parseHeightMm, seojiSearch } from '@/lib/books/nl';

describe('normalizeIsbn', () => {
  it('ISBN-13 체크섬', () => {
    expect(normalizeIsbn('978-89-364-3412-0')).toBe('9788936434120');
    expect(normalizeIsbn('9788936434121')).toBeNull();
  });
  it('ISBN-10 → 13', () => {
    expect(normalizeIsbn('89-364-3412-8')).toBe('9788936434120');
    expect(normalizeIsbn('0-306-40615-2')).toBe('9780306406157');
    expect(normalizeIsbn('0306406153')).toBeNull();
  });
  it('형식이 틀리면 null', () => expect(normalizeIsbn('abc')).toBeNull());
});

describe('부가기호 장르', () => {
  it.each([
    ['03810', 'lit'], ['04840', 'lit'], ['07830', 'manga'], ['04650', 'hum'], ['93400', 'hum'],
    ['77810', 'lit'], ['77650', 'lit'], ['13590', 'hum'], ['0381', null], ['', null],
  ])('%s → %s', (code, g) => expect(genreFromAddCode(code)).toBe(g));
});

describe('normalizeDoc', () => {
  const doc = {
    TITLE: '채식주의자 ', AUTHOR: '한강 지음', PUBLISHER: '창비', EA_ISBN: '9788936434120', EA_ADD_CODE: '03810',
    PAGE: '247 p.', BOOK_SIZE: '20 cm', FORM: '양장', EBOOK_YN: 'N', PUBLISH_PREDATE: '20071030', TITLE_URL: 'http://x/c.jpg',
  };
  it('기본 필드', () => {
    const b = normalizeDoc(doc)!;
    expect(b).toMatchObject({ isbn: '9788936434120', title: '채식주의자', pages: 247, heightMm: 200, size: 'mid', hardcover: true,
      format: 'paper', pubDate: '2007-10-30', genre: 'lit', genreSource: 'addcode', coverUrl: 'http://x/c.jpg' });
  });
  it('반양장은 양장 아님, 전자책, 세트만 있는 기록', () => {
    expect(normalizeDoc({ ...doc, FORM: '반양장' })!.hardcover).toBe(false);
    expect(normalizeDoc({ ...doc, EBOOK_YN: 'Y' })!.format).toBe('ebook');
    expect(normalizeDoc({ ...doc, EA_ISBN: '', SET_ISBN: '9788936434120' })!.isbn).toBe('9788936434120');
  });
  it('부가기호가 없으면 SUBJECT, 그것도 없으면 기본값', () => {
    expect(normalizeDoc({ ...doc, EA_ADD_CODE: '', SUBJECT: '4' })).toMatchObject({ genre: 'hum', genreSource: 'subject' });
    expect(normalizeDoc({ ...doc, EA_ADD_CODE: '' })).toMatchObject({ genre: 'lit', genreSource: 'default' });
  });
  it('이상한 값', () => {
    expect(parseHeightMm('0*0')).toBeNull();
    expect(parseHeightMm('128*188')).toBe(188);
    expect(normalizeDoc({ ...doc, PAGE: '' })!.pages).toBeNull();
    expect(normalizeDoc({ ...doc, EA_ISBN: '123' })).toBeNull();
  });
});

describe('seojiSearch', () => {
  it('RESULT=ERROR는 HTTP 200이어도 오류', async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ RESULT: 'ERROR', ERR_MESSAGE: '인증키 오류' })));
    await expect(seojiSearch('k', { isbn: '1' }, f)).rejects.toThrow('인증키 오류');
  });
  it('키·isbn이 쿼리에 들어가고 docs를 정리한다', async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ docs: [{ TITLE: 'A', EA_ISBN: '9788936434120' }, { TITLE: '' }] })));
    const r = await seojiSearch('KEY', { isbn: '9788936434120' }, f);
    expect(r).toHaveLength(1);
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain('cert_key=KEY');
    expect(url).toContain('isbn=9788936434120');
  });
});
