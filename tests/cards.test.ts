import { describe, expect, it } from 'vitest';
import { allowedCover } from '@/lib/cards/cover-url';
import { wrapChars } from '@/lib/cards/text';

describe('표지 중계 허용 주소', () => {
  it.each([
    ['https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=x', true], ['http://books.google.com/books/content?id=1', true],
    ['https://evil.com/a.jpg', false], ['https://kakaocdn.net.evil.com/a.jpg', false], ['file:///etc/passwd', false], ['nope', false], ['', false],
  ])('%s → %s', (u, ok) => expect(!!allowedCover(u)).toBe(ok));
  it('http는 https로', () => expect(allowedCover('http://books.google.com/x')!.protocol).toBe('https:'));
});
describe('글자 줄바꿈(한글은 글자 단위)', () => {
  const measure = (s: string) => s.length * 10;
  it('최대 줄 수와 말줄임', () => {
    expect(wrapChars('가나다라마바사아자차', 40, measure, 2)).toEqual(['가나다라', '마바사…']);
    expect(wrapChars('짧음', 100, measure, 2)).toEqual(['짧음']);
  });
});
