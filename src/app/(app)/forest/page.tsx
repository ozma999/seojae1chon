'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useLibrary } from '@/components/LibraryProvider';
import { AvatarThumb } from '@/components/AvatarThumb';
import { ScanOnce } from '@/components/ScanOnce';
import { BulkScan, PasteBulk } from '@/components/BulkAdd';
import { PhotoScan } from '@/components/PhotoScan';
import { ago } from '@/components/Guestbook';
import { canUseCamera } from '@/lib/books/barcode';
import type { BookInfo } from '@/lib/books/nl';
import type { Forest, ForestBook, ForestLoan } from '@/lib/data/types';

const day = 864e5;
const dueText = (due: number, now: number) => {
  const d = Math.ceil((due - now) / day);
  return d < 0 ? `${-d}일 연체` : d === 0 ? '오늘 반납' : `D-${d}`;
};
const md = (t: number) => new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
const titleOf = (b: { title: string; vol: number | null; series?: string | null }) => `${b.title}${b.vol && !b.title.includes(String(b.vol)) ? ` ${b.vol}` : ''}`;

/** 도서관숲: 실제로 함께 쓰는 책장. 바코드로 빌리기·반납, 지금 누가 빌렸는지, 모든 대여 기록 */
export default function ForestPage() {
  const { repo, profile, say } = useLibrary();
  const [f, setF] = useState<Forest | null | undefined>(undefined);
  const [log, setLog] = useState<ForestLoan[]>([]);
  const [tab, setTab] = useState<'books' | 'out' | 'log'>('books');
  const [q, setQ] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [scan, setScan] = useState<'borrow' | 'return' | null>(null);
  const [pick, setPick] = useState<ForestBook | null>(null);
  const [reg, setReg] = useState<'scan' | 'paste' | 'photo' | null>(null);
  const [now, setNow] = useState(0);
  const cam = useSyncExternalStore(() => () => {}, canUseCamera, () => false);
  const load = useCallback(async () => {
    try { const [a, b] = await Promise.all([repo.forest(), repo.forestActivity()]); setF(a); setLog(b); setNow(Date.now()); }
    catch (e) { say((e as Error).message); setF(null); }
  }, [repo, say]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const me = profile?.id;
  const mine = useMemo(() => (f?.books ?? []).flatMap((b) => b.out.filter((l) => l.user.id === me)).sort((a, b) => a.dueAt - b.dueAt), [f, me]);
  const out = useMemo(() => (f?.books ?? []).flatMap((b) => b.out).sort((a, b) => a.dueAt - b.dueAt), [f]);
  const books = useMemo(() => {
    const t = q.toLowerCase().replace(/\s/g, '');
    return (f?.books ?? []).filter((b) => (!t || (b.title + (b.author ?? '') + (b.series ?? '') + (b.publisher ?? '')).toLowerCase().replace(/\s/g, '').includes(t) || b.isbn === t)
      && (!onlyFree || b.out.length < b.copies))
      .sort((a, b) => a.title.localeCompare(b.title, 'ko') || (a.vol ?? 0) - (b.vol ?? 0));
  }, [f, q, onlyFree]);
  const events = useMemo(() => log.flatMap((l) => [{ t: l.borrowedAt, kind: 'borrow' as const, l }, ...(l.returnedAt ? [{ t: l.returnedAt, kind: 'return' as const, l }] : [])])
    .sort((a, b) => b.t - a.t).slice(0, 80), [log]);

  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); say(ok); setPick(null); await load(); } catch (e) { say((e as Error).message); } };
  const byIsbn = (isbn: string) => f?.books.find((b) => b.isbn === isbn);
  const onScan = useCallback((isbn: string) => {
    const mode = scan; setScan(null);
    const b = f?.books.find((x) => x.isbn === isbn);
    if (!b) { say('도서관숲에 없는 책이에요'); return; }
    if (mode === 'return') act(() => repo.forestReturn({ isbn }), `『${titleOf(b)}』 반납했어요`);
    else setPick(b);   // 빌리기 전에 한 번 확인
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan, f]);
  const register = async (list: BookInfo[]) => { const r = await repo.forestAdd(list.map((b) => b.isbn)); await load(); return `도서관숲에 ${r.added}권 등록했어요${r.skipped ? ` (이미 있는 ${r.skipped}권 제외)` : ''}`; };

  if (f === undefined) return <p className="pad muted">도서관숲을 여는 중…</p>;
  if (f === null) return <div className="pad"><h1 className="h">도서관숲</h1><p className="muted">도서관숲이 아직 준비되지 않았어요. 관리자가 DB 설정(SQL)을 실행하면 열려요.</p></div>;
  const free = (b: ForestBook) => b.copies - b.out.length;
  return (
    <div className="pad forest">
      <h1 className="h">{f.library.name}</h1>
      <p className="muted small">{f.library.place ? `${f.library.place} · ` : ''}함께 쓰는 책장 · 책 {f.books.length.toLocaleString()}권 · 지금 대여 중 {out.length}권 · 대여 기간 {f.library.loanDays}일</p>
      <div className="bigbtns">
        <button className="btn primary big" onClick={() => (cam ? setScan('borrow') : (setTab('books'), say('목록에서 빌릴 책을 눌러 주세요')))}><b>빌리기</b><small>{cam ? '책 뒤 바코드 찍기' : '목록에서 고르기'}</small></button>
        <button className="btn big" onClick={() => (cam ? setScan('return') : mine.length ? say('아래 내가 빌린 책에서 반납을 눌러 주세요') : say('빌린 책이 없어요'))}><b>반납하기</b><small>{cam ? '찍으면 바로 반납' : '내가 빌린 책에서'}</small></button>
      </div>
      {mine.length > 0 && (
        <section className="card mine">
          <h2>내가 빌린 책 {mine.length}권</h2>
          <ul className="loans">
            {mine.map((l) => (
              <li key={l.id} className={l.dueAt < now ? 'late' : ''}>
                <span><b>{titleOf(l)}</b><small className="muted">{md(l.borrowedAt)} 빌림 · {md(l.dueAt)}까지</small></span>
                <span className="due">{dueText(l.dueAt, now)}</span>
                <span className="chiprow tight">
                  <button className="chip" onClick={() => act(() => repo.forestExtend(l.id), '반납일을 연장했어요')}>연장</button>
                  <button className="chip" aria-pressed onClick={() => act(() => repo.forestReturn({ loanId: l.id }), '반납했어요')}>반납</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="tabs3" role="tablist">
        <button role="tab" aria-selected={tab === 'books'} onClick={() => setTab('books')}>책 <small>{f.books.length}</small></button>
        <button role="tab" aria-selected={tab === 'out'} onClick={() => setTab('out')}>대여 중 <small>{out.length}</small></button>
        <button role="tab" aria-selected={tab === 'log'} onClick={() => setTab('log')}>기록</button>
      </div>
      {tab === 'books' && (
        <section className="card">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="도서관숲에서 찾기: 제목·작가·시리즈" aria-label="도서관숲에서 찾기" />
          <div className="chiprow"><button className="chip" aria-pressed={onlyFree} onClick={() => setOnlyFree((v) => !v)}>빌릴 수 있는 책만</button></div>
          <ul className="results books">
            {books.slice(0, 400).map((b) => (
              <li key={b.id}><button className="bookrow" onClick={() => setPick(b)}>
                <b>{titleOf(b)}</b>
                <span className="small"><span className={free(b) > 0 ? 'free' : 'busy'}>{free(b) > 0 ? '대여 가능' : '대여 중'}</span>
                  <span className="muted">{[b.author, b.shelf, b.copies > 1 ? `${b.copies}권 중 ${free(b)}권 남음` : null].filter(Boolean).map((x) => ` · ${x}`).join('')}</span>
                  {b.out[0] && <span className="muted"> · {b.out.map((l) => l.user.roomName).join(', ')} · {md(b.out[0].dueAt)}까지</span>}</span>
              </button></li>
            ))}
          </ul>
          {!books.length && <p className="muted small">{f.books.length ? '조건에 맞는 책이 없어요' : '아직 등록된 책이 없어요'}</p>}
        </section>
      )}
      {tab === 'out' && (
        <section className="card">
          {!out.length && <p className="muted small">지금 빌려 간 책이 없어요</p>}
          <ul className="loans">
            {out.map((l) => (
              <li key={l.id} className={l.dueAt < now ? 'late' : ''}>
                <Link href={`/walk/${l.user.id}`} className="who"><AvatarThumb hair={l.user.hair} outfit={l.user.outfit} scale={1} /></Link>
                <span><b>{titleOf(l)}</b><small className="muted">{l.user.roomName} · {md(l.borrowedAt)} 빌림 · {md(l.dueAt)}까지</small></span>
                <span className="due">{dueText(l.dueAt, now)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab === 'log' && (
        <section className="card">
          <p className="muted small">도서관숲의 모든 대여·반납 기록이에요. 누구나 볼 수 있어요.</p>
          <ul className="feed">
            {events.map((e, i) => (
              <li key={i}>
                <AvatarThumb hair={e.l.user.hair} outfit={e.l.user.outfit} scale={1} />
                <span><span><b>{e.l.user.roomName}</b>님이 『{titleOf(e.l)}』 {e.kind === 'borrow' ? '빌렸어요' : '반납했어요'}</span><small className="muted">{ago(e.t, now)}</small></span>
                <span className={`tag ${e.kind}`}>{e.kind === 'borrow' ? '대여' : '반납'}</span>
              </li>
            ))}
          </ul>
          {!events.length && <p className="muted small">아직 기록이 없어요</p>}
        </section>
      )}
      {f.canManage && (
        <section className="card">
          <h2>책 등록 <small className="muted">관리자</small></h2>
          <p className="muted small">도서관숲 책장에 있는 책을 등록해요. 이미 등록된 책은 건너뛰어요. 책장에는 <Link href="/forest/poster">QR 안내문</Link>을 인쇄해 붙여 두세요.</p>
          <div className="bulkbtns">
            {cam && <button className="btn" onClick={() => setReg('scan')}><b>연속 바코드</b><small>책 뒷면을 차례로</small></button>}
            <button className="btn" onClick={() => setReg('photo')}><b>사진으로</b><small>책장 사진을 AI가 읽어요</small></button>
            <button className="btn" onClick={() => setReg('paste')}><b>목록 붙여넣기</b><small>제목·ISBN 목록</small></button>
          </div>
        </section>
      )}
      {scan && <ScanOnce title={scan === 'borrow' ? '빌릴 책 바코드' : '반납할 책 바코드'} hint={scan === 'borrow' ? '빌릴 책 뒤의 바코드를 비춰 주세요' : '반납할 책 뒤의 바코드를 비춰 주세요. 찍히면 바로 반납돼요'} onCode={onScan} onClose={() => setScan(null)} />}
      {reg === 'scan' && <BulkScan title="도서관숲 책 등록" onClose={() => setReg(null)} onAdd={register} skip={new Set(f.books.map((b) => b.isbn))} skipLabel="이미 도서관숲에 있음" />}
      {reg === 'paste' && <PasteBulk title="도서관숲 책 등록" onClose={() => setReg(null)} onAdd={register} skip={new Set(f.books.map((b) => b.isbn))} />}
      {reg === 'photo' && <PhotoScan onClose={() => setReg(null)} onAdd={register} skip={new Set(f.books.map((b) => b.isbn))} />}
      {pick && <ForestSheet b={byIsbn(pick.isbn) ?? pick} me={me} now={now} log={log.filter((l) => l.isbn === pick.isbn)} canManage={f.canManage} onClose={() => setPick(null)}
        onBorrow={() => act(() => repo.forestBorrow(pick.isbn), `『${titleOf(pick)}』 빌렸어요. ${f.library.loanDays}일 뒤까지 반납해 주세요`)}
        onReturn={(id) => act(() => repo.forestReturn({ loanId: id }), '반납했어요')}
        onUpdate={(p) => act(() => repo.forestUpdate(pick.id, p), '저장했어요')}
        onRemove={() => { if (confirm(`『${titleOf(pick)}』을(를) 도서관숲에서 뺄까요? 대여 기록도 지워져요`)) act(() => repo.forestRemove(pick.id), '도서관숲에서 뺐어요'); }} />}
    </div>
  );
}

function ForestSheet({ b, me, now, log, canManage, onClose, onBorrow, onReturn, onUpdate, onRemove }: {
  b: ForestBook; me?: string; now: number; log: ForestLoan[]; canManage: boolean; onClose: () => void;
  onBorrow: () => void; onReturn: (loanId: string) => void; onUpdate: (p: { copies?: number; shelf?: string | null }) => void; onRemove: () => void;
}) {
  const [shelf, setShelf] = useState(b.shelf ?? '');
  const my = b.out.find((l) => l.user.id === me), free = b.copies - b.out.length;
  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={b.title} onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="닫기">×</button>
        <h3>{titleOf(b)}</h3>
        <p className="muted">{[b.author, b.publisher, b.shelf].filter(Boolean).join(' · ')}</p>
        <p><span className={free > 0 ? 'free' : 'busy'}>{free > 0 ? `대여 가능 (${free}/${b.copies}권)` : '모두 대여 중'}</span></p>
        {b.out.map((l) => <p key={l.id} className="small">{l.user.roomName} · {md(l.dueAt)}까지 <b className={l.dueAt < now ? 'late' : ''}>{dueText(l.dueAt, now)}</b></p>)}
        {my ? <button className="btn primary" onClick={() => onReturn(my.id)}>반납하기</button>
          : free > 0 ? <button className="btn primary" onClick={onBorrow}>빌리기</button>
          : <p className="muted small">반납되면 빌릴 수 있어요.</p>}
        {log.length > 0 && (
          <>
            <h4 className="sub2">이 책의 기록</h4>
            <ul className="feed small">{log.slice(0, 10).map((l) => <li key={l.id}><span>{l.user.roomName} · {md(l.borrowedAt)} 빌림{l.returnedAt ? ` → ${md(l.returnedAt)} 반납` : ' · 대여 중'}</span></li>)}</ul>
          </>
        )}
        {canManage && (
          <div className="manage">
            <h4 className="sub2">관리</h4>
            <div className="row">
              <span className="small">권수</span>
              <button className="chip" onClick={() => b.copies > 1 && onUpdate({ copies: b.copies - 1 })}>−</button><b>{b.copies}</b>
              <button className="chip" onClick={() => onUpdate({ copies: b.copies + 1 })}>+</button>
            </div>
            <label className="field">놓인 칸<input value={shelf} maxLength={30} placeholder="예: 2층 왼쪽" onChange={(e) => setShelf(e.target.value)} onBlur={() => shelf !== (b.shelf ?? '') && onUpdate({ shelf: shelf || null })} /></label>
            <button className="btn ghost danger" onClick={onRemove}>도서관숲에서 빼기</button>
          </div>
        )}
      </div>
    </div>
  );
}
