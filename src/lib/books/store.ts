import 'server-only';
import type { BookInfo } from './nl';
import { seojiSearch } from './nl';
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
 * 순서: 서지 캐시(DB) → 국립중앙도서관 API(키가 있을 때, 결과를 캐시에 저장) → 데모 목록(키가 없을 때)
 */
export async function lookupBooks(q: { isbn?: string; title?: string }): Promise<{ books: BookInfo[]; source: string }> {
  const key = process.env.NL_API_KEY;
  const db = supabaseService();
  const isbn = q.isbn ? normalizeIsbn(q.isbn) : null;
  if (q.isbn && !isbn) throw new Error('ISBN 형식이 맞지 않아요');
  if (isbn && db) {
    const { data } = await db.from('books').select('*').eq('isbn', isbn).maybeSingle();
    if (data) return { books: [rowToBook(data as BookRow)], source: 'cache' };
  }
  if (key) {
    const books = await seojiSearch(key, isbn ? { isbn } : { title: q.title });
    if (db && books.length) await db.from('books').upsert(books.map(bookToRow), { onConflict: 'isbn' });
    return { books, source: 'seoji' };
  }
  const t = (q.title ?? '').trim();
  const books = demoBooks.filter((b) => (isbn ? b.isbn === isbn : t && (b.title.includes(t) || (b.author ?? '').includes(t))));
  return { books, source: 'demo' };
}
