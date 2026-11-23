'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRenderer, loadArt, type ActorDraw, type Hit, type World } from '@/lib/room/render';
import type { RoomState } from '@/lib/room/types';
import { Sim, frameOf } from '@/lib/room/actors';

let artPromise: ReturnType<typeof loadArt> | null = null;
export const getRenderer = async () => createRenderer(await (artPromise ??= loadArt()));
export type Renderer = Awaited<ReturnType<typeof getRenderer>>;

// ---- 걸어 다니는 캐릭터 시트(조합마다 한 장, 필요한 것만 불러온다) ----
interface ActorIndex { w: number; h: number; frames: Record<string, [number, number]>; sheets: string[][] }
let actorIndex: Promise<ActorIndex> | null = null;
const sheetCache = new Map<string, Promise<HTMLImageElement>>();
function loadSheet(path: string) {
  let p = sheetCache.get(path);
  if (!p) {
    p = new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = bad; im.src = `/art/${path}`; });
    sheetCache.set(path, p);
  }
  return p;
}

export interface CastMember { id: string; hair: number; outfit: number }

/**
 * 방 그림. 캐릭터는 처음 몇 초 가만히 있다가 방 안을 돌아다닌다(소파에 앉기, 창문·화분·책장 바라보기).
 * cast가 두 명이면(일촌 방문) 가끔 서로 다가가 말풍선을 주고받는다. '동작 줄이기'를 켠 기기는 가만히 서 있다.
 */
export function RoomCanvas({ state, onWorld, onPick, cast, lines }: {
  state: RoomState;
  onWorld?: (w: World, r: Renderer) => void;
  onPick?: (h: Hit) => void;
  cast?: CastMember[];
  /** 말풍선 문장 두 개(말 걸기, 대답)를 돌려주는 함수 */
  lines?: () => string[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [r, setR] = useState<Renderer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<{ id: string; text: string; x: number; y: number; tail: number }[]>([]);
  useEffect(() => { getRenderer().then(setR, (e) => setErr(String(e))); }, []);
  const world = useMemo<World | null>(() => (r ? r.renderWorld(state) : null), [r, state]);
  useEffect(() => {
    if (r && world) onWorld?.(world, r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, world]);
  const members = useMemo(() => cast ?? [{ id: 'me', hair: state.hair, outfit: state.outfit }], [cast, state.hair, state.outfit]);
  const castKey = members.map((m) => `${m.id}:${m.hair}:${m.outfit}`).join(',');
  const linesRef = useRef(lines);
  useEffect(() => { linesRef.current = lines; }, [lines]);

  useEffect(() => {
    if (!r || !world || !ref.current) return;
    const cv = ref.current, L = world.level;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let alive = true, raf = 0, last = 0, breath: 0 | 1 = 0;
    let sim: Sim | null = null;
    let sheets: HTMLImageElement[] = [];
    let idx: ActorIndex | null = null;

    const size = () => {
      const cssW = cv.parentElement!.clientWidth, dpr = window.devicePixelRatio || 1;
      const cssH = Math.round(L.H * (cssW / L.W));
      cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
      const iw = Math.round(cssW * dpr), ih = Math.round(cssH * dpr);
      if (cv.width !== iw) cv.width = iw;
      if (cv.height !== ih) cv.height = ih;
      return { iw, ih, cssW };
    };
    const actors = (): ActorDraw[] => {
      if (!sim || !idx) return members.map((m) => r.staticActors(world, m.hair, m.outfit, breath)[0]).slice(0, 1);
      return sim.actors.map((a, i) => {
        const f = frameOf(a, sim!.now, !!sim!.bubble(a));
        const [start] = idx!.frames[f.name];
        return { src: r.actorFrame(world, sheets[i], idx!.w, idx!.h, start + f.k, a.x, a.y), x: Math.round(a.x), y: Math.round(a.y), flip: a.flip };
      });
    };
    const paint = () => {
      const { iw, ih, cssW } = size();
      const ctx = cv.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, iw, ih);
      r.compositeFit(ctx, world, iw, ih, actors(), reduce ? -1 : sim ? sim.now : performance.now() / 1000);
      if (sim) {
        const k = cssW / L.W;
        // 말풍선은 화면 밖으로 나가지 않게 가운데 쪽으로 당기고, 꼬리만 말하는 사람 위에 둔다
        const half = Math.min(80, cssW * 0.24);
        const bs = sim.actors.map((a) => {
          const x = a.x * k, cx = Math.max(half + 4, Math.min(cssW - half - 4, x));
          return { id: a.id, text: sim!.bubble(a), x: cx, y: (a.y - 50) * k, tail: x - cx };
        }).filter((b) => b.text) as { id: string; text: string; x: number; y: number; tail: number }[];
        setBubbles((prev) => (prev.length === bs.length && prev.every((p, i) => p.text === bs[i].text && Math.abs(p.x - bs[i].x) < 1) ? prev : bs));
      }
    };
    const tick = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (document.hidden) { last = t; return; }
      const dt = last ? Math.min(0.25, (t - last) / 1000) : 0;
      if (dt < 0.12 && last) return;                       // 1초에 8번 정도만 다시 그린다(픽셀 느낌·배터리)
      last = t;
      sim?.step(dt);
      paint();
    };

    paint();
    if (reduce) {
      const id = window.setInterval(() => { breath = breath ? 0 : 1; paint(); }, 650);
      window.addEventListener('resize', paint);
      return () => { clearInterval(id); window.removeEventListener('resize', paint); };
    }
    (async () => {
      try {
        idx = await (actorIndex ??= fetch('/art/actor.json').then((x) => x.json()));
        sheets = await Promise.all(members.map((m) => loadSheet(idx!.sheets[m.hair]?.[m.outfit] ?? idx!.sheets[0][0])));
        if (!alive || !L.walk) return;
        const floor = { W: L.W, H: L.H, poly: L.walk.poly, blocks: world.blocks, poi: world.poi };
        const starts = members.map((m, i) => ({ id: m.id, x: L.foot[0] + (i ? 30 : 0), y: L.foot[1] + (i ? 6 : 0) }));
        sim = new Sim(floor, starts, { lines: () => linesRef.current?.() ?? [] });
        raf = requestAnimationFrame(tick);
      } catch { /* 시트를 못 불러오면 예전처럼 가만히 서 있는다 */ }
    })();
    window.addEventListener('resize', paint);
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', paint); setBubbles([]); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, world, castKey]);

  const click = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!world || !onPick) return;
    const rect = e.currentTarget.getBoundingClientRect(), s = rect.width / world.level.W;
    const X = (e.clientX - rect.left) / s, Y = (e.clientY - rect.top) / s;
    for (let i = world.hits.length - 1; i >= 0; i--) {
      const h = world.hits[i];
      if (X >= h.x - 1 && X < h.x + h.w + 1 && Y >= h.y && Y < h.y + h.h) return onPick(h);
    }
  };
  if (err) return <p className="err">방 그림을 불러오지 못했어요. {err}</p>;
  return (
    <div className="roomwrap">
      <canvas ref={ref} onClick={click} className="room" aria-label="픽셀 서재. 책등을 누르면 책 정보가 열려요" />
      {bubbles.map((b) => <div key={b.id} className="bubble" style={{ left: b.x, top: b.y, ['--tail' as string]: `${b.tail}px` }}>{b.text}</div>)}
      {!world && <div className="roomloading">서재를 그리는 중…</div>}
    </div>
  );
}
