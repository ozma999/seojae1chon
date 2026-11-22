import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * 이메일 인증·비밀번호 재설정 링크가 돌아오는 곳.
 * 링크는 요청한 기기의 같은 브라우저에서 열어야 한다(보안 코드가 그 브라우저에 저장됨). 실패하면 로그인 화면에서 이유를 알려준다
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const next = req.nextUrl.searchParams.get('next') ?? '/room';
  const fail = (why: string) => NextResponse.redirect(new URL(`/login?err=${why}`, req.url));
  if (req.nextUrl.searchParams.get('error')) return fail('expired');   // 만료·이미 쓴 링크(Supabase가 error를 붙여 보냄)
  if (!code) return fail('link');
  try {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return fail(/verifier|code challenge/i.test(error.message) ? 'device' : 'expired');
  } catch {
    return fail('expired');
  }
  return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/room', req.url));
}
