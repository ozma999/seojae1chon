'use client';
import { useEffect, useState } from 'react';
import { useLibrary } from '@/components/LibraryProvider';
import type { InviteCode } from '@/lib/data/types';
import { useClock } from '@/hooks/useClock';
import { GENRE_NAME, thicknessMm } from '@/lib/room/logic';
import type { Genre } from '@/lib/room/types';

/** 공유 카드 4종(9:16)은 다음 단계. 지금은 카드에 들어갈 숫자만 보여준다 */
export default function SharePage() {
  const { entries } = useLibrary();
  const paper = entries.filter((e) => e.format === 'paper');
  const mm = paper.reduce((a, e) => a + thicknessMm(e), 0);
  const cnt = (Object.keys(GENRE_NAME) as Genre[]).map((g) => [g, entries.filter((e) => e.genre === g).length] as const);
  return (
    <div className="pad">
      <h1 className="h">공유</h1>
      <section className="card">
        <h2>보유량</h2>
        <p className="big">{entries.length.toLocaleString()}<small>권</small></p>
        <p className="muted small">종이 {paper.length.toLocaleString()} · 전자 {(entries.length - paper.length).toLocaleString()} · 실물 인증 {entries.filter((e) => e.verified).length.toLocaleString()}</p>
        <p>종이책을 쌓으면 <b className="neon">{(mm / 1000).toFixed(1)}m</b>, 아파트 약 {Math.floor(mm / 2800).toLocaleString()}층</p>
      </section>
      <section className="card">
        <h2>컨셉</h2>
        {cnt.map(([g, c]) => (
          <div key={g} className="genre"><span>{GENRE_NAME[g]}</span><span className="prog"><i style={{ width: `${entries.length ? (c / entries.length) * 100 : 0}%` }} /></span><span>{c}</span></div>
        ))}
      </section>
      <Invites />
      <p className="muted small">공유 카드 이미지 저장(보유량·자랑 책장·컨셉·인테리어, 9:16)은 다음 단계에서 붙입니다.</p>
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
      <h2>친구 초대</h2>
      <p className="muted small">코드 하나로 한 명이 가입할 수 있어요. 30일 동안 유효하고, 안 쓴 코드는 5개까지 만들 수 있어요.</p>
      <button className="btn primary" onClick={make} disabled={busy}>초대 코드 만들기</button>
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
