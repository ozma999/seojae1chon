// 책장 사진 × 모델 비교(개발용). 사용: ANTHROPIC_API_KEY=... npx tsx scripts/photo-bakeoff.mts 출력폴더 사진1.jpg 사진2.jpg ...
// 앱과 같은 방식: 방향 보정 없이(휴대폰 사진 그대로) 가로로 길면 겹치게 두 조각, 긴 변 1568px JPEG
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const MODELS = { haiku: ['claude-haiku-5-5', 0.1, 0.5], sonnet: ['claude-sonnet-5-5', 2, 10], opus: ['claude-opus-5-5', 4, 20] } as const;
const Out = z.object({ books: z.array(z.object({ title: z.string(), volume: z.number().int().nullable(), author: z.string().nullable(), publisher: z.string().nullable(), confidence: z.enum(['high', 'low']) })) });
const SYSTEM = fs.readFileSync(new URL('../src/lib/books/photo.ts', import.meta.url), 'utf8').match(/const SYSTEM = `([\s\S]*?)`;/)![1];

async function tiles(file: string) {
  const img = sharp(file).rotate(); const { width: W = 0, height: H = 0 } = await img.metadata();
  const ov = 0.12;
  const parts = W > H * 1.15 ? [[0, 0, W * (0.5 + ov / 2), H], [W * (0.5 - ov / 2), 0, W * (0.5 + ov / 2), H]]
    : H > W * 1.15 ? [[0, 0, W, H * (0.5 + ov / 2)], [0, H * (0.5 - ov / 2), W, H * (0.5 + ov / 2)]] : [[0, 0, W, H]];
  return Promise.all(parts.map(async ([x, y, w, h]) => (await sharp(file).rotate().extract({ left: Math.round(x), top: Math.round(y), width: Math.round(w), height: Math.round(h) })
    .resize({ width: 1568, height: 1568, fit: 'inside' }).jpeg({ quality: 86 }).toBuffer()).toString('base64')));
}
const client = new Anthropic();
const [outDir, ...files] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
for (const f of files) {
  const imgs = await tiles(f);
  await Promise.all(Object.entries(MODELS).map(async ([key, [id, pin, pout]]) => {
    const t0 = Date.now();
    try {
      const res = await client.beta.messages.create({
        model: id, max_tokens: 8000,
        ...(key !== 'haiku' ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: z.toJSONSchema(Out) as Record<string, unknown> } },
        system: SYSTEM,
        messages: [{ role: 'user', content: [...imgs.map((data) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data } })),
          { type: 'text' as const, text: `책장 사진 ${imgs.length > 1 ? `조각 ${imgs.length}장` : '1장'}입니다. 보이는 책을 모두 적어 주세요.` }] }],
      });
      const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      const books = Out.parse(JSON.parse(text)).books;
      const cost = ((res.usage.input_tokens * pin + res.usage.output_tokens * pout) / 1e6) * 1450;
      const r = { file: path.basename(f), model: key, servedBy: res.model, ms: Date.now() - t0, in: res.usage.input_tokens, out: res.usage.output_tokens, krw: +cost.toFixed(1), books };
      fs.writeFileSync(path.join(outDir, `${path.basename(f, path.extname(f))}-${key}.json`), JSON.stringify(r, null, 1));
      console.log(r.file, key, books.length, '권', (r.ms / 1000).toFixed(1) + 's', r.krw + '원');
    } catch (e) { console.log(path.basename(f), key, 'ERROR', (e as Error).message); }
  }));
}
