'use client';
import { useMemo, useState } from 'react';
import type { LibraryEntry } from '@/lib/data/types';
import { GENRE_NAME, thicknessMm } from '@/lib/room/logic';
import type { Genre } from '@/lib/room/types';
import { READ_LABEL } from './BookSheet';

export type QuickFilter = 'comment' | 'brag' | 'done' | 'reading' | 'want' | 'top' | 'lend' | 'ebook';
const QUICK: [QuickFilter, string][] = [
  ['comment', '추천 코멘트'], ['brag', '자랑 책장'], ['top', '별점 4+'], ['done', '다 읽음'], ['reading', '읽는 중'], ['want', '읽고 싶음'], ['lend', '빌려줄 수 있음'], ['ebook', '전자책'],
];
const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[\s·:,.()[\]\-_'"!?~]/g, '');
const pass = (e: LibraryEntry, f: QuickFilter) =>
  f === 'comment' ? !!(e.comment || e.bragText) : f === 'brag' ? e.bragAt !== null : f === 'top' ? (e.rating ?? 0) >= 4
  : f === 'lend' ? !!e.lendable : f === 'ebook' ? e.format === 'ebook' : e.readStatus === f;

/** 서재 책 찾기: 제목·작가·시리즈·출판사·ISBN(띄어쓰기 무시) + 빠른 필터 + 정렬. 내 책장과 일촌 서재에서 같이 쓴다 */
export function LibrarySearch({ entries, onPick, mine, initial, title }: {
  entries: LibraryEntry[]; onPick: (e: LibraryEntry) => void; mine?: boolean; initial?: QuickFilter | null; title?: string;
}) {
  const [q, setQ] = useState('');
  const [quick, setQuick] = useState<QuickFilter | null>(initial ?? null);
  const [genre, setGenre] = useState<Genre | null>(null);
  const [sort, setSort] = useState<'recent' | 'title' | 'author' | 'rating' | 'thick'>('recent');
  const [open, setOpen] = useState<string | null>(null);
  const active = !!(q.trim() || quick || genre);
  const rows = useMemo(() => {
    const t = norm(q);
    let list = entries.filter((e) => (!t || norm(e.title).includes(t) || norm(e.author).includes(t) || norm(e.series).includes(t) || norm(e.publisher).includes(t) || e.isbn === t)
      && (!quick || pass(e, quick)) && (!genre || e.genre === genre));
    const cmp = {
      recent: (a: LibraryEntry, b: LibraryEntry) => b.addedAt - a.addedAt,
      title: (a: LibraryEntry, b: LibraryEntry) => a.title.localeCompare(b.title, 'ko') || (a.vol ?? 0) - (b.vol ?? 0),
      author: (a: LibraryEntry, b: LibraryEntry) => (a.author ?? '힣').localeCompare(b.author ?? '힣', 'ko'),
      rating: (a: LibraryEntry, b: LibraryEntry) => (b.rating ?? 0) - (a.rating ?? 0) || b.addedAt - a.addedAt,
      thick: (a: LibraryEntry, b: LibraryEntry) => thicknessMm(b) - thicknessMm(a),
    }[sort];
    list = [...list].sort(cmp);
    // 시리즈는 한 줄로 묶는다(코멘트·자랑 필터일 때는 권마다 따로)
    const group = !quick || !['comment', 'brag', 'top'].includes(quick);
    const seen = new Map<string, { e: LibraryEntry; vols: LibraryEntry[] }>(), out: { e: LibraryEntry; vols: LibraryEntry[] }[] = [];
    for (const e of list) {
      if (group && e.series && sort !== 'thick') {
        const s = seen.get(e.series);
        if (s) { s.vols.push(e); continue; }
        const row = { e, vols: [e] }; seen.set(e.series, row); out.push(row);
      } else out.push({ e, vols: [e] });
    }
    return out;
  }, [entries, q, quick, genre, sort]);
  const counts = useMemo(() => Object.fromEntries(QUICK.map(([f]) => [f, entries.filter((e) => pass(e, f)).length])) as Record<QuickFilter, number>, [entries]);
  return (
    <section className="card libsearch" id="search">
      <h2>{title ?? (mine ? `내 책 ${entries.length.toLocaleString()}권` : `책 ${entries.length.toLocaleString()}권`)}</h2>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목·작가·시리즈·출판사로 찾기" aria-label="서재에서 책 찾기" enterKeyHint="search" />
      <div className="chiprow quick" role="group" aria-label="빠른 필터">
        {QUICK.filter(([f]) => counts[f] > 0 || quick === f).map(([f, label]) => (
          <button key={f} className="chip" aria-pressed={quick === f} onClick={() => setQuick(quick === f ? null : f)}>{label} <small>{counts[f]}</small></button>
        ))}
      </div>
      <div className="chiprow">
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="정렬" className="sortsel">
          <option value="recent">최근 꽂은 순</option><option value="title">제목순</option><option value="author">작가순</option><option value="rating">별점순</option><option value="thick">두꺼운 순</option>
        </select>
        {(Object.keys(GENRE_NAME) as Genre[]).map((g) => <button key={g} className="chip" aria-pressed={genre === g} onClick={() => setGenre(genre === g ? null : g)}>{GENRE_NAME[g]}</button>)}
      </div>
      {active && <p className="small muted">{rows.reduce((a, r) => a + r.vols.length, 0).toLocaleString()}권 찾음</p>}
      <ul className="results books">
        {rows.slice(0, 300).map(({ e, vols }) => {
          const many = vols.length > 1, key = e.series ?? e.id;
          return (
            <li key={e.id}>
              <button className="bookrow" onClick={() => (many ? setOpen(open === key ? null : key) : onPick(e))}>
                <b>{many ? `${e.series} · ${vols.length}권` : `${e.title}${e.series && e.vol ? ` ${e.vol}` : ''}`}</b>
                <span className="muted small">{[e.author, GENRE_NAME[e.genre], e.readStatus ? READ_LABEL[e.readStatus] : null, e.rating ? '★'.repeat(e.rating) : null,
                  e.bragAt ? '자랑' : null, e.lendable ? '빌려줌' : null, e.format === 'ebook' ? '전자책' : null].filter(Boolean).join(' · ')}</span>
                {!many && (e.comment || e.bragText) && <span className="cmt">“{e.comment ?? e.bragText}”</span>}
              </button>
              {many && open === key && (
                <div className="vols">
                  {[...vols].sort((a, b) => (a.vol ?? 0) - (b.vol ?? 0)).map((v) => (
                    <button key={v.id} className="chip" onClick={() => onPick(v)}>{v.vol ?? '?'}권{v.comment ? ' 💬' : ''}{v.bragAt ? ' ★' : ''}</button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!rows.length && <p className="muted small">{entries.length ? '조건에 맞는 책이 없어요' : mine ? '아직 꽂은 책이 없어요. 책 추가에서 시작해 보세요' : '아직 꽂은 책이 없어요'}</p>}
    </section>
  );
}
