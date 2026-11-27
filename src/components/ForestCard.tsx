'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLibrary } from './LibraryProvider';
import type { ForestLoan } from '@/lib/data/types';

/** 서재 화면의 도서관숲 바로가기: 빌린 책·반납일이 한눈에 */
export function ForestCard() {
  const { repo, profile } = useLibrary();
  const [s, setS] = useState<{ name: string; total: number; free: number; mine: ForestLoan[]; now: number } | null>(null);
  useEffect(() => {
    repo.forest().then((f) => {
      if (!f) return;
      const mine = f.books.flatMap((b) => b.out.filter((l) => l.user.id === profile?.id)).sort((a, b) => a.dueAt - b.dueAt);
      setS({ name: f.library.name, total: f.books.length, free: f.books.filter((b) => b.out.length < b.copies).length, mine, now: Date.now() });
    }, () => {});
  }, [repo, profile?.id]);
  if (!s) return null;
  const next = s.mine[0], d = next ? Math.ceil((next.dueAt - s.now) / 864e5) : 0;
  return (
    <Link href="/forest" className="card forest-card">
      <span className="tree" aria-hidden>🌳</span>
      <span><b>{s.name}</b><small className="muted">{s.mine.length ? `빌린 책 ${s.mine.length}권 · 『${next.title}』 ${d < 0 ? `${-d}일 연체` : d === 0 ? '오늘 반납' : `D-${d}`}` : `${s.total}권 중 ${s.free}권 빌릴 수 있어요`}</small></span>
      <span className="chip">{s.mine.length ? '반납·연장' : '빌리러 가기'}</span>
    </Link>
  );
}
