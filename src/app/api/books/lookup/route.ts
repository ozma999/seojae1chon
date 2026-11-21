import { NextResponse, type NextRequest } from 'next/server';
import { lookupBooks } from '@/lib/books/store';

export async function GET(req: NextRequest) {
  const isbn = req.nextUrl.searchParams.get('isbn') ?? undefined;
  const q = req.nextUrl.searchParams.get('q') ?? undefined;
  if (!isbn && !(q && q.trim().length >= 1)) return NextResponse.json({ error: 'ISBN이나 제목을 입력해 주세요' }, { status: 400 });
  try {
    return NextResponse.json(await lookupBooks({ isbn, title: q }));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
