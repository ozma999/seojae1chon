'use client';
import { useEffect, useRef, useState } from 'react';
import { useLibrary } from './LibraryProvider';
import type { BookInfo } from '@/lib/books/nl';

/** 도서관숲 관리자: 제목·시리즈·작가로 찾아서 한 권 또는 시리즈 전체 등록 */
export function ForestSearchAdd({ have, onAdd }: { have: Set<string>; onAdd: (isbns: string[]) => Promise<string> }) {
  const { lookup, repo, say } = useLibrary();
  const [mode, setMode] = useState<'title' | 'author'>('title');
  const [q, setQ] = useState('');
  const [list, setList] = useState<BookInfo[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) return;
    const my = ++seq.current;
    const id = setTimeout(() => {
      lookup(mode === 'author' ? { author: t } : { title: t }).then((r) => { if (my === seq.current) setList(r.slice(0, 40)); }, () => { if (my === seq.current) setList([]); });
    }, 350);
    return () => clearTimeout(id);
  }, [q, mode, lookup]);
  const add = async (key: string, isbns: string[]) => {
    const todo = isbns.filter((i) => !have.has(i));
    if (!todo.length) { say('이미 모두 등록된 책이에요'); return; }
    setBusy(key);
    try { say(await onAdd(todo)); } catch (e) { say((e as Error).message); } finally { setBusy(null); }
  };
  const addSeries = async (b: BookInfo) => {
    setBusy('s:' + b.series);
    try {
      const vols = await repo.seriesVolumes(b.series!, b.publisher);
      setBusy(null);
      await add('s:' + b.series, vols.map((v) => v.isbn));
    } catch (e) { say((e as Error).message); setBusy(null); }
  };
  const series = [...new Map((list ?? []).filter((b) => b.series).map((b) => [b.series!, b])).values()].slice(0, 3);
  return (
    <div className="fsearch">
      <div className="chiprow" role="group" aria-label="찾는 방법">
        <button className="chip" aria-pressed={mode === 'title'} onClick={() => setMode('title')}>제목·시리즈</button>
        <button className="chip" aria-pressed={mode === 'author'} onClick={() => setMode('author')}>작가</button>
      </div>
      <input type="search" value={q} onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) setList(null); }} placeholder={mode === 'author' ? '작가 이름 (예: 우라사와 나오키)' : '책 제목이나 시리즈 (예: 마스터 키튼)'} aria-label="등록할 책 찾기" />
      {series.length > 0 && (
        <div className="chiprow">
          {series.map((b) => <button key={b.series} className="chip" aria-pressed disabled={!!busy} onClick={() => addSeries(b)}>{busy === 's:' + b.series ? '등록 중…' : `『${b.series}』 전체 등록`}</button>)}
        </div>
      )}
      {list && !list.length && <p className="muted small">찾는 책이 없어요</p>}
      <ul className="results books">
        {(list ?? []).map((b) => (
          <li key={b.isbn} className="fsrow">
            <span><b>{b.title}</b><small className="muted">{[b.author, b.publisher, b.pubDate?.slice(0, 4)].filter(Boolean).join(' · ')}</small></span>
            {have.has(b.isbn) ? <small className="muted">등록됨</small>
              : <button className="chip" disabled={busy === b.isbn} onClick={() => add(b.isbn, [b.isbn])}>{busy === b.isbn ? '…' : '등록'}</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
