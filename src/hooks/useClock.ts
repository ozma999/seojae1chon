'use client';
import { useMemo, useSyncExternalStore } from 'react';

/** 휴대폰 시각(분 단위). 1분마다, 그리고 앱으로 돌아올 때 갱신. 서버 렌더링 중에는 null */
function subscribe(cb: () => void) {
  const id = setInterval(cb, 15e3);
  const vis = () => { if (!document.hidden) cb(); };
  document.addEventListener('visibilitychange', vis);
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
}
const minute = () => Math.floor(Date.now() / 60e3);
export function useClock(): Date | null {
  const m = useSyncExternalStore(subscribe, minute, () => 0);
  // 같은 분 안에서는 같은 Date 객체(새 객체를 매번 만들면 이를 의존하는 화면이 끝없이 다시 그려진다)
  return useMemo(() => (m ? new Date(m * 60e3) : null), [m]);
}
