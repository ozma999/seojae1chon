import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer, supabaseService } from '@/lib/supabase/server';
import { guessGenre } from '@/lib/books/genre';
import { classifyGenres } from '@/lib/books/classify';
import { normalizeIsbn } from '@/lib/books/isbn';
import type { Genre } from '@/lib/room/types';

/** 장르를 모르는(기본값) 책들의 장르를 정한다: 규칙(만화·SF 출판사 등) → AI(키가 있을 때). 한 번 정하면 DB에 남는다 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const isbns = [...new Set((Array.isArray(body.isbns) ? body.isbns : []).map((x: unknown) => normalizeIsbn(String(x ?? ''))).filter(Boolean))].slice(0, 300) as string[];
  if (!isbns.length) return NextResponse.json({ updated: 0 });
  const sb = await supabaseServer();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });
  const svc = supabaseService();
  if (!svc) return NextResponse.json({ updated: 0 });
  const { data } = await svc.from('books').select('isbn,title,author,publisher').in('isbn', isbns).eq('genre_source', 'default');
  const rows = (data ?? []) as { isbn: string; title: string; author: string | null; publisher: string | null }[];
  const set = async (isbn: string, genre: Genre, src: 'guess' | 'ai') => {
    const { error } = await svc.from('books').update({ genre, genre_source: src }).eq('isbn', isbn);
    if (error?.code === '23514') await svc.from('books').update({ genre, genre_source: 'subject' }).eq('isbn', isbn);   // 마이그레이션 전
  };
  let updated = 0;
  const rest = [];
  for (const r of rows) {
    const g = guessGenre(r);
    if (g) { await set(r.isbn, g, 'guess'); updated++; } else rest.push(r);
  }
  const ai = await classifyGenres(rest);
  for (const [isbn, g] of ai) { await set(isbn, g, 'ai'); if (g !== 'lit') updated++; }
  return NextResponse.json({ updated, guessed: rows.length - rest.length, ai: ai.size });
}
