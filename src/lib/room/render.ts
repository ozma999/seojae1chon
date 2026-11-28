'use client';
// 브라우저 전용: 방 그림을 캔버스에 합성한다(프로토타입 v0.6과 같은 순서).
import type { ArtLevel, ArtManifest, ItemId, RoomBook, RoomState, ThemeKey, Tod } from './types';
import { autoTheme, bragList, itemOn, pickLevel, pickedVar, type Placed } from './logic';
import { autoTod } from './time';
import { EBOOK_MARK } from './look';
import { parseGarden, placeGarden, type PlantsData } from './garden';

export interface LoadedArt {
  art: ArtManifest;
  /** 식물 정원(public/art/plants.json). 못 받으면 null — 방은 식물 없이 그린다 */
  plants: PlantsData | null;
  img: (path: string) => HTMLImageElement;
  /** 필요한 그림만 받아 둔다(이미 받은 건 건너뜀) */
  need: (paths: Iterable<string>) => Promise<void>;
}
/**
 * 그림 목록(manifest)만 먼저 받고, 그림은 지금 방에 필요한 것만 그때그때 받는다.
 * (예전에는 모든 방·스타일·꾸미기 모양 340여 장을 처음에 한꺼번에 받았다)
 */
export async function loadArt(base = '/art'): Promise<LoadedArt> {
  const [art, plants]: [ArtManifest, PlantsData | null] = await Promise.all([
    fetch(`${base}/manifest.json`).then((r) => r.json()),
    fetch(`${base}/plants.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  // 예전 '화분' 아이템(50권)은 식물 정원으로 바뀌었다
  art.itemdefs = art.itemdefs.filter((d) => d.id !== 'plant');
  art.levels.forEach((L) => { L.items = L.items.filter((it) => it.id !== 'plant'); });
  const map = new Map<string, HTMLImageElement>(), pending = new Map<string, Promise<void>>();
  const one = (p: string) => {
    let pr = pending.get(p);
    if (!pr) {
      pr = new Promise<void>((ok, bad) => {
        const im = new Image();
        im.onload = () => { map.set(p, im); ok(); };
        im.onerror = () => { pending.delete(p); bad(new Error('art load failed: ' + p)); };
        im.src = `${base}/${p}`;
      });
      pending.set(p, pr);
    }
    return pr;
  };
  const need = async (paths: Iterable<string>) => { await Promise.all([...new Set(paths)].map(one)); };
  await need([art.avatar.img]);
  return { art, plants, img: (p) => map.get(p)!, need };
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
/** 바닥 물건 한 개(시간대 그늘까지 입힌 조각). base = 바닥에 닿는 y(앞뒤 순서) */
export interface FloorPiece { id: string; c: HTMLCanvasElement; x: number; y: number; base: number; w: number }
/** 캐릭터 한 프레임: x,y = 발 위치(방 좌표) */
export interface ActorDraw { src: HTMLCanvasElement; x: number; y: number; flip?: boolean; base?: number }
export interface World {
  li: number; level: ArtLevel; theme: ThemeKey; tod: Tod;
  /** 벽·책·벽 물건(바닥 물건 제외) */
  back: HTMLCanvasElement; floor: FloorPiece[]; lights: Light[];
  /** 지금 켜진 바닥 물건 자리(캐릭터가 피해 간다) [x0,y0,x1,y1] */
  blocks: [number, number, number, number][];
  /** 들를 곳(물건이 켜져 있을 때만) */
  poi: NonNullable<ArtLevel['walk']>['poi'];
  /** 샹들리에 효과 자리(켜져 있을 때) */
  fx: { glow: [number, number][]; sparkle: [number, number][] } | null;
  hits: Hit[]; overflow: number; bragSlots: number;
}
const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!;

export function createRenderer(la: LoadedArt) {
  const { art, img, plants } = la;
  const gardenOf = (li: number, st: RoomState) => (plants ? placeGarden(plants, li, parseGarden(st.picks)) : []);
  /** 이 상태의 방을 그리는 데 필요한 그림을 받아 둔다(renderWorld 전에 부른다) */
  async function prepare(st: RoomState) {
    const { li } = pickLevel(art, st.books), L = art.levels[li];
    const theme = st.theme ?? autoTheme(st.books), tod = st.tod ?? autoTod();
    const on = (id: ItemId) => itemOn(art, id, st.books.length, st.itemsOff);
    const paths = [L.bg[theme] ?? L.bg.attic, ...L.win.map((w) => (w.img[theme] ?? w.img.attic)[tod]),
      ...L.items.filter((it) => on(it.id) && (!it.var || it.var === pickedVar(art, it.id, st.picks))).map((it) => it.img),
      ...gardenOf(li, st).map((g) => g.plant.img)];
    await la.need(paths);
  }
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
    // 아이템: 벽 물건은 배경에, 바닥 물건은 한 개씩 따로(캐릭터와 앞뒤를 매번 정한다)
    const wallItems = L.items.filter((it) => on(it.id) && vOk(it) && it.kind === 'wall');
    wallItems.forEach((it) => x.drawImage(img(it.img), it.x, it.y));
    // 식물 정원: 벽·책장 위·천장·난간 식물은 배경에, 바닥 식물은 바닥 물건처럼 따로
    const garden = gardenOf(li, st), backPlants = garden.filter((g) => g.layer === 'back');
    backPlants.forEach((g) => x.drawImage(img(g.plant.img), g.x, g.y));
    const lights = L.lights.filter((l) => on(l.id) && (!l.shape || l.shape === pickedVar(art, l.id, st.picks)?.[0]));
    const floorItems = L.items.filter((it) => on(it.id) && vOk(it) && it.kind === 'floor');
    const floor: FloorPiece[] = floorItems.map((it) => {
      const im = img(it.img), c = canvas(im.width, im.height), cx = ctx2d(c);
      cx.drawImage(im, 0, 0);
      if (tod !== '낮') shade(cx, im.width, im.height, tod, lights, null, it.x, it.y);
      return { id: it.id, c, x: it.x, y: it.y, base: it.base, w: im.width };
    });
    const plantFloor = garden.filter((g) => g.layer === 'floor');
    for (const g of plantFloor) {
      const im = img(g.plant.img), c = canvas(im.width, im.height), cx = ctx2d(c);
      cx.drawImage(im, 0, 0);
      if (tod !== '낮') shade(cx, im.width, im.height, tod, lights, null, g.x, g.y);
      floor.push({ id: 'plant:' + g.plant.id, c, x: g.x, y: g.y, base: g.base, w: im.width });
    }
    // 방의 시간(창 유리 제외)
    if (tod !== '낮') {
      const wm = canvas(L.W, L.H), wx = ctx2d(wm);
      winImgs.forEach(({ w, im }) => wx.drawImage(im, w.x, w.y));
      wx.globalCompositeOperation = 'destination-out';
      wallItems.forEach((it) => wx.drawImage(img(it.img), it.x, it.y));
      backPlants.forEach((g) => wx.drawImage(img(g.plant.img), g.x, g.y));   // 창 앞에 걸린 식물도 시간대 그늘을 받는다
      shade(x, L.W, L.H, tod, lights, wx.getImageData(0, 0, L.W, L.H).data);
    }
    // 납작한 러그(base 0)는 밟고 지나간다
    const blocks = floor.filter((f) => f.base > 0 && !f.id.startsWith('plant:')).map((f) => [f.x - 3, f.base - 7, f.x + f.w + 3, f.base + 3] as [number, number, number, number]);
    // 바닥 식물은 화분 폭만큼만 막는다(잎은 위로 퍼져 있어 지나갈 수 있다)
    const grounded = plantFloor.filter((g) => g.slot.kind !== 'top');   // 책 더미 위 작은 화분은 길을 막지 않는다
    for (const g of grounded) {
      const half = (g.plant.foot ?? g.plant.w / 3) / 2 + 2, cx = g.slot.x;
      blocks.push([cx - half, g.base - 6, cx + half, g.base + 3]);
    }
    const need: Record<string, ItemId> = { sofa: 'chair' };
    const poi = (L.walk?.poi ?? []).filter((q) => q.kind !== 'plant' && (!need[q.kind] || on(need[q.kind])));
    // 바닥 식물 옆에 서서 바라보기
    for (const g of grounded) {
      const half = (g.plant.foot ?? 20) / 2, right = g.slot.x > L.W / 2;
      poi.push({ kind: 'plant', x: Math.round(g.slot.x + (right ? -half - 14 : half + 14)), y: g.base, face: right ? 'right' : 'left' });
    }
    const fx = on('pendant') ? L.fx?.pendant?.[pickedVar(art, 'pendant', st.picks) ?? 'a'] ?? null : null;
    return { li, level: L, theme, tod, back, floor, lights, blocks, poi, fx, hits, overflow, bragSlots };
  }

  /** 예전 정면 캐릭터 시트(공유 카드·움직임 끔일 때) */
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
  const staticActors = (w: World, hair: number, outfit: number, breath: 0 | 1): ActorDraw[] =>
    [{ src: avatar(w, hair, outfit, breath), x: w.level.foot[0], y: w.level.foot[1] }];
  /** 걸어 다니는 캐릭터 프레임 한 장(시간대 그늘 입힘, 위치는 8px 단위로 캐시) */
  function actorFrame(w: World, sheet: HTMLImageElement, fw: number, fh: number, frame: number, x: number, y: number) {
    const gx = Math.round(x / 8) * 8, gy = Math.round(y / 8) * 8;
    const key = [sheet.src, frame, w.tod, gx, gy, w.lights.map((l) => l.id + l.x).join()].join('|');
    let c = avCache.get(key);
    if (!c) {
      c = canvas(fw, fh);
      const cx = ctx2d(c);
      cx.drawImage(sheet, frame * fw, 0, fw, fh, 0, 0, fw, fh);
      if (w.tod !== '낮') shade(cx, fw, fh, w.tod, w.lights, null, gx - fw / 2, gy - fh + 1, 1);
      if (avCache.size > 400) avCache.clear();
      avCache.set(key, c);
    }
    return c;
  }

  /** 화면 캔버스에 방 + (바닥 물건·캐릭터를 발 위치 순서로) s배로 그린다 */
  function composite(ctx: CanvasRenderingContext2D, w: World, s: number, actors: ActorDraw[], t = -1) {
    const L = w.level;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(w.back, 0, 0, L.W * s, L.H * s);
    drawFx(ctx, w, s, t);
    type D = { base: number; draw: () => void };
    const list: D[] = w.floor.map((f) => ({ base: f.base, draw: () => ctx.drawImage(f.c, f.x * s, f.y * s, f.c.width * s, f.c.height * s) }));
    for (const a of actors) list.push({ base: a.base ?? a.y, draw: () => {
      const fw = a.src.width, fh = a.src.height, dx = (a.x - fw / 2) * s, dy = (a.y - fh + 1) * s;
      if (a.flip) { ctx.save(); ctx.translate(dx + fw * s, dy); ctx.scale(-1, 1); ctx.drawImage(a.src, 0, 0, fw * s, fh * s); ctx.restore(); }
      else ctx.drawImage(a.src, dx, dy, fw * s, fh * s);
    } });
    // 같은 높이면 물건 먼저(캐릭터가 앞)
    list.sort((p, q) => p.base - q.base).forEach((d) => d.draw());
  }
  /**
   * 샹들리에 효과. 저녁·밤·새벽에는 촛불·전구 둘레가 은은하게 빛나고(촛불은 살짝 일렁임),
   * 크리스탈은 2.4초마다 구슬 두 개가 반짝인다. t < 0 이면(동작 줄이기) 일렁임·반짝임 없이 빛만.
   */
  function drawFx(ctx: CanvasRenderingContext2D, w: World, s: number, t: number) {
    if (!w.fx) return;
    const dot = (x: number, y: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x * s, y * s, s, s); };
    if (w.tod !== '낮') {
      w.fx.glow.forEach(([x, y], i) => {
        const dim = t >= 0 && Math.floor(t * 3 + i * 1.7) % 5 === 0;      // 가끔 한 번씩 작아지는 일렁임
        const r = dim ? 3 : 4;
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++) {
            const d = Math.abs(dx) + Math.abs(dy);
            if (!d || d > r) continue;
            if (d === 1) dot(x + dx, y + dy, 'rgba(255,236,170,0.85)');
            else if (d === 2 && (x + y + dx + dy) % 2 === 0) dot(x + dx, y + dy, 'rgba(242,196,107,0.6)');
            else if (d === 3 && (x + y + dx + dy) % 2 === 0) dot(x + dx, y + dy, 'rgba(242,196,107,0.4)');
            else if (d === 4 && (x + dx) % 2 === 0 && (y + dy) % 2 === 0) dot(x + dx, y + dy, 'rgba(242,196,107,0.25)');
          }
        dot(x, y, '#fff6d8');
      });
    }
    const sp = w.fx.sparkle;
    if (t >= 0 && sp.length) {
      const slot = Math.floor(t / 2.4), ph = t - slot * 2.4;
      if (ph < 0.4) {
        const peak = ph >= 0.12 && ph <= 0.28, arm = peak ? 3 : 2;
        for (let k = 0; k < 3; k++) {
          const [x, y] = sp[(slot * 7919 + k * 104729) % sp.length];
          dot(x, y, '#ffffff');
          for (let a = 1; a <= arm; a++) {
            const c = a === arm ? 'rgba(255,255,255,0.6)' : '#ffffff';
            dot(x - a, y, c); dot(x + a, y, c); dot(x, y - a, c); dot(x, y + a, c);
          }
          if (peak) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) dot(x + dx, y + dy, 'rgba(255,255,255,0.7)');
        }
      }
    }
  }
  /**
   * 목표 크기(기기 픽셀)에 맞춰 그리기. 픽셀 그림을 1.5배·2.3배처럼 어중간한 배율로 늘리면
   * 1px 선이 어떤 곳은 1칸, 어떤 곳은 2칸이 되어 스탠드 봉·소파 윤곽이 깨져 보인다.
   * → 배율이 정수에 가까우면 그대로, 아니면 한 단계 큰 정수 배로 그린 뒤 부드럽게 줄인다(모든 선이 같은 굵기)
   */
  let off: HTMLCanvasElement | null = null;
  function compositeFit(ctx: CanvasRenderingContext2D, w: World, tw: number, th: number, actors: ActorDraw[], t = -1) {
    const L = w.level, sc = tw / L.W, k = Math.round(sc);
    if (k >= 1 && Math.abs(sc - k) < 0.08) { composite(ctx, w, sc, actors, t); return; }
    const K = Math.ceil(sc);
    off ??= document.createElement('canvas');
    if (off.width !== L.W * K || off.height !== L.H * K) { off.width = L.W * K; off.height = L.H * K; }
    const o = off.getContext('2d')!;
    o.clearRect(0, 0, off.width, off.height);
    composite(o, w, K, actors, t);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, tw, th);
    ctx.imageSmoothingEnabled = false;
  }
  return { art, plants, prepare, renderWorld, composite, compositeFit, staticActors, actorFrame };
}
