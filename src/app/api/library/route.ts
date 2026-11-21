import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer, supabaseService } from '@/lib/supabase/server';
import { bookToRow, lookupBooks } from '@/lib/books/store';
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
  const { data: cached } = await sb.from('books').select('isbn').eq('isbn', isbn).maybeSingle();
  if (!cached) {
    const { books } = await lookupBooks({ isbn });
    const b = books.find((x) => x.isbn === isbn);
    if (!b) return NextResponse.json({ error: '국립중앙도서관에서 찾지 못한 책이에요' }, { status: 404 });
    // 국립중앙도서관 결과는 lookupBooks가 이미 캐시에 넣지만, 키가 없을 때의 임시 목록도 여기서 저장한다
    const { error: upErr } = await supabaseService()!.from('books').upsert(bookToRow(b), { onConflict: 'isbn' });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
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
