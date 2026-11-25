'use client';
import { useEffect, useRef, useState } from 'react';
import { getDetector } from '@/lib/books/barcode';
import { normalizeIsbn } from '@/lib/books/isbn';

/** 바코드 한 번 찍기: 첫 ISBN을 읽으면 onCode를 부르고 닫힌다(도서관숲 빌리기·반납용) */
export function ScanOnce({ title, hint, onCode, onClose }: { title: string; hint: string; onCode: (isbn: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState('카메라를 켜는 중…');
  const done = useRef(false);
  useEffect(() => {
    let stream: MediaStream | null = null, stop = false;
    (async () => {
      try {
        const det = await getDetector();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (!video.current) return;
        video.current.srcObject = stream; await video.current.play();
        setMsg(hint);
        while (!stop && !done.current) {
          const codes = await det.detect(video.current).catch(() => []);
          for (const c of codes) {
            const isbn = normalizeIsbn(c.rawValue);
            if (isbn && /^97[89]/.test(isbn) && !done.current) { done.current = true; navigator.vibrate?.(40); onCode(isbn); return; }
          }
          await new Promise((r) => setTimeout(r, 180));
        }
      } catch { setMsg('카메라를 쓸 수 없어요. 권한을 확인하거나 아래 목록에서 골라 주세요'); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [hint, onCode]);
  return (
    <div className="sheetbg">
      <div className="sheet bulk" role="dialog" aria-modal="true" aria-label={title}>
        <button className="x" onClick={onClose} aria-label="닫기">×</button>
        <h3>{title}</h3>
        <div className="scanner"><video ref={video} playsInline muted /></div>
        <p className="small muted">{msg}</p>
      </div>
    </div>
  );
}
