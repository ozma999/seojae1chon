import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import type { ArtManifest, RoomBook } from '@/lib/room/types';
import { autoTheme, bragTopGenre, fillSlots, nextItem, pickLevel, shelfOrder, spineW } from '@/lib/room/logic';
import { defaultLook } from '@/lib/room/look';
import { autoTod, sunTimes } from '@/lib/room/time';

const art: ArtManifest = JSON.parse(fs.readFileSync('public/art/manifest.json', 'utf8'));
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const book = (i: number, o: Partial<RoomBook> = {}): RoomBook => ({
  id: 'b' + i, title: '책' + i, pages: 120 + Math.floor(rnd() * 500), hardcover: rnd() < 0.15, size: 'mid', format: 'paper',
  genre: 'lit', look: defaultLook('b' + i), bragAt: null, ...o,
});
const many = (n: number) => Array.from({ length: n }, (_, i) => book(i));

describe('방 단계', () => {
  it('수용량이 manifest의 cap(파이썬 계산)과 비슷하다', () => {
    for (const L of art.levels) {
      seed = 1;
      const r = fillSlots(L, many(L.cap + 400));
      const cap = r.placed.length + L.sidecap;
      expect(Math.abs(cap - L.cap) / L.cap).toBeLessThan(0.05);
    }
  });
  it('책 수에 따라 Lv.1→4', () => {
    expect(pickLevel(art, many(0)).li).toBe(0);
    expect(pickLevel(art, many(60)).li).toBe(0);
    expect(pickLevel(art, many(200)).li).toBe(1);
    expect(pickLevel(art, many(600)).li).toBe(2);
    expect(pickLevel(art, many(1500)).li).toBe(3);
    const r = pickLevel(art, many(3000));
    expect(r.li).toBe(3);
    expect(r.overflow).toBeGreaterThan(0);
  });
  it('자랑 책장 책은 일반 책장에서 빠진다', () => {
    const bs = [book(1), book(2, { bragAt: 5 })];
    expect(shelfOrder(bs).map((b) => b.id)).toEqual(['b1']);
  });
  it('책등 폭 2~4px', () => {
    expect(spineW(book(1, { pages: 50 }))).toBe(2);
    expect(spineW(book(1, { pages: 900, hardcover: true }))).toBe(4);
    expect(spineW(book(1, { pages: null }))).toBe(3);
  });
});

describe('대표 책 테마', () => {
  it('다수결, 동률이면 최근', () => {
    expect(autoTheme([book(1)])).toBe('attic');
    expect(bragTopGenre([book(1, { genre: 'sf', bragAt: 1 }), book(2, { genre: 'hum', bragAt: 2 })])).toBe('hum');
    expect(autoTheme([book(1, { genre: 'sf', bragAt: 3 }), book(2, { genre: 'hum', bragAt: 2 })])).toBe('space');
    expect(autoTheme([book(1, { genre: 'manga', bragAt: 1 }), book(2, { genre: 'manga', bragAt: 2 }), book(3, { genre: 'sf', bragAt: 9 })])).toBe('manga');
  });
  it('기본 스탠드는 책 0권부터, 다음 아이템 계산에는 안 걸림', () => {
    expect(art.itemdefs[0]).toMatchObject({ id: 'desklamp', th: 0 });
    expect(art.levels.every((L) => L.items.some((i) => i.id === 'desklamp') && L.lights.some((l) => l.id === 'desklamp'))).toBe(true);
  });
  it('다음 아이템', () => {
    expect(nextItem(art, 0)?.id).toBe('rug');
    expect(nextItem(art, 650)?.id).toBe('ladder');
    expect(nextItem(art, 5000)).toBeNull();
  });
});

describe('방의 시간', () => {
  it('서울 해 뜨고 지는 시각(UTC, ±5분)', () => {
    const near = (d: Date, hh: number, mm: number) =>
      { const diff = (((d.getUTCHours() * 60 + d.getUTCMinutes() - (hh * 60 + mm)) % 1440) + 1440) % 1440;
        expect(Math.min(diff, 1440 - diff)).toBeLessThan(6); }
    const s = sunTimes(new Date(2026, 5, 21, 12));
    near(s.rise, 20, 11); near(s.set, 10, 57); // KST 05:11 / 19:57
    const w = sunTimes(new Date(2026, 11, 21, 12));
    near(w.rise, 22, 44); near(w.set, 8, 17); // KST 07:44 / 17:17
  });
  it('시간대 경계', () => {
    const { rise, set } = sunTimes(new Date(2026, 10, 21, 12));
    const at = (base: Date, min: number) => autoTod(new Date(base.getTime() + min * 60e3));
    expect(at(rise, -61)).toBe('밤');
    expect(at(rise, -59)).toBe('새벽');
    expect(at(rise, 31)).toBe('낮');
    expect(at(set, -44)).toBe('노을');
    expect(at(set, 31)).toBe('밤');
  });
});
