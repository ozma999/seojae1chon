import { NextResponse, type NextRequest } from 'next/server';
import { seriesVolumes } from '@/lib/books/store';

/** 시리즈의 모든 권: /api/books/series?name=원피스&publisher=대원씨아이 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim();
  if (!name) return NextResponse.json({ error: '시리즈 이름이 필요해요' }, { status: 400 });
  try {
    return NextResponse.json({ books: await seriesVolumes(name, req.nextUrl.searchParams.get('publisher')) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
