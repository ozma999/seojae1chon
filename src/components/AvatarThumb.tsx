'use client';
import { useEffect, useRef } from 'react';

let sheet: Promise<{ im: HTMLImageElement; w: number; h: number }> | null = null;
function loadSheet() {
  return (sheet ??= fetch('/art/manifest.json').then((r) => r.json()).then((m) => new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok({ im, w: m.avatar.w, h: m.avatar.h });
    im.src = `/art/${m.avatar.img}`;
  })));
}
/** 아바타 한 컷(머리·옷 조합). scale배로 그린다 */
export function AvatarThumb({ hair, outfit, scale = 2 }: { hair: number; outfit: number; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    loadSheet().then(({ im, w, h }) => {
      const c = ref.current;
      if (!alive || !c) return;
      c.width = w; c.height = h;
      c.style.width = `${w * scale}px`; c.style.height = `${h * scale}px`;
      const x = c.getContext('2d')!;
      x.clearRect(0, 0, w, h);
      x.drawImage(im, outfit * 2 * w, hair * h, w, h, 0, 0, w, h);
    });
    return () => { alive = false; };
  }, [hair, outfit, scale]);
  return <canvas ref={ref} className="avatar" aria-hidden />;
}
