// 국립중앙도서관 ISBN 서지정보 API(seoji) 응답 → 앱의 책 정보
import type { Genre } from '../room/types';
import { normalizeIsbn } from './isbn';
import { withSeries } from './series';

/** API 원본 한 건(필요한 필드만). 값은 모두 문자열이고 비어 있을 수 있다 */
export interface SeojiDoc {
  TITLE?: string; VOL?: string; SERIES_TITLE?: string; SERIES_NO?: string; AUTHOR?: string; PUBLISHER?: string;
  EA_ISBN?: string; EA_ADD_CODE?: string; SET_ISBN?: string; SET_ADD_CODE?: string; SUBJECT?: string; KDC?: string;
  PAGE?: string; BOOK_SIZE?: string; FORM?: string; FORM_DETAIL?: string; EBOOK_YN?: string;
  PUBLISH_PREDATE?: string; REAL_PUBLISH_DATE?: string; TITLE_URL?: string; BOOK_INTRODUCTION_URL?: string;
}
export interface SeojiResponse { PAGE_NO?: string; TOTAL_COUNT?: string; docs?: SeojiDoc[]; RESULT?: string; ERR_MESSAGE?: string }

export interface BookInfo {
  isbn: string;
  title: string;
  author: string | null;
  publisher: string | null;
  pubDate: string | null; // YYYY-MM-DD 또는 YYYY-MM
  pages: number | null;
  size: 'small' | 'mid' | 'big';
  heightMm: number | null;
  hardcover: boolean;
  format: 'paper' | 'ebook';
  series: string | null;
  vol: number | null;
  setIsbn: string | null;
  coverUrl: string | null;
  addCode: string | null;
  genre: Genre;
  /** 'addcode' = 부가기호로 판정, 'subject' = SUBJECT(KDC 대분류), 'default' = 판단 근거 없음 */
  genreSource: 'addcode' | 'subject' | 'guess' | 'ai' | 'default';
  /** 옮긴이(카카오). 서재 성향 칭호용 */
  translators?: string | null;
}

const clean = (s?: string) => (s ?? '').replace(/\s+/g, ' ').trim() || null;
const int = (s?: string) => { const m = (s ?? '').match(/\d+/); return m ? Number(m[0]) : null; };

/** BOOK_SIZE: "21 cm", "128*188", "0*0" 등 → 세로 mm */
export function parseHeightMm(s?: string): number | null {
  const t = (s ?? '').trim();
  const cm = t.match(/(\d+(?:\.\d+)?)\s*cm/i);
  if (cm) return Math.round(Number(cm[1]) * 10) || null;
  const wh = t.match(/(\d+)\s*[*x×]\s*(\d+)/i);
  if (wh) { const h = Math.max(Number(wh[1]), Number(wh[2])); return h > 0 ? h : null; }
  return null;
}
export const sizeClass = (h: number | null): BookInfo['size'] => (h === null ? 'mid' : h < 160 ? 'small' : h >= 250 ? 'big' : 'mid');

/**
 * 부가기호(독자대상 1 + 발행형태 1 + 내용분류 3)로 장르 추정.
 * - 발행형태 7(그림책·만화)이고 아동(7)이 아니면 만화
 * - 내용분류 첫 자리 8 = 문학, 그 밖 = 인문·과학
 * - SF·판타지·미스터리는 부가기호로 구분할 수 없어 '문학'으로 나온다(사용자가 고친다)
 */
export function genreFromAddCode(code?: string | null): Genre | null {
  const c = (code ?? '').trim();
  if (!/^\d{5}$/.test(c)) return null;
  const reader = c[0], form = c[1], main = c[2];
  if (form === '7' && reader !== '7') return 'manga';
  if (main === '8') return 'lit';
  if (reader === '7') return 'lit'; // 아동 그림책 등
  return 'hum';
}
export function genreFromSubject(subject?: string | null): Genre | null {
  const m = (subject ?? '').trim().match(/^\d/);
  if (!m) return null;
  return m[0] === '8' ? 'lit' : 'hum';
}

export function normalizeDoc(d: SeojiDoc): BookInfo | null {
  const isbn = normalizeIsbn(d.EA_ISBN ?? '') ?? normalizeIsbn(d.SET_ISBN ?? '');
  const title = clean(d.TITLE);
  if (!isbn || !title) return null;
  const form = `${d.FORM ?? ''} ${d.FORM_DETAIL ?? ''}`;
  const addCode = clean(d.EA_ADD_CODE) ?? clean(d.SET_ADD_CODE);
  const ebook = d.EBOOK_YN === 'Y' || /전자/.test(form) || (addCode?.[1] === '5');
  const h = parseHeightMm(d.BOOK_SIZE);
  const date = (d.REAL_PUBLISH_DATE || d.PUBLISH_PREDATE || '').replace(/\D/g, '');
  const g1 = genreFromAddCode(addCode), g2 = g1 ? null : genreFromSubject(d.SUBJECT ?? d.KDC);
  const pages = int(d.PAGE);
  return {
    isbn, title,
    author: clean(d.AUTHOR), publisher: clean(d.PUBLISHER),
    pubDate: date.length >= 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date.length >= 6 ? `${date.slice(0, 4)}-${date.slice(4, 6)}` : null,
    pages: pages && pages > 0 && pages < 10000 ? pages : null,
    size: sizeClass(h), heightMm: h,
    hardcover: /양장/.test(form) && !/반양장/.test(form),
    format: ebook ? 'ebook' : 'paper',
    series: clean(d.SERIES_TITLE), vol: int(d.VOL) ?? int(d.SERIES_NO),
    setIsbn: normalizeIsbn(d.SET_ISBN ?? ''),
    coverUrl: clean(d.TITLE_URL),
    addCode,
    genre: g1 ?? g2 ?? 'lit',
    genreSource: g1 ? 'addcode' : g2 ? 'subject' : 'default',
  };
}

export const SEOJI_URL = 'https://www.nl.go.kr/seoji/SearchApi.do';
/** 서버에서만 호출(키 노출 금지). 오류도 HTTP 200으로 오므로 RESULT를 확인한다 */
export async function seojiSearch(key: string, q: { isbn?: string; title?: string }, fetchImpl: typeof fetch = fetch) {
  const u = new URL(SEOJI_URL);
  u.searchParams.set('cert_key', key);
  u.searchParams.set('result_style', 'json');
  u.searchParams.set('page_no', '1');
  u.searchParams.set('page_size', '10');
  if (q.isbn) u.searchParams.set('isbn', q.isbn);
  if (q.title) u.searchParams.set('title', q.title);
  const r = await fetchImpl(u, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`seoji http ${r.status}`);
  const j = (await r.json()) as SeojiResponse;
  if (j.RESULT === 'ERROR') throw new Error(`seoji error: ${j.ERR_MESSAGE ?? 'unknown'}`);
  return (j.docs ?? []).map(normalizeDoc).filter((b): b is BookInfo => b !== null).map(withSeries);
}
