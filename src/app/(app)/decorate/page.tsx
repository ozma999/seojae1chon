'use client';
import { useEffect, useRef, useState } from 'react';
import { useLibrary } from '@/components/LibraryProvider';
import { getRenderer, type Renderer } from '@/components/RoomCanvas';
import { HAIR_TH, OUTFIT_TH, pickedTheme, pickedVar } from '@/lib/room/logic';
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
      <h2 className="sub" id="style">방 스타일</h2>
      <div className="styles" role="group" aria-label="방 스타일">
        {([null, 'attic', 'space', 'manga', 'study'] as const).map((k) => {
          const cur = pickedTheme(profile.picks), th = k ? r.art.themes[k] : null;
          return (
            <button key={k ?? 'auto'} className="style" aria-pressed={cur === k} onClick={() => save({ picks: { ...profile.picks, theme: k ?? '' } })}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 작은 픽셀 미리보기 */}
              {k ? <img className="pix" src={`/art/${r.art.levels[1].bg[k]}`} alt="" /> : <span className="autoth">자동</span>}
              <small>{th ? `${th.name} · ${th.scene}` : '자랑 책장 따라'}</small>
            </button>
          );
        })}
      </div>
      <h2 className="sub">서재 아이템</h2>
      <ul className="items">
        {r.art.itemdefs.map((d) => {
          const u = n >= d.th, on = u && !profile.itemsOff.includes(d.id);
          return (
            <li key={d.id} className={u ? '' : 'locked'}>
              <div className="itemrow">
                <span><b>{d.name}</b><small>{u ? `책 ${d.th.toLocaleString()}권 달성` : `책 ${d.th.toLocaleString()}권이면 생겨요`}</small></span>
                <input type="checkbox" className="sw" checked={on} disabled={!u} onChange={(e) => toggle(d.id, e.target.checked)} aria-label={`${d.name} 켜기`} />
              </div>
              {u && d.vars && <VarPicker r={r} id={d.id} picks={profile.picks} onPick={(k) => save({ picks: { ...profile.picks, [d.id]: k }, itemsOff: profile.itemsOff.filter((x) => x !== d.id) })} />}
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

/** 모양 3가지(그림) + 색 칩. 큰 서재(Lv.3) 그림을 미리보기로 쓴다 */
function VarPicker({ r, id, picks, onPick }: { r: Renderer; id: ItemId; picks?: Record<string, string | number>; onPick: (key: string) => void }) {
  const vars = r.art.itemdefs.find((d) => d.id === id)!.vars!;
  const cur = pickedVar(r.art, id, picks)!, shape = cur[0], color = cur.slice(1);
  const shapes = [...new Set(vars.map((v) => v.key[0]))];
  const colors = [...new Set(vars.map((v) => v.key.slice(1)))].filter(Boolean);
  const L = r.art.levels[2];
  const layer = (k: string) => L.items.filter((it) => it.id === id && it.var === k).sort((a, b) => b.base - a.base)[0];
  const nameOf = (k: string) => vars.find((v) => v.key === k)?.name.split(' · ') ?? [];
  const SW: Record<string, string> = { 파랑: '#3e6eb4', 빨강: '#cc4a3c', 초록: '#5a9e5a', 청록: '#3ea29a', 노랑: '#e8b84a', 크림: '#ecdeba' };
  return (
    <div className="vars">
      <div className="shapes" role="group" aria-label="모양">
        {shapes.map((s) => {
          const k = s + color, it = layer(k);
          return (
            <button key={s} className="shape" aria-pressed={s === shape} onClick={() => onPick(k)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 작은 픽셀 조각 */}
              {it && <img className="pix" src={`/art/${it.img}`} alt="" />}
              <small>{nameOf(k)[0]}</small>
            </button>
          );
        })}
      </div>
      {colors.length > 0 && (
        <div className="swatches" role="group" aria-label="색">
          {colors.map((c) => {
            const nm = nameOf(shape + c)[1];
            return <button key={c} className="sw-c" aria-pressed={c === color} aria-label={nm} title={nm} style={{ background: SW[nm] ?? '#ccc' }} onClick={() => onPick(shape + c)} />;
          })}
        </div>
      )}
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
