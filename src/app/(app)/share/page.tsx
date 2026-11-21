'use client';
import { useLibrary } from '@/components/LibraryProvider';
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
      <p className="muted small">공유 카드 이미지 저장(보유량·자랑 책장·컨셉·인테리어, 9:16)은 다음 단계에서 붙입니다.</p>
    </div>
  );
}
