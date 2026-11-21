import { BottomNav } from '@/components/BottomNav';
import { LibraryProvider } from '@/components/LibraryProvider';
import { Toast } from '@/components/Toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LibraryProvider>
      <div className="app">
        <main className="appmain">{children}</main>
        <Toast />
        <BottomNav />
      </div>
    </LibraryProvider>
  );
}
