// 구글 북스 API(키 없이도 적은 양은 동작) 응답 → 앱의 책 정보
import type { Genre } from '../room/types';
import type { BookInfo } from './nl';
import { normalizeIsbn } from './isbn';
import { withSeries } from './series';

export interface GVolume {
  id?: string;
  volumeInfo?: {
    title?: string; subtitle?: string; authors?: string[]; publisher?: string; publishedDate?: string;
    industryIdentifiers?: { type?: string; identifier?: string }[]; pageCount?: number; printType?: string;
    categories?: string[]; imageLinks?: { smallThumbnail?: string; thumbnail?: string }; language?: string;
  };
  saleInfo?: { isEbook?: boolean };
}
export interface GResponse { totalItems?: number; items?: GVolume[]; error?: { code?: number; message?: string } }

/** 구글 분류(영어)로 장르 추정. 한국 책은 분류가 없는 경우가 많다 → null */
export function genreFromCategories(cats?: string[]): Genre | null {
  const c = (cats ?? []).join(' / ').toLowerCase();
  if (!c) return null;
  if (/comic|graphic novel|manga/.test(c)) return 'manga';
  if (/science fiction|fantasy|sf\b/.test(c)) return 'sf';
  if (/fiction|poetry|drama|literary|literature/.test(c)) return 'lit';
  return 'hum';
}
/** "2007-10-30" / "2007-10" / "2007" 그대로(자리 수만 확인) */
const date = (s?: string) => (s && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(s) ? s : null);
const https = (u?: string) => (u ? u.replace(/^http:/, 'https:').replace(/&edge=curl/, '') : null);

export function normalizeVolume(v: GVolume): BookInfo | null {
  const i = v.volumeInfo;
  if (!i?.title) return null;
  const ids = i.industryIdentifiers ?? [];
  const isbn = normalizeIsbn(ids.find((x) => x.type === 'ISBN_13')?.identifier ?? '') ?? normalizeIsbn(ids.find((x) => x.type === 'ISBN_10')?.identifier ?? '');
  if (!isbn) return null;
  const g = genreFromCategories(i.categories);
  return {
    isbn, title: i.title.trim(), author: i.authors?.length ? i.authors.join(', ') : null, publisher: i.publisher ?? null,
    pubDate: date(i.publishedDate), pages: i.pageCount && i.pageCount > 0 && i.pageCount < 10000 ? i.pageCount : null,
    size: 'mid', heightMm: null, hardcover: false, format: 'paper', series: null, vol: null, setIsbn: null,
    coverUrl: https(i.imageLinks?.thumbnail ?? i.imageLinks?.smallThumbnail), addCode: null,
    genre: g ?? 'lit', genreSource: g ? 'subject' : 'default',   // 'subject' = 주제 분류(구글 categories)로 판정
  };
}

export const GOOGLE_URL = 'https://www.googleapis.com/books/v1/volumes';
/** 서버에서 호출. key가 없어도 동작(하루 사용량이 적을 때). 429면 사용량 초과 */
export async function googleSearch(q: { isbn?: string; title?: string; start?: number }, key?: string, fetchImpl: typeof fetch = fetch) {
  const u = new URL(GOOGLE_URL);
  // 제목 검색은 intitle: 로 제한(책 소개문에만 단어가 있는 무관한 책 제외)
  u.searchParams.set('q', q.isbn ? `isbn:${q.isbn}` : (q.title ?? '').trim().split(/\s+/).map((w) => `intitle:${w}`).join(' '));
  u.searchParams.set('maxResults', '40');
  if (q.start) u.searchParams.set('startIndex', String(q.start));
  u.searchParams.set('printType', 'books');
  if (!q.isbn) u.searchParams.set('langRestrict', 'ko');
  if (key) u.searchParams.set('key', key);
  const r = await fetchImpl(u, { headers: { accept: 'application/json' } });
  if (r.status === 429) throw new Error('도서 검색 사용량이 많아요. 잠시 뒤 다시 시도해 주세요');
  if (!r.ok) throw new Error(`google books http ${r.status}`);
  const j = (await r.json()) as GResponse;
  const seen = new Set<string>();
  return (j.items ?? []).map(normalizeVolume).map((b) => (b ? withSeries(b) : b)).filter((b): b is BookInfo => {
    if (!b || seen.has(b.isbn)) return false;
    seen.add(b.isbn);
    return true;
  });
}
