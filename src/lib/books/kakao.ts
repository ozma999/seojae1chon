// 카카오(다음) 책 검색 API → 앱의 책 정보. 국내 책·만화 시리즈가 잘 잡히지만 쪽수·장르는 없다.
import type { BookInfo } from './nl';
import { normalizeIsbn } from './isbn';
import { withSeries } from './series';
import { guessGenre } from './genre';

export interface KDoc {
  title?: string; contents?: string; isbn?: string; datetime?: string; authors?: string[]; publisher?: string;
  translators?: string[]; thumbnail?: string; status?: string;
}
export interface KResponse { meta?: { total_count?: number; pageable_count?: number; is_end?: boolean }; documents?: KDoc[]; errorType?: string; message?: string }

export function normalizeKakao(d: KDoc): BookInfo | null {
  const title = (d.title ?? '').trim();
  // isbn: "8936433598 9788936433598" 처럼 10자리·13자리가 공백으로 함께 온다
  const parts = (d.isbn ?? '').split(/\s+/).filter(Boolean);
  const isbn = parts.map((p) => normalizeIsbn(p)).find((x) => x && x.length === 13) ?? null;
  if (!title || !isbn) return null;
  const date = (d.datetime ?? '').slice(0, 10);
  const b = withSeries({
    isbn, title, author: d.authors?.length ? d.authors.join(', ') : null, publisher: d.publisher?.trim() || null,
    pubDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null, pages: null, size: 'mid', heightMm: null, hardcover: false,
    format: 'paper', series: null, vol: null, setIsbn: null, coverUrl: d.thumbnail || null, addCode: null,
    genre: 'lit', genreSource: 'default', translators: d.translators?.length ? d.translators.join(', ') : null,
  });
  const g = guessGenre(b);
  return g ? { ...b, genre: g, genreSource: 'guess' } : b;
}

export const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book';
/** 서버 전용(REST 키). 한 번에 최대 50권, page는 1부터 */
export async function kakaoSearch(key: string, q: { isbn?: string; title?: string; page?: number }, fetchImpl: typeof fetch = fetch) {
  const u = new URL(KAKAO_URL);
  u.searchParams.set('query', q.isbn ?? (q.title ?? '').trim());
  u.searchParams.set('target', q.isbn ? 'isbn' : 'title');
  u.searchParams.set('size', '50');
  u.searchParams.set('page', String(q.page ?? 1));
  const r = await fetchImpl(u, { headers: { Authorization: `KakaoAK ${key}` } });
  if (r.status === 401 || r.status === 403) throw new Error('카카오 책 검색 키를 확인해 주세요(권한 없음)');
  if (r.status === 429) throw new Error('도서 검색 사용량이 많아요. 잠시 뒤 다시 시도해 주세요');
  if (!r.ok) throw new Error(`kakao http ${r.status}`);
  const j = (await r.json()) as KResponse;
  const seen = new Set<string>();
  const books = (j.documents ?? []).map(normalizeKakao).filter((b): b is BookInfo => {
    if (!b || seen.has(b.isbn)) return false;
    seen.add(b.isbn);
    return true;
  });
  return { books, isEnd: j.meta?.is_end ?? true };
}
