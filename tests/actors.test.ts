import { describe, expect, it } from 'vitest';
import { Grid, Sim, frameOf, type Floor } from '@/lib/room/actors';

const floor: Floor = {
  W: 200, H: 120, poly: [[10, 40], [190, 40], [195, 115], [5, 115]],
  blocks: [[80, 60, 120, 90]],
  poi: [{ kind: 'sofa', x: 150, y: 70, face: 'front' }, { kind: 'window', x: 100, y: 44, face: 'back' }],
};
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('바닥 격자·길 찾기', () => {
  const g = new Grid(floor);
  it('물건 자리와 바닥 밖은 못 간다', () => {
    expect(g.free(...g.cell(100, 75))).toBe(false);
    expect(g.free(...g.cell(100, 20))).toBe(false);
    expect(g.free(...g.cell(40, 80))).toBe(true);
  });
  it('물건을 돌아서 간다', () => {
    const p = g.path(60, 75, 140, 75)!;
    expect(p.length).toBeGreaterThan(1);
    for (const [x, y] of p) expect(g.free(...g.cell(x, y))).toBe(true);
    expect(Math.hypot(p[p.length - 1][0] - 140, p[p.length - 1][1] - 75)).toBeLessThan(6);
  });
});

describe('행동', () => {
  it('처음 5초는 가만히, 그 뒤에 움직인다', () => {
    seed = 3;
    const s = new Sim(floor, [{ id: 'me', x: 40, y: 80 }], { rnd });
    for (let i = 0; i < 40; i++) s.step(0.12);
    expect(s.actors[0].mode).toBe('idle');
    expect(s.actors[0].x).toBe(40);
    for (let i = 0; i < 20; i++) s.step(0.12);
    expect(s.actors[0].mode).not.toBe('idle');
  });
  it('오래 돌려도 바닥 밖으로 나가지 않고, 소파에 앉기도 한다', () => {
    seed = 7;
    const s = new Sim(floor, [{ id: 'me', x: 40, y: 80 }], { rnd });
    const g = new Grid(floor); let sat = false;
    for (let i = 0; i < 6000; i++) {
      s.step(0.12);
      const a = s.actors[0];
      if (a.mode === 'sit') { sat = true; continue; }
      expect(g.free(...g.cell(a.x, a.y)) || g.nearest(a.x, a.y) !== null).toBe(true);
      expect(a.x).toBeGreaterThan(0); expect(a.x).toBeLessThan(200);
    }
    expect(sat).toBe(true);
  });
  it('두 명이면 언젠가 말풍선을 주고받는다', () => {
    seed = 11;
    const s = new Sim(floor, [{ id: 'host', x: 40, y: 80 }, { id: 'me', x: 70, y: 86 }], { rnd, lines: () => ['안녕!', '반가워'] });
    let said = new Set<string>();
    for (let i = 0; i < 8000 && said.size < 2; i++) { s.step(0.12); for (const a of s.actors) { const b = s.bubble(a); if (b) said.add(b); } }
    expect([...said].sort()).toEqual(['반가워', '안녕!']);
  });
  it('프레임 이름', () => {
    const s = new Sim(floor, [{ id: 'me', x: 40, y: 80 }], { rnd });
    expect(frameOf(s.actors[0], 0).name).toBe('front_stand');
  });
});
