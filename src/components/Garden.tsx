'use client';
import { useMemo, useState } from 'react';
import { RoomCanvas, type Renderer } from './RoomCanvas';
import { useLibrary } from './LibraryProvider';
import type { World } from '@/lib/room/render';
import type { RoomState } from '@/lib/room/types';
import { pickedTheme } from '@/lib/room/logic';
import {
  canPlant, fits, hiddenEntries, levelSlots, parseGarden, placeGarden, seedsTotal, seedsUsed, serializeGarden,
  type GardenEntry, type PlantCat, type PlantDef, type PlantsData, type Slot,
} from '@/lib/room/garden';

type Mode = { kind: 'idle' } | { kind: 'plant'; p: PlantDef } | { kind: 'sel'; e: GardenEntry } | { kind: 'move'; e: GardenEntry };

/**
 * 식물 정원: 10권마다 씨앗 1개. 식물을 고르고 → 방 그림에서 반짝이는 자리(+)를 눌러 심는다.
 * 심은 식물(●)을 누르면 옮기기·뽑기(씨앗 돌려받기). 상징목은 방마다 하나(1000권부터).
 */
export function Garden({ r }: { r: Renderer }) {
  const { profile, entries, roomBooks, updateProfile, say } = useLibrary();
  const data = r.plants;
  const [world, setWorld] = useState<World | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [cat, setCat] = useState<PlantCat>('L');
  const state: RoomState | null = useMemo(() => profile && {
    books: roomBooks, itemsOff: profile.itemsOff, hair: profile.hair, outfit: profile.outfit, theme: pickedTheme(profile.picks), tod: '낮', picks: profile.picks,
  }, [profile, roomBooks]);
  if (!profile || !state) return null;
  if (!data) return <p className="muted small">식물 그림을 불러오지 못했어요.</p>;

  const n = entries.length, g = parseGarden(profile.picks), total = seedsTotal(data, n), left = total - seedsUsed(data, g);
  const li = world?.li ?? 0, L = world?.level, slots = levelSlots(data, li);
  const defOf = (id: string) => data.plants.find((p) => p.id === id);
  // 이 방에 보이는 식물만 자리를 차지한다. 자리가 없는 식물은 아래 '보관 중'에서 다시 심거나 뽑는다
  const taken = new Map(placeGarden(data, li, g).map((d) => [d.slot.key, g.find((e) => e.s === d.slot.key && e.p === d.plant.id)!]));
  const hidden = world ? hiddenEntries(data, li, g) : [];
  const save = (next: GardenEntry[], msg: string) =>
    updateProfile({ picks: { ...profile.picks, garden: serializeGarden(next) } }).then(() => { say(msg); setMode({ kind: 'idle' }); }, (e: Error) => say(e.message));

  const tapSlot = (s: Slot) => {
    if (mode.kind === 'plant') save([...g, { p: mode.p.id, s: s.key }], `『${mode.p.name}』을(를) 심었어요 · 남은 씨앗 ${left - mode.p.seeds}개`);
    else if (mode.kind === 'move') save(g.map((e) => (e.s === mode.e.s && e.p === mode.e.p ? { ...e, s: s.key } : e)), '자리를 옮겼어요');
    else { const e = taken.get(s.key); if (e) setMode({ kind: 'sel', e }); }
  };
  const moving = mode.kind === 'move' ? defOf(mode.e.p) : null;
  const target = mode.kind === 'plant' ? mode.p : moving;
  // 지금 보여 줄 자리: 심는 중이면 맞는 빈자리(+), 아니면 심은 자리(●)
  const marks = slots.filter((s) => (target ? fits(target, s) && !taken.has(s.key) : taken.has(s.key)));
  const selDef = mode.kind === 'sel' ? defOf(mode.e.p) : null;

  return (
    <section className="garden" id="garden">
      <h2 className="shelfh">식물 정원</h2>
      <p className="seeds">남은 씨앗 <b>{Math.max(0, left)}</b>개 <span className="muted small">· 10권마다 1개 (모두 {total}개 · 심은 식물 {g.length}개)</span></p>
      {left < 0 && <p className="small muted">책이 줄어 씨앗이 {-left}개 모자라요. 심은 식물은 그대로 두고, 새로 심으려면 책을 더 꽂거나 식물을 뽑아 주세요.</p>}
      <div className="gardenroom">
        <RoomCanvas state={state} onWorld={(w) => setWorld(w)} />
        {L && marks.map((s) => {
          const e = taken.get(s.key), planted = !target && e;
          const y = s.kind === 'hang' ? s.y + 8 : s.kind === 'sym' && target?.slot === 'symTop' ? (s.top ?? 0) + 30 : s.y - 6;
          return (
            <button key={s.key} className={`gmark ${planted ? 'on' : 'free'} ${s.kind}`} style={{ left: `${(s.x / L.W) * 100}%`, top: `${(y / L.H) * 100}%` }}
              aria-label={planted ? `${defOf(e!.p)?.name ?? '식물'} 고르기` : '여기에 심기'} onClick={() => tapSlot(s)}>
              {planted ? '' : '+'}
            </button>
          );
        })}
      </div>
      <div className="ghint" aria-live="polite">
        {mode.kind === 'idle' && <span className="muted small">아래에서 식물을 고르면 심을 수 있는 자리가 반짝여요. 심은 식물의 ● 를 누르면 옮기거나 뽑을 수 있어요.</span>}
        {target && <><span>『{target.name}』 {mode.kind === 'move' ? '옮길' : '심을'} 자리(+)를 눌러요{marks.length === 0 ? ' — 이 방엔 빈자리가 없어요' : ''}</span>
          <button className="chip" onClick={() => setMode({ kind: 'idle' })}>취소</button></>}
        {selDef && mode.kind === 'sel' && <>
          <span><b>{selDef.name}</b></span>
          <button className="chip" onClick={() => setMode({ kind: 'move', e: mode.e })}>옮기기</button>
          <button className="chip" onClick={() => save(g.filter((x) => !(x.s === mode.e.s && x.p === mode.e.p)), `『${selDef.name}』을(를) 뽑았어요 · 씨앗 ${selDef.seeds}개 돌려받음`)}>뽑기 (씨앗 {selDef.seeds}개 돌려받기)</button>
          <button className="chip" onClick={() => setMode({ kind: 'idle' })}>닫기</button></>}
      </div>
      {hidden.length > 0 && (
        <div className="ghidden">
          <p className="small"><b>보관 중인 식물 {hidden.length}개</b> <span className="muted">· 이 방에는 맞는 자리가 없어 보이지 않아요. 방이 넓어지면 다시 보이거나, 지금 빈자리로 옮길 수 있어요.</span></p>
          <ul>
            {hidden.map((e) => {
              const d = defOf(e.p), room = !!d && slots.some((sl) => fits(d, sl) && !taken.has(sl.key));
              return (
                <li key={e.p + e.s}>
                  <span>{d?.name ?? '알 수 없는 식물'}</span>
                  {room && <button className="chip" onClick={() => setMode({ kind: 'move', e })}>빈자리로 옮기기</button>}
                  <button className="chip" onClick={() => save(g.filter((x) => !(x.s === e.s && x.p === e.p)), `${d?.name ?? '식물'}을(를) 뽑았어요${d ? ` · 씨앗 ${d.seeds}개 돌려받음` : ''}`)}>뽑기</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="tabs3 gtabs" role="tablist">
        {data.cats.map((c) => <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</button>)}
      </div>
      <PlantGrid data={data} cat={cat} books={n} g={g} li={li} sel={mode.kind === 'plant' ? mode.p.id : null} onPick={(p) => setMode({ kind: 'plant', p })} />
    </section>
  );
}

/** 미리보기 배율: 작은 식물은 정수 배로 키우고(또렷하게), 큰 식물은 칸에 맞게 줄인다 */
const thumbK = (p: PlantDef) => { const k = Math.min(72 / p.h, 96 / p.w); return k >= 1 ? Math.min(4, Math.floor(k)) : k; };

function PlantGrid({ data, cat, books, g, li, sel, onPick }: {
  data: PlantsData; cat: PlantCat; books: number; g: GardenEntry[]; li: number; sel: string | null; onPick: (p: PlantDef) => void;
}) {
  return (
    <ul className="pgrid">
      {data.plants.filter((p) => p.cat === cat).map((p) => {
        const c = canPlant(data, p, books, g, li);
        return (
          <li key={p.id}>
            <button className="pcard" aria-pressed={sel === p.id} disabled={!c.ok} onClick={() => onPick(p)} title={c.why || p.name}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 픽셀 식물 미리보기 */}
              <img className="pix" src={`/art/${p.img}`} alt="" width={p.w * thumbK(p)} height={p.h * thumbK(p)} />
              <b>{p.name}</b>
              <small>{c.ok ? `씨앗 ${p.seeds}` : c.why}</small>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
