// 일괄 등록 도우미: 붙여 넣은 글을 검색할 줄로 정리, 검색 결과에서 가장 맞는 책 고르기
import type { BookInfo } from './nl';
import { normalizeIsbn } from './isbn';
import { norm } from './series';

/**
 * 붙여 넣은 글 → 검색할 줄 목록.
 * 글머리표·번호·따옴표를 떼고, 너무 짧거나 숫자뿐인 줄(쪽수·가격 등)은 빼고, 같은 줄은 한 번만. 최대 100줄
 */
export function cleanLines(text: string, max = 100): string[] {
  const out: string[] = [], seen = new Set<string>();
  for (const raw of text.split(/\r?\n|[;·•|]/)) {
    const isbn = normalizeIsbn(raw.trim());   // ISBN 줄은 번호 떼기 전에 먼저 알아본다
    let s = isbn ?? raw.trim().replace(/^[\s\-–—*●○◦▪︎>\d.)\]]+(?=\D)/, '').replace(/^["'“”‘’「『《〈]+|["'“”‘’」』》〉]+$/g, '').trim();
    if (isbn) s = isbn;
    else if (norm(s).length < 2 || /^[\d\s,.원쪽pP-]+$/.test(s)) continue;
    const k = norm(s);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

/** 검색 결과 중 줄과 가장 맞는 책. 제목이 줄을 품거나(또는 반대) 거의 같으면 '확실' */
export function pickBest(line: string, books: BookInfo[]): { book: BookInfo | null; confident: boolean } {
  if (!books.length) return { book: null, confident: false };
  const isbn = normalizeIsbn(line);
  if (isbn) { const b = books.find((x) => x.isbn === isbn); return { book: b ?? books[0], confident: !!b }; }
  const q = norm(line);
  const score = (b: BookInfo) => {
    const t = norm(b.title), who = norm(b.author ?? '');
    if (t === q) return 100;
    if (t.startsWith(q) || q.startsWith(t)) return 80;
    if (t.includes(q) || q.includes(t)) return 60;
    if (who && q.includes(who) && q.replace(who, '').length && t.includes(q.replace(who, ''))) return 70;   // "작가 제목" 줄
    return 0;
  };
  const ranked = books.map((b, i) => ({ b, s: score(b) - i * 0.01 })).sort((a, b) => b.s - a.s);
  return { book: ranked[0].b, confident: ranked[0].s >= 60 };
}
