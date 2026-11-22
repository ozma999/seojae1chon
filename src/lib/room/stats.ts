// 내 책장 대시보드 계산(화면과 무관한 순수 함수)
import type { LibraryEntry } from '../data/types';
import { seriesKey } from '../books/series';
import { thicknessMm } from './logic';
import type { Genre } from './types';

/** 쌓은 높이 비교 대상(m) */
export const LANDMARKS = [
  { m: 0, name: '바닥', icon: 'floor' }, { m: 1.6, name: '내 키', icon: 'person' }, { m: 2.3, name: '방문', icon: 'door' },
  { m: 6, name: '2층집', icon: 'house' }, { m: 14, name: '아파트 5층', icon: 'apt' }, { m: 42, name: '아파트 15층', icon: 'apt' },
  { m: 84, name: '아파트 30층', icon: 'apt' }, { m: 236, name: '남산서울타워', icon: 'tower' }, { m: 555, name: '롯데월드타워', icon: 'tower' },
] as const;
export function towerInfo(entries: LibraryEntry[]) {
  const paper = entries.filter((e) => e.format === 'paper');
  const m = paper.reduce((a, e) => a + thicknessMm(e), 0) / 1000;
  let below: (typeof LANDMARKS)[number] = LANDMARKS[0], next: (typeof LANDMARKS)[number] | null = null;
  for (const l of LANDMARKS) { if (l.m <= m) below = l; else { next = l; break; } }
  const avg = paper.length ? m / paper.length : 0.022;
  return { m, paper: paper.length, below, next, booksToNext: next ? Math.ceil((next.m - m) / avg) : 0 };
}

const TITLE: Record<Genre, string> = { lit: '문학 수집가', sf: 'SF 탐험가', manga: '만화방 주인', hum: '인문 탐구자' };
/** 저자 표기에서 이름 하나만: "무라카미 하루키, 양억관" → "무라카미 하루키" */
const firstAuthor = (a: string) => a.split(/[,·;]/)[0].replace(/\(.*?\)|\[.*?\]|지음|글|그림|저\b/g, '').trim();
const shortName = (a: string) => { const p = a.split(/\s+/); return p.length > 1 && /[가-힣]/.test(a) && p[p.length - 1].length >= 2 && p.length >= 2 && p[0].length >= 3 ? p[p.length - 1] : a; };

/**
 * 서재 성향: 장르 말고 '어떻게 모았나'로 사람마다 다른 칭호. 가장 두드러진 하나(기준을 가장 크게 넘은 것)를 고른다.
 * 10권 미만이면 null(장르 칭호를 쓴다)
 */
export function persona(entries: LibraryEntry[], now = Date.now()): { name: string; why: string } | null {
  // 시리즈는 한 작품으로 센다(만화 100권이 작가 덕후로 보이지 않게)
  const works = entries.filter((e) => !e.vol || e.vol === 1 || !e.series);
  const n = entries.length, w = works.length;
  if (n < 10) return null;
  const cands: { name: string; why: string; score: number }[] = [];
  const top = <T,>(xs: T[]) => { const m = new Map<T, number>(); xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1])[0] ?? null; };
  const au = top(works.filter((e) => e.author).map((e) => firstAuthor(e.author!)).filter(Boolean));
  if (au && au[1] >= 5) cands.push({ name: `${shortName(au[0])} 덕후`, why: `${au[0]}의 책 ${au[1]}권`, score: au[1] / 5 });
  const done = seriesProgress(entries).filter((s) => s.missing.length === 0 && s.have >= 5);
  if (done.length >= 2) cands.push({ name: '완결 수집가', why: `빠진 권 없이 모은 시리즈 ${done.length}개`, score: done.length / 2 });
  const tr = works.filter((e) => e.translators).length;
  if (tr / w >= 0.5) cands.push({ name: '세계여행자', why: `번역서가 ${Math.round((tr / w) * 100)}%`, score: tr / w / 0.5 });
  const years = works.map((e) => (e.pubDate ? Date.parse(e.pubDate) : NaN)).filter((x) => !isNaN(x));
  if (years.length >= 10) {
    const old = years.filter((y) => y < Date.UTC(2000, 0, 1)).length / years.length;
    const fresh = years.filter((y) => now - y < 365 * 86400e3).length / years.length;
    if (old >= 0.4) cands.push({ name: '고전파', why: `2000년 전에 나온 책이 ${Math.round(old * 100)}%`, score: old / 0.4 });
    if (fresh >= 0.4) cands.push({ name: '얼리리더', why: `최근 1년 안에 나온 책이 ${Math.round(fresh * 100)}%`, score: fresh / 0.4 });
  }
  const pub = top(works.filter((e) => e.publisher).map((e) => e.publisher!));
  if (pub && w >= 10 && pub[1] / w >= 0.3) cands.push({ name: `${pub[0]} 단골`, why: `${pub[0]} 책이 ${pub[1]}권`, score: pub[1] / w / 0.3 });
  const g: Record<Genre, number> = { lit: 0, sf: 0, manga: 0, hum: 0 };
  entries.forEach((e) => g[e.genre]++);
  if (Object.values(g).every((v) => v / n >= 0.15)) cands.push({ name: '잡식 독서가', why: '네 갈래 장르를 고루 모음', score: 1.2 });
  return cands.sort((a, b) => b.score - a.score)[0] ?? null;
}

/** 칭호: 성향(없으면 가장 많은 장르) + 권수에 따른 앞말 */
export function shelfTitle(entries: LibraryEntry[], now = Date.now()) {
  if (!entries.length) return '첫 책을 기다리는 서재';
  const c: Record<Genre, number> = { lit: 0, sf: 0, manga: 0, hum: 0 };
  entries.forEach((e) => c[e.genre]++);
  const top = (Object.keys(c) as Genre[]).sort((a, b) => c[b] - c[a])[0];
  const n = entries.length;
  const pre = n >= 2000 ? '전설의 ' : n >= 700 ? '이름난 ' : n >= 100 ? '' : n >= 30 ? '꿈나무 ' : '새내기 ';
  return pre + (persona(entries, now)?.name ?? TITLE[top]);
}

/** 시리즈 완주 현황: 2권 이상 가진 시리즈, 가장 큰 권 번호 기준 */
export function seriesProgress(entries: LibraryEntry[]) {
  const by = new Map<string, { name: string; vols: Set<number>; publisher: string | null }>();
  for (const e of entries) {
    if (!e.series || !e.vol) continue;
    const k = seriesKey(e.series);
    const g = by.get(k) ?? { name: e.series, vols: new Set<number>(), publisher: e.publisher };
    g.vols.add(e.vol);
    by.set(k, g);
  }
  return [...by.values()].filter((g) => g.vols.size >= 2).map((g) => {
    const max = Math.max(...g.vols), missing: number[] = [];
    for (let v = 1; v <= max; v++) if (!g.vols.has(v)) missing.push(v);
    return { name: g.name, have: g.vols.size, max, missing, publisher: g.publisher };
  }).sort((a, b) => b.have - a.have);
}

export function monthCount(entries: LibraryEntry[], now: Date) {
  const y = now.getFullYear(), mo = now.getMonth();
  return entries.filter((e) => { const d = new Date(e.addedAt); return d.getFullYear() === y && d.getMonth() === mo; }).length;
}
