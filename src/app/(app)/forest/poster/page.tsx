'use client';
import Image from 'next/image';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import QRCode from 'qrcode';

/** 책장에 붙일 안내문: QR(도서관숲 바로가기) + 빌리기·반납 방법. 인쇄해서 쓴다 */
export default function ForestPoster() {
  const ref = useRef<HTMLCanvasElement>(null);
  const url = useSyncExternalStore(() => () => {}, () => `${location.origin}/forest`, () => '');
  useEffect(() => { if (ref.current && url) QRCode.toCanvas(ref.current, url, { width: 360, margin: 1, color: { dark: '#2e1f1a', light: '#ffffff' } }); }, [url]);
  return (
    <div className="poster">
      <Image src="/brand/logo-h-light-v3.png" alt="서재일촌" width={261} height={76} className="logoimg" />
      <h1>도서관숲</h1>
      <p className="lead">이 책장의 책은 누구나 빌려 읽을 수 있어요</p>
      <canvas ref={ref} width={360} height={360} />
      <ol>
        <li><b>QR을 찍어요</b> → 서재일촌 도서관숲이 열려요(처음이면 로그인)</li>
        <li><b>빌리기</b>를 누르고 책 뒤 <b>바코드</b>를 비춰요</li>
        <li>다 읽으면 <b>반납하기</b> → 바코드를 비추고 책장에 꽂아 주세요</li>
      </ol>
      <p className="muted small">대여 기록은 모두가 함께 봐요 · {url}</p>
      <button className="btn primary noprint" onClick={() => print()}>인쇄하기</button>
    </div>
  );
}
