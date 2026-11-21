import 'server-only';
import type { BookInfo } from './nl';
import { seojiSearch } from './nl';
import { googleSearch } from './google';
import { matchesQuery, norm, onePerVolume, sortResults } from './series';
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

// 같은 검색어를 짧은 시간에 다시 부르면(자동완성) 구글 사용량을 아끼려고 서버 메모리에 잠깐 둔다
const memo = new Map<string, { at: number; v: BookInfo[] }>();
async function cached(key: string, f: () => Promise<BookInfo[]>) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < 30 * 60e3) return hit.v;
  const v = await f();
  memo.set(key, { at: Date.now(), v });
  if (memo.size > 500) memo.delete(memo.keys().next().value!);
  return v;
}
/** 테스트용 */
export const clearLookupCache = () => memo.clear();
const gkey = () => process.env.GOOGLE_BOOKS_KEY;
const google = (q: { isbn?: string; title?: string; start?: number }) =>
  cached(`g|${q.isbn ?? ''}|${q.title ?? ''}|${q.start ?? 0}`, () => googleSearch(q, gkey()));

/** 제목 검색 결과 다듬기: 관련 없는 책 빼고, 첫 시리즈에 1권이 없으면 따로 찾아 넣고, 1권부터 정렬 */
async function refineTitle(books: BookInfo[], title: string) {
  let list = books.filter((b) => matchesQuery(b, title));
  const top = sortResults(list, title)[0];
  if (top?.series && !list.some((b) => b.series === top.series && b.vol === 1)) {
    try {
      const one = (await google({ title: `${top.series} 1` })).filter((b) => b.series && norm(b.series) === norm(top.series!) && b.vol === 1);
      list = [...list, ...one.filter((b) => !list.some((x) => x.isbn === b.isbn))];
    } catch { /* 1권을 못 찾아도 나머지는 보여준다 */ }
  }
  return sortResults(list, title);
}

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
      let books = await seojiSearch(nlKey, query);
      if (!isbn) books = sortResults(books.filter((b) => matchesQuery(b, q.title ?? '')), q.title ?? '');
      if (books.length) return save(books, 'seoji');
    } catch (e) { lastError = e as Error; }
  }
  try {
    let books = await google(query);
    if (!isbn) books = await refineTitle(books, q.title ?? '');
    if (books.length) return save(books, 'google');
  } catch (e) { lastError = e as Error; }
  // 데모 목록(임시 ISBN 979-11-99…): 실제 서비스 검색에 없을 때만
  const t = (q.title ?? '').trim();
  const demo = demoBooks.filter((b) => (isbn ? b.isbn === isbn : t && (b.title.includes(t) || (b.author ?? '').includes(t))));
  if (!demo.length && lastError) throw lastError;
  return { books: demo, source: 'demo' };
}

/**
 * 시리즈 전체 권 찾기(최대 120개 결과를 3번에 나눠 조회). 권마다 한 판만, 기준 출판사 우선. 결과는 캐시에 저장.
 */
export async function seriesVolumes(series: string, publisher?: string | null): Promise<BookInfo[]> {
  const all: BookInfo[] = [];
  for (const start of [0, 40, 80]) {
    const page = await google({ title: series, start });
    all.push(...page);
    if (page.length < 30) break;
  }
  const same = all.filter((b) => b.series && norm(b.series) === norm(series) && b.vol);
  const vols = onePerVolume(same, publisher);
  const db = supabaseService();
  if (db && vols.length) await db.from('books').upsert(vols.map((b) => ({ ...bookToRow(b), source: 'google' })), { onConflict: 'isbn' });
  return vols;
}
