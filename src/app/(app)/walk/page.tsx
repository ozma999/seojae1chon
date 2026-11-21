'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLibrary } from '@/components/LibraryProvider';
import { AvatarThumb } from '@/components/AvatarThumb';
import type { RoomSummary } from '@/lib/data/types';

/** 서재산책: 초대받은 지인들의 서재 목록 */
export default function WalkPage() {
  const { repo, entries } = useLibrary();
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { repo.listRooms().then(setRooms, (e: Error) => setErr(e.message)); }, [repo, entries.length]);
  return (
    <div className="pad">
      <h1 className="h">서재산책</h1>
      <p className="muted small">초대받은 지인들의 서재를 구경해요. 들어가면 그 서재의 오늘 방문 수가 하나 올라가요.</p>
      {err && <p className="err">{err}</p>}
      {!rooms && !err && <p className="muted">불러오는 중…</p>}
      <ul className="rooms">
        {rooms?.map((r) => (
          <li key={r.id}>
            <Link href={r.isMe ? '/room' : `/walk/${r.id}`}>
              <AvatarThumb hair={r.hair} outfit={r.outfit} scale={1} />
              <span>
                <b>{r.roomName}{r.isMe ? ' (내 서재)' : ''}</b>
                <small className="muted">책 {r.books.toLocaleString()}권 · 자랑 책장 {r.brag}권</small>
              </span>
              <span className="go" aria-hidden>›</span>
            </Link>
          </li>
        ))}
      </ul>
      {rooms && rooms.length === 1 && <p className="muted small">아직 둘러볼 서재가 없어요. 공유 탭에서 초대 코드를 만들어 지인에게 보내 보세요.</p>}
    </div>
  );
}
