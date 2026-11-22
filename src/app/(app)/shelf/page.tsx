'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLibrary, toRoomBook } from '@/components/LibraryProvider';
import { BookSheet } from '@/components/BookSheet';
import type { LibraryEntry } from '@/lib/data/types';
import { GENRE_NAME, thicknessMm } from '@/lib/room/logic';
import { drawCover } from '@/lib/room/render';
import { defaultLook } from '@/lib/room/look';
import { monthCount, seriesProgress, shelfTitle, towerInfo } from '@/lib/room/stats';
import { useClock } from '@/hooks/useClock';
import type { Genre } from '@/lib/room/types';

/** 내 책장: 자랑하고 싶어지는 대시보드 + 내 책 목록 */
export default function ShelfPage() {
  const { entries, ready, profile } = useLibrary();
  const now = useClock();
  const [pick, setPick] = useState<LibraryEntry | null>(null);
  const tower = useMemo(() => towerInfo(entries), [entries]);
  const series = useMemo(() => seriesProgress(entries), [entries]);
  const [allSeries, setAllSeries] = useState(false);
  if (!ready) return <p className="pad muted">책장을 여는 중…</p>;
  const pages = entries.reduce((a, e) => a + (e.pages ?? 0), 0);
  const recent = [...entries].sort((a, b) => b.addedAt - a.addedAt).slice(0, 12);
  return (
    <div className="pad shelf">
      <h1 className="h">내 책장</h1>
      <section className="card titlecard">
        {profile?.cohort === 'founding' && <span className="badge">최초 가족</span>}
        <small className="muted">나의 칭호</small>
        <p className="title">{shelfTitle(entries)}</p>
      </section>
      <div className="stats">
        <div><b>{entries.length.toLocaleString()}</b><small>권</small></div>
        <div><b>{entries.filter((e) => e.format === 'paper').length.toLocaleString()}</b><small>종이</small></div>
        <div><b>{entries.filter((e) => e.format === 'ebook').length.toLocaleString()}</b><small>전자</small></div>
        <div><b>+{now ? monthCount(entries, now) : 0}</b><small>이번 달</small></div>
      </div>
      <section className="card">
        <h2>책 탑 쌓기</h2>
        <div className="tower">
          <TowerCanvas entries={entries} />
          <div>
            <p className="big">{tower.m < 10 ? tower.m.toFixed(1) : Math.round(tower.m).toLocaleString()}<small>m</small></p>
            <p className="small">종이책 {tower.paper.toLocaleString()}권을 눕혀 쌓은 높이{pages ? ` · ${pages.toLocaleString()}쪽` : ''}</p>
            {tower.below.m > 0 && <p className="small"><b>{tower.below.name}</b>({tower.below.m}m)보다 높아요</p>}
            {tower.next && <p className="small acc">다음 목표 <b>{tower.next.name}</b>({tower.next.m}m)까지 약 {tower.booksToNext.toLocaleString()}권</p>}
          </div>
        </div>
      </section>
      {series.length > 0 && (
        <section className="card">
          <h2>시리즈 완주</h2>
          <ul className="series">
            {(allSeries ? series : series.slice(0, 5)).map((s) => (
              <li key={s.name}>
                <div className="row2"><b>{s.name}</b><span className="small muted">{s.have} / {s.max}권</span></div>
                <span className="prog"><i style={{ width: `${(s.have / s.max) * 100}%` }} /></span>
                {s.missing.length > 0 && <small className="muted">빠진 권 {s.missing.slice(0, 12).join(', ')}{s.missing.length > 12 ? ' …' : ''}</small>}
              </li>
            ))}
          </ul>
          {series.length > 5 && <button className="link" onClick={() => setAllSeries((v) => !v)}>{allSeries ? '접기' : `시리즈 ${series.length}개 모두 보기`}</button>}
        </section>
      )}
      {recent.length > 0 && (
        <section className="card">
          <h2>최근 꽂은 책</h2>
          <div className="covers">
            {recent.map((e) => <button key={e.id} onClick={() => setPick(e)} aria-label={e.title}><Cover e={e} /><span>{e.title}</span></button>)}
          </div>
        </section>
      )}
      <BookList onPick={setPick} />
      {pick && <BookSheet entry={pick} onClose={() => setPick(null)} />}
    </div>
  );
}

/** 표지: 사진이 있으면 사진, 없으면 책 모양(픽셀) */
function Cover({ e }: { e: LibraryEntry }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (e.coverUrl && !bad) return;
    const c = ref.current?.getContext('2d');
    if (c) drawCover(c, 0, 0, 14, 20, toRoomBook(e));
  }, [e, bad]);
  // eslint-disable-next-line @next/next/no-img-element
  if (e.coverUrl && !bad) return <img src={e.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
  return <canvas ref={ref} width={14} height={20} className="pix" />;
}

/** 책을 눕혀 쌓은 탑(픽셀) + 옆에 비교 대상 */
function TowerCanvas({ entries }: { entries: LibraryEntry[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!, c = cv.getContext('2d')!, W = 80, H = 112, floor = H - 4;
    c.clearRect(0, 0, W, H);
    const paper = entries.filter((e) => e.format === 'paper').sort((a, b) => a.addedAt - b.addedAt);
    const t = towerInfo(entries), top = Math.max(t.next?.m ?? t.m * 1.15, t.m * 1.05, 2), scale = (floor - 6) / top;
    c.fillStyle = '#c08454'; c.fillRect(0, floor, W, 4); c.fillStyle = '#1b1626'; c.fillRect(0, floor, W, 1);
    // 비교 대상: 다음 목표는 실루엣, 이미 넘은 것은 높이 눈금만
    const tick = (m: number) => { const h = Math.round(m * scale); c.fillStyle = '#1b1626'; for (let x = 2; x < W - 2; x += 3) c.fillRect(x, floor - h, 2, 1); };
    if (t.below.m > 0) tick(t.below.m);
    const l = t.next;
    if (l) {
      const h = Math.max(4, Math.round(l.m * scale)), x = 40;
      c.fillStyle = '#d2c2a2';
      if (l.icon === 'tower') { c.fillRect(x + 7, floor - h, 2, h); c.fillRect(x + 4, floor - Math.round(h * .55), 8, 3); c.fillRect(x + 3, floor - 4, 10, 4); }
      else if (l.icon === 'apt') { c.fillRect(x, floor - h, 16, h); c.fillStyle = '#fffaf0'; for (let y = floor - h + 2; y < floor - 2; y += 3) for (let xx = x + 2; xx < x + 14; xx += 4) c.fillRect(xx, y, 2, 1); }
      else if (l.icon === 'house') {   // 벽 + 지붕(지붕 폭은 20px까지) + 창 두 줄
        const hw = Math.min(34, Math.max(14, Math.round(h * .9))), roof = Math.round(hw / 2) - 1, body = Math.max(3, h - roof), hx = x + 1;
        c.fillRect(hx, floor - body, hw, body);
        for (let i = 0; i < roof; i++) { const w = Math.min(hw + 4, 2 + i * 2); c.fillRect(hx + hw / 2 - w / 2, floor - h + i, w, 1); }
        c.fillStyle = '#fffaf0';
        for (const fy of [.3, .72]) for (const fx of [.2, .62]) c.fillRect(hx + Math.round(hw * fx), floor - Math.round(body * fy) - 2, 4, 3);
      }
      else if (l.icon === 'door') { c.fillRect(x + 2, floor - h, 12, h); c.fillStyle = '#b09c7c'; c.fillRect(x + 10, floor - Math.round(h * .5), 2, 2); }
      else {   // 사람: 머리·몸·다리
        const hw = Math.max(4, Math.round(h * .16)), bw = Math.max(6, Math.round(h * .26)), cx = x + 8;
        c.fillRect(cx - hw / 2, floor - h, hw, hw);
        c.fillRect(cx - bw / 2, floor - h + hw + 1, bw, Math.round(h * .42));
        c.fillRect(cx - bw / 2 + 1, floor - Math.round(h * .45) + hw, Math.max(2, bw / 2 - 1), Math.round(h * .45) - hw);
        c.fillRect(cx + 1, floor - Math.round(h * .45) + hw, Math.max(2, bw / 2 - 1), Math.round(h * .45) - hw);
      }
      c.fillStyle = '#96322c'; c.fillRect(x - 2, floor - h - 1, 38, 1);   // 목표 높이
    }
    // 책 탑: 아래부터 한 줄씩, 그 높이에 있는 책의 색
    const cum: number[] = []; let s = 0;
    for (const e of paper) { s += thicknessMm(e) / 1000; cum.push(s); }
    const hpx = Math.round(t.m * scale);
    let bi = 0;
    for (let y = 0; y < hpx; y++) {
      const mAt = (y + .5) / scale;
      while (bi < cum.length - 1 && cum[bi] < mAt) bi++;
      const e = paper[bi], look = e.look ?? defaultLook(e.isbn), w = 22 + ((bi * 7) % 7), x = 8 + ((bi * 5) % 4);
      c.fillStyle = look.c1; c.fillRect(x, floor - 1 - y, w, 1);
      c.fillStyle = '#1b1626'; c.fillRect(x - 1, floor - 1 - y, 1, 1); c.fillRect(x + w, floor - 1 - y, 1, 1);
      if (bi > 0 && cum[bi - 1] >= (y - .5) / scale && hpx < 300) { c.fillStyle = look.c2; c.fillRect(x, floor - 1 - y, w, 1); }
    }
  }, [entries]);
  return <canvas ref={ref} width={80} height={112} className="pix towercv" aria-hidden />;
}

/** 내 책 목록: 검색 + 정렬 + 거르기, 시리즈는 한 줄로 */
function BookList({ onPick }: { onPick: (e: LibraryEntry) => void }) {
  const { entries } = useLibrary();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'recent' | 'title' | 'author' | 'thick'>('recent');
  const [genre, setGenre] = useState<Genre | null>(null);
  const [fmt, setFmt] = useState<'all' | 'paper' | 'ebook'>('all');
  const rows = useMemo(() => {
    const t = q.trim();
    let list = entries.filter((e) => (!t || e.title.includes(t) || (e.author ?? '').includes(t) || e.isbn === t.replace(/-/g, ''))
      && (!genre || e.genre === genre) && (fmt === 'all' || e.format === fmt));
    const cmp = { recent: (a: LibraryEntry, b: LibraryEntry) => b.addedAt - a.addedAt, title: (a: LibraryEntry, b: LibraryEntry) => a.title.localeCompare(b.title, 'ko'),
      author: (a: LibraryEntry, b: LibraryEntry) => (a.author ?? '힣').localeCompare(b.author ?? '힣', 'ko'), thick: (a: LibraryEntry, b: LibraryEntry) => thicknessMm(b) - thicknessMm(a) }[sort];
    list = [...list].sort(cmp);
    const seen = new Map<string, { e: LibraryEntry; n: number }>(), out: { e: LibraryEntry; n: number }[] = [];
    for (const e of list) {
      if (e.series && sort !== 'thick') {
        const s = seen.get(e.series);
        if (s) { s.n++; continue; }
        const row = { e, n: 1 }; seen.set(e.series, row); out.push(row);
      } else out.push({ e, n: 1 });
    }
    return out;
  }, [entries, q, sort, genre, fmt]);
  return (
    <section className="card">
      <h2>내 책 {entries.length.toLocaleString()}권</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="내 책장에서 찾기: 제목, 작가, ISBN" aria-label="내 책장에서 찾기" />
      <div className="chiprow">
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="정렬" className="sortsel">
          <option value="recent">최근 꽂은 순</option><option value="title">제목순</option><option value="author">작가순</option><option value="thick">두꺼운 순</option>
        </select>
        {(Object.keys(GENRE_NAME) as Genre[]).map((g) => <button key={g} className="chip" aria-pressed={genre === g} onClick={() => setGenre(genre === g ? null : g)}>{GENRE_NAME[g]}</button>)}
        <button className="chip" aria-pressed={fmt === 'ebook'} onClick={() => setFmt(fmt === 'ebook' ? 'all' : 'ebook')}>전자책만</button>
      </div>
      <ul className="results">
        {rows.slice(0, 300).map(({ e, n }) => (
          <li key={e.id} onClick={() => onPick(e)} className="tap">
            <div>
              <b>{n > 1 ? `${e.series} (${n}권)` : e.title}</b>
              <span className="muted small">{[e.author, GENRE_NAME[e.genre], e.format === 'ebook' ? '전자책' : null, e.bragAt ? '자랑 책장' : null].filter(Boolean).join(' · ')}</span>
            </div>
          </li>
        ))}
      </ul>
      {!rows.length && <p className="muted small">{entries.length ? '조건에 맞는 책이 없어요' : '아직 꽂은 책이 없어요. 책 추가에서 시작해 보세요'}</p>}
    </section>
  );
}
