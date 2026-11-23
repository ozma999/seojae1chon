// 서재산책 '우리 사이': 같이 가진 책, 취향 겹침 %, 그 서재에만 있는 추천 책
import type { LibraryEntry } from '../data/types';
import { seriesKey } from '../books/series';

const work = (e: LibraryEntry) => (e.series ? 's:' + seriesKey(e.series) : 'i:' + e.isbn);   // 시리즈는 한 작품
const authorOf = (e: LibraryEntry) => (e.author ?? '').split(/[,·;]/)[0].replace(/\(.*?\)/g, '').trim();

export function together(host: LibraryEntry[], mine: LibraryEntry[]) {
  const myIsbn = new Set(mine.map((e) => e.isbn)), myWorks = new Set(mine.map(work));
  const myAuthors = new Set(mine.map(authorOf).filter(Boolean));
  const shared = host.filter((e) => myIsbn.has(e.isbn));
  const hostWorks = new Set(host.map(work)), hostAuthors = new Set(host.map(authorOf).filter(Boolean));
  const sw = [...hostWorks].filter((w) => myWorks.has(w)).length;
  const sa = [...hostAuthors].filter((a) => myAuthors.has(a)).length;
  // 취향 겹침: 같은 작품(시리즈는 하나로)과 같은 작가가 작은 쪽 서재에서 차지하는 비율의 평균
  const r = (a: number, b: number) => (b ? a / b : 0);
  const pct = mine.length && host.length
    ? Math.min(100, Math.round(((r(sw, Math.min(hostWorks.size, myWorks.size)) + r(sa, Math.min(hostAuthors.size, myAuthors.size))) / 2) * 100))
    : 0;
  // 추천: 내게 없는 작품만. 자랑 책장 → 내가 좋아하는 작가 → 최근에 꽂은 순. 시리즈는 1권(또는 첫 권) 하나만
  const seen = new Set<string>();
  const score = (e: LibraryEntry) => (e.bragAt ? 1e15 : 0) + (myAuthors.has(authorOf(e)) ? 1e14 : 0) + e.addedAt;
  const recs: LibraryEntry[] = [];
  for (const e of [...host].sort((a, b) => score(b) - score(a) || (a.vol ?? 0) - (b.vol ?? 0))) {
    const w = work(e);
    if (myWorks.has(w) || seen.has(w)) continue;
    seen.add(w);
    const first = e.series ? host.filter((x) => work(x) === w).sort((a, b) => (a.vol ?? 99) - (b.vol ?? 99))[0] : e;
    recs.push(first);
    if (recs.length >= 3) break;
  }
  return { shared, sharedWorks: sw, sharedAuthors: sa, pct, recs, myAuthors };
}
