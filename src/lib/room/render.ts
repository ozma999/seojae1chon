'use client';
// 브라우저 전용: 방 그림을 캔버스에 합성한다(프로토타입 v0.6과 같은 순서).
import type { ArtLevel, ArtManifest, ItemId, RoomBook, RoomState, ThemeKey, Tod } from './types';
import { autoTheme, bragList, itemOn, pickLevel, pickedVar, type Placed } from './logic';
import { autoTod } from './time';
import { EBOOK_MARK } from './look';

export interface LoadedArt {
  art: ArtManifest;
  img: (path: string) => HTMLImageElement;
}
export async function loadArt(base = '/art'): Promise<LoadedArt> {
  const art: ArtManifest = await (await fetch(`${base}/manifest.json`)).json();
  const paths = new Set<string>([art.avatar.img]);
  for (const L of art.levels) {
    Object.values(L.bg).forEach((p) => paths.add(p));
    L.win.forEach((w) => Object.values(w.img).forEach((t) => Object.values(t).forEach((p) => paths.add(p))));
    L.items.forEach((it) => paths.add(it.img));
  }
  const map = new Map<string, HTMLImageElement>();
  await Promise.all(
    [...paths].map(
      (p) =>
        new Promise<void>((ok, bad) => {
          const im = new Image();
          im.onload = () => ok();
          im.onerror = () => bad(new Error('art load failed: ' + p));
          im.src = `${base}/${p}`;
          map.set(p, im);
        }),
    ),
  );
  return { art, img: (p) => map.get(p)! };
}

// ---------- 시간대 조명 ----------
type Tint = [number, number, number, number, number, number] | null;
// 밤(v0.7): 깜깜하지 않게 — 창밖과 살짝 푸른 벽으로 밤을 보이고, 바닥 나무색·책장 칸은 보이게
const ROOM_TINT: Record<Tod, Tint> = { 새벽: [.74, .72, .9, 8, 0, 28], 낮: null, 노을: [1, .8, .66, 22, 6, 0], 밤: [.74, .74, .86, 0, 0, 10] };
const ROOM_HALF: Record<Tod, Tint> = { 새벽: [.88, .86, .95, 4, 0, 12], 낮: null, 노을: [1, .88, .78, 12, 2, 0], 밤: [.9, .88, .9, 6, 4, 4] };
const ROOM_LIT: Record<Tod, Tint> = { 새벽: null, 낮: null, 노을: null, 밤: [1, .97, .9, 4, 2, 0] };
type Light = ArtLevel['lights'][number];

function makeShader(pal: [number, number, number][]) {
  const near = new Map<number, [number, number, number]>();
  const nearPal = (r: number, g: number, b: number) => {
    const k = (r << 16) | (g << 8) | b;
    let v = near.get(k);
    if (v) return v;
    let bd = 1e9;
    for (const p of pal) {
      const d = (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2;
      if (d < bd) { bd = d; v = p; }
    }
    near.set(k, v!);
    return v!;
  };
  const caches = new Map<Tint, Map<number, [number, number, number]>>();
  const tint = (r: number, g: number, b: number, T: NonNullable<Tint>) => {
    let m = caches.get(T);
    if (!m) caches.set(T, (m = new Map()));
    const k = (r << 16) | (g << 8) | b;
    let v = m.get(k);
    if (!v) {
      v = nearPal(Math.min(255, r * T[0] + T[3]) | 0, Math.min(255, g * T[1] + T[4]) | 0, Math.min(255, b * T[2] + T[5]) | 0);
      m.set(k, v);
    }
    return v;
  };
  /** 조명 안쪽 → 중간 → 바깥 3단, 경계 한 줄은 체크무늬. 색은 32색으로 되돌린다 */
  return function shade(ctx: CanvasRenderingContext2D, w: number, h: number, tod: Tod, lights: Light[],
    skip: Uint8ClampedArray | null, ox = 0, oy = 0, maxBand = 2) {
    const T = ROOM_TINT[tod];
    if (!T) return;
    const im = ctx.getImageData(0, 0, w, h), d = im.data;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (!d[i + 3] || (skip && skip[i + 3])) continue;
        let q = 9;
        for (const l of lights) q = Math.min(q, ((x + ox - l.x) / l.rx) ** 2 + ((y + oy - l.y) / l.ry) ** 2);
        const ck = (x + y) & 1;
        const band = Math.min(maxBand, q < .5 || (q < .56 && ck) ? 0 : q < 1 || (q < 1.1 && ck) ? 1 : 2);
        const TT = band === 0 ? ROOM_LIT[tod] : band === 1 ? ROOM_HALF[tod] : T;
        if (!TT) continue;
        const P = tint(d[i], d[i + 1], d[i + 2], TT);
        d[i] = P[0]; d[i + 1] = P[1]; d[i + 2] = P[2];
      }
    ctx.putImageData(im, 0, 0);
  };
}

// ---------- 책 그리기 ----------
function px(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col; c.fillRect(x, y, w, h);
}
export function drawCover(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, b: RoomBook) {
  const L = b.look;
  px(c, x, y, w, h, L.c1); c.fillStyle = L.c2;
  if (L.pat === 'band') c.fillRect(x, y + Math.round(h * .58), w, Math.max(1, Math.round(h * .18)));
  else if (L.pat === 'circle') {
    const cx = w / 2, cy = h * .58, r = w * .3;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dx = i + .5 - cx, dy = j + .5 - cy; if (dx * dx + dy * dy <= r * r) c.fillRect(x + i, y + j, 1, 1); }
  } else if (L.pat === 'split') { for (let j = 0; j < h; j++) { const len = Math.round(w * j / h); c.fillRect(x + w - len, y + j, len, 1); } }
  else if (L.pat === 'grid') { const s = Math.max(1, Math.round(w / 7)); for (let j = Math.round(h * .38); j < h - s; j += s * 2) for (let i = s; i < w - s; i += s * 2) c.fillRect(x + i, y + j, s, s); }
  else if (L.pat === 'stripe') { const s = Math.max(1, Math.round(w / 8)), t = Math.round(h * .32); for (let i = 0; i < w; i += s * 2) c.fillRect(x + i, y + t, s, h - t); }
  else if (L.pat === 'frame') { const m = Math.max(1, Math.round(w * .12)); c.fillRect(x + m, y + m, w - 2 * m, h - 2 * m); px(c, x + 2 * m, y + 2 * m, w - 4 * m, h - 4 * m, L.c1); }
  const tw = Math.max(2, Math.round(w * .62)), th = Math.max(1, Math.round(h * .07)), tx = x + Math.max(1, Math.round(w * .14)), ty = y + Math.max(1, Math.round(h * .1));
  px(c, tx, ty, tw, th, L.tc); px(c, tx, ty + th * 2, Math.max(1, Math.round(tw * .6)), Math.max(1, Math.round(th * .7)), L.tc);
  if (b.format === 'ebook') px(c, x, y + h - 1, w, 1, EBOOK_MARK);
}
function drawSpine(c: CanvasRenderingContext2D, p: Placed) {
  const { x, y, w, h, book: b } = p, L = b.look;
  px(c, x, y, w, h, L.c1); px(c, x, y + 2, w, 2, L.c2);
  const tx = x + Math.floor((w - 1) / 2), len = Math.min(h - 9, Math.max(3, b.title.length + 1)), skip = b.vol ? b.vol % 3 : 2;
  c.fillStyle = L.tc;
  for (let i = 0; i < len; i++) if (i % 3 !== skip) c.fillRect(tx, y + 5 + i, 1, 1);
  px(c, x, y + h - 3, w, 1, L.c2);
  if (b.format === 'ebook') { px(c, x, y, w, 1, EBOOK_MARK); px(c, x, y + h - 1, w, 1, EBOOK_MARK); }
  if (w >= 3) px(c, x + w - 1, y, 1, h, 'rgba(0,0,0,0.28)');
}

// ---------- 방 합성 ----------
export interface Hit { book?: RoomBook; empty?: boolean; brag?: boolean; x: number; y: number; w: number; h: number }
export interface World {
  li: number; level: ArtLevel; theme: ThemeKey; tod: Tod;
  back: HTMLCanvasElement; front: HTMLCanvasElement; lights: Light[];
  hits: Hit[]; overflow: number; bragSlots: number;
}
const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!;

export function createRenderer(la: LoadedArt) {
  const { art, img } = la;
  const shade = makeShader(art.pal);
  const avCache = new Map<string, HTMLCanvasElement>();

  function renderWorld(st: RoomState): World {
    const n = st.books.length;
    const { li, placed, overflow } = pickLevel(art, st.books);
    const L = art.levels[li];
    const theme = st.theme ?? autoTheme(st.books), tod = st.tod ?? autoTod();
    const on = (id: ItemId) => itemOn(art, id, n, st.itemsOff);
    const vOk = (it: { id: ItemId; var?: string }) => !it.var || it.var === pickedVar(art, it.id, st.picks);
    const back = canvas(L.W, L.H), x = ctx2d(back);
    x.drawImage(img(L.bg[theme] ?? L.bg.attic), 0, 0);
    // 책: 배경의 책장 뒷판 색(70,44,32) 픽셀에만 그린다 → 사다리·계단이 책 앞에 남는다
    const bg = x.getImageData(0, 0, L.W, L.H), bc = canvas(L.W, L.H), bx = ctx2d(bc);
    placed.forEach((p) => drawSpine(bx, p));
    const bd = bx.getImageData(0, 0, L.W, L.H).data, gd = bg.data;
    for (let i = 0; i < gd.length; i += 4)
      if (bd[i + 3] && gd[i] === 70 && gd[i + 1] === 44 && gd[i + 2] === 32) { gd[i] = bd[i]; gd[i + 1] = bd[i + 1]; gd[i + 2] = bd[i + 2]; }
    x.putImageData(bg, 0, 0);
    // 창밖 풍경은 책 처리 뒤에
    const winImgs = L.win.map((w) => ({ w, im: img((w.img[theme] ?? w.img.attic)[tod]) }));
    winImgs.forEach(({ w, im }) => x.drawImage(im, w.x, w.y));
    // 자랑 책장
    const hits: Hit[] = placed.map((p) => ({ book: p.book, x: p.x, y: p.y, w: p.w, h: p.h }));
    const bl = bragList(st.books);
    let k = 0, bragSlots = 0;
    for (const [x0, yb, cnt] of L.brag) {
      bragSlots += cnt;
      for (let j = 0; j < cnt; j++, k++) {
        const cx = x0 + j * 19, cy = yb - 21, b = bl[k];
        if (b) { px(x, cx, cy, 16, 21, '#1b1626'); drawCover(x, cx + 1, cy + 1, 14, 19, b); hits.push({ book: b, brag: true, x: cx, y: cy, w: 16, h: 21 }); }
        else { x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1; x.strokeRect(cx + .5, cy + .5, 15, 20); hits.push({ empty: true, x: cx, y: cy, w: 16, h: 21 }); }
      }
    }
    // 아이템: 벽 → 바닥(발 위치 기준 앞뒤)
    const front = canvas(L.W, L.H), fx = ctx2d(front);
    const wallItems = L.items.filter((it) => on(it.id) && vOk(it) && it.kind === 'wall');
    wallItems.forEach((it) => x.drawImage(img(it.img), it.x, it.y));
    L.items.filter((it) => on(it.id) && vOk(it) && it.kind === 'floor').sort((a, b) => a.base - b.base)
      .forEach((it) => (it.base >= L.foot[1] ? fx : x).drawImage(img(it.img), it.x, it.y));
    // 방의 시간(창 유리 제외)
    const lights = L.lights.filter((l) => on(l.id) && (!l.shape || l.shape === pickedVar(art, l.id, st.picks)?.[0]));
    if (tod !== '낮') {
      const wm = canvas(L.W, L.H), wx = ctx2d(wm);
      winImgs.forEach(({ w, im }) => wx.drawImage(im, w.x, w.y));
      wx.globalCompositeOperation = 'destination-out';
      wallItems.forEach((it) => wx.drawImage(img(it.img), it.x, it.y));
      shade(x, L.W, L.H, tod, lights, wx.getImageData(0, 0, L.W, L.H).data);
      shade(fx, L.W, L.H, tod, lights, null);
    }
    return { li, level: L, theme, tod, back, front, lights, hits, overflow, bragSlots };
  }

  function avatar(w: World, hair: number, outfit: number, breath: 0 | 1) {
    const A = art.avatar, sx = (outfit * 2 + breath) * A.w, sy = hair * A.h;
    const fx = w.level.foot[0] - A.w / 2, fy = w.level.foot[1] - A.h + 1;
    const key = [sx, sy, w.tod, fx, fy, w.lights.map((l) => l.id).join()].join('|');
    let c = avCache.get(key);
    if (!c) {
      c = canvas(A.w, A.h);
      const x = ctx2d(c);
      x.drawImage(img(A.img), sx, sy, A.w, A.h, 0, 0, A.w, A.h);
      shade(x, A.w, A.h, w.tod, w.lights, null, fx, fy, 1); // 얼굴이 회색으로 죽지 않게 최소 중간 밝기
      if (avCache.size > 64) avCache.clear();
      avCache.set(key, c);
    }
    return c;
  }

  /** 화면 캔버스에 방 + 캐릭터 + 앞쪽 가구를 s배로 그린다 */
  function composite(ctx: CanvasRenderingContext2D, w: World, s: number, hair: number, outfit: number, breath: 0 | 1) {
    const L = w.level, A = art.avatar;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(w.back, 0, 0, L.W * s, L.H * s);
    ctx.drawImage(avatar(w, hair, outfit, breath), 0, 0, A.w, A.h, (L.foot[0] - A.w / 2) * s, (L.foot[1] - A.h + 1) * s, A.w * s, A.h * s);
    ctx.drawImage(w.front, 0, 0, L.W * s, L.H * s);
  }
  return { art, renderWorld, composite };
}
