import { redirect } from 'next/navigation';
/** 예전 주소: 내 책장으로 옮김 */
export default function SearchPage() { redirect('/shelf'); }
