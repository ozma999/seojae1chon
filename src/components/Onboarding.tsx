'use client';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { useLibrary } from './LibraryProvider';

const KEY = 'seojae-onboard';
const subscribe = (f: () => void) => { window.addEventListener('storage', f); window.addEventListener('onboard', f); return () => { window.removeEventListener('storage', f); window.removeEventListener('onboard', f); }; };
const readState = () => localStorage.getItem(KEY) ?? '';
const setState = (v: string) => { localStorage.setItem(KEY, v); window.dispatchEvent(new Event('onboard')); };
export const markInvited = () => { if (!readState().includes('invited')) setState(readState() + ' invited'); };

/** 처음 쓰는 사람 안내: 책 꽂기 → 자랑 책장 → 일촌 초대. 다 하거나 닫으면 사라진다 */
export function Onboarding() {
  const { entries } = useLibrary();
  const st = useSyncExternalStore(subscribe, readState, () => 'hidden');
  if (st.includes('done') || st === 'hidden') return null;
  const steps = [
    { done: entries.length > 0, title: '첫 책 꽂기', desc: '바코드나 제목으로 가진 책을 꽂아요. 책이 쌓일수록 방이 넓어져요.', href: '/add', cta: '책 추가' },
    { done: entries.some((e) => e.bragAt !== null), title: '자랑 책장에 한 권', desc: '아끼는 책을 눌러 \'자랑 책장에 꽂기\'. 일촌에게 표지로 보여요.', href: '/shelf#search', cta: '내 책장' },
    { done: st.includes('invited'), title: '일촌 초대', desc: '초대 코드를 보내면 서로의 서재에 놀러 갈 수 있어요.', href: '/ilchon', cta: '일촌' },
  ];
  const n = steps.filter((s) => s.done).length;
  if (n === steps.length) return null;
  return (
    <section className="card onboard">
      <button className="x small" aria-label="안내 닫기" onClick={() => setState(readState() + ' done')}>×</button>
      <h2>서재일촌 시작하기 <small className="muted">{n} / {steps.length}</small></h2>
      <ol>
        {steps.map((s, i) => (
          <li key={i} className={s.done ? 'ok' : ''}>
            <span className="num">{s.done ? '✓' : i + 1}</span>
            <span><b>{s.title}</b><small className="muted">{s.desc}</small></span>
            {!s.done && <Link className="chip" href={s.href} onClick={() => { if (i === 2) markInvited(); }}>{s.cta} ›</Link>}
          </li>
        ))}
      </ol>
    </section>
  );
}
