'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RoomCanvas } from '@/components/RoomCanvas';
import { BookSheet } from '@/components/BookSheet';
import { useLibrary } from '@/components/LibraryProvider';
import type { World } from '@/lib/room/render';
import type { RoomState, Tod } from '@/lib/room/types';
import { nextItem, GENRE_NAME, bragTopGenre, pickedTheme } from '@/lib/room/logic';
import { autoTod, hm, sunTimes } from '@/lib/room/time';
import { demoFill, demoReset } from '@/lib/data/demo';
import { useClock } from '@/hooks/useClock';
import type { LibraryEntry } from '@/lib/data/types';
import { NameSheet } from '@/components/NameSheet';
import { Guestbook } from '@/components/Guestbook';
import { Onboarding } from '@/components/Onboarding';
import { ForestCard } from '@/components/ForestCard';
import { DEFAULT_ROOM_NAME } from '@/lib/room/names';

const TODS: Tod[] = ['새벽', '낮', '노을', '밤'];

export default function RoomPage() {
  const { ready, profile, entries, roomBooks, tod, setTod, mode, reload, say, repo, updateProfile } = useLibrary();
  const [visits, setVisits] = useState<number | null>(null);
  useEffect(() => { repo.todayVisits().then(setVisits, () => {}); }, [repo]);
  const [world, setWorld] = useState<World | null>(null);
  const [art, setArt] = useState<{ itemdefs: { id: string; th: number; name: string; vars?: unknown[] }[]; themes: Record<string, { name: string }> } | null>(null);
  const [pick, setPick] = useState<LibraryEntry | null>(null);
  // 이름이 기본값이면 한 번만 묻는다(닫으면 이 기기에선 다시 안 물음)
  const [askName, setAskName] = useState(false);
  useEffect(() => {
    if (mode === 'live' && profile?.roomName === DEFAULT_ROOM_NAME && !localStorage.getItem('askedName')) queueMicrotask(() => setAskName(true));
  }, [mode, profile?.roomName]);
  const closeName = () => { localStorage.setItem('askedName', '1'); setAskName(false); };
  const now = useClock();
  const autoT = now ? autoTod(now) : '낮';
  const state: RoomState | null = useMemo(() => profile && {
    books: roomBooks, itemsOff: profile.itemsOff, hair: profile.hair, outfit: profile.outfit, theme: pickedTheme(profile.picks), tod: tod ?? autoT, picks: profile.picks,
  }, [profile, roomBooks, tod, autoT]);

  // 새 아이템·방 확장 알림
  const prev = useRef<{ n: number; li: number } | null>(null);
  useEffect(() => {
    if (!world || !art) return;
    const n = entries.length, p = prev.current;
    if (p) {
      if (p.n === 0 && n > 0) say('첫 책을 꽂았어요! 서재가 시작됐어요 🎉');
      else if (Math.floor(n / 10) > Math.floor(p.n / 10) && world.li === p.li) say(`씨앗을 받았어요 · 꾸미기 > 식물 정원에서 심어요`);
      else if (world.li > p.li) say(`방이 넓어졌어요 · Lv.${world.li + 1} ${world.level.name}`);
      else {
        const got = art.itemdefs.filter((d) => d.th <= n && d.th > p.n);
        if (got.length) { const g = got[got.length - 1]; say(`새 아이템: ${g.name}${'vars' in g && g.vars ? ' · 꾸미기에서 모양을 골라요' : ''}`); }
      }
    }
    prev.current = { n, li: world.li };
  }, [world, art, entries.length, say]);

  if (!ready || !state || !now) return <p className="pad muted">서재를 여는 중…</p>;
  const n = entries.length, nx = art ? nextItem(art as never, n) : null;
  const sun = sunTimes(now), top = bragTopGenre(roomBooks);
  return (
    <div>
      <header className="bar roombar">
        <div className="brand">
          <Image src="/brand/symbol-v3.png" alt="서재일촌" width={40} height={40} className="logoimg sym" priority />
          <h1 className="rn">{profile!.roomName}</h1>
        </div>
        {world && <span className="lv">Lv.{world.li + 1} {world.level.name}</span>}
      </header>
      <RoomCanvas state={state} onWorld={(w, r) => { setWorld(w); setArt(r.art); }}
        onPick={(h) => { if (h.book) setPick(entries.find((e) => e.id === h.book!.id) ?? null); else if (h.empty) say('책을 눌러 \'자랑 책장에 꽂기\'를 고르면 여기에 표지가 보여요'); }} />
      <nav className="roomacts" aria-label="서재 바로가기">
        <Link href="/shelf#search">내 책 찾기</Link>
        <Link href="/ilchon">서재산책</Link>
      </nav>
      <section className="pad">
        <Onboarding />
        <div className="tally">
          <p className="count"><b>{n.toLocaleString()}</b>권</p>
          <p className="small muted">
            {profile!.title && <><b className="ptitle">{profile!.title}</b><br /></>}
            종이 {entries.filter((e) => e.format === 'paper').length.toLocaleString()} · 전자 {entries.filter((e) => e.format === 'ebook').length.toLocaleString()} · 오늘 방문 <b className="today">{visits ?? '-'}</b>
          </p>
        </div>
        {nx ? (
          <div className="next">
            <span>다음 아이템 <b className="acc">{nx.name}</b>까지 {(nx.th - n).toLocaleString()}권</span>
            <span className="prog"><i style={{ width: `${Math.min(100, (n / nx.th) * 100)}%` }} /></span>
          </div>
        ) : <p className="next">모든 서재 아이템을 모았어요</p>}
        <p className="small seedline">받은 씨앗 <b>{Math.floor(n / 10)}</b>개 · 10권마다 하나씩 <Link href="/decorate#garden">식물 심기</Link></p>
        <ForestCard />
        {world && world.overflow > 0 && <p className="muted">책장에 다 못 꽂은 {world.overflow.toLocaleString()}권은 보관함에 있어요.</p>}
        <h2 className="shelfh">방 분위기</h2>
        {world && art && (
          <div className="themerow">
            <span><b>{art.themes[world.theme].name}</b><small className="muted">{pickedTheme(profile!.picks) ? '꾸미기에서 고른 스타일' : top ? `자랑 책장의 ${GENRE_NAME[top]} 책이 고른 방` : '자랑 책장이 비어 기본 테마'}</small></span>
            <Link href="/decorate#style" className="chip">바꾸기</Link>
          </div>
        )}
        <div className="seg" role="group" aria-label="방의 시간">
          <button aria-pressed={tod === null} onClick={() => setTod(null)}>자동 <small>{hm(now)}</small></button>
          {TODS.map((t) => <button key={t} aria-pressed={tod === t} onClick={() => setTod(t)}>{t}</button>)}
        </div>
        <p className="muted small">지금은 {autoT} · 오늘 해 뜸 {hm(sun.rise)}, 해 짐 {hm(sun.set)} (서울 기준)</p>
        {profile && <Guestbook host={profile.id} canWrite={false} isHost limit={3} />}
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
      {askName && <NameSheet onClose={closeName} onSave={(name) => updateProfile({ roomName: name }).then(() => { closeName(); say(`'${name}'(으)로 이름을 지었어요`); }, (e) => say((e as Error).message))} />}
      {pick && world && <BookSheet entry={pick} onClose={() => setPick(null)} />}
    </div>
  );
}
