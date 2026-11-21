import 'server-only';
import type { BookInfo } from './nl';
import { seojiSearch } from './nl';
import { googleSearch } from './google';
import { normalizeIsbn } from './isbn';
import { supabaseService } from '../supabase/server';
import catalog from '../data/demo-catalog.json';

export const bookToRow = (b: BookInfo) => ({
  isbn: b.isbn, title: b.title, author: b.author, publisher: b.publisher, pub_date: b.pubDate, pages: b.pages,
  height_mm: b.heightMm, size: b.size, hardcover: b.hardcover, format: b.format, series: b.series, vol: b.vol,
  set_isbn: b.setIsbn, cover_url: b.coverUrl, add_code: b.addCode, genre: b.genre, genre_source: b.genreSource,
  fetched_at: new Date().toISOString(),
});
type BookRow = ReturnType<typeof bookToRow>;
const rowToBook = (r: BookRow): BookInfo => ({
  isbn: r.isbn, title: r.title, author: r.author, publisher: r.publisher, pubDate: r.pub_date, pages: r.pages,
  heightMm: r.height_mm, size: r.size, hardcover: r.hardcover, format: r.format, series: r.series, vol: r.vol,
  setIsbn: r.set_isbn, coverUrl: r.cover_url, addCode: r.add_code, genre: r.genre, genreSource: r.genre_source,
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const demoBooks = (catalog as (BookInfo & { own: boolean })[]).map(({ own, ...b }) => b as BookInfo);

/**
 * ISBN 또는 제목으로 책 찾기.
 * 순서: 서지 캐시(DB) → 국립중앙도서관(키가 있을 때) → 구글 북스(키 없이도 동작) → 데모 목록
 * 찾은 결과는 캐시에 저장한다(같은 책은 다시 검색하지 않음).
 */
export async function lookupBooks(q: { isbn?: string; title?: string }): Promise<{ books: BookInfo[]; source: string }> {
  const db = supabaseService();
  const isbn = q.isbn ? normalizeIsbn(q.isbn) : null;
  if (q.isbn && !isbn) throw new Error('ISBN 형식이 맞지 않아요');
  const query = isbn ? { isbn } : { title: q.title };
  if (isbn && db) {
    const { data } = await db.from('books').select('*').eq('isbn', isbn).maybeSingle();
    if (data) return { books: [rowToBook(data as BookRow)], source: 'cache' };
  }
  const save = async (books: BookInfo[], source: string) => {
    if (db && books.length) await db.from('books').upsert(books.map((b) => ({ ...bookToRow(b), source })), { onConflict: 'isbn' });
    return { books, source };
  };
  let lastError: Error | null = null;
  const nlKey = process.env.NL_API_KEY;
  if (nlKey) {
    try {
      const books = await seojiSearch(nlKey, query);
      if (books.length) return save(books, 'seoji');
    } catch (e) { lastError = e as Error; }
  }
  try {
    const books = await googleSearch(query, process.env.GOOGLE_BOOKS_KEY);
    if (books.length) return save(books, 'google');
  } catch (e) { lastError = e as Error; }
  // 데모 목록(임시 ISBN 979-11-99…): 실제 서비스 검색에 없을 때만
  const t = (q.title ?? '').trim();
  const demo = demoBooks.filter((b) => (isbn ? b.isbn === isbn : t && (b.title.includes(t) || (b.author ?? '').includes(t))));
  if (!demo.length && lastError) throw lastError;
  return { books: demo, source: 'demo' };
}
