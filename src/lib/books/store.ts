import 'server-only';
import type { BookInfo } from './nl';
import { seojiSearch } from './nl';
import { googleSearch } from './google';
import { kakaoSearch } from './kakao';
import { matchesQuery, missingVols, onePerVolume, sameSeries, sortResults } from './series';
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
const kkey = () => process.env.KAKAO_REST_KEY;
const google = (q: { isbn?: string; title?: string; start?: number }) =>
  cached(`g|${q.isbn ?? ''}|${q.title ?? ''}|${q.start ?? 0}`, () => googleSearch(q, gkey()));
const kakaoPage = (q: { isbn?: string; title?: string; page?: number }) =>
  cached(`k|${q.isbn ?? ''}|${q.title ?? ''}|${q.page ?? 1}`, async () => (await kakaoSearch(kkey()!, q)).books);
/** 제목 검색용 기본 검색원: 카카오 키가 있으면 카카오, 없으면 구글 */
const titleSearch = (title: string) => (kkey() ? kakaoPage({ title }) : google({ title }));

/** 제목 검색 결과 다듬기: 관련 없는 책 빼고, 첫 시리즈에 1권이 없으면 따로 찾아 넣고, 1권부터 정렬 */
async function refineTitle(books: BookInfo[], title: string) {
  let list = books.filter((b) => matchesQuery(b, title));
  const top = sortResults(list, title)[0];
  if (top?.series && !list.some((b) => sameSeries(b.series, top.series) && b.vol === 1)) {
    try {
      const one = (await titleSearch(`${top.series} 1`)).filter((b) => sameSeries(b.series, top.series) && b.vol === 1);
      list = [...list, ...one.filter((b) => !list.some((x) => x.isbn === b.isbn))];
    } catch { /* 1권을 못 찾아도 나머지는 보여준다 */ }
  }
  return sortResults(list, title);
}

/** 쪽수가 없으면(카카오 결과 등) 같은 ISBN으로 구글에서 쪽수·표지를 채운다. 실패해도 그대로 */
export async function withPages(b: BookInfo): Promise<BookInfo> {
  if (b.pages) return b;
  try {
    const g = (await google({ isbn: b.isbn }))[0];
    if (g?.pages) return { ...b, pages: g.pages, coverUrl: b.coverUrl ?? g.coverUrl, genre: b.genreSource === 'default' ? g.genre : b.genre, genreSource: b.genreSource === 'default' ? g.genreSource : b.genreSource };
  } catch { /* 쪽수 모름 → 300쪽으로 추정 */ }
  return b;
}

/**
 * ISBN 또는 제목으로 책 찾기.
 * 순서: 서지 캐시(DB) → 국립중앙도서관(키가 있을 때) → 카카오(키가 있을 때) → 구글 북스 → 데모 목록
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
  if (kkey()) {
    try {
      let books = isbn ? await kakaoPage({ isbn }) : await titleSearch(q.title ?? '');
      if (!isbn) books = await refineTitle(books, q.title ?? '');   // 쪽수는 서재에 꽂은 뒤 따로(후순위)
      if (books.length) return save(books, 'kakao');
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
 * 시리즈 전체 권 찾기.
 * 1) 카카오(50권씩 최대 4쪽) 또는 구글(40권씩 3쪽)로 시리즈 이름 검색 → 같은 시리즈만(영문 병기 무시)
 * 2) 1~마지막 권 사이에 빠진 권은 '시리즈명 + 권 번호'로 한 번씩 더 찾는다(최대 10권, 사용량 보호)
 * 3) 권마다 한 판(기준 출판사 우선). 결과는 서지 캐시에 저장.
 */
export async function seriesVolumes(series: string, publisher?: string | null): Promise<BookInfo[]> {
  const all: BookInfo[] = [];
  if (kkey()) {
    for (let page = 1; page <= 4; page++) {
      const r = await cached(`ks|${series}|${page}`, async () => { const x = await kakaoSearch(kkey()!, { title: series, page }); return x.isEnd ? [...x.books, END] : x.books; });
      all.push(...r.filter((b) => b !== END));
      if (r.includes(END) || !r.length) break;
    }
  } else {
    for (const start of [0, 40, 80]) {
      const page = await google({ title: series, start });
      all.push(...page);
      if (page.length < 30) break;
    }
  }
  let same = all.filter((b) => b.vol && sameSeries(b.series, series));
  const gaps = missingVols(same.map((b) => b.vol!)).slice(0, 10);
  for (const v of gaps) {
    try {
      const found = (await titleSearch(`${series} ${v}`)).filter((b) => b.vol === v && sameSeries(b.series, series));
      same = [...same, ...found];
    } catch { break; }   // 사용량 초과 등이면 멈춘다
  }
  const vols = onePerVolume(same, publisher);
  const db = supabaseService();
  if (db && vols.length) await db.from('books').upsert(vols.map((b) => ({ ...bookToRow(b), source: kkey() ? 'kakao' : 'google' })), { onConflict: 'isbn' });
  return vols;
}
const END = { isbn: '__end__' } as BookInfo;   // 카카오 마지막 쪽 표시(캐시에 함께 저장)
