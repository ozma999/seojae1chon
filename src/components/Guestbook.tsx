'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useLibrary } from './LibraryProvider';
import { AvatarThumb } from './AvatarThumb';
import type { GuestNote } from '@/lib/data/types';

export const ago = (t: number, now = Date.now()) => {
  const m = Math.floor((now - t) / 60000);
  return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : m < 43200 ? `${Math.floor(m / 1440)}일 전` : new Date(t).toLocaleDateString('ko-KR');
};

/** 방명록(일촌평). 일촌이면 쓰기, 주인·글쓴이는 지우기. 주인이 보면 새 글을 읽음으로 */
export function Guestbook({ host, canWrite, isHost, limit }: { host: string; canWrite: boolean; isHost: boolean; limit?: number }) {
  const { repo, say, profile } = useLibrary();
  const [list, setList] = useState<GuestNote[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState(false);
  const [now, setNow] = useState(0);
  const load = useCallback(() => repo.guestbook(host).then((l) => { setList(l); setNow(Date.now()); }, (e: Error) => say(e.message)), [repo, host, say]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isHost && list?.some((g) => !g.readAt)) repo.markGuestbookRead().catch(() => {}); }, [isHost, list, repo]);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await repo.writeGuestbook(host, text); setText(''); await load(); say('방명록을 남겼어요'); }
    catch (e) { say((e as Error).message); } finally { setBusy(false); }
  };
  const del = async (g: GuestNote) => {
    if (!confirm('이 글을 지울까요?')) return;
    try { await repo.deleteGuestbook(g.id); await load(); } catch (e) { say((e as Error).message); }
  };
  const shown = list ? (all || !limit ? list : list.slice(0, limit)) : [];
  return (
    <section className="card guestbook">
      <h2>방명록 {list && list.length > 0 && <small className="muted">{list.length}</small>}</h2>
      {canWrite && (
        <div className="gbform">
          <textarea value={text} maxLength={200} rows={2} placeholder="일촌평 한마디 남기기" onChange={(e) => setText(e.target.value)} aria-label="방명록 쓰기" />
          <button className="btn primary sm" disabled={busy || !text.trim()} onClick={send}>남기기</button>
        </div>
      )}
      {!canWrite && !isHost && <p className="muted small">일촌이 되면 방명록을 남길 수 있어요.</p>}
      {list && !list.length && <p className="muted small">{isHost ? '아직 방명록이 없어요. 일촌을 초대해 보세요' : '첫 방명록을 남겨 보세요'}</p>}
      <ul className="gblist">
        {shown.map((g) => (
          <li key={g.id} className={isHost && !g.readAt ? 'new' : ''}>
            <AvatarThumb hair={g.author.hair} outfit={g.author.outfit} scale={1} />
            <div>
              <p className="gbmeta"><Link href={`/walk/${g.author.id}`}><b>{g.author.roomName}</b></Link> <small className="muted">{ago(g.createdAt, now)}</small>
                {isHost && !g.readAt && <span className="badge sm">새 글</span>}</p>
              {g.kind === 'borrow' && <p className="borrow">📚 빌려줘{g.bookTitle ? ` · 『${g.bookTitle}』` : ''}</p>}
              <p className="gbbody">{g.body}</p>
            </div>
            {(isHost || g.author.id === profile?.id) && <button className="x small" aria-label="지우기" onClick={() => del(g)}>×</button>}
          </li>
        ))}
      </ul>
      {limit && list && list.length > limit && <button className="link" onClick={() => setAll((v) => !v)}>{all ? '접기' : `방명록 ${list.length}개 모두 보기`}</button>}
    </section>
  );
}
