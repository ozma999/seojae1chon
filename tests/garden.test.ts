import { describe, expect, it } from 'vitest';
import { canPlant, hiddenEntries, levelSlots, parseGarden, placeGarden, seedsTotal, seedsUsed, serializeGarden, type PlantsData } from '../src/lib/room/garden';

const data: PlantsData = {
  seedEvery: 10,
  cats: [],
  plants: [
    { id: 'big', name: '큰', cat: 'L', seeds: 4, slot: 'floorL', img: '', w: 40, h: 100, ax: 20, ay: 98, unlock: 0, foot: 18 },
    { id: 'mid', name: '중', cat: 'M', seeds: 2, slot: 'floorM', img: '', w: 30, h: 50, ax: 15, ay: 48, unlock: 0, foot: 14 },
    { id: 'hang', name: '행잉', cat: 'H', seeds: 2, slot: 'hang', img: '', w: 30, h: 80, ax: 15, ay: 0, unlock: 0 },
    { id: 'tree', name: '상징목', cat: 'SYM', seeds: 20, slot: 'sym', img: '', w: 400, h: 400, ax: 200, ay: 398, unlock: 1000, foot: 100 },
    { id: 'tree2', name: '상징목2', cat: 'SYM', seeds: 20, slot: 'symTop', img: '', w: 300, h: 400, ax: 150, ay: 0, unlock: 1000 },
  ],
  slots: [
    { floor: [[10, 100, 'M']], hang: [[50, 10]] },
    { floor: [[10, 200, 'L'], [60, 200, 'M']], hang: [[50, 10]], sym: [[200, 300, 8]] },
  ],
};

describe('식물 정원', () => {
  it('picks.garden 문자열을 읽고 쓴다', () => {
    const g = parseGarden({ garden: 'big@floor0,hang@hang0' });
    expect(g).toEqual([{ p: 'big', s: 'floor0' }, { p: 'hang', s: 'hang0' }]);
    expect(serializeGarden(g)).toBe('big@floor0,hang@hang0');
    expect(parseGarden({})).toEqual([]);
  });
  it('10권마다 씨앗 1개, 심은 만큼 줄어든다', () => {
    expect(seedsTotal(data, 213)).toBe(21);
    expect(seedsUsed(data, parseGarden({ garden: 'big@floor0,mid@floor1' }))).toBe(6);
  });
  it('큰 화분은 큰 자리에만, 이 방에 없는 자리는 건너뛴다', () => {
    const g = parseGarden({ garden: 'big@floor0,mid@floor1,hang@hang0' });
    expect(placeGarden(data, 0, g).map((d) => d.plant.id)).toEqual(['hang']);       // 작은 방: M 자리뿐 + floor1 없음
    const L2 = placeGarden(data, 1, g);
    expect(L2.map((d) => d.plant.id).sort()).toEqual(['big', 'hang', 'mid']);
    const big = L2.find((d) => d.plant.id === 'big')!;
    expect([big.x, big.y, big.layer, big.base]).toEqual([10 - 20, 200 - 98, 'floor', 200]);
    expect(L2.find((d) => d.plant.id === 'hang')!.layer).toBe('back');
  });
  it('상징목은 1000권부터, 방마다 하나', () => {
    const t = data.plants[3];
    expect(canPlant(data, t, 999, [], 1).ok).toBe(false);
    expect(canPlant(data, t, 1000, [], 1).ok).toBe(true);
    expect(canPlant(data, data.plants[4], 2000, [{ p: 'tree', s: 'sym0' }], 1).why).toBe('상징목은 방마다 하나');
    expect(levelSlots(data, 1).map((s) => s.key)).toEqual(['floor0', 'floor1', 'hang0', 'sym0']);
    const top = placeGarden(data, 1, [{ p: 'tree2', s: 'sym0' }])[0];
    expect([top.y, top.layer]).toEqual([8, 'back']);   // 천장에서 내려오는 상징목
  });
  it('씨앗이 모자라면 못 심는다', () => {
    expect(canPlant(data, data.plants[0], 30, [], 1).why).toBe('씨앗 4개 필요');
  });
  it('자리가 없거나 맞지 않는 식물은 보관 중으로 보고, 그 자리를 막지 않는다', () => {
    const g = parseGarden({ garden: 'big@floor0,mid@floor1' });
    expect(hiddenEntries(data, 0, g)).toEqual(g);                  // 작은 방: floor0은 M 자리, floor1은 없음
    expect(hiddenEntries(data, 1, g)).toEqual([]);
    // 작은 방 floor0에 큰 화분이 '보관 중'이어도 중간 화분은 그 자리에 심을 수 있다
    expect(canPlant(data, data.plants[1], 100, [{ p: 'big', s: 'floor0' }], 0).ok).toBe(true);
  });
  it('바닥 물건 위 작은 화분은 그 물건과 앞뒤를 맞춘다', () => {
    const d2: PlantsData = { ...data, plants: [...data.plants, { id: 's', name: '작은', cat: 'S', seeds: 1, slot: 'top', img: '', w: 10, h: 16, ax: 5, ay: 14, unlock: 0 }],
      slots: [{ top: [[50, 40], [80, 60, 75]] }] };
    const [a, b] = placeGarden(d2, 0, [{ p: 's', s: 'top0' }, { p: 's', s: 'top1' }]);
    expect([a.layer, b.layer, b.base]).toEqual(['back', 'floor', 75.5]);
  });
});
