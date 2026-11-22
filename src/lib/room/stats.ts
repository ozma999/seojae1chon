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
/** 칭호: 가장 많은 장르 + 권수에 따른 앞말 */
export function shelfTitle(entries: LibraryEntry[]) {
  if (!entries.length) return '첫 책을 기다리는 서재';
  const c: Record<Genre, number> = { lit: 0, sf: 0, manga: 0, hum: 0 };
  entries.forEach((e) => c[e.genre]++);
  const top = (Object.keys(c) as Genre[]).sort((a, b) => c[b] - c[a])[0];
  const n = entries.length;
  const pre = n >= 2000 ? '전설의 ' : n >= 700 ? '이름난 ' : n >= 100 ? '' : n >= 30 ? '꿈나무 ' : '새내기 ';
  return pre + TITLE[top];
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
