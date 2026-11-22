import { describe, expect, it } from 'vitest';
import { guessGenre } from '@/lib/books/genre';
import { normalizeKakao } from '@/lib/books/kakao';

describe('장르 추정', () => {
  it('만화 출판사·제목', () => {
    expect(guessGenre({ title: '원피스 105', publisher: '대원씨아이' })).toBe('manga');
    expect(guessGenre({ title: '슬램덩크 신장재편판 1', publisher: '대원' })).toBeNull();
    expect(guessGenre({ title: '나의 히어로 아카데미아 1', publisher: '서울미디어코믹스' })).toBe('manga');
    expect(guessGenre({ title: '유미의 세포들 1 (웹툰 단행본)', publisher: '위즈덤하우스' })).toBe('manga');
  });
  it('SF 출판사', () => {
    expect(guessGenre({ title: '우리가 빛의 속도로 갈 수 없다면', publisher: '허블' })).toBe('sf');
  });
  it('모르면 null', () => {
    expect(guessGenre({ title: '사피엔스', publisher: '김영사' })).toBeNull();
    expect(guessGenre({ title: '채식주의자', publisher: '창비' })).toBeNull();
  });
  it('카카오 결과에 반영', () => {
    const b = normalizeKakao({ title: '원피스 1', isbn: '8952721001 9788952721006', publisher: '대원씨아이', translators: ['이세통'] })!;
    expect(b.genre).toBe('manga');
    expect(b.genreSource).toBe('guess');
    expect(b.translators).toBe('이세통');
  });
});
