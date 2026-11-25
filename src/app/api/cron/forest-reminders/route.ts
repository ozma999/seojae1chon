import { NextResponse, type NextRequest } from 'next/server';
import { supabaseService } from '@/lib/supabase/server';
import { mailer, MAIL_FROM } from '@/lib/mail';

/**
 * 매일 아침(Vercel Cron, 09:00 KST): 반납일이 '내일'인 도서관숲 대여에 알림 메일.
 * 한 대여에 한 번만 보낸다(reminded_at). 연장하면 다시 보낼 수 있게 초기화된다.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const svc = supabaseService(), mail = mailer();
  if (!svc) return NextResponse.json({ error: 'no service key' }, { status: 500 });
  if (!mail) return NextResponse.json({ error: '메일 설정(SMTP_HOST·SMTP_USER·SMTP_PASS)이 없어요' }, { status: 500 });

  // 한국 날짜 기준 '내일' 하루(00:00~24:00 KST)
  const kst = new Date(Date.now() + 9 * 3600e3);
  const y = kst.getUTCFullYear(), m = kst.getUTCMonth(), d = kst.getUTCDate();
  const from = new Date(Date.UTC(y, m, d + 1) - 9 * 3600e3), to = new Date(Date.UTC(y, m, d + 2) - 9 * 3600e3);
  const { data, error } = await svc.from('loans')
    .select('id,user_id,due_at,extended,lb:library_books(isbn,book:books(title,vol),lib:libraries(name,place))')
    .is('returned_at', null).is('reminded_at', null).gte('due_at', from.toISOString()).lt('due_at', to.toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  type R = { id: string; user_id: string; due_at: string; extended: number; lb: { isbn: string; book: { title: string; vol: number | null } | null; lib: { name: string; place: string | null } | null } | null };
  const rows = (data ?? []) as unknown as R[];
  const origin = req.nextUrl.origin;
  let sent = 0; const failed: string[] = [];
  for (const r of rows) {
    const { data: u } = await svc.auth.admin.getUserById(r.user_id);
    const email = u?.user?.email;
    if (!email) { failed.push(r.id); continue; }
    const title = `${r.lb?.book?.title ?? '빌린 책'}${r.lb?.book?.vol ? ` ${r.lb.book.vol}` : ''}`;
    const lib = r.lb?.lib?.name ?? '도서관숲', place = r.lb?.lib?.place ? ` (${r.lb.lib.place})` : '';
    const due = new Date(r.due_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' });
    const canExtend = (r.extended ?? 0) < 1;
    try {
      await mail.sendMail({
        from: `서재일촌 <${MAIL_FROM()}>`, to: email,
        subject: `[서재일촌] 『${title}』 내일 반납일이에요`,
        text: `『${title}』 반납일이 내일(${due})이에요.\n${lib}${place}에 반납하고, 앱에서 '반납하기'로 바코드를 찍어 주세요.\n${canExtend ? '더 읽고 싶으면 앱에서 한 번 연장할 수 있어요.\n' : ''}\n${origin}/forest`,
        html: `<div style="font-family:sans-serif;line-height:1.6;color:#2e1f1a"><p><b>『${title}』</b> 반납일이 <b>내일(${due})</b>이에요.</p>
<p>${lib}${place}에 반납하고, 앱에서 <b>반납하기</b>로 바코드를 찍어 주세요.${canExtend ? '<br>더 읽고 싶으면 앱에서 한 번 연장할 수 있어요.' : ''}</p>
<p><a href="${origin}/forest" style="display:inline-block;padding:10px 16px;background:#2f5a86;color:#fff;border-radius:8px;text-decoration:none">도서관숲 열기</a></p></div>`,
      });
      await svc.from('loans').update({ reminded_at: new Date().toISOString() }).eq('id', r.id);
      sent++;
    } catch { failed.push(r.id); }
  }
  return NextResponse.json({ due: rows.length, sent, failed: failed.length });
}
