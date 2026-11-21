// 제목에서 시리즈 이름과 권 번호 뽑기, 검색어와 관련 있는지 판단, 정렬
import type { BookInfo } from './nl';

/** 비교용: 소문자, 공백·문장부호 제거 */
export const norm = (s: string) => s.toLowerCase().normalize('NFC').replace(/[\s\p{P}\p{S}]/gu, '');

/**
 * "원피스 104" / "원피스 1권" / "삼국지 3 - 적벽대전" / "해리 포터 (2)" / "슬램덩크 Vol.5" / "토지 제1부"
 * → { series, vol }. 숫자가 4자리 이상(연도)이거나 시리즈 이름이 비면 시리즈가 아님.
 */
export function parseSeries(title: string): { series: string; vol: number } | null {
  const t = title.trim().replace(/\s+/g, ' ');
  const m =
    t.match(/^(.+?)[\s.,:]*(?:vol\.?|volume|제)\s*(\d{1,3})(?:\s*(?:권|부|편|화))?(?:\s*[-:–—(\[].*)?$/i) ??
    t.match(/^(.+?)\s*[(\[]\s*(\d{1,3})\s*(?:권|부)?\s*[)\]](?:\s*[-:–—].*)?$/) ??
    t.match(/^(.+?)[\s.,:]+(\d{1,3})(?:\s*(?:권|부|편))?(?:\s*[-:–—(\[].*)?$/);
  if (!m) return null;
  const series = m[1].replace(/[\s.,:\-–—]+$/, '').trim();
  const vol = Number(m[2]);
  if (!series || norm(series).length < 1 || vol < 1 || vol > 300) return null;
  return { series, vol };
}

/** 시리즈·권 정보가 없으면 제목에서 채운다 */
export function withSeries(b: BookInfo): BookInfo {
  if (b.series && b.vol) return b;
  const p = parseSeries(b.title);
  if (!p) return b;
  return { ...b, series: b.series ?? p.series, vol: b.vol ?? p.vol };
}

/** 검색어의 모든 단어가 제목(또는 시리즈·저자)에 들어 있어야 관련 있는 책 */
export function matchesQuery(b: BookInfo, q: string) {
  const hay = norm(`${b.title} ${b.series ?? ''}`), who = norm(b.author ?? '');
  const words = q.trim().split(/\s+/).map(norm).filter(Boolean);
  if (!words.length) return false;
  return words.every((w) => hay.includes(w)) || words.every((w) => hay.includes(w) || who.includes(w));
}

/**
 * 정렬: 검색어로 시작하는 제목 먼저 → 같은 시리즈는 1권부터 오름차순으로 묶음 → 나머지
 */
export function sortResults(books: BookInfo[], q: string) {
  const nq = norm(q);
  const key = (b: BookInfo) => norm(b.series ?? b.title);
  const rank = (b: BookInfo) => {
    const k = key(b), t = norm(b.title);
    if (k === nq || t === nq) return 0;
    if (k.startsWith(nq) || t.startsWith(nq)) return 1;
    if (k.includes(nq) || t.includes(nq)) return 2;
    return 3;
  };
  // 시리즈 묶음의 대표 순위 = 그 시리즈에서 가장 좋은 순위
  const best = new Map<string, number>();
  for (const b of books) { const k = key(b); best.set(k, Math.min(best.get(k) ?? 9, rank(b))); }
  const firstSeen = new Map<string, number>();
  books.forEach((b, i) => { const k = key(b); if (!firstSeen.has(k)) firstSeen.set(k, i); });
  return [...books].sort((a, b) => {
    const ka = key(a), kb = key(b);
    return best.get(ka)! - best.get(kb)! || firstSeen.get(ka)! - firstSeen.get(kb)! || (a.vol ?? 0) - (b.vol ?? 0);
  });
}

/** 같은 권이 여러 판(개정판 등)이면 하나만: 기준 출판사와 같은 것 → 쪽수 있는 것 → 먼저 나온 것 */
export function onePerVolume(books: BookInfo[], publisher?: string | null) {
  const by = new Map<number, BookInfo>();
  for (const b of books) {
    if (!b.vol) continue;
    const cur = by.get(b.vol);
    const score = (x: BookInfo) => (publisher && x.publisher === publisher ? 2 : 0) + (x.pages ? 1 : 0);
    if (!cur || score(b) > score(cur)) by.set(b.vol, b);
  }
  return [...by.values()].sort((a, b) => a.vol! - b.vol!);
}
