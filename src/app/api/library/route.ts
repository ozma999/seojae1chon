import { after, NextResponse, type NextRequest } from 'next/server';
import { supabaseServer, supabaseService } from '@/lib/supabase/server';
import { bookToRow, lookupBooks, withPages } from '@/lib/books/store';
import { ENTRY_SELECT, rowToEntry, type Row } from '@/lib/data/live-shared';
import { normalizeIsbn } from '@/lib/books/isbn';

/**
 * 내 서재에 책 추가(한 권: {isbn}, 여러 권: {isbns}).
 * 빠르게: 서지 캐시에 있으면 바로 꽂고, 쪽수 보충(구글)은 응답을 보낸 뒤(after) 한다.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const raw: unknown[] = Array.isArray(body.isbns) ? body.isbns : [body.isbn];
  const isbns = [...new Set(raw.map((x) => normalizeIsbn(String(x ?? ''))).filter((x): x is string => !!x))].slice(0, 200);
  const method = ['barcode', 'photo', 'search', 'manual'].includes(body.method) ? body.method : 'search';
  const format = body.format === 'ebook' ? 'ebook' : 'paper';
  if (!isbns.length) return NextResponse.json({ error: 'ISBN 형식이 맞지 않아요' }, { status: 400 });
  const sb = await supabaseServer();
  const { data: claims } = await sb.auth.getClaims();   // 서명 확인만(인증 서버 왕복 없음)
  if (!claims?.claims?.sub) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });
  const svc = supabaseService();
  if (!svc) return NextResponse.json({ error: '서버 설정(SUPABASE_SERVICE_ROLE_KEY)이 없어요' }, { status: 500 });

  // 1) 서지 캐시에 없는 책만 찾아서 저장
  const { data: have } = await svc.from('books').select('isbn,pages').in('isbn', isbns);
  const cached = new Map((have ?? []).map((r) => [r.isbn as string, r.pages as number | null]));
  const missing = isbns.filter((i) => !cached.has(i));
  for (const i of missing) {
    const { books } = await lookupBooks({ isbn: i }).catch(() => ({ books: [] }));
    const b = books.find((x) => x.isbn === i);
    if (b) { await svc.from('books').upsert(bookToRow(b), { onConflict: 'isbn' }); cached.set(i, b.pages); }
  }
  const ok = isbns.filter((i) => cached.has(i));
  if (!ok.length) return NextResponse.json({ error: '찾지 못한 책이에요' }, { status: 404 });

  // 2) 한 번에 꽂기(이미 있는 책은 건너뜀)
  const rows = ok.map((isbn) => ({ isbn, method, format, verified: method === 'barcode' || method === 'photo' }));
  const { data, error } = await sb.from('user_books')
    .upsert(rows, { onConflict: 'user_id,isbn,format', ignoreDuplicates: true })
    .select(ENTRY_SELECT);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const entries = (data as unknown as Row[]).map(rowToEntry);
  if (isbns.length === 1 && !entries.length) return NextResponse.json({ error: '이미 서재에 있는 책이에요' }, { status: 409 });

  // 3) 응답 뒤: 쪽수 없는 책은 구글에서 채운다(책등 두께). 다음에 서재를 열면 반영
  const noPages = ok.filter((i) => !cached.get(i));
  if (noPages.length) {
    after(async () => {
      for (const i of noPages.slice(0, 60)) {
        const { data: row } = await svc.from('books').select('isbn,pages,cover_url,genre,genre_source').eq('isbn', i).single();
        if (!row || row.pages) continue;
        const f = await withPages({ isbn: i, pages: null, coverUrl: row.cover_url, genre: row.genre, genreSource: row.genre_source } as never);
        if (f.pages) await svc.from('books').update({ pages: f.pages, cover_url: row.cover_url ?? f.coverUrl }).eq('isbn', i);
      }
    });
  }
  return NextResponse.json({ entry: entries[0] ?? null, entries, skipped: isbns.length - entries.length });
}
