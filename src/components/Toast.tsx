'use client';
import { useEffect, useRef, useState } from 'react';
import { useLibrary } from './LibraryProvider';

export function Toast() {
  const { toast, mode, error, jobs } = useLibrary();
  const [small, setSmall] = useState(false);
  const pill = useRef<HTMLDivElement>(null);
  const job = jobs[jobs.length - 1];
  // 다른 곳을 누르면 작은 점으로 줄어든다(작업은 계속)
  useEffect(() => {
    if (!job) return;
    const down = (e: PointerEvent) => { if (!pill.current?.contains(e.target as Node)) setSmall(true); };
    document.addEventListener('pointerdown', down);
    return () => document.removeEventListener('pointerdown', down);
  }, [job]);
  return (
    <>
      {mode === 'demo' && <p className="demobar">데모 모드 · 저장은 이 브라우저에만 돼요</p>}
      {error && <p className="err" role="alert">불러오지 못했어요: {error}</p>}
      {job && (
        <div ref={pill} className={'jobpill' + (small ? ' small' : '')} role="status" aria-live="polite" onClick={() => setSmall((s) => !s)}>
          <span className="spin" aria-hidden />{!small && <span>{job.label}{jobs.length > 1 ? ` 외 ${jobs.length - 1}건` : ''}</span>}
        </div>
      )}
      <div className={'toast' + (toast ? ' on' : '')} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
