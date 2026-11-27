'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ICONS, gridPath, type NavIconName } from './navIcons';
import { useLibrary } from './LibraryProvider';

const TABS: { href: string; label: string; icon: NavIconName; also?: string[] }[] = [
  // 내 것(서재·책장) → 가장 자주 하는 일(책 추가) → 함께 쓰는 곳(도서관숲·일촌) → 꾸미기
  { href: '/room', label: '서재', icon: 'home' },
  { href: '/shelf', label: '책장', icon: 'shelf' },
  { href: '/add', label: '책 추가', icon: 'add' },
  { href: '/forest', label: '도서관숲', icon: 'forest' },
  { href: '/ilchon', label: '일촌', icon: 'ilchon', also: ['/walk'] },
  { href: '/decorate', label: '꾸미기', icon: 'deco' },
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
  const { news } = useLibrary();
  const dot: Record<string, number> = { '/room': news.guest, '/ilchon': news.requests, '/forest': news.forest };
  return (
    <nav className="tabbar" aria-label="메뉴">
      {TABS.map((t) => {
        const on = [t.href, ...(t.also ?? [])].some((h) => path.startsWith(h));
        return (
          <Link key={t.href} href={t.href} className={[on ? 'on' : '', t.href === '/add' ? 'addtab' : ''].join(' ').trim() || undefined} aria-current={on ? 'page' : undefined}>
            <span className="navic"><PixelIcon name={t.icon} on={on} />{dot[t.href] > 0 && <i className="dot" aria-label={`새 소식 ${dot[t.href]}개`} />}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
