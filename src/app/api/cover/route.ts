import { NextResponse, type NextRequest } from 'next/server';
import { allowedCover } from '@/lib/cards/cover-url';

/** 공유 카드용 표지 중계: 같은 출처로 받아야 캔버스 이미지 저장이 막히지 않는다. 허용된 도서 이미지 서버만 */
export async function GET(req: NextRequest) {
  const u = allowedCover(req.nextUrl.searchParams.get('u'));
  if (!u) return NextResponse.json({ error: '허용되지 않은 주소' }, { status: 400 });
  const r = await fetch(u, { headers: { accept: 'image/*' } }).catch(() => null);
  const type = r?.headers.get('content-type') ?? '';
  if (!r?.ok || !type.startsWith('image/')) return NextResponse.json({ error: '표지를 받지 못했어요' }, { status: 502 });
  const buf = await r.arrayBuffer();
  if (buf.byteLength > 2_000_000) return NextResponse.json({ error: '표지가 너무 커요' }, { status: 413 });
  return new NextResponse(buf, { headers: { 'content-type': type, 'cache-control': 'public, max-age=604800, immutable' } });
}
