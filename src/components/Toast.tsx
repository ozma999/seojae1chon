'use client';
import { useLibrary } from './LibraryProvider';
export function Toast() {
  const { toast, mode, error } = useLibrary();
  return (
    <>
      {mode === 'demo' && <p className="demobar">데모 모드 · 저장은 이 브라우저에만 돼요</p>}
      {error && <p className="err" role="alert">불러오지 못했어요: {error}</p>}
      <div className={'toast' + (toast ? ' on' : '')} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
