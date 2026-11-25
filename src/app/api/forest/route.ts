import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer, supabaseService } from '@/lib/supabase/server';
import { bookToRow, lookupBooks, upsertBooks } from '@/lib/books/store';
import { normalizeIsbn } from '@/lib/books/isbn';

/** 도서관숲에 책 등록(관리자): 서지 캐시에 없는 책은 찾아 저장한 뒤, 관리자 권한(RLS)으로 꽂는다 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const raw: unknown[] = Array.isArray(body.isbns) ? body.isbns : [];
  const isbns = [...new Set(raw.map((x) => normalizeIsbn(String(x ?? ''))).filter((x): x is string => !!x))].slice(0, 200);
  const slug = typeof body.library === 'string' ? body.library : 'forest';
  if (!isbns.length) return NextResponse.json({ error: 'ISBN 형식이 맞지 않아요' }, { status: 400 });
  const sb = await supabaseServer();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });
  const svc = supabaseService();
  if (!svc) return NextResponse.json({ error: '서버 설정(SUPABASE_SERVICE_ROLE_KEY)이 없어요' }, { status: 500 });
  const { data: lib } = await sb.from('libraries').select('id').eq('slug', slug).single();
  if (!lib) return NextResponse.json({ error: '도서관을 찾을 수 없어요(SQL을 실행했는지 확인해 주세요)' }, { status: 404 });
  const { data: can } = await sb.rpc('library_manager', { lib: lib.id });
  if (!can) return NextResponse.json({ error: '도서관숲 관리자만 책을 등록할 수 있어요' }, { status: 403 });

  const { data: have } = await svc.from('books').select('isbn').in('isbn', isbns);
  const known = new Set((have ?? []).map((r) => r.isbn as string));
  for (const i of isbns.filter((x) => !known.has(x))) {
    const { books } = await lookupBooks({ isbn: i }).catch(() => ({ books: [] }));
    const b = books.find((x) => x.isbn === i);
    if (b) { await upsertBooks(svc, [bookToRow(b)]); known.add(i); }
  }
  const ok = isbns.filter((i) => known.has(i));
  if (!ok.length) return NextResponse.json({ error: '찾지 못한 책이에요' }, { status: 404 });
  const { data, error } = await sb.from('library_books')
    .upsert(ok.map((isbn) => ({ library_id: lib.id, isbn })), { onConflict: 'library_id,isbn', ignoreDuplicates: true }).select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ added: data?.length ?? 0, skipped: isbns.length - (data?.length ?? 0) });
}
