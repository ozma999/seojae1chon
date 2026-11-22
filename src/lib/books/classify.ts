import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { Genre } from '../room/types';

/** 장르 정보가 없는 책을 Claude Haiku로 4갈래 분류. 키(ANTHROPIC_API_KEY)가 없으면 빈 결과 */
export const hasClassifier = () => !!process.env.ANTHROPIC_API_KEY;

const Out = z.object({
  books: z.array(z.object({ i: z.number().int(), genre: z.enum(['lit', 'sf', 'manga', 'hum']) })),
});

const SYSTEM = `한국 서점의 책을 네 갈래로 나눈다.
- lit: 소설·시·에세이 등 문학(SF·판타지 제외), 그림책·동화 포함
- sf: SF·판타지·라이트노벨
- manga: 만화·웹툰 단행본·그래픽노블
- hum: 인문·사회·과학·역사·철학·경제·자기계발·실용 등 비문학
제목·저자·출판사만 보고 가장 그럴듯한 하나를 고른다. 모든 책에 답한다.`;

export async function classifyGenres(books: { isbn: string; title: string; author: string | null; publisher: string | null }[]) {
  const out = new Map<string, Genre>();
  if (!hasClassifier() || !books.length) return out;
  const client = new Anthropic();
  for (let s = 0; s < books.length; s += 60) {
    const chunk = books.slice(s, s + 60);
    const list = chunk.map((b, i) => `${i}\t${b.title}\t${b.author ?? ''}\t${b.publisher ?? ''}`).join('\n');
    try {
      const res = await client.messages.parse({
        model: 'claude-haiku-5-5',
        max_tokens: 4000,
        output_config: { effort: 'low', format: zodOutputFormat(Out) },
        system: SYSTEM,
        messages: [{ role: 'user', content: `번호\t제목\t저자\t출판사\n${list}` }],
      });
      if (res.stop_reason === 'refusal') continue;
      for (const r of res.parsed_output?.books ?? []) if (chunk[r.i]) out.set(chunk[r.i].isbn, r.genre);
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) { console.error('ANTHROPIC_API_KEY 확인 필요'); break; }
      if (e instanceof Anthropic.RateLimitError) break;
      console.error('genre classify failed', e instanceof Anthropic.APIError ? e.status : e);
    }
  }
  return out;
}
