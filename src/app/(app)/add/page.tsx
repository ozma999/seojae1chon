'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLibrary } from '@/components/LibraryProvider';
import type { BookInfo } from '@/lib/books/nl';
import { normalizeIsbn } from '@/lib/books/isbn';
import type { AddMethod } from '@/lib/data/types';
import { GENRE_NAME } from '@/lib/room/logic';

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global { interface Window { BarcodeDetector?: new (o: { formats: string[] }) => Detector } }

export default function AddPage() {
  const { lookup, add, entries, say } = useLibrary();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BookInfo[] | null>(null);
  const [method, setMethod] = useState<AddMethod>('search');
  const [scan, setScan] = useState(false);
  const canScan = useSyncExternalStore(() => () => {}, () => !!window.BarcodeDetector && !!navigator.mediaDevices, () => false);

  const find = async (text: string, m: AddMethod) => {
    const isbn = normalizeIsbn(text);
    if (!text.trim()) return;
    if (!isbn && /^[\d-\s]{10,17}[\dXx]?$/.test(text.trim()) && text.replace(/\D/g, '').length >= 10) {
      say('ISBN 숫자가 맞지 않아요. 책 뒷면의 13자리를 다시 확인해 주세요'); return;
    }
    setBusy(true); setMethod(m);
    try {
      const r = await lookup(isbn ? { isbn } : { title: text.trim() });
      setResults(r);
      if (!r.length) say(isbn ? '국립중앙도서관에서 찾지 못한 ISBN이에요' : '찾는 책이 없어요');
    } catch (e) { say((e as Error).message); } finally { setBusy(false); }
  };
  const owned = (b: BookInfo) => entries.some((e) => e.isbn === b.isbn && e.format === b.format);

  return (
    <div className="pad">
      <h1 className="h">책 등록</h1>
      <form className="row" onSubmit={(e) => { e.preventDefault(); find(q, 'search'); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ISBN 13자리 또는 제목·작가" aria-label="ISBN 또는 제목" inputMode="search" />
        <button className="btn primary" disabled={busy}>{busy ? '찾는 중' : '찾기'}</button>
      </form>
      {canScan ? (
        <button className="btn" onClick={() => setScan((s) => !s)}>{scan ? '카메라 닫기' : '바코드 찍기'}</button>
      ) : (
        <p className="muted small">이 브라우저는 바코드 인식을 지원하지 않아요. 책 뒷면의 ISBN 13자리를 입력해 주세요.</p>
      )}
      {scan && <Scanner onCode={(code) => { setScan(false); setQ(code); find(code, 'barcode'); }} />}
      {results && (
        <ul className="results">
          {results.map((b) => (
            <li key={b.isbn + b.format}>
              <div>
                <b>{b.title}{b.vol ? ` ${b.vol}` : ''}</b>
                <span className="muted small">{[b.author, b.publisher, b.pubDate].filter(Boolean).join(' · ')}</span>
                <span className="muted small">{b.pages ? `${b.pages}쪽` : '쪽수 모름'} · {b.format === 'ebook' ? '전자책' : '종이책'} · {GENRE_NAME[b.genre]}{b.genreSource === 'addcode' ? '' : '(추정)'}</span>
              </div>
              {owned(b) ? <span className="muted small">서재에 있음</span> : (
                <button className="btn primary sm" onClick={async () => {
                  try { await add(b, method); say(`'${b.title}'을(를) 서재에 꽂았어요`); } catch (e) { say((e as Error).message); }
                }}>추가</button>
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
    </div>
  );
}

function Scanner({ onCode }: { onCode: (isbn: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState('책 뒷면 바코드를 화면 가운데에 맞춰 주세요');
  useEffect(() => {
    let stream: MediaStream | null = null, stop = false;
    const det = new window.BarcodeDetector!({ formats: ['ean_13'] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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
