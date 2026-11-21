'use client';
import { useMemo, useState } from 'react';
import { useLibrary } from '@/components/LibraryProvider';
import { BookSheet } from '@/components/BookSheet';
import type { LibraryEntry } from '@/lib/data/types';
import { GENRE_NAME } from '@/lib/room/logic';

/** 내 서재 검색. 시리즈는 한 줄로 묶는다 */
export default function SearchPage() {
  const { entries } = useLibrary();
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<LibraryEntry | null>(null);
  const rows = useMemo(() => {
    const t = q.trim();
    const list = entries.filter((e) => !t || e.title.includes(t) || (e.author ?? '').includes(t) || e.isbn === t.replace(/-/g, ''));
    const seen = new Map<string, { e: LibraryEntry; n: number }>(), out: { e: LibraryEntry; n: number }[] = [];
    for (const e of list) {
      if (e.series) {
        const s = seen.get(e.series);
        if (s) { s.n++; continue; }
        const row = { e, n: 1 }; seen.set(e.series, row); out.push(row);
      } else out.push({ e, n: 1 });
    }
    return out;
  }, [entries, q]);
  return (
    <div className="pad">
      <h1 className="h">내 서재 검색</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목, 작가, ISBN" aria-label="검색어" />
      <p className="muted small">{q ? `검색 결과 ${rows.length}건` : `서재에 있는 책 ${entries.length.toLocaleString()}권 (시리즈는 한 줄로)`}</p>
      <ul className="results">
        {rows.slice(0, 200).map(({ e, n }) => (
          <li key={e.id} onClick={() => setPick(e)} className="tap">
            <div>
              <b>{n > 1 ? `${e.series} (${n}권)` : e.title}</b>
              <span className="muted small">{[e.author, GENRE_NAME[e.genre], e.format === 'ebook' ? '전자책' : null, e.bragAt ? '자랑 책장' : null].filter(Boolean).join(' · ')}</span>
            </div>
          </li>
        ))}
      </ul>
      {pick && <BookSheet entry={pick} onClose={() => setPick(null)} />}
    </div>
  );
}
