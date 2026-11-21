import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '서재일촌',
  description: '책이 쌓일수록 넓어지는 픽셀 서재',
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = { themeColor: '#121a2e', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
