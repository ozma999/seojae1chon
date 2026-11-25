'use client';
import { useEffect, useRef, useState } from 'react';
import { useLibrary } from './LibraryProvider';
import type { BookInfo } from '@/lib/books/nl';
import { normalizeIsbn } from '@/lib/books/isbn';
import { getDetector } from '@/lib/books/barcode';
import { cleanLines, pickBest } from '@/lib/books/bulk';

/** 짧은 '삑' + 진동(인식했을 때) */
function beep(ok = true) {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const a = new AC(), o = a.createOscillator(), g = a.createGain();
    o.frequency.value = ok ? 1320 : 440; g.gain.value = 0.08;
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.09);
    setTimeout(() => a.close(), 300);
  } catch { /* 소리 못 내도 괜찮음 */ }
  navigator.vibrate?.(ok ? 40 : [30, 40, 30]);
}

type ScanItem = { isbn: string; state: 'finding' | 'found' | 'missing' | 'owned'; book?: BookInfo };

/** ① 연속 바코드: 카메라를 켜 둔 채 찍을 때마다 목록에 쌓고, 마지막에 한 번에 꽂기 */
export function BulkScan({ onClose }: { onClose: () => void }) {
  const { lookup, addMany, entries, say } = useLibrary();
  const video = useRef<HTMLVideoElement>(null);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [msg, setMsg] = useState('카메라를 켜는 중…');
  const seen = useRef(new Set<string>());
  const owned = useRef(new Set(entries.map((e) => e.isbn)));
  useEffect(() => {
    let stream: MediaStream | null = null, stop = false;
    const found = async (isbn: string) => {
      if (seen.current.has(isbn)) return;
      seen.current.add(isbn);
      if (owned.current.has(isbn)) { beep(false); setItems((x) => [{ isbn, state: 'owned' }, ...x]); return; }
      beep(true);
      setItems((x) => [{ isbn, state: 'finding' }, ...x]);
      try {
        const [b] = await lookup({ isbn });
        setItems((x) => x.map((i) => (i.isbn === isbn ? { isbn, state: b ? 'found' : 'missing', book: b } : i)));
      } catch { setItems((x) => x.map((i) => (i.isbn === isbn ? { isbn, state: 'missing' } : i))); }
    };
    (async () => {
      try {
        const det = await getDetector();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        setMsg('책 뒷면 바코드를 차례로 비춰 주세요. 찍힐 때마다 삑 소리가 나요');
        while (!stop) {
          const codes = await det.detect(video.current).catch(() => []);
          for (const c of codes) { const isbn = normalizeIsbn(c.rawValue); if (isbn && /^97[89]/.test(isbn)) found(isbn); }
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch { setMsg('카메라를 쓸 수 없어요. 권한을 확인해 주세요'); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [lookup]);
  const ready = items.filter((i) => i.state === 'found' && i.book);
  const finish = () => {
    if (!ready.length) { onClose(); return; }
    onClose();
    addMany(ready.map((i) => i.book!), 'barcode').then((a) => say(`${a.length}권을 서재에 꽂았어요`), (e: Error) => say(`저장 실패: ${e.message}`));
  };
  return (
    <div className="sheetbg">
      <div className="sheet bulk" role="dialog" aria-modal="true" aria-label="연속 바코드 등록">
        <button className="x" onClick={onClose} aria-label="닫기">×</button>
        <h3>연속 바코드</h3>
        <div className="scanner"><video ref={video} playsInline muted /></div>
        <p className="small muted">{msg}</p>
        <p className="small"><b>{ready.length}</b>권 찾음{items.some((i) => i.state === 'owned') ? ` · 이미 있는 책 ${items.filter((i) => i.state === 'owned').length}권은 건너뜀` : ''}</p>
        <ul className="tray">
          {items.map((i) => (
            <li key={i.isbn} className={i.state}>
              <span>{i.state === 'finding' ? '찾는 중…' : i.state === 'owned' ? '이미 서재에 있음' : i.state === 'missing' ? `못 찾음 (${i.isbn})` : i.book!.title}</span>
              {i.state !== 'finding' && <button className="link" onClick={() => { setItems((x) => x.filter((y) => y.isbn !== i.isbn)); seen.current.delete(i.isbn); }} aria-label="목록에서 빼기">빼기</button>}
            </li>
          ))}
        </ul>
        <button className="btn primary" onClick={finish}>{ready.length ? `${ready.length}권 한 번에 꽂기` : '닫기'}</button>
      </div>
    </div>
  );
}

type Row = { line: string; state: 'finding' | 'done'; options: BookInfo[]; pick: number; on: boolean };

/** ② 텍스트 붙여넣기: 줄마다 책을 찾아 가장 맞는 책을 고르고, 확인 후 한 번에 꽂기 */
export function PasteBulk({ onClose, preset, method = 'search', title = '텍스트 붙여넣기', note }: {
  onClose: () => void; preset?: string[]; method?: 'search' | 'photo'; title?: string; note?: string;
}) {
  const { lookup, addMany, entries, say } = useLibrary();
  const [text, setText] = useState(preset ? preset.join('\n') : '');
  const [rows, setRows] = useState<Row[] | null>(null);
  const has = (b?: BookInfo) => !!b && entries.some((e) => e.isbn === b.isbn);
  const run = async (given?: string[]) => {
    const lines = given ?? cleanLines(text);
    if (!lines.length) { say('책 제목이나 ISBN을 한 줄에 하나씩 넣어 주세요'); return; }
    setRows(lines.map((line) => ({ line, state: 'finding', options: [], pick: 0, on: false })));
    let next = 0;
    const worker = async () => {   // 3줄씩 동시에(검색 서비스에 무리 주지 않게)
      while (next < lines.length) {
        const k = next++, line = lines[k], isbn = normalizeIsbn(line);
        let options: BookInfo[] = [];
        try { options = (await lookup(isbn ? { isbn } : { title: line })).slice(0, 5); } catch { /* 못 찾음 */ }
        const { book, confident } = pickBest(line, options);
        const pick = book ? options.indexOf(book) : 0;
        setRows((r) => r && r.map((x, i) => (i === k ? { ...x, state: 'done', options, pick, on: confident && !has(book ?? undefined) } : x)));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  };
  const started = useRef(false);
  useEffect(() => { if (preset && !started.current) { started.current = true; queueMicrotask(() => run(preset)); } });
  const chosen = (rows ?? []).filter((r) => r.on && r.options[r.pick]).map((r) => r.options[r.pick]);
  const finish = () => {
    onClose();
    addMany(chosen, method).then((a) => say(`${a.length}권을 서재에 꽂았어요`), (e: Error) => say(`저장 실패: ${e.message}`));
  };
  const busy = rows?.some((r) => r.state === 'finding');
  return (
    <div className="sheetbg">
      <div className="sheet bulk" role="dialog" aria-modal="true" aria-label={`${title} 등록`}>
        <button className="x" onClick={onClose} aria-label="닫기">×</button>
        <h3>{title}</h3>
        {note && <p className="small muted">{note}</p>}
        {!rows ? (
          <>
            <p className="small muted">책장 사진에서 글자를 복사해 붙여 넣으세요. 메모장의 책 목록이나 ISBN 목록도 돼요(한 줄에 한 권, 최대 100줄).</p>
            <ul className="small muted howto">
              <li>아이폰: 사진 앱에서 책장 사진 → 글자를 길게 눌러 <b>모두 선택 → 복사</b></li>
              <li>안드로이드: 구글 렌즈로 사진 → <b>텍스트 → 모두 선택 → 복사</b></li>
            </ul>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={'채식주의자\n소년이 온다\n9788936434120'} aria-label="붙여 넣을 책 목록" />
            <button className="btn primary" onClick={() => run()} disabled={!text.trim()}>책 찾기</button>
          </>
        ) : (
          <>
            <p className="small">{busy ? `찾는 중… ${rows.filter((r) => r.state === 'done').length} / ${rows.length}` : `${rows.length}줄 중 ${rows.filter((r) => r.options.length).length}줄에서 책을 찾았어요. 맞는 것만 체크해 주세요.`}</p>
            <ul className="pasted">
              {rows.map((r, i) => {
                const b = r.options[r.pick];
                return (
                  <li key={i} className={r.state === 'done' && !b ? 'none' : ''}>
                    <label>
                      <input type="checkbox" checked={r.on} disabled={!b || has(b)} onChange={() => setRows((x) => x && x.map((y, j) => (j === i ? { ...y, on: !y.on } : y)))} />
                      <span>
                        <small className="muted">{r.line}</small>
                        {r.state === 'finding' ? <b>찾는 중…</b> : !b ? <b>못 찾음</b> : has(b) ? <b>{b.title} · 이미 있음</b> : <b>{b.title}</b>}
                        {b && <small className="muted">{[b.author, b.publisher].filter(Boolean).join(' · ')}</small>}
                      </span>
                    </label>
                    {r.options.length > 1 && (
                      <select value={r.pick} aria-label={`${r.line} 다른 후보`} onChange={(e) => setRows((x) => x && x.map((y, j) => (j === i ? { ...y, pick: Number(e.target.value), on: true } : y)))}>
                        {r.options.map((o, k) => <option key={o.isbn} value={k}>{o.title}{o.author ? ` · ${o.author}` : ''}</option>)}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="row">
              {!preset && <button className="btn" onClick={() => setRows(null)}>다시 붙여넣기</button>}
              <button className="btn primary" style={{ flex: 1 }} disabled={busy || !chosen.length} onClick={finish}>{chosen.length}권 한 번에 꽂기</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
