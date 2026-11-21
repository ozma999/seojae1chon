'use client';
import { useEffect, useRef, useState } from 'react';
import { useLibrary } from '@/components/LibraryProvider';
import { getRenderer, type Renderer } from '@/components/RoomCanvas';
import { HAIR_TH, OUTFIT_TH } from '@/lib/room/logic';
import type { ItemId } from '@/lib/room/types';

/** 꾸미기: 서재 아이템 켜고 끄기 → 머리 → 옷 → 서재 이름 */
export default function DecoratePage() {
  const { profile, entries, updateProfile, say } = useLibrary();
  const [r, setR] = useState<Renderer | null>(null);
  const [draft, setName] = useState<string | null>(null);
  useEffect(() => { getRenderer().then(setR); }, []);
  if (!profile || !r) return <p className="pad muted">불러오는 중…</p>;
  const n = entries.length, A = r.art.avatar, name = draft ?? profile.roomName;
  const save = (p: Parameters<typeof updateProfile>[0]) => updateProfile(p).catch((e: Error) => say(e.message));
  const toggle = (id: ItemId, on: boolean) =>
    save({ itemsOff: on ? profile.itemsOff.filter((x) => x !== id) : [...profile.itemsOff, id] });
  return (
    <div className="pad">
      <h1 className="h">꾸미기</h1>
      <h2 className="sub">서재 아이템</h2>
      <ul className="items">
        {r.art.itemdefs.map((d) => {
          const u = n >= d.th, on = u && !profile.itemsOff.includes(d.id);
          return (
            <li key={d.id} className={u ? '' : 'locked'}>
              <span><b>{d.name}</b><small>{u ? `책 ${d.th.toLocaleString()}권 달성` : `책 ${d.th.toLocaleString()}권이면 생겨요`}</small></span>
              <input type="checkbox" className="sw" checked={on} disabled={!u} onChange={(e) => toggle(d.id, e.target.checked)} aria-label={`${d.name} 켜기`} />
            </li>
          );
        })}
      </ul>
      <h2 className="sub">머리</h2>
      <div className="chars">
        {A.hairs.map((h, i) => (
          <AvatarBtn key={h} r={r} hair={i} outfit={profile.outfit} label={n >= HAIR_TH[i] ? h.replace(' (v7)', '') : `${HAIR_TH[i]}권`}
            on={profile.hair === i} locked={n < HAIR_TH[i]} onClick={() => save({ hair: i })} />
        ))}
      </div>
      <h2 className="sub">옷</h2>
      <div className="chars">
        {A.outfits.map((o, i) => (
          <AvatarBtn key={o} r={r} hair={profile.hair} outfit={i} label={n >= OUTFIT_TH[i] ? o : `${OUTFIT_TH[i]}권`}
            on={profile.outfit === i} locked={n < OUTFIT_TH[i]} onClick={() => save({ outfit: i })} />
        ))}
      </div>
      <h2 className="sub">서재 이름</h2>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) save({ roomName: name.trim().slice(0, 20) }).then(() => say('서재 이름을 바꿨어요')); }}>
        <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} aria-label="서재 이름" />
        <button className="btn primary">저장</button>
      </form>
    </div>
  );
}

function AvatarBtn({ r, hair, outfit, label, on, locked, onClick }: {
  r: Renderer; hair: number; outfit: number; label: string; on: boolean; locked: boolean; onClick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const A = r.art.avatar, c = ref.current!.getContext('2d')!;
    const im = new Image();
    im.onload = () => { c.clearRect(0, 0, A.w, A.h); c.drawImage(im, outfit * 2 * A.w, hair * A.h, A.w, A.h, 0, 0, A.w, A.h); };
    im.src = `/art/${A.img}`;
  }, [r, hair, outfit]);
  return (
    <button className="charbtn" aria-pressed={on} disabled={locked} onClick={onClick}>
      <canvas ref={ref} width={r.art.avatar.w} height={r.art.avatar.h} />
      <span>{label}</span>
    </button>
  );
}
