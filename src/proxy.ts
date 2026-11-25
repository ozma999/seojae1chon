import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { forwardAuthCode } from './lib/auth/forward';

const PUBLIC = ['/login', '/auth', '/sample'];

/** 로그인 세션을 갱신하고, 로그인하지 않았으면 /login으로 보낸다(데모 모드에서는 통과) */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // 메일 링크가 콜백이 아닌 곳(홈 등)으로 돌아와도 로그인 코드를 콜백으로 넘긴다
  const fwd = forwardAuthCode(request.nextUrl);
  if (fwd) return NextResponse.redirect(fwd);
  if (!url || !key) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getClaims: 로그인 토큰 서명만 확인(매 화면 이동마다 인증 서버를 부르지 않아 빠르다). 만료가 가까우면 쿠키를 갱신한다
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub;
  const path = request.nextUrl.pathname;
  if (user && path === '/') {   // 로그인한 사람은 첫 화면 대신 내 서재
    const to = request.nextUrl.clone();
    to.pathname = '/room';
    return NextResponse.redirect(to);
  }
  if (!user && path !== '/' && !PUBLIC.some((p) => path.startsWith(p)) && !path.startsWith('/api/books/') && !path.startsWith('/api/cron/')) {
    const to = request.nextUrl.clone();
    // 화면을 바로 열려던 경우(책장 QR·서재 링크)는 로그인 뒤 그 화면으로 돌아오게
    if (!path.startsWith('/api/')) { to.pathname = '/login'; to.search = ''; to.searchParams.set('next', path); }
    else to.pathname = '/';
    return NextResponse.redirect(to);
  }
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|art/|brand/|favicon.ico|.*\\.(?:png|gif|svg|ico|json|webmanifest|woff2)$).*)'],
};
