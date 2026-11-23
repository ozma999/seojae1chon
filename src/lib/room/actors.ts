// 방 안을 슬렁슬렁 돌아다니는 캐릭터(화면과 무관한 순수 로직 — 테스트 가능)
// 처음 몇 초는 가만히 → 아무 데나 걷기 / 소파에 앉기 / 창문·화분·책장 바라보기 → 다시 걷기
// 일촌 방문(두 명)일 때는 가끔 서로 다가가 말풍선을 주고받는다.

export type Dir = 'front' | 'back' | 'side';
export type Mode = 'idle' | 'walk' | 'sit' | 'look' | 'talk';
export interface Poi { kind: 'sofa' | 'plant' | 'window' | 'shelf'; x: number; y: number; face: 'front' | 'back' | 'left' | 'right' }
export interface Floor { W: number; H: number; poly: [number, number][]; blocks: [number, number, number, number][]; poi: Poi[] }
export interface Actor {
  id: string; x: number; y: number; dir: Dir; flip: boolean; mode: Mode;
  path: [number, number][]; wait: number; t: number; walkT: number;
  /** 지금 하러 가는 일(도착하면 할 것) */
  plan: null | { kind: 'sit' | 'look' | 'meet' | 'wander'; poi?: Poi; face?: Poi['face']; seat?: [number, number] };
  /** 앉기 전 서 있던 자리(일어날 때 돌아간다) */
  stand?: [number, number];
  say?: { text: string; until: number };
}
export interface Frame { name: 'front_stand' | 'front_walk' | 'back_stand' | 'back_walk' | 'side_stand' | 'side_walk' | 'sit' | 'front_talk' | 'side_talk'; k: number }

const CELL = 4;
type Rnd = () => number;

// ---------- 바닥 격자 ----------
function inPoly(x: number, y: number, poly: [number, number][]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
export class Grid {
  w: number; h: number; ok: Uint8Array;
  constructor(public f: Floor) {
    this.w = Math.ceil(f.W / CELL); this.h = Math.ceil(f.H / CELL);
    this.ok = new Uint8Array(this.w * this.h);
    for (let gy = 0; gy < this.h; gy++)
      for (let gx = 0; gx < this.w; gx++) {
        const x = gx * CELL + CELL / 2, y = gy * CELL + CELL / 2;
        // 발 양옆 6px까지 물건에 닿지 않게
        const hit = f.blocks.some(([x0, y0, x1, y1]) => x + 6 > x0 && x - 6 < x1 && y > y0 && y < y1);
        this.ok[gy * this.w + gx] = inPoly(x, y, f.poly) && !hit ? 1 : 0;
      }
  }
  cell(x: number, y: number): [number, number] { return [Math.max(0, Math.min(this.w - 1, Math.floor(x / CELL))), Math.max(0, Math.min(this.h - 1, Math.floor(y / CELL)))]; }
  free(gx: number, gy: number) { return gx >= 0 && gy >= 0 && gx < this.w && gy < this.h && this.ok[gy * this.w + gx] === 1; }
  /** 가장 가까운 걸을 수 있는 칸 */
  nearest(x: number, y: number): [number, number] | null {
    const [cx, cy] = this.cell(x, y);
    for (let r = 0; r < 40; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++)
          if ((Math.abs(dx) === r || Math.abs(dy) === r) && this.free(cx + dx, cy + dy)) return [cx + dx, cy + dy];
    return null;
  }
  randomFree(rnd: Rnd): [number, number] | null {
    for (let i = 0; i < 200; i++) {
      const gx = Math.floor(rnd() * this.w), gy = Math.floor(rnd() * this.h);
      if (this.free(gx, gy)) return [gx * CELL + CELL / 2, gy * CELL + CELL / 2];
    }
    return null;
  }
  /** A* (8방향). 결과는 칸 중심 좌표 목록, 못 가면 null */
  path(ax: number, ay: number, bx: number, by: number): [number, number][] | null {
    const s = this.nearest(ax, ay), g = this.nearest(bx, by);
    if (!s || !g) return null;
    const W = this.w, key = (x: number, y: number) => y * W + x, gk = key(g[0], g[1]);
    const open = new Map<number, number>(), came = new Map<number, number>(), gs = new Map<number, number>();
    const hfn = (k: number) => Math.hypot((k % W) - g[0], Math.floor(k / W) - g[1]);
    const sk = key(s[0], s[1]); gs.set(sk, 0); open.set(sk, hfn(sk));
    let n = 0;
    while (open.size && n++ < 6000) {
      let cur = -1, best = Infinity;
      for (const [k, f] of open) if (f < best) { best = f; cur = k; }
      if (cur === gk) break;
      open.delete(cur);
      const cx = cur % W, cy = Math.floor(cur / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.free(nx, ny)) continue;
        if (dx && dy && (!this.free(cx + dx, cy) || !this.free(cx, cy + dy))) continue;   // 모서리 자르기 금지
        const nk = key(nx, ny), ng = gs.get(cur)! + (dx && dy ? 1.414 : 1);
        if (ng < (gs.get(nk) ?? Infinity)) { gs.set(nk, ng); came.set(nk, cur); open.set(nk, ng + hfn(nk)); }
      }
    }
    if (!came.has(gk) && gk !== sk) return null;
    const out: [number, number][] = [];
    for (let k = gk; k !== sk; k = came.get(k)!) out.push([(k % W) * CELL + CELL / 2, Math.floor(k / W) * CELL + CELL / 2]);
    out.reverse();
    // 직선으로 갈 수 있는 중간 칸은 건너뛴다(지그재그 줄이기)
    const smooth: [number, number][] = [];
    let from: [number, number] = [ax, ay];
    for (let i = 0; i < out.length; i++) {
      const next = out[i + 1];
      if (next && this.clear(from, next)) continue;
      smooth.push(out[i]); from = out[i];
    }
    return smooth;
  }
  clear(a: [number, number], b: [number, number]) {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
    for (let i = 0; i <= n; i++) {
      const [gx, gy] = this.cell(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n);
      if (!this.free(gx, gy)) return false;
    }
    return true;
  }
}

// ---------- 행동 ----------
export interface SimOpts { rnd?: Rnd; startIdle?: number; lines?: () => string[] }
export class Sim {
  actors: Actor[] = [];
  grid: Grid;
  rnd: Rnd;
  now = 0;
  speed: number;
  private talkCool = 0;
  constructor(public floor: Floor, starts: { id: string; x: number; y: number }[], public opts: SimOpts = {}) {
    this.rnd = opts.rnd ?? Math.random;
    this.grid = new Grid(floor);
    this.speed = Math.max(14, floor.W * 0.045);          // px/초 — 슬렁슬렁
    starts.forEach((s, i) => this.actors.push({
      id: s.id, x: s.x, y: s.y, dir: 'front', flip: false, mode: 'idle', path: [], plan: null,
      wait: (opts.startIdle ?? 5) + i * 1.5, t: 0, walkT: 0,
    }));
    this.talkCool = 12;
  }
  /** dt초만큼 진행 */
  step(dt: number) {
    this.now += dt; this.talkCool -= dt;
    for (const a of this.actors) this.stepActor(a, dt);
    if (this.actors.length > 1) this.maybeMeet();
  }
  private choose(a: Actor) {
    // 두 사람: 대화할 때가 됐고 상대가 쉬는 중이면 상대 옆으로 가서 말을 건다
    const other = this.actors.find((o) => o !== a);
    if (other && this.talkCool <= 0 && (other.mode === 'idle' || other.mode === 'look') && this.rnd() < 0.6) { this.meet(a, other); return; }
    const r = this.rnd(), P = this.floor.poi;
    const pick = (k: Poi['kind']) => { const l = P.filter((p) => p.kind === k && !this.taken(p, a)); return l.length ? l[Math.floor(this.rnd() * l.length)] : null; };
    let poi: Poi | null = null;
    if (r < 0.16) poi = pick('sofa');
    else if (r < 0.30) poi = pick('window');
    else if (r < 0.42) poi = pick('plant');
    else if (r < 0.56) poi = pick('shelf');
    if (poi) {
      if (poi.kind === 'sofa') { const stand: [number, number] = [poi.x, poi.y + 10]; this.go(a, stand, { kind: 'sit', poi, seat: [poi.x, poi.y] }); }
      else this.go(a, [poi.x, poi.y], { kind: 'look', poi, face: poi.face });
      return;
    }
    const p = this.grid.randomFree(this.rnd);
    if (p) this.go(a, p, { kind: 'wander' }); else a.wait = 3;
  }
  private taken(p: Poi, me: Actor) {
    return this.actors.some((o) => o !== me && (o.plan?.poi === p || (o.mode === 'sit' && p.kind === 'sofa')));
  }
  private go(a: Actor, to: [number, number], plan: Actor['plan']) {
    const path = this.grid.path(a.x, a.y, to[0], to[1]);
    if (!path) { a.wait = 2 + this.rnd() * 2; return; }
    a.path = path.length ? path : [to]; a.plan = plan; a.mode = 'walk';
  }
  private stepActor(a: Actor, dt: number) {
    a.t += dt;
    if (a.say && a.say.until < this.now) a.say = undefined;
    if (a.mode === 'walk') {
      let left = this.speed * dt;
      while (left > 0 && a.path.length) {
        const [tx, ty] = a.path[0], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
        if (d < 0.01) { a.path.shift(); continue; }
        // 걷는 방향으로 몸을 돌린다
        if (Math.abs(dx) > Math.abs(dy) * 0.8) { a.dir = 'side'; a.flip = dx < 0; } else a.dir = dy > 0 ? 'front' : 'back';
        const m = Math.min(left, d); a.x += (dx / d) * m; a.y += (dy / d) * m; left -= m;
        if (m === d) a.path.shift();
      }
      a.walkT += dt;
      if (!a.path.length) this.arrive(a);
      return;
    }
    a.wait -= dt;
    if (a.wait > 0) return;
    if (a.mode === 'sit' && a.stand) {                       // 일어나서 소파 앞으로
      a.x = a.stand[0]; a.y = a.stand[1]; a.stand = undefined; a.dir = 'front';
    }
    if (a.mode === 'talk') { a.mode = 'idle'; a.wait = 1 + this.rnd() * 2; return; }
    a.mode = 'idle'; a.plan = null;
    this.choose(a);
  }
  private arrive(a: Actor) {
    const plan = a.plan; a.walkT = 0;
    if (plan?.kind === 'sit' && plan.seat) {
      a.stand = [a.x, a.y]; a.x = plan.seat[0]; a.y = plan.seat[1]; a.dir = 'front'; a.flip = false;
      a.mode = 'sit'; a.wait = 8 + this.rnd() * 8; return;
    }
    if (plan?.kind === 'look' && plan.face) {
      a.dir = plan.face === 'front' || plan.face === 'back' ? plan.face : 'side'; a.flip = plan.face === 'left';
      a.mode = 'look'; a.wait = 3 + this.rnd() * 3; return;
    }
    if (plan?.kind === 'meet') { a.mode = 'idle'; a.plan = null; a.wait = 0.5; return; }
    a.mode = 'idle'; a.dir = 'front'; a.wait = 2 + this.rnd() * 4;
  }
  /** a가 b 옆(왼쪽 또는 오른쪽 22px)으로 걸어간다. b는 기다린다 */
  private meet(a: Actor, b: Actor) {
    const side = a.x < b.x ? -27 : 27;
    const spot = this.grid.free(...this.grid.cell(b.x + side, b.y)) ? b.x + side : b.x - side;
    this.go(a, [spot, b.y], { kind: 'meet' });
    if (a.mode === 'walk') { b.wait = Math.max(b.wait, 12); (a as Actor & { meetWith?: Actor }).meetWith = b; }
  }
  /** 만나러 간 사람이 도착하면 대화 */
  private maybeMeet() {
    for (const a of this.actors) {
      const b = (a as Actor & { meetWith?: Actor }).meetWith;
      if (!b || a.mode !== 'idle' || a.plan) continue;
      (a as Actor & { meetWith?: Actor }).meetWith = undefined;
      if (Math.hypot(a.x - b.x, a.y - b.y) < 40 && b.mode !== 'walk' && b.mode !== 'sit') this.talk(a, b);
    }
  }
  private talk(a: Actor, b: Actor) {
    const lines = this.opts.lines?.() ?? [];
    if (lines.length < 2) { this.talkCool = 20; return; }
    for (const [x, o] of [[a, b], [b, a]] as const) { x.dir = 'side'; x.flip = o.x < x.x; x.mode = 'talk'; x.path = []; x.plan = null; }
    // 방문자('me')가 먼저 말을 걸고 주인이 대답한다
    const first = [a, b].find((x) => x.id === 'me') ?? a, second = first === a ? b : a;
    first.say = { text: lines[0], until: this.now + 3.2 }; (first as Actor & { sayFrom?: number }).sayFrom = this.now;
    second.say = { text: lines[1], until: this.now + 6.4 }; (second as Actor & { sayFrom?: number }).sayFrom = this.now + 3.2;
    a.wait = 6.6; b.wait = 6.6;
    this.talkCool = 25 + this.rnd() * 20;
  }
  /** 지금 보여 줄 말풍선(대답은 차례가 오면) */
  bubble(a: Actor) {
    const from = (a as Actor & { sayFrom?: number }).sayFrom ?? 0;
    return a.say && this.now >= from ? a.say.text : null;
  }
}

/** 지금 그릴 프레임 */
export function frameOf(a: Actor, now: number, speaking = false): Frame {
  if (a.mode === 'walk') return { name: `${a.dir}_walk` as Frame['name'], k: Math.floor(a.walkT / 0.16) % 4 };
  if (a.mode === 'sit') return { name: 'sit', k: Math.floor(now / 0.65) % 2 };
  if (speaking && Math.floor(now / 0.22) % 2 === 0) return { name: a.dir === 'side' ? 'side_talk' : 'front_talk', k: 0 };
  return { name: `${a.dir}_stand` as Frame['name'], k: Math.floor(now / 0.65) % 2 };
}
