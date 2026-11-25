import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

/**
 * 책장 사진 → 책 목록. 사진(조각 여러 장 = 한 책장)을 Claude에 보내 책등을 한 권씩 읽게 한다.
 * 고른 모델·사용량·대략의 비용(원)을 함께 돌려준다.
 */
export const PHOTO_MODELS = {
  haiku: { id: 'claude-haiku-5-5', name: '빠름', inUsd: 0.1, outUsd: 0.5 },
  sonnet: { id: 'claude-sonnet-5-5', name: '기본', inUsd: 2, outUsd: 10 },
  opus: { id: 'claude-opus-5-5', name: '정밀', inUsd: 4, outUsd: 20 },
} as const;
export type PhotoModel = keyof typeof PHOTO_MODELS;
const KRW_PER_USD = 1450;

const Spine = z.object({
  title: z.string(),
  volume: z.number().int().nullable(),
  author: z.string().nullable(),
  publisher: z.string().nullable(),
  confidence: z.enum(['high', 'low']),
});
const Out = z.object({ books: z.array(Spine) });
export type SpineRead = z.infer<typeof Spine>;

const SYSTEM = `책장 사진에서 책을 읽어 목록을 만든다.
- 왼쪽에서 오른쪽으로(칸이 여러 개면 위 칸부터) 책등이나 표지가 보이는 책을 한 권씩 모두 적는다.
- 시리즈는 권마다 한 줄씩 적는다. 같은 권이 두 권 있으면 두 번 적는다.
- title에는 권수를 뺀 작품 제목만 적는다. 책등에 한국어 제목이 있으면 한국어로, 없으면 보이는 그대로 적는다. '애장판'·'완전판' 같은 판 이름은 제목 뒤에 붙인다.
- volume에는 권수 숫자만 적고, 권수가 없으면 null.
- author·publisher는 책등에 보이면 적고, 안 보이면 null.
- 글자가 잘 안 보여 짐작한 책은 confidence를 low로 한다. 장식품·액자·상자는 적지 않는다.
- 사진이 여러 장이면 한 책장을 겹치게 나눈 조각이다. 겹친 부분의 책은 한 번만 적는다.`;

export async function readShelf(images: { data: string; media: 'image/jpeg' | 'image/png' }[], model: PhotoModel) {
  const M = PHOTO_MODELS[model];
  const client = new Anthropic();
  const big = model !== 'haiku';
  const res = await client.beta.messages.create({
    model: M.id,
    max_tokens: 8000,
    ...(big ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: z.toJSONSchema(Out) as Record<string, unknown> } },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: [
        ...images.map((im) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: im.media, data: im.data } })),
        { type: 'text' as const, text: `책장 사진 ${images.length > 1 ? `조각 ${images.length}장` : '1장'}입니다. 보이는 책을 모두 적어 주세요.` },
      ],
    }],
  });
  if (res.stop_reason === 'refusal') throw new Error('이 사진은 읽을 수 없었어요');
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const books = Out.parse(JSON.parse(text)).books.filter((b) => b.title.trim());
  const inTok = res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0);
  const outTok = res.usage.output_tokens;
  const costKrw = ((inTok * M.inUsd + outTok * M.outUsd) / 1e6) * KRW_PER_USD;
  return { books, model, servedBy: res.model, inTok, outTok, costKrw: Math.round(costKrw * 100) / 100 };
}
