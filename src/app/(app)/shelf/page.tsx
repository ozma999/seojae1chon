'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLibrary } from '@/components/LibraryProvider';
import { BookSheet } from '@/components/BookSheet';
import { Cover } from '@/components/Cover';
import { LibrarySearch } from '@/components/LibrarySearch';
import type { LibraryEntry } from '@/lib/data/types';
import { thicknessMm } from '@/lib/room/logic';
import { defaultLook } from '@/lib/room/look';
import { monthCount, persona, seriesProgress, shelfTitle, towerInfo } from '@/lib/room/stats';
import { useClock } from '@/hooks/useClock';

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
      <LibrarySearch entries={entries} onPick={setPick} mine />
      <section className="card titlecard">
        {profile?.cohort === 'founding' && <span className="badge">태초가족</span>}
        <small className="muted">나의 칭호</small>
        <p className="title">{shelfTitle(entries, now?.getTime())}</p>
        <small className="muted">{(() => { const p = persona(entries, now?.getTime()); return p ? `${p.why} — 그래서 이 칭호예요` : entries.length < 10 ? '10권부터 모으는 방식에 따라 칭호가 달라져요' : '가장 많은 장르로 정한 칭호예요'; })()}</small>
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
      {pick && <BookSheet entry={pick} onClose={() => setPick(null)} />}
    </div>
  );
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
      c.fillStyle = '#2f5a86'; c.fillRect(x - 2, floor - h - 1, 38, 1);   // 목표 높이
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
