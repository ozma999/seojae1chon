import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer, supabaseService } from '@/lib/supabase/server';
import { bookToRow, lookupBooks, withPages } from '@/lib/books/store';
import { ENTRY_SELECT } from '@/lib/data/live-shared';
import { normalizeIsbn } from '@/lib/books/isbn';

/** 내 서재에 책 추가: 서지 캐시를 채운 뒤 사용자 권한으로 user_books에 넣는다 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const isbn = normalizeIsbn(String(body.isbn ?? ''));
  const method = ['barcode', 'photo', 'search', 'manual'].includes(body.method) ? body.method : 'search';
  const format = body.format === 'ebook' ? 'ebook' : 'paper';
  if (!isbn) return NextResponse.json({ error: 'ISBN 형식이 맞지 않아요' }, { status: 400 });
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });
  if (!supabaseService()) return NextResponse.json({ error: '서버 설정(SUPABASE_SERVICE_ROLE_KEY)이 없어요' }, { status: 500 });
  const svc = supabaseService()!;
  const { data: cached } = await sb.from('books').select('isbn,pages').eq('isbn', isbn).maybeSingle();
  if (!cached) {
    const { books } = await lookupBooks({ isbn });
    const b = books.find((x) => x.isbn === isbn);
    if (!b) return NextResponse.json({ error: '찾지 못한 책이에요' }, { status: 404 });
    // 검색 결과는 lookupBooks가 캐시에 넣지만, 쪽수 보충·임시 목록 저장을 위해 여기서 한 번 더 저장한다
    const { error: upErr } = await svc.from('books').upsert(bookToRow(await withPages(b)), { onConflict: 'isbn' });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  } else if (!cached.pages) {
    // 카카오 결과처럼 쪽수가 없으면 서재에 꽂을 때 구글에서 채운다(책등 두께)
    const { data: row } = await svc.from('books').select('*').eq('isbn', isbn).single();
    const filled = row ? await withPages({ isbn, pages: null, coverUrl: row.cover_url, genre: row.genre, genreSource: row.genre_source } as never) : null;
    if (filled?.pages) await svc.from('books').update({ pages: filled.pages, cover_url: row.cover_url ?? filled.coverUrl }).eq('isbn', isbn);
  }
  const { data, error } = await sb.from('user_books')
    .insert({ isbn, method, format, verified: method === 'barcode' || method === 'photo' })
    .select(ENTRY_SELECT).single();
  if (error) {
    const dup = error.code === '23505';
    return NextResponse.json({ error: dup ? '이미 서재에 있는 책이에요' : error.message }, { status: dup ? 409 : 400 });
  }
  return NextResponse.json({ entry: (await import('@/lib/data/live-shared')).rowToEntry(data as never) });
}
