'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ICONS, gridPath, type NavIconName } from './navIcons';

const TABS: { href: string; label: string; icon: NavIconName; also?: string[] }[] = [
  { href: '/room', label: '서재', icon: 'home' },
  { href: '/add', label: '책 추가', icon: 'add' },
  { href: '/shelf', label: '책장', icon: 'shelf' },
  { href: '/decorate', label: '꾸미기', icon: 'deco' },
  { href: '/ilchon', label: '일촌', icon: 'ilchon', also: ['/walk'] },
];
/** 단색 픽셀 아이콘: 평소 외곽선, 선택하면 꽉 찬 모양. 크기·글자·가로선은 모든 탭이 같다 */
function PixelIcon({ name, on }: { name: NavIconName; on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="24" height="24" shapeRendering="crispEdges" aria-hidden className="navicon">
      <path d={gridPath(NAV_ICONS[name][on ? 'fill' : 'line'])} fill="currentColor" />
    </svg>
  );
}
export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="메뉴">
      {TABS.map((t) => {
        const on = [t.href, ...(t.also ?? [])].some((h) => path.startsWith(h));
        return (
          <Link key={t.href} href={t.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
            <PixelIcon name={t.icon} on={on} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
