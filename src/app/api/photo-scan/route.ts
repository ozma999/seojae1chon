import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseServer, supabaseService } from '@/lib/supabase/server';
import { PHOTO_MODELS, readShelf, type PhotoModel } from '@/lib/books/photo';

export const maxDuration = 120;   // 큰 모델은 사진 읽는 데 수십 초 걸릴 수 있다
const MONTHLY_LIMIT = 60;          // 1인당 한 달 사진 수

/** 태초가족 전용: 책장 사진(조각 1~4장) → 책 목록 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: '서버에 AI 키(ANTHROPIC_API_KEY)가 아직 없어요' }, { status: 503 });
  const sb = await supabaseServer();
  const { data: claims } = await sb.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });
  const svc = supabaseService();
  if (!svc) return NextResponse.json({ error: '서버 설정(SUPABASE_SERVICE_ROLE_KEY)이 없어요' }, { status: 500 });
  const { data: prof } = await svc.from('profiles').select('cohort').eq('id', uid).single();
  if (prof?.cohort !== 'founding') return NextResponse.json({ error: '사진 등록은 지금 태초가족만 쓸 수 있어요' }, { status: 403 });

  // 이번 달 사용량(표가 아직 없으면 한도 없이 진행)
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const { count, error: cErr } = await svc.from('photo_scans').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', monthStart.toISOString());
  if (!cErr && (count ?? 0) >= MONTHLY_LIMIT) return NextResponse.json({ error: `이번 달 사진 등록 ${MONTHLY_LIMIT}장을 모두 썼어요` }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const model: PhotoModel = body.model in PHOTO_MODELS ? body.model : 'sonnet';
  const raw: unknown[] = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
  const images = raw.map((u) => String(u)).map((u) => {
    const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(u);
    return m ? { media: m[1] as 'image/jpeg' | 'image/png', data: m[2] } : null;
  }).filter((x): x is { media: 'image/jpeg' | 'image/png'; data: string } => !!x);
  if (!images.length) return NextResponse.json({ error: '사진을 읽지 못했어요' }, { status: 400 });

  try {
    const t0 = Date.now();
    const r = await readShelf(images, model);
    await svc.from('photo_scans').insert({ user_id: uid, model: r.servedBy, photos: 1, books: r.books.length, input_tokens: r.inTok, output_tokens: r.outTok, cost_krw: r.costKrw });
    return NextResponse.json({ ...r, ms: Date.now() - t0, used: (count ?? 0) + 1, limit: MONTHLY_LIMIT });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: 'AI 키를 확인해 주세요' }, { status: 503 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'AI 사용량이 몰렸어요. 잠시 뒤 다시 해 주세요' }, { status: 429 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: `AI 오류(${e.status})` }, { status: 502 });
    return NextResponse.json({ error: (e as Error).message || '사진을 읽지 못했어요' }, { status: 500 });
  }
}
