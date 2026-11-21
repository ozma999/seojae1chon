import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// 갈무리(OFL). 로고·제목·숫자에만 쓰므로 굵은 글씨 하나만 넣는다
const galmuri = localFont({ src: './fonts/Galmuri11-Bold.woff2', weight: '400 700', variable: '--font-galmuri', display: 'swap' });

export const metadata: Metadata = {
  title: '서재일촌',
  description: '책이 쌓일수록 넓어지는 픽셀 서재',
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = { themeColor: '#f3ead6', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={galmuri.variable}>
      <body>{children}</body>
    </html>
  );
}
