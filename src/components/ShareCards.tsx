'use client';
import { useEffect, useState } from 'react';
import { useLibrary } from './LibraryProvider';
import { getRenderer } from './RoomCanvas';
import { CARD_NAMES, drawCard, type CardType } from '@/lib/cards/draw';
import { autoTod } from '@/lib/room/time';

/** 공유 카드 4종: 고르면 바로 그려서 미리 보고, 이미지로 저장하거나 공유 */
export function ShareCards() {
  const { profile, entries, roomBooks, tod, say } = useLibrary();
  const [type, setType] = useState<CardType>('count');
  const [card, setCard] = useState<{ url: string; blob: Blob; key: string } | null>(null);
  const key = `${type}|${entries.length}|${roomBooks.filter((b) => b.bragAt).length}|${profile?.hair}|${profile?.outfit}`;
  useEffect(() => {
    if (!profile) return;
    let alive = true;
    (async () => {
      const r = await getRenderer();
      const now = new Date();
      const cv = await drawCard({ type, profile, entries, books: roomBooks, tod: tod ?? autoTod(now), now, renderer: r });
      const blob = await new Promise<Blob | null>((ok) => cv.toBlob(ok, 'image/png'));
      if (!alive || !blob) return;
      setCard((old) => { if (old) URL.revokeObjectURL(old.url); return { url: URL.createObjectURL(blob), blob, key }; });
    })().catch((e: Error) => say(`카드를 만들지 못했어요: ${e.message}`));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const file = () => new File([card!.blob], `seojae-${type}.png`, { type: 'image/png' });
  const share = async () => {
    if (!card) return;
    const f = file();
    if (navigator.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f], text: `${profile?.roomName} · 서재일촌` }); return; } catch { return; }
    }
    save();
  };
  const save = () => {
    if (!card) return;
    const a = document.createElement('a'); a.href = card.url; a.download = `seojae-${type}.png`; a.click();
    say('카드 이미지를 저장했어요');
  };
  const ready = card?.key === key;
  return (
    <section className="card">
      <h2>공유 카드</h2>
      <div className="chiprow" role="group" aria-label="카드 종류">
        {(Object.keys(CARD_NAMES) as CardType[]).map((t) => (
          <button key={t} className="chip" aria-pressed={type === t} onClick={() => setType(t)}>{CARD_NAMES[t]}</button>
        ))}
      </div>
      <div className="cardpreview">
        {card ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.url} alt={`${CARD_NAMES[type]} 공유 카드 미리보기`} style={{ opacity: ready ? 1 : 0.5 }} />
        ) : <p className="muted small">카드를 그리는 중…</p>}
      </div>
      <div className="row">
        <button className="btn primary" style={{ flex: 1 }} disabled={!ready} onClick={share}>공유하기</button>
        <button className="btn" style={{ flex: 1 }} disabled={!ready} onClick={save}>이미지 저장</button>
      </div>
      <p className="muted small">휴대폰에서는 공유하기로 카카오톡·인스타그램에 바로 보낼 수 있어요.</p>
    </section>
  );
}
