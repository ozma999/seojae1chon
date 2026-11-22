import { redirect } from 'next/navigation';
/** 예전 주소: 일촌 탭으로 옮김(보유량·장르는 내 책장으로) */
export default function SharePage() { redirect('/ilchon'); }
