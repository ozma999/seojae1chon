import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC = ['/login', '/auth', '/sample'];

/** 로그인 세션을 갱신하고, 로그인하지 않았으면 /login으로 보낸다(데모 모드에서는 통과) */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (data.user && path === '/') {   // 로그인한 사람은 첫 화면 대신 내 서재
    const to = request.nextUrl.clone();
    to.pathname = '/room';
    return NextResponse.redirect(to);
  }
  if (!data.user && path !== '/' && !PUBLIC.some((p) => path.startsWith(p)) && !path.startsWith('/api/books/')) {
    const to = request.nextUrl.clone();
    to.pathname = '/';
    return NextResponse.redirect(to);
  }
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|art/|brand/|favicon.ico|.*\\.(?:png|gif|svg|ico|json|webmanifest|woff2)$).*)'],
};
