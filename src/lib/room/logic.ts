// 렌더링과 무관한 방 규칙(서버·테스트에서도 쓴다)
import type { ArtLevel, ArtManifest, Genre, ItemId, RoomBook, ThemeKey } from './types';

export const GENRE_THEME: Record<Genre, ThemeKey> = { lit: 'attic', sf: 'space', manga: 'manga', hum: 'study' };
export const GENRE_NAME: Record<Genre, string> = { lit: '문학', sf: 'SF·판타지', manga: '만화', hum: '인문·과학' };
const GENRE_ORDER: Record<Genre, number> = { lit: 0, sf: 1, hum: 2, manga: 3 };

/** 책등 두께(mm) = 쪽수 × 0.06 + 표지(무선 1, 양장 3). 쪽수가 없으면 300쪽으로 본다 */
export const thicknessMm = (b: Pick<RoomBook, 'pages' | 'hardcover'>) =>
  (b.pages ?? 300) * 0.06 + (b.hardcover ? 3 : 1);
export const spineW = (b: RoomBook) => Math.max(2, Math.min(4, Math.round(thicknessMm(b) / 6)));
export const spineH = (b: RoomBook) => (b.size === 'small' ? 14 : b.size === 'big' ? 19 : 17);

export const bragList = (books: RoomBook[]) =>
  books.filter((b) => b.bragAt !== null).sort((a, b) => (a.bragAt ?? 0) - (b.bragAt ?? 0));

/** 일반 책장에 꽂힐 순서: 장르 → 시리즈 → 권 */
export function shelfOrder(books: RoomBook[]) {
  return books
    .filter((b) => b.bragAt === null)
    .sort(
      (a, b) =>
        GENRE_ORDER[a.genre] - GENRE_ORDER[b.genre] ||
        (a.series ?? '').localeCompare(b.series ?? '') ||
        (a.vol ?? 0) - (b.vol ?? 0),
    );
}

export interface Placed { book: RoomBook; x: number; y: number; w: number; h: number }
/** 칸 좌표에 책을 왼쪽부터 꽂는다(아래 칸부터) */
export function fillSlots(L: ArtLevel, books: RoomBook[]) {
  const placed: Placed[] = [];
  let bi = 0;
  const slots = [...L.slots].sort((p, q) => q[2] - p[2] || p[0] - q[0]);
  for (const [x0, x1, yb, maxh] of slots) {
    let x = x0;
    while (bi < books.length) {
      const b = books[bi], w = spineW(b), h = Math.min(maxh, spineH(b));
      if (x + w > x1 - 1) break;
      placed.push({ book: b, x, y: yb - h, w, h });
      x += w + 1;
      bi++;
    }
  }
  // 옆벽 장식 책장(sidecap)도 수용량에 포함
  return { placed, overflow: Math.max(0, books.length - bi - (L.sidecap || 0)) };
}

/** 책이 다 들어가는 가장 작은 방 */
export function pickLevel(art: ArtManifest, books: RoomBook[]) {
  const order = shelfOrder(books);
  for (let li = 0; li < art.levels.length; li++) {
    const r = fillSlots(art.levels[li], order);
    if (r.overflow === 0 || li === art.levels.length - 1) return { li, ...r };
  }
  throw new Error('no levels');
}

/** 대표 책(자랑 책장) 장르 다수결, 동률이면 최근에 꽂은 책 */
export function bragTopGenre(books: RoomBook[]): Genre | null {
  const bl = bragList(books);
  if (!bl.length) return null;
  const cnt: Partial<Record<Genre, number>> = {}, last: Partial<Record<Genre, number>> = {};
  for (const b of bl) {
    cnt[b.genre] = (cnt[b.genre] ?? 0) + 1;
    last[b.genre] = Math.max(last[b.genre] ?? 0, b.bragAt ?? 0);
  }
  let top: Genre | null = null;
  for (const g of Object.keys(cnt) as Genre[]) {
    if (top === null || cnt[g]! > cnt[top]! || (cnt[g] === cnt[top] && last[g]! > last[top]!)) top = g;
  }
  return top;
}
export const autoTheme = (books: RoomBook[]): ThemeKey => {
  const g = bragTopGenre(books);
  return g ? GENRE_THEME[g] : 'attic';
};

export const itemUnlocked = (art: ArtManifest, id: ItemId, n: number) =>
  n >= (art.itemdefs.find((d) => d.id === id)?.th ?? Infinity);
export const itemOn = (art: ArtManifest, id: ItemId, n: number, off: ItemId[]) =>
  itemUnlocked(art, id, n) && !off.includes(id);
export const nextItem = (art: ArtManifest, n: number) => art.itemdefs.find((d) => d.th > n) ?? null;

export const HAIR_TH = [0, 0, 10, 30, 80, 120, 200, 300];
export const OUTFIT_TH = [0, 20, 40, 60, 100, 150, 250, 400];
