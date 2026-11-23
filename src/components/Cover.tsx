'use client';
import { useEffect, useRef, useState } from 'react';
import { toRoomBook } from '@/components/LibraryProvider';
import { drawCover } from '@/lib/room/render';
import type { LibraryEntry } from '@/lib/data/types';

/** 표지: 사진이 있으면 사진, 없으면 책 모양(픽셀) */
export function Cover({ e }: { e: LibraryEntry }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (e.coverUrl && !bad) return;
    const c = ref.current?.getContext('2d');
    if (c) drawCover(c, 0, 0, 14, 20, toRoomBook(e));
  }, [e, bad]);
  // eslint-disable-next-line @next/next/no-img-element
  if (e.coverUrl && !bad) return <img src={e.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
  return <canvas ref={ref} width={14} height={20} className="pix" />;
}

