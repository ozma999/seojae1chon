'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { RoomCanvas } from '@/components/RoomCanvas';
import { toRoomBook, useLibrary } from '@/components/LibraryProvider';
import { useClock } from '@/hooks/useClock';
import { autoTod } from '@/lib/room/time';
import { GENRE_NAME, bragList } from '@/lib/room/logic';
import type { World } from '@/lib/room/render';
import type { LibraryEntry, Profile } from '@/lib/data/types';
import type { RoomState } from '@/lib/room/types';

/** 친구 서재 구경(읽기 전용). 책을 누르면 정보와 '내 서재에 추가' */
// 친구 id는 요청 때 정해지므로 Suspense 안에서 읽는다(cacheComponents)
export default function FriendRoomPage() {
  return <Suspense fallback={<p className="pad muted">서재를 여는 중…</p>}><FriendRoom /></Suspense>;
}
function FriendRoom() {
  const { id } = useParams<{ id: string }>();
  const { repo, entries: mine, add, say } = useLibrary();
  const [room, setRoom] = useState<{ profile: Profile; entries: LibraryEntry[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [pick, setPick] = useState<LibraryEntry | null>(null);
  const visited = useRef(false);
  const now = useClock();
  useEffect(() => {
    repo.loadRoom(id).then(setRoom, (e: Error) => setErr(e.message));
    if (!visited.current) { visited.current = true; repo.visit(id).catch(() => {}); }
  }, [repo, id]);
  const books = useMemo(() => room?.entries.map(toRoomBook) ?? [], [room]);
  const state: RoomState | null = useMemo(() => room && now && {
    books, itemsOff: room.profile.itemsOff, hair: room.profile.hair, outfit: room.profile.outfit, theme: null, tod: autoTod(now),
  }, [room, books, now]);
  if (err) return <p className="pad err">서재를 열지 못했어요: {err}</p>;
  if (!room || !state) return <p className="pad muted">서재를 여는 중…</p>;
  const brag = bragList(books).map((b) => room.entries.find((e) => e.id === b.id)!).filter(Boolean);
  const has = (e: LibraryEntry) => mine.some((m) => m.isbn === e.isbn);
  return (
    <div>
      <header className="bar">
        <Link href="/ilchon" className="back" aria-label="일촌으로">‹</Link>
        <h1 className="logo">{room.profile.roomName}</h1>
        {world && <span className="lv">Lv.{world.li + 1} {world.level.name}</span>}
      </header>
      <RoomCanvas state={state} onWorld={(w) => setWorld(w)}
        onPick={(h) => { if (h.book) setPick(room.entries.find((e) => e.id === h.book!.id) ?? null); }} />
      <section className="pad">
        <p className="stat"><b>{room.entries.length.toLocaleString()}</b>권</p>
        {brag.length > 0 && (
          <>
            <h2 className="sub">자랑 책장</h2>
            <ul className="results">
              {brag.map((e) => (
                <li key={e.id} className="tap" onClick={() => setPick(e)}>
                  <div><b>{e.title}</b><span className="muted small">{e.bragText ?? e.author ?? ''}</span></div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {pick && (
        <div className="sheetbg" onClick={() => setPick(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={pick.title} onClick={(ev) => ev.stopPropagation()}>
            <button className="x" onClick={() => setPick(null)} aria-label="닫기">×</button>
            <h3>{pick.title}{pick.vol ? ` ${pick.vol}` : ''}</h3>
            <p className="muted">{[pick.author, pick.publisher, pick.pubDate, GENRE_NAME[pick.genre]].filter(Boolean).join(' · ')}</p>
            {pick.bragText && <p className="note">자랑 포인트: {pick.bragText}</p>}
            {pick.comment && <p className="note">{room.profile.roomName}의 코멘트: {pick.comment}</p>}
            {has(pick) ? <p className="muted small">내 서재에도 있는 책이에요</p> : (
              <button className="btn primary" onClick={async () => {
                try { await add(pick, 'search', pick.format); say(`'${pick.title}'을(를) 내 서재에 꽂았어요`); } catch (e) { say((e as Error).message); }
              }}>내 서재에도 추가</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
