'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { RoomCanvas } from '@/components/RoomCanvas';
import { defaultLook } from '@/lib/room/look';
import type { Genre, RoomBook, RoomState } from '@/lib/room/types';
import { useClock } from '@/hooks/useClock';
import { autoTod } from '@/lib/room/time';

const LEVELS = [{ n: 60, label: 'Lv.1 · 60권' }, { n: 220, label: 'Lv.2 · 220권' }, { n: 800, label: 'Lv.3 · 800권' }, { n: 2000, label: 'Lv.4 · 2,000권' }];
function sampleBooks(n: number): RoomBook[] {
  let r = 7;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const G: Genre[] = ['lit', 'lit', 'hum', 'sf', 'manga'];
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i}`, title: `샘플 ${i}`, pages: 120 + Math.floor(rnd() * 500), hardcover: rnd() < 0.15, size: rnd() < 0.1 ? 'big' : 'mid',
    format: rnd() < 0.12 ? 'ebook' : 'paper', genre: G[Math.floor(rnd() * G.length)], look: defaultLook(`sample-${i}`),
    bragAt: i < Math.min(12, Math.floor(n / 60)) ? i + 1 : null,
  }));
}

/** 로그인 없이 보는 샘플 서재(실서비스용) */
export default function SamplePage() {
  const [lv, setLv] = useState(1);
  const now = useClock();
  const books = useMemo(() => sampleBooks(LEVELS[lv].n), [lv]);
  const state: RoomState | null = useMemo(() => now && ({
    books, itemsOff: [], hair: 1, outfit: 3, theme: null, tod: autoTod(now),
  }), [books, now]);
  return (
    <main className="app">
      <header className="bar"><Link href="/" className="brand"><Image src="/brand/logo.png" alt="서재일촌" width={224} height={32} className="pix" /></Link></header>
      {state && <RoomCanvas state={state} />}
      <section className="pad">
        <div className="chiprow" role="group" aria-label="방 단계">
          {LEVELS.map((L, i) => <button key={i} className="chip" aria-pressed={lv === i} onClick={() => setLv(i)}>{L.label}</button>)}
        </div>
        <p className="muted small">샘플 서재예요. 책 수를 바꿔 보면 방이 넓어지고 소품이 하나씩 생겨요. 창밖은 지금 휴대폰 시각을 따라요.</p>
        <Link className="btn primary" href="/login?join=1">초대 코드로 내 서재 만들기</Link>
      </section>
    </main>
  );
}
