import { Suspense } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { LibraryProvider } from '@/components/LibraryProvider';
import { Toast } from '@/components/Toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LibraryProvider>
      <div className="app">
        <Toast />
        <main className="appmain">{children}</main>
        <Suspense fallback={<nav className="tabbar" aria-label="메뉴" />}><BottomNav /></Suspense>
      </div>
    </LibraryProvider>
  );
}
