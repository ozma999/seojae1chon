'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const I = {
  room: <path d="M3 21V9l9-6 9 6v12M7 21v-8h3v8M14 21v-8h3v8" />,
  add: <path d="M4 5h4v14H4zM10 5h4v14h-4zM18 9v8M14 13h8" />,
  shelf: <path d="M3 4h18M3 20h18M3 12h18M6 4v8M9 4v8M15 12v8M18 12v8" />,
  deco: <path d="M12 3a4 4 0 0 1 4 4c0 2-2 3-4 3S8 9 8 7a4 4 0 0 1 4-4zM5 21c0-4 3-7 7-7s7 3 7 7" />,
  share: <path d="M7 3h10v18H7zM10 7h4M10 11h4M12 15v3" />,
};
const TABS = [
  { href: '/room', label: '서재', icon: I.room },
  { href: '/add', label: '책 추가', icon: I.add },
  { href: '/shelf', label: '책장', icon: I.shelf },
  { href: '/decorate', label: '꾸미기', icon: I.deco },
  { href: '/share', label: '공유', icon: I.share },
];
export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="메뉴">
      {TABS.map((t) => {
        const on = path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{t.icon}</svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
