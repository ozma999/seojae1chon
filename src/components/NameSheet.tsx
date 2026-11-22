'use client';
import { useState } from 'react';
import { cleanRoomName, randomRoomName } from '@/lib/room/names';

/** 이름이 아직 '나의 서재'인 사람에게 한 번 묻는다 */
export function NameSheet({ onSave, onClose }: { onSave: (name: string) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(''), [busy, setBusy] = useState(false);
  return (
    <div className="sheetbg" onClick={onClose}>
      <form className="sheet" role="dialog" aria-modal="true" aria-label="서재 이름 짓기" onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); setBusy(true); onSave(cleanRoomName(name) || randomRoomName()).finally(() => setBusy(false)); }}>
        <button type="button" className="x" aria-label="닫기" onClick={onClose}>×</button>
        <h3>서재 이름을 지어 주세요</h3>
        <p className="muted small">서재산책에서 친구들에게 보이는 이름이에요. 꾸미기에서 언제든 바꿀 수 있어요.</p>
        <label className="field">서재 이름<input value={name} maxLength={20} placeholder="예: 새벽서가, 만화방 주인" onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => setName(randomRoomName())}>아무거나 추천</button>
          <button className="btn primary" disabled={busy}>{name.trim() ? '이걸로 할게요' : '추천 이름으로'}</button>
        </div>
      </form>
    </div>
  );
}
