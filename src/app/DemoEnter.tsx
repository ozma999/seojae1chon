'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isLive } from '@/lib/supabase/env';
import { demoReset } from '@/lib/data/demo';

/** 데모 모드에서는 샘플 서재로 바로, 실서비스에서는 로그인 없이 보는 샘플 화면으로 */
export function DemoEnter() {
  const router = useRouter();
  if (isLive()) return <Link className="link" href="/sample">샘플 서재 먼저 구경하기 ›</Link>;
  return <button className="link" onClick={() => { demoReset(false); router.push('/room'); }}>샘플 서재 먼저 구경하기 ›</button>;
}
