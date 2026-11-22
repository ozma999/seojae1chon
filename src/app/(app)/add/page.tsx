'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLibrary } from '@/components/LibraryProvider';
import type { BookInfo } from '@/lib/books/nl';
import { normalizeIsbn } from '@/lib/books/isbn';
import type { AddMethod } from '@/lib/data/types';
import { GENRE_NAME } from '@/lib/room/logic';
import { missingVols } from '@/lib/books/series';
import { canUseCamera, getDetector } from '@/lib/books/barcode';


const looksLikeIsbn = (s: string) => /^[\d\s-]{10,17}[\dXx]?$/.test(s.trim()) && s.replace(/\D/g, '').length >= 10;

export default function AddPage() {
  const { lookup, add, entries, say } = useLibrary();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BookInfo[] | null>(null);
  const [method, setMethod] = useState<AddMethod>('search');
  const [scan, setScan] = useState(false);
  const [series, setSeries] = useState<BookInfo | null>(null);
  const canScan = useSyncExternalStore(() => () => {}, canUseCamera, () => false);
  const seq = useRef(0);

  /** 검색(가장 마지막 요청의 결과만 보여준다) */
  const find = async (text: string, m: AddMethod, quiet = false) => {
    const t = text.trim(), isbn = normalizeIsbn(t), my = ++seq.current;
    if (!t) { setResults(null); return; }
    if (!isbn && looksLikeIsbn(t)) { if (!quiet) say('ISBN 숫자가 맞지 않아요. 책 뒷면의 13자리를 다시 확인해 주세요'); return; }
    setBusy(true);
    try {
      const r = await lookup(isbn ? { isbn } : { title: t });
      if (my !== seq.current) return;
      setMethod(m);
      setResults(r);
      if (!r.length && !quiet) say(isbn ? '찾지 못한 ISBN이에요' : '찾는 책이 없어요');
    } catch (e) { if (my === seq.current && !quiet) say((e as Error).message); }
    finally { if (my === seq.current) setBusy(false); }
  };
  // 자동완성: 입력을 멈추고 0.35초 뒤 검색(제목 2글자 이상 또는 ISBN 13자리)
  useEffect(() => {
    const t = q.trim();
    if (!(normalizeIsbn(t) || (t.length >= 2 && !looksLikeIsbn(t)))) return;
    const id = setTimeout(() => find(t, 'search', true), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const owned = (b: BookInfo) => entries.some((e) => e.isbn === b.isbn && e.format === b.format);
  // 기다리지 않는다: 화면에는 바로 '서재에 있음', 저장은 뒤에서(실패하면 되돌리고 알림)
  const addOne = (b: BookInfo) => {
    say(`'${b.title}'을(를) 서재에 꽂았어요`);
    add(b, method).catch((e: Error) => say(`'${b.title}' 저장 실패: ${e.message}`));
  };

  return (
    <div className="pad">
      <h1 className="h">책 등록</h1>
      <form className="row" onSubmit={(e) => { e.preventDefault(); find(q, 'search'); }}>
        <input value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value.trim()) setResults(null); }}
          placeholder="제목·작가 또는 ISBN 13자리" aria-label="ISBN 또는 제목" inputMode="search" autoComplete="off" />
        <button className="btn primary" disabled={busy}>{busy ? '찾는 중' : '찾기'}</button>
      </form>
      {canScan ? (
        <button className="btn" onClick={() => setScan((s) => !s)}>{scan ? '카메라 닫기' : '바코드 찍기'}</button>
      ) : (
        <p className="muted small">이 브라우저에서는 카메라를 쓸 수 없어요. 제목을 치거나 책 뒷면의 ISBN 13자리를 입력해 주세요.</p>
      )}
      {scan && <Scanner onCode={(code) => { setScan(false); setQ(code); find(code, 'barcode'); }} />}
      {busy && !results && <p className="muted small">찾는 중…</p>}
      {results && (
        <ul className="results" aria-live="polite">
          {results.map((b) => (
            <li key={b.isbn + b.format}>
              <div>
                <b>{b.title}</b>
                <span className="muted small">{[b.author, b.publisher, b.pubDate].filter(Boolean).join(' · ')}</span>
                <span className="muted small">{b.pages ? `${b.pages}쪽` : '쪽수 모름'} · {b.format === 'ebook' ? '전자책' : '종이책'} · {GENRE_NAME[b.genre]}{b.genreSource === 'default' ? '(추정)' : ''}{b.series ? ` · ${b.series} 시리즈 ${b.vol}권` : ''}</span>
              </div>
              {owned(b) ? <span className="muted small owned">✓ 서재에 있음</span> : (
                <button className="btn primary sm" onClick={() => (b.series ? setSeries(b) : addOne(b))}>추가</button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">도서 정보 제공: Google Books · 국립중앙도서관</p>
      <section className="card">
        <h2>책장 사진으로 한꺼번에</h2>
        <p className="muted small">책장을 한 칸씩 찍으면 책등을 읽어 한 번에 추가해요. 다음 단계에서 붙입니다.</p>
      </section>
      {series && <SeriesSheet book={series} method={method} onClose={() => setSeries(null)} onOne={() => { addOne(series); setSeries(null); }}
        onSearch={(text) => { setSeries(null); setQ(text); }} />}
    </div>
  );
}

/** 시리즈 책을 고르면: 이 권만 / 전체 / 일부 */
function SeriesSheet({ book, method, onClose, onOne, onSearch }: { book: BookInfo; method: AddMethod; onClose: () => void; onOne: () => void; onSearch: (text: string) => void }) {
  const { repo, addMany, entries, say } = useLibrary();
  const [vols, setVols] = useState<BookInfo[] | null>(null);
  const [mode, setMode] = useState<'ask' | 'pick'>('ask');
  const [pick, setPick] = useState<Set<string>>(new Set());
  const has = (b: BookInfo) => entries.some((e) => e.isbn === b.isbn);
  const load = async () => {
    const v = await repo.seriesVolumes(book.series!, book.publisher);
    const list = v.some((x) => x.isbn === book.isbn) ? v : [...v, book].sort((a, b) => (a.vol ?? 0) - (b.vol ?? 0));
    setVols(list);
    return list;
  };
  const addList = async (list: BookInfo[]) => {
    const todo = list.filter((b) => !has(b));
    if (!todo.length) { say('이미 모두 서재에 있어요'); onClose(); return; }
    // 창은 바로 닫고, 꽂기는 뒤에서(아래 작은 표시로 진행 중을 알림)
    onClose();
    addMany(todo, method === 'barcode' ? 'search' : method)
      .then((added) => say(`${book.series} ${added.length}권을 서재에 꽂았어요`), (e: Error) => say(`저장 실패: ${e.message}`));
  };
  const all = async () => { try { await addList(await load()); } catch (e) { say((e as Error).message); } };
  const some = async () => {
    setMode('pick');
    try { const l = await load(); setPick(new Set(l.filter((b) => !has(b) && b.isbn === book.isbn).map((b) => b.isbn))); } catch (e) { say((e as Error).message); }
  };
  const toggle = (isbn: string) => setPick((s) => { const n = new Set(s); if (n.has(isbn)) n.delete(isbn); else n.add(isbn); return n; });
  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={`${book.series} 시리즈 추가`} onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="닫기">×</button>
        <h3>&lsquo;{book.series}&rsquo; 시리즈예요</h3>
        <p className="muted small">{[book.author, book.publisher].filter(Boolean).join(' · ')}</p>
        {mode === 'ask' ? (
          <>
            <button className="btn primary" onClick={onOne}>{book.vol}권만 추가</button>
            <button className="btn" onClick={all}>시리즈 전체 추가</button>
            <button className="btn ghost" onClick={some}>일부 고르기</button>
          </>
        ) : !vols ? <p className="muted">권 목록을 불러오는 중…</p> : (
          <>
            <div className="chiprow">
              <button className="chip" onClick={() => setPick(new Set(vols.filter((b) => !has(b)).map((b) => b.isbn)))}>전체 선택</button>
              <button className="chip" onClick={() => setPick(new Set())}>선택 해제</button>
            </div>
            <ul className="vols">
              {vols.map((b) => (
                <li key={b.isbn}>
                  <label className={has(b) ? 'owned' : ''}>
                    <input type="checkbox" disabled={has(b)} checked={has(b) || pick.has(b.isbn)} onChange={() => toggle(b.isbn)} />
                    <span>{b.vol}권</span>{has(b) && <small>있음</small>}
                  </label>
                </li>
              ))}
            </ul>
            <p className="muted small">검색으로 찾은 {vols.length}권이에요.</p>
            {missingVols(vols.map((b) => b.vol ?? 0).filter(Boolean)).length > 0 && (
              <div className="gaps">
                <p className="small">찾지 못한 권 · 누르면 그 권만 다시 검색해요(바코드로 찍어도 돼요)</p>
                <div className="chiprow">
                  {missingVols(vols.map((b) => b.vol ?? 0).filter(Boolean)).slice(0, 30).map((v) => (
                    <button key={v} className="chip" onClick={() => onSearch(`${book.series} ${v}`)}>{v}권</button>
                  ))}
                </div>
              </div>
            )}
            <button className="btn primary" disabled={!pick.size} onClick={() => addList(vols.filter((b) => pick.has(b.isbn)))}>선택한 {pick.size}권 추가</button>
          </>
        )}
      </div>
    </div>
  );
}

function Scanner({ onCode }: { onCode: (isbn: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState('책 뒷면 바코드를 화면 가운데에 맞춰 주세요');
  useEffect(() => {
    let stream: MediaStream | null = null, stop = false;
    (async () => {
      try {
        const det = await getDetector();   // 아이폰은 여기서 인식기(약 1MB)를 처음 한 번 받는다
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stop) {
          const codes = await det.detect(video.current).catch(() => []);
          const isbn = codes.map((c) => normalizeIsbn(c.rawValue)).find((x) => x && /^97[89]/.test(x));
          if (isbn) return onCode(isbn);
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch { setMsg('카메라를 쓸 수 없어요. 권한을 확인하거나 ISBN을 입력해 주세요'); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);
  return (
    <div className="scanner">
      <video ref={video} playsInline muted />
      <p className="small">{msg}</p>
    </div>
  );
}
