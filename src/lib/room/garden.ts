// 식물 정원 규칙(렌더링과 무관 — 꾸미기 화면·방 그림·테스트에서 함께 쓴다)
// 10권마다 씨앗 1개. 식물마다 씨앗 값이 있고, 방마다 정해진 자리(slot)에만 심는다.
// 저장: profile.picks.garden = "식물id@자리키,식물id@자리키" (예: "monstera@floor0,banyan@sym0")
//  → DB에 새 칸을 만들지 않고, 일촌이 방문해도 같은 picks로 그대로 보인다.

export type PlantCat = 'L' | 'M' | 'S' | 'H' | 'W' | 'G' | 'SYM';
/** 식물이 들어가는 자리: floorL = 바닥 큰 자리만, floorM = 바닥 아무 자리 */
export type PlantSlot = 'floorL' | 'floorM' | 'top' | 'hang' | 'wall' | 'rail' | 'railTop' | 'bed' | 'sym' | 'symTop';
export type SlotKind = 'floor' | 'top' | 'hang' | 'wall' | 'rail' | 'bed' | 'sym';

export interface PlantDef {
  id: string; name: string; cat: PlantCat; seeds: number; slot: PlantSlot;
  img: string; w: number; h: number;
  /** 기준점(스프라이트 안 좌표): 바닥에 놓는 건 화분 바닥, 매다는 건 끈 끝 */
  ax: number; ay: number;
  /** 이 책 수부터 심을 수 있다(온실·상징목 = 1000) */
  unlock: number;
  /** 바닥 식물의 화분 폭(캐릭터가 피해 간다) */
  foot?: number;
}
type XY = [number, number];
export interface LevelSlots {
  floor?: [number, number, 'L' | 'M'][];
  top?: XY[]; hang?: XY[]; wall?: XY[]; rail?: XY[]; bed?: XY[];
  sym?: [number, number, number][];
}
export interface PlantsData { plants: PlantDef[]; cats: { id: PlantCat; name: string }[]; slots: LevelSlots[]; seedEvery: number }

export interface Slot { key: string; kind: SlotKind; x: number; y: number; size?: 'L' | 'M'; top?: number }
export interface GardenEntry { p: string; s: string }

export const SLOT_KIND: Record<PlantSlot, SlotKind> = {
  floorL: 'floor', floorM: 'floor', top: 'top', hang: 'hang', wall: 'wall', rail: 'rail', railTop: 'rail', bed: 'bed', sym: 'sym', symTop: 'sym',
};

export function parseGarden(picks?: Record<string, string | number>): GardenEntry[] {
  const raw = picks?.garden;
  if (typeof raw !== 'string' || !raw) return [];
  return raw.split(',').map((t) => { const [p, s] = t.split('@'); return { p, s }; }).filter((e) => e.p && e.s);
}
export const serializeGarden = (g: GardenEntry[]) => g.map((e) => `${e.p}@${e.s}`).join(',');

export const seedsTotal = (data: PlantsData, books: number) => Math.floor(books / (data.seedEvery || 10));
export function seedsUsed(data: PlantsData, g: GardenEntry[]) {
  const by = new Map(data.plants.map((p) => [p.id, p.seeds]));
  return g.reduce((n, e) => n + (by.get(e.p) ?? 0), 0);
}

/** 방(레벨)의 모든 심는 자리 */
export function levelSlots(data: PlantsData, li: number): Slot[] {
  const L = data.slots[Math.min(li, data.slots.length - 1)] ?? {}, out: Slot[] = [];
  L.floor?.forEach(([x, y, size], i) => out.push({ key: `floor${i}`, kind: 'floor', x, y, size }));
  (['top', 'hang', 'wall', 'rail', 'bed'] as const).forEach((k) => L[k]?.forEach(([x, y], i) => out.push({ key: `${k}${i}`, kind: k, x, y })));
  L.sym?.forEach(([x, y, top], i) => out.push({ key: `sym${i}`, kind: 'sym', x, y, top }));
  return out;
}
export const fits = (p: PlantDef, s: Slot) =>
  SLOT_KIND[p.slot] === s.kind && (p.slot !== 'floorL' || s.size === 'L');

/** 심은 식물을 그릴 위치로: 이 방에 없는 자리·모르는 식물은 건너뛴다(저장은 그대로 — 방이 넓어지면 다시 보인다) */
export interface PlantDraw { plant: PlantDef; slot: Slot; x: number; y: number; layer: 'back' | 'floor'; base: number; order: number }
const BACK_ORDER: Record<SlotKind, number> = { wall: 0, top: 1, rail: 2, hang: 3, sym: 4, floor: 0, bed: 0 };
export function placeGarden(data: PlantsData, li: number, g: GardenEntry[]): PlantDraw[] {
  const slots = new Map(levelSlots(data, li).map((s) => [s.key, s])), defs = new Map(data.plants.map((p) => [p.id, p]));
  const used = new Set<string>(), out: PlantDraw[] = [];
  for (const e of g) {
    const p = defs.get(e.p), s = slots.get(e.s);
    if (!p || !s || used.has(s.key) || !fits(p, s)) continue;
    used.add(s.key);
    const topAnchor = p.slot === 'hang' || p.slot === 'railTop' || p.slot === 'symTop';
    const ty = p.slot === 'symTop' ? (s.top ?? 0) : p.slot === 'railTop' ? s.y - 2 : s.y;
    const floorish = s.kind === 'floor' || s.kind === 'bed' || (s.kind === 'sym' && !topAnchor);
    out.push({ plant: p, slot: s, x: s.x - p.ax, y: ty - p.ay, layer: floorish ? 'floor' : 'back', base: s.y, order: BACK_ORDER[s.kind] });
  }
  return out.sort((a, b) => a.order - b.order || a.base - b.base);
}

/** 지금 심을 수 있는가(씨앗·책 수·빈자리) — 꾸미기 화면 버튼 상태 */
export function canPlant(data: PlantsData, p: PlantDef, books: number, g: GardenEntry[], li: number) {
  if (books < p.unlock) return { ok: false, why: `${p.unlock.toLocaleString()}권부터` };
  const left = seedsTotal(data, books) - seedsUsed(data, g);
  if (left < p.seeds) return { ok: false, why: `씨앗 ${p.seeds}개 필요` };
  const taken = new Set(g.map((e) => e.s));
  if (p.cat === 'SYM' && g.some((e) => data.plants.find((d) => d.id === e.p)?.cat === 'SYM')) return { ok: false, why: '상징목은 방마다 하나' };
  if (!levelSlots(data, li).some((s) => fits(p, s) && !taken.has(s.key))) return { ok: false, why: '이 방엔 빈자리가 없어요' };
  return { ok: true, why: '' };
}
