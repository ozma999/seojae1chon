'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { RoomCanvas } from '@/components/RoomCanvas';
import { toRoomBook, useLibrary } from '@/components/LibraryProvider';
import { useClock } from '@/hooks/useClock';
import { autoTod } from '@/lib/room/time';
import { GENRE_NAME, bragList, pickedTheme } from '@/lib/room/logic';
import type { World } from '@/lib/room/render';
import type { LibraryEntry, Profile } from '@/lib/data/types';
import type { RoomState } from '@/lib/room/types';
import { makeLines } from '@/lib/room/talk';
import { monthCount, persona, seriesProgress, shelfTitle, towerInfo } from '@/lib/room/stats';
import { together } from '@/lib/room/together';
import { Cover } from '@/components/Cover';
import type { RoomBook, Genre } from '@/lib/room/types';

/** 친구 서재 구경(읽기 전용). 책을 누르면 정보와 '내 서재에 추가' */
// 친구 id는 요청 때 정해지므로 Suspense 안에서 읽는다(cacheComponents)
export default function FriendRoomPage() {
  return <Suspense fallback={<p className="pad muted">서재를 여는 중…</p>}><FriendRoom /></Suspense>;
}
function FriendRoom() {
  const { id } = useParams<{ id: string }>();
  const { repo, entries: mine, add, say, profile: me } = useLibrary();
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
  const tod = now ? autoTod(now) : null;   // 시각이 바뀌어도 시간대가 같으면 방을 다시 그리지 않는다(캐릭터가 제자리로 돌아가지 않게)
  const state: RoomState | null = useMemo(() => room && tod && {
    books, itemsOff: room.profile.itemsOff, hair: room.profile.hair, outfit: room.profile.outfit, picks: room.profile.picks, theme: pickedTheme(room.profile.picks), tod,
  }, [room, books, tod]);
  // 내 캐릭터가 놀러 간다(내 서재가 아닐 때만). 내가 먼저 말을 걸고 주인이 대답한다
  const cast = useMemo(() => room && me && me.id !== room.profile.id
    ? [{ id: 'me', hair: me.hair, outfit: me.outfit }, { id: 'host', hair: room.profile.hair, outfit: room.profile.outfit }] : undefined, [room, me]);
  const theme = world?.theme;
  const lines = useMemo(() => room ? makeLines(room.entries, mine, { scene: theme ? { attic: '바다', space: '우주', manga: '도시', study: '숲' }[theme] : undefined }) : undefined, [room, mine, theme]);
  if (err) return <p className="pad err">서재를 열지 못했어요: {err}</p>;
  if (!room || !state) return <p className="pad muted">서재를 여는 중…</p>;
  const has = (e: LibraryEntry) => mine.some((m) => m.isbn === e.isbn);
  return (
    <div>
      <header className="bar">
        <Link href="/ilchon" className="back" aria-label="일촌으로">‹</Link>
        <h1 className="logo">{room.profile.roomName}</h1>
        {world && <span className="lv">Lv.{world.li + 1} {world.level.name}</span>}
      </header>
      <RoomCanvas state={state} cast={cast} lines={lines} onWorld={(w) => setWorld(w)}
        onPick={(h) => { if (h.book) setPick(room.entries.find((e) => e.id === h.book!.id) ?? null); }} />
      <FriendStats room={room} mine={mine} books={books} world={world} now={now} onPick={setPick} self={me?.id === room.profile.id} />
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

const GENRES: Genre[] = ['lit', 'sf', 'manga', 'hum'];
const SCENE: Record<string, string> = { attic: '다락방', space: '우주정거장', manga: '만화방', study: '서고' };

/** 서재산책 아래 정보: 칭호 → 숫자 → 우리 사이 → 자랑 책장 → 장르 → 시리즈 → 최근 → 방 정보 */
function FriendStats({ room, mine, books, world, now, onPick, self }: {
  room: { profile: Profile; entries: LibraryEntry[] }; mine: LibraryEntry[]; books: RoomBook[];
  world: World | null; now: Date | null; onPick: (e: LibraryEntry) => void; self?: boolean;
}) {
  const E = room.entries, n = E.length, t = now?.getTime();
  const tower = useMemo(() => towerInfo(E), [E]);
  const series = useMemo(() => seriesProgress(E).slice(0, 3), [E]);
  const us = useMemo(() => together(E, mine), [E, mine]);
  const brag = bragList(books).map((b) => E.find((e) => e.id === b.id)!).filter(Boolean);
  const recent = [...E].sort((a, b) => b.addedAt - a.addedAt).slice(0, 5);
  const per = persona(E, t);
  const g = Object.fromEntries(GENRES.map((k) => [k, E.filter((e) => e.genre === k).length])) as Record<Genre, number>;
  const paper = E.filter((e) => e.format === 'paper').length;
  return (
    <div className="pad shelf friend">
      <section className="card titlecard">
        {room.profile.cohort === 'founding' && <span className="badge">태초가족</span>}
        <p className="title">{shelfTitle(E, t)}</p>
        <small className="muted">{per ? `${per.why} — 그래서 이 칭호예요` : n < 10 ? '책이 10권을 넘으면 모으는 방식에 따라 칭호가 생겨요' : '가장 많은 장르로 정한 칭호예요'}</small>
      </section>
      <div className="stats">
        <div><b>{n.toLocaleString()}</b><small>권</small></div>
        <div><b>{paper.toLocaleString()}<i>/{(n - paper).toLocaleString()}</i></b><small>종이/전자</small></div>
        <div><b>+{now ? monthCount(E, now) : 0}</b><small>이번 달</small></div>
        <div><b>{tower.m < 10 ? tower.m.toFixed(1) : Math.round(tower.m)}<i>m</i></b><small>쌓은 높이</small></div>
      </div>
      {!self && <section className="card us">
        <h2>우리 사이</h2>
        <div className="usrow">
          <div className="pct"><b>{us.pct}<i>%</i></b><small>취향 겹침</small></div>
          <p className="small">같이 가진 책 <b>{us.shared.length.toLocaleString()}</b>권 · 같이 좋아하는 작가 <b>{us.sharedAuthors}</b>명
            <br /><span className="muted">{us.pct >= 30 ? '취향이 꽤 닮았어요' : us.pct >= 10 ? '겹치는 데가 있어요' : '서로 모르는 책이 많아서 빌려 읽기 좋아요'}</span></p>
        </div>
        {us.recs.length > 0 && (
          <>
            <h3 className="sub2">이 서재에만 있는 책</h3>
            <div className="covers">
              {us.recs.map((e) => <button key={e.id} onClick={() => onPick(e)} aria-label={e.title}><Cover e={e} /><span>{e.title}{e.series && e.vol ? ` ${e.vol}` : ''}</span></button>)}
            </div>
          </>
        )}
      </section>}
      {brag.length > 0 && (
        <section className="card">
          <h2>자랑 책장</h2>
          <ul className="bragl">
            {brag.map((e) => (
              <li key={e.id}><button onClick={() => onPick(e)}><Cover e={e} />
                <span><b>{e.title}</b><small className="muted">{e.author ?? ''}</small>{e.bragText && <em>“{e.bragText}”</em>}</span></button></li>
            ))}
          </ul>
        </section>
      )}
      {n > 0 && (
        <section className="card">
          <h2>장르</h2>
          <ul className="genres">
            {GENRES.filter((k) => g[k]).sort((a, b) => g[b] - g[a]).map((k) => (
              <li key={k}><span>{GENRE_NAME[k]}</span><span className={`gbar g-${k}`}><i style={{ width: `${(g[k] / n) * 100}%` }} /></span><small>{Math.round((g[k] / n) * 100)}%</small></li>
            ))}
          </ul>
        </section>
      )}
      {series.length > 0 && (
        <section className="card">
          <h2>시리즈</h2>
          <ul className="series">
            {series.map((s) => (
              <li key={s.name}>
                <div className="row2"><b>{s.name}</b><span className="small muted">{s.have} / {s.max}권</span></div>
                <span className="prog"><i style={{ width: `${(s.have / s.max) * 100}%` }} /></span>
                {s.missing.length > 0 && <small className="muted">{s.missing.length}권 빠짐</small>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {recent.length > 0 && (
        <section className="card">
          <h2>최근 꽂은 책</h2>
          <div className="covers">
            {recent.map((e) => <button key={e.id} onClick={() => onPick(e)} aria-label={e.title}><Cover e={e} /><span>{e.title}</span></button>)}
          </div>
        </section>
      )}
      {world && <p className="muted small roominfo">{SCENE[world.theme]} · Lv.{world.li + 1} {world.level.name} · 지금 {world.tod}</p>}
    </div>
  );
}
