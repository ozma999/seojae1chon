import Image from 'next/image';
import Link from 'next/link';
import { DemoEnter } from './DemoEnter';

/** 첫 화면: 서재마을 움직이는 그림 + 소개 + 시작 버튼(로그인한 사람은 proxy가 /room으로 보낸다) */
export default function Landing() {
  return (
    <main className="landing">
      <Image src="/brand/logo-h-light.png" alt="서재일촌 seojae1chon" width={268} height={92} className="logoimg hero" priority />
      <figure className="village">
        <picture>
          <source srcSet="/brand/village-lv4.png" media="(prefers-reduced-motion: reduce)" />
          <source srcSet="/brand/village.webp" type="image/webp" />
          <img src="/brand/village.gif" width={1536} height={1152} alt="책이 늘면서 Lv.1 작은 방이 Lv.4 복층 서재로 넓어지고, 친구들이 하나둘 모이는 장면" />
        </picture>
        <figcaption>책 50권 → 200권 → 700권 → 2,000권</figcaption>
      </figure>
      <h1>책이 쌓일수록<br />넓어지는 픽셀 서재</h1>
      <p className="muted">가진 책을 꽂으면 방이 자라고, 친구들이 놀러 와요.</p>
      <ul className="points">
        <li>바코드나 검색으로 책을 꽂으면 책등이 실제 두께로</li>
        <li>권수가 늘면 방이 넓어지고 소품과 옷이 열려요</li>
        <li>자랑 책장의 대표 책이 방 테마를 정해요</li>
      </ul>
      <Link className="btn primary" href="/login?join=1">초대 코드로 시작하기</Link>
      <Link className="btn ghost" href="/login">로그인</Link>
      <DemoEnter />
    </main>
  );
}
