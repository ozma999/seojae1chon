'use client';
// 공유 카드 4종(9:16, 1080×1920). 브랜드 A 색, 갈무리 제목, 실제 방 그림
import type { LibraryEntry, Profile } from '../data/types';
import type { RoomBook, RoomState, Tod } from '../room/types';
import { createRenderer, drawCover } from '../room/render';
import { GENRE_NAME, autoTheme, bragList, bragTopGenre, pickedTheme } from '../room/logic';
import { shelfTitle, towerInfo } from '../room/stats';
import { wrapChars } from './text';
import { hm, sunTimes } from '../room/time';

export type CardType = 'count' | 'brag' | 'concept' | 'interior';
export const CARD_NAMES: Record<CardType, string> = { count: '보유량', brag: '자랑 책장', concept: '컨셉', interior: '인테리어' };
const W = 1080, H = 1920, M = 80;
const C = { bg: '#f5ecd8', panel: '#fcf8ef', line: '#d8c7a6', ink: '#2e1f1a', muted: '#6e4b35', pri: '#2f5a86', acc: '#8a5212' };
const GENRE_COL = { lit: '#cc4a3c', sf: '#2c447e', manga: '#b48834', hum: '#3a6e44' } as const;
const PX = (s: number) => `700 ${s}px GalmuriCard, sans-serif`;
const SANS = (s: number, w = 400) => `${w} ${s}px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;

let fontReady: Promise<unknown> | null = null;
function loadFont() {
  return (fontReady ??= (async () => {
    const f = new FontFace('GalmuriCard', 'url(/fonts/Galmuri11-Bold.woff2)');
    document.fonts.add(await f.load());
  })().catch(() => {}));
}
const img = (src: string) => new Promise<HTMLImageElement | null>((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });

/** 표지: 같은 출처로 받아 작게 줄였다가 키워 픽셀로. 사진이 없으면 책 모양 그림 */
async function pixelCover(e: LibraryEntry, book: RoomBook, w: number, h: number) {
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const o = out.getContext('2d')!; o.imageSmoothingEnabled = false;
  const small = document.createElement('canvas'); small.width = 28; small.height = 40;
  const s = small.getContext('2d')!;
  const photo = e.coverUrl ? await img(`/api/cover?u=${encodeURIComponent(e.coverUrl)}`) : null;
  if (photo) s.drawImage(photo, 0, 0, 28, 40);
  else drawCover(s, 0, 0, 28, 40, book);
  o.drawImage(small, 0, 0, w, h);
  return out;
}

export interface CardData {
  type: CardType; profile: Profile; entries: LibraryEntry[]; books: RoomBook[]; tod: Tod; now: Date;
  renderer: ReturnType<typeof createRenderer>;
}

export async function drawCard(d: CardData): Promise<HTMLCanvasElement> {
  await loadFont();
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
  c.textBaseline = 'alphabetic';
  // 머리: 로고 + 서재 이름
  const logo = await img('/brand/logo-h-light-v3.png');
  c.imageSmoothingEnabled = false;
  if (logo) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(logo, M, 60, 330, 96); c.imageSmoothingEnabled = false; }
  c.fillStyle = C.muted; c.font = SANS(36); c.textAlign = 'right'; c.fillText(d.profile.roomName, W - M, 132); c.textAlign = 'left';
  // 꼬리
  c.fillStyle = C.line; c.fillRect(M, H - 150, W - 2 * M, 3);
  c.fillStyle = C.muted; c.font = SANS(32); c.fillText('서재일촌 · 책이 쌓일수록 넓어지는 픽셀 서재', M, H - 92);
  c.font = PX(30); c.fillStyle = C.pri; c.textAlign = 'right'; c.fillText(CARD_NAMES[d.type], W - M, H - 92); c.textAlign = 'left';

  // 방 스냅샷(현재 단계, 지금 시간대)
  const state: RoomState = { books: d.books, itemsOff: d.profile.itemsOff, hair: d.profile.hair, outfit: d.profile.outfit, theme: pickedTheme(d.profile.picks), tod: d.tod, picks: d.profile.picks };
  await d.renderer.prepare(state);
  const world = d.renderer.renderWorld(state);
  const roomAt = (x: number, y: number, w: number) => {
    const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = Math.round(world.level.H * (w / world.level.W));
    const tc = tmp.getContext('2d')!;
    d.renderer.compositeFit(tc, world, tmp.width, tmp.height, d.renderer.staticActors(world, d.profile.hair, d.profile.outfit, 0));
    c.fillStyle = C.ink; c.fillRect(x - 6, y - 6, w + 12, tmp.height + 12);
    c.drawImage(tmp, x, y);
    return tmp.height;
  };
  const n = d.entries.length, paper = d.entries.filter((e) => e.format === 'paper').length;
  const label = (t: string, y: number) => { c.fillStyle = C.muted; c.font = PX(44); c.fillText(t, M, y); };

  if (d.type === 'count') {
    label('보유량', 300);
    c.fillStyle = C.ink; c.font = PX(230); c.fillText(n.toLocaleString(), M - 6, 520);
    const nw = c.measureText(n.toLocaleString()).width;
    c.font = PX(90); c.fillText('권', M + nw + 16, 520);
    c.fillStyle = C.muted; c.font = SANS(40);
    c.fillText(`종이 ${paper.toLocaleString()} · 전자 ${(n - paper).toLocaleString()} · 실물 인증 ${d.entries.filter((e) => e.verified).length.toLocaleString()}`, M, 600);
    const t = towerInfo(d.entries);
    c.fillStyle = C.ink; c.font = PX(64); c.fillText(`쌓으면 ${t.m < 10 ? t.m.toFixed(1) : Math.round(t.m)}m`, M, 730);
    c.fillStyle = C.acc; c.font = SANS(40, 700);
    c.fillText(t.below.m > 0 ? `${t.below.name}(${t.below.m}m)보다 높아요` : '첫 책부터 쌓는 중', M, 795);
    // 방 그림은 아래 숫자 칸(170)과 꼬리(H-150) 사이에 들어가게 크기를 맞춘다
    const maxH = H - 190 - 170 - 50 - 880, rw = Math.min(W - 2 * M, Math.floor(maxH * world.level.W / world.level.H));
    const rh = roomAt(Math.round((W - rw) / 2), 880, rw);
    // 방 아래 작은 숫자 세 칸: 칭호 · 시리즈 · 자랑 책장
    const y0 = 880 + rh + 50, bw = (W - 2 * M - 40) / 3;
    const sers = new Set(d.entries.filter((e) => e.series).map((e) => e.series)).size;
    const cells: [string, string][] = [[shelfTitle(d.entries), '칭호'], [`${sers}개`, '시리즈'], [`${bragList(d.books).length}권`, '자랑 책장']];
    cells.forEach(([v, k], i) => {
      const x = M + i * (bw + 20);
      c.fillStyle = C.panel; c.fillRect(x, y0, bw, 170); c.fillStyle = C.line; c.fillRect(x, y0, bw, 3);
      c.fillStyle = C.ink; c.font = PX(i === 0 ? 34 : 56); c.textAlign = 'center';
      wrapChars(v, bw - 30, (s) => c.measureText(s).width, 2).forEach((l, j, a) => c.fillText(l, x + bw / 2, y0 + (a.length > 1 ? 70 : 92) + j * 42));
      c.fillStyle = C.muted; c.font = SANS(30); c.fillText(k, x + bw / 2, y0 + 145); c.textAlign = 'left';
    });
  }
  if (d.type === 'brag') {
    label('자랑 책장', 300);
    const bl = bragList(d.books).slice(0, 4);
    c.fillStyle = C.ink; c.font = SANS(44, 700);
    c.fillText(bl.length ? `${n.toLocaleString()}권 중에서 고른 ${bragList(d.books).length}권` : '자랑 책장이 비어 있어요', M, 380);
    let y = 450;
    for (const b of bl) {
      const e = d.entries.find((x) => x.id === b.id)!;
      const cov = await pixelCover(e, b, 210, 300);
      c.fillStyle = C.ink; c.fillRect(M - 5, y - 5, 220, 310); c.drawImage(cov, M, y);
      const tx = M + 250, tw = W - M - tx;
      c.fillStyle = C.ink; c.font = SANS(48, 700);
      const tl = wrapChars(e.title, tw, (s) => c.measureText(s).width, 2);
      tl.forEach((l, i) => c.fillText(l, tx, y + 50 + i * 60));
      c.fillStyle = C.muted; c.font = SANS(34);
      c.fillText([e.author, e.format === 'ebook' ? '전자책' : e.verified ? '실물 인증' : null].filter(Boolean).join(' · ').slice(0, 30), tx, y + 50 + tl.length * 60 + 4);
      if (e.bragText) {
        c.fillStyle = C.pri; c.font = SANS(38);
        wrapChars(`“${e.bragText}”`, tw, (s) => c.measureText(s).width, 3).forEach((l, i) => c.fillText(l, tx, y + 110 + tl.length * 60 + i * 50));
      }
      y += 350;
    }
    if (!bl.length) { c.fillStyle = C.muted; c.font = SANS(40); c.fillText('책을 눌러 \'자랑 책장에 꽂기\'를 해 보세요', M, 460); y = 520; }
    // 남는 자리에 방 그림(자랑 책장이 걸린 벽이 보인다)
    const space = H - 200 - (y + 30);
    if (space > 360) {
      const w = Math.min(W - 2 * M, Math.round(space * (world.level.W / world.level.H)));
      roomAt(Math.round((W - w) / 2), y + 30, w);
    }
  }
  if (d.type === 'concept') {
    label('컨셉', 300);
    c.fillStyle = C.pri; c.font = PX(96);
    wrapChars(shelfTitle(d.entries), W - 2 * M, (s) => c.measureText(s).width, 2).forEach((l, i) => c.fillText(l, M, 430 + i * 110));
    const cnt = (Object.keys(GENRE_NAME) as (keyof typeof GENRE_NAME)[]).map((g) => [g, d.entries.filter((e) => e.genre === g).length] as const).sort((a, b) => b[1] - a[1]);
    const top = cnt[0];
    c.fillStyle = C.ink; c.font = PX(150);
    c.fillText(`${n ? Math.round((top[1] / n) * 100) : 0}%`, M, 720);
    c.font = SANS(44, 700); c.fillText(`${GENRE_NAME[top[0]]} 비율`, M, 790);
    let y = 880;
    for (const [g, k] of cnt) {
      c.fillStyle = C.ink; c.font = SANS(40, 700); c.fillText(GENRE_NAME[g], M, y + 40);
      c.fillStyle = C.line; c.fillRect(M + 230, y + 6, 560, 44);
      c.fillStyle = GENRE_COL[g]; c.fillRect(M + 230, y + 6, Math.round(560 * (n ? k / n : 0)), 44);
      c.fillStyle = C.muted; c.font = SANS(36); c.textAlign = 'right'; c.fillText(k.toLocaleString(), W - M, y + 40); c.textAlign = 'left';
      y += 90;
    }
    roomAt(M + 160, 1280, W - 2 * M - 320);
  }
  if (d.type === 'interior') {
    label('인테리어', 300);
    const theme = d.renderer.art.themes[pickedTheme(d.profile.picks) ?? autoTheme(d.books)];
    const g = bragTopGenre(d.books);
    c.fillStyle = C.ink; c.font = PX(120); c.fillText(theme.name, M, 450);
    c.fillStyle = C.muted; c.font = SANS(40);
    c.fillText(g ? `자랑 책장의 ${GENRE_NAME[g]} 책이 고른 방` : '자랑 책장이 비어 기본 방', M, 520);
    const h = roomAt(M, 600, W - 2 * M);
    let y = 600 + h + 90;
    const sun = sunTimes(d.now);
    c.fillStyle = C.acc; c.font = SANS(38, 700); c.fillText(`지금 ${d.tod} · 오늘 해 짐 ${hm(sun.set)}`, M, y);
    y += 80;
    const bl = bragList(d.books).slice(0, 3);
    if (bl.length) {
      c.fillStyle = C.muted; c.font = PX(36); c.fillText('대표 책', M, y); y += 60;
      c.fillStyle = C.ink; c.font = SANS(40);
      for (const b of bl) { c.fillText(`· ${wrapChars(b.title, W - 2 * M - 40, (s) => c.measureText(s).width, 1)[0]}`, M, y); y += 58; }
    }
  }
  return cv;
}
