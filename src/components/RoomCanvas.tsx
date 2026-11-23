'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRenderer, loadArt, type Hit, type World } from '@/lib/room/render';
import type { RoomState } from '@/lib/room/types';

let artPromise: ReturnType<typeof loadArt> | null = null;
export const getRenderer = async () => createRenderer(await (artPromise ??= loadArt()));
export type Renderer = Awaited<ReturnType<typeof getRenderer>>;

/** 방 그림. state가 바뀌면 다시 합성하고, 캐릭터는 숨쉬기 2프레임으로 움직인다 */
export function RoomCanvas({ state, onWorld, onPick }: {
  state: RoomState;
  onWorld?: (w: World, r: Renderer) => void;
  onPick?: (h: Hit) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [r, setR] = useState<Renderer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { getRenderer().then(setR, (e) => setErr(String(e))); }, []);
  const world = useMemo<World | null>(() => (r ? r.renderWorld(state) : null), [r, state]);
  useEffect(() => {
    if (r && world) onWorld?.(world, r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, world]);
  useEffect(() => {
    if (!r || !world || !ref.current) return;
    const cv = ref.current;
    let breath: 0 | 1 = 0;
    const paint = () => {
      const cssW = cv.parentElement!.clientWidth, s = cssW / world.level.W, dpr = window.devicePixelRatio || 1;
      const cssH = Math.round(world.level.H * s);
      cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
      const iw = Math.round(cssW * dpr), ih = Math.round(cssH * dpr);
      if (cv.width !== iw) cv.width = iw;
      if (cv.height !== ih) cv.height = ih;
      const ctx = cv.getContext('2d')!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, iw, ih);
      r.compositeFit(ctx, world, iw, ih, state.hair, state.outfit, breath);
    };
    paint();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = reduce ? 0 : window.setInterval(() => { breath = breath ? 0 : 1; paint(); }, 650);
    window.addEventListener('resize', paint);
    return () => { clearInterval(id); window.removeEventListener('resize', paint); };
  }, [r, world, state.hair, state.outfit]);

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
      {!world && <div className="roomloading">서재를 그리는 중…</div>}
    </div>
  );
}
