'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLibrary } from '@/components/LibraryProvider';
import { AvatarThumb } from '@/components/AvatarThumb';
import { ShareCards } from '@/components/ShareCards';
import type { IlchonRequest, InviteCode, RoomSummary } from '@/lib/data/types';
import { useClock } from '@/hooks/useClock';
import { markInvited } from '@/components/Onboarding';

/** 일촌: 오늘 방문 · 서재산책 · 일촌 맺기(초대) · 공유 카드 */
export default function IlchonPage() {
  const { repo, entries, say, refreshNews } = useLibrary();
  const [reqs, setReqs] = useState<IlchonRequest[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => { repo.ilchonRequests().then(setReqs, () => {}); }, [repo, tick]);
  const answer = async (r: IlchonRequest, ok: boolean) => {
    try { await (ok ? repo.ilchonAccept(r.id) : repo.ilchonRemove(r.id)); say(ok ? `${r.roomName}와(과) 일촌이 되었어요` : '신청을 거절했어요'); setTick((x) => x + 1); refreshNews(); }
    catch (e) { say((e as Error).message); }
  };
  const [visits, setVisits] = useState<number | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { repo.todayVisits().then(setVisits, () => {}); }, [repo]);
  useEffect(() => { repo.listRooms().then(setRooms, (e: Error) => setErr(e.message)); }, [repo, entries.length, tick]);
  const friends = rooms?.filter((r) => !r.isMe) ?? [];
  return (
    <div className="pad">
      <h1 className="h">일촌</h1>
      <div className="stats two">
        <div><b>{visits ?? '-'}</b><small>오늘 내 서재 방문</small></div>
        <div><b>{rooms ? friends.length : '-'}</b><small>일촌 서재</small></div>
      </div>
      {reqs.length > 0 && (
        <section className="card">
          <h2>받은 일촌 신청 <span className="badge sm">{reqs.length}</span></h2>
          <ul className="rooms">
            {reqs.map((r) => (
              <li key={r.id} className="reqrow">
                <Link href={`/walk/${r.id}`} className="reqname"><AvatarThumb hair={r.hair} outfit={r.outfit} scale={1} /><b>{r.roomName}</b></Link>
                <span className="chiprow tight"><button className="chip" aria-pressed onClick={() => answer(r, true)}>수락</button><button className="chip" onClick={() => answer(r, false)}>거절</button></span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="card">
        <h2>서재산책</h2>
        <p className="muted small">일촌의 서재를 구경해요. 들어가면 그 서재의 오늘 방문 수가 하나 올라가요.</p>
        {err && <p className="err">{err}</p>}
        {!rooms && !err && <p className="muted small">불러오는 중…</p>}
        <ul className="rooms">
          {friends.map((r) => (
            <li key={r.id}>
              <Link href={`/walk/${r.id}`}>
                <AvatarThumb hair={r.hair} outfit={r.outfit} scale={1} />
                <span><b>{r.roomName}{r.cohort === 'founding' && <span className="badge sm">태초가족</span>}</b><small className="muted">{r.title && <>{r.title} · </>}책 {r.books.toLocaleString()}권 · 자랑 책장 {r.brag}권</small></span>
                <span className="go" aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
        {rooms && !friends.length && <p className="muted small">아직 일촌이 없어요. 아래에서 초대 코드를 보내 일촌을 맺어 보세요.</p>}
      </section>
      <Invites />
      <ShareCards />
    </div>
  );
}

/** 친구 초대: 내 초대 코드 만들기 → 복사하거나 바로 보내기 */
function Invites() {
  const { repo, say, profile } = useLibrary();
  const [list, setList] = useState<InviteCode[] | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useClock()?.getTime() ?? 0;
  useEffect(() => { repo.myInvites().then(setList, (e: Error) => say(e.message)); }, [repo, say]);
  const message = (code: string) =>
    `${profile?.roomName ?? '서재일촌'}에서 초대했어요. 가진 책으로 픽셀 서재를 채워 보세요.\n${location.origin}/login?code=${code}\n초대 코드: ${code}`;
  const send = async (code: string) => {
    const text = message(code);
    markInvited();
    if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* 취소하면 복사로 */ } }
    await navigator.clipboard.writeText(text);
    say('초대 메시지를 복사했어요');
  };
  const make = async () => {
    setBusy(true);
    try { const code = await repo.createInvite(); setList(await repo.myInvites()); say(`초대 코드 ${code}를 만들었어요`); }
    catch (e) { say((e as Error).message); } finally { setBusy(false); }
  };
  const left = (i: InviteCode) => i.uses < i.maxUses && (!i.expiresAt || i.expiresAt > now);
  return (
    <section className="card">
      <h2>일촌 맺기</h2>
      <p className="muted small">초대 코드를 보내면 일촌이 돼요. 코드 하나로 한 명이 가입할 수 있어요. 30일 동안 유효하고, 안 쓴 코드는 5개까지 만들 수 있어요.</p>
      <div className="row">
        <button className="btn primary" onClick={make} disabled={busy}>초대 코드 만들기</button>
        <button className="btn" onClick={async () => {
          const url = `${location.origin}/walk/${profile?.id}`, text = `${profile?.roomName ?? '내 서재'}에 놀러 와요! 서재에서 '일촌 신청'을 눌러 주세요\n${url}`;
          markInvited();
          if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* 취소 */ } }
          await navigator.clipboard.writeText(text); say('내 서재 링크를 복사했어요');
        }}>내 서재 링크 보내기</button>
      </div>
      <p className="muted small">이미 가입한 사람은 내 서재 링크로 들어와 ‘일촌 신청’을 누르면 돼요.</p>
      <ul className="invites">
        {list?.map((i) => (
          <li key={i.code} className={left(i) ? '' : 'used'}>
            <code>{i.code}</code>
            <span className="muted small">{left(i) ? `~${new Date(i.expiresAt ?? 0).toLocaleDateString('ko-KR')}` : i.uses >= i.maxUses ? '가입 완료' : '만료'}</span>
            {left(i) && <button className="btn sm" onClick={() => send(i.code)}>보내기</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
