'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RoomCanvas } from '@/components/RoomCanvas';
import { BookSheet } from '@/components/BookSheet';
import { useLibrary } from '@/components/LibraryProvider';
import type { World } from '@/lib/room/render';
import type { RoomState, Tod } from '@/lib/room/types';
import { nextItem, GENRE_NAME, bragTopGenre } from '@/lib/room/logic';
import { autoTod, hm, sunTimes } from '@/lib/room/time';
import { demoFill, demoReset } from '@/lib/data/demo';
import { useClock } from '@/hooks/useClock';
import type { LibraryEntry } from '@/lib/data/types';

const TODS: Tod[] = ['새벽', '낮', '노을', '밤'];

export default function RoomPage() {
  const { ready, profile, entries, roomBooks, tod, setTod, mode, reload, say, repo } = useLibrary();
  const [visits, setVisits] = useState<number | null>(null);
  useEffect(() => { repo.todayVisits().then(setVisits, () => {}); }, [repo]);
  const [world, setWorld] = useState<World | null>(null);
  const [art, setArt] = useState<{ itemdefs: { id: string; th: number; name: string }[]; themes: Record<string, { name: string }> } | null>(null);
  const [pick, setPick] = useState<LibraryEntry | null>(null);
  const now = useClock();
  const autoT = now ? autoTod(now) : '낮';
  const state: RoomState | null = useMemo(() => profile && {
    books: roomBooks, itemsOff: profile.itemsOff, hair: profile.hair, outfit: profile.outfit, theme: null, tod: tod ?? autoT,
  }, [profile, roomBooks, tod, autoT]);

  // 새 아이템·방 확장 알림
  const prev = useRef<{ n: number; li: number } | null>(null);
  useEffect(() => {
    if (!world || !art) return;
    const n = entries.length, p = prev.current;
    if (p) {
      if (world.li > p.li) say(`방이 넓어졌어요 · Lv.${world.li + 1} ${world.level.name}`);
      else {
        const got = art.itemdefs.filter((d) => d.th <= n && d.th > p.n);
        if (got.length) say(`새 아이템: ${got[got.length - 1].name}`);
      }
    }
    prev.current = { n, li: world.li };
  }, [world, art, entries.length, say]);

  if (!ready || !state || !now) return <p className="pad muted">서재를 여는 중…</p>;
  const n = entries.length, nx = art ? nextItem(art as never, n) : null;
  const sun = sunTimes(now), top = bragTopGenre(roomBooks);
  return (
    <div>
      <header className="bar">
        <div className="brand">
          <Image src="/brand/logo.png" alt="서재일촌" width={224} height={32} className="pix" priority />
          <h1 className="rn">· {profile!.roomName}</h1>
        </div>
        {world && <span className="lv">Lv.{world.li + 1} {world.level.name}</span>}
      </header>
      <div className="subbar">
        <span className="muted small">오늘 방문 <b className="today">{visits ?? '-'}</b></span>
        <Link href="/walk" className="chip">서재산책 ›</Link>
      </div>
      <RoomCanvas state={state} onWorld={(w, r) => { setWorld(w); setArt(r.art); }}
        onPick={(h) => { if (h.book) setPick(entries.find((e) => e.id === h.book!.id) ?? null); else if (h.empty) say('책을 눌러 \'자랑 책장에 꽂기\'를 고르면 여기에 표지가 보여요'); }} />
      <section className="pad">
        <p className="stat"><b>{n.toLocaleString()}</b>권 · 종이 {entries.filter((e) => e.format === 'paper').length.toLocaleString()} / 전자 {entries.filter((e) => e.format === 'ebook').length.toLocaleString()}</p>
        {nx ? (
          <div className="next">
            <span>다음 아이템 <b className="acc">{nx.name}</b>까지 {(nx.th - n).toLocaleString()}권</span>
            <span className="prog"><i style={{ width: `${Math.min(100, (n / nx.th) * 100)}%` }} /></span>
          </div>
        ) : <p className="next">모든 서재 아이템을 모았어요</p>}
        {world && world.overflow > 0 && <p className="muted">책장에 다 못 꽂은 {world.overflow.toLocaleString()}권은 보관함에 있어요.</p>}
        {world && art && (
          <p className="muted">테마 <b>{art.themes[world.theme].name}</b> · {top ? `자랑 책장의 ${GENRE_NAME[top]} 책이 고른 방` : '자랑 책장이 비어 기본 테마'}</p>
        )}
        <div className="chiprow" role="group" aria-label="방의 시간">
          <button className="chip" aria-pressed={tod === null} onClick={() => setTod(null)}>휴대폰 시각 {hm(now)} · {autoT}</button>
          {TODS.map((t) => <button key={t} className="chip" aria-pressed={tod === t} onClick={() => setTod(t)}>{t}</button>)}
        </div>
        <p className="muted small">오늘 해 뜸 {hm(sun.rise)} · 해 짐 {hm(sun.set)} (서울 기준)</p>
        {mode === 'demo' && (
          <div className="demo">
            <p className="small">데모 도구</p>
            <div className="chiprow">
              {[100, 300, 1000].map((k) => <button key={k} className="chip" onClick={() => { demoFill(k); reload(); }}>책 {k.toLocaleString()}권 더 넣기</button>)}
              <button className="chip" onClick={() => { demoReset(false); reload(); }}>샘플 서재로</button>
              <button className="chip" onClick={() => { demoReset(true); reload(); }}>빈 방으로</button>
            </div>
          </div>
        )}
      </section>
      {pick && world && <BookSheet entry={pick} onClose={() => setPick(null)} />}
    </div>
  );
}
