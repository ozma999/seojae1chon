import type { Genre } from '../room/types';

/**
 * 장르 정보가 없는 검색 결과(카카오)용 추정. 확실한 신호만 쓴다 — 애매하면 null(→ AI 분류나 기본값).
 * 만화: 만화 전문 출판사·레이블, 제목의 '코믹스/만화/웹툰'
 * SF·판타지: SF 전문 출판사·레이블, 제목의 'SF'
 */
const MANGA_PUB = /대원씨아이|대원\s*CI|학산문화사|서울미디어코믹스|서울문화사|디앤씨미디어|D&C\s*미디어|영상출판미디어|삼양출판사|재담미디어|애니북스|이미지프레임|YJ코믹스|문학동네\s*코믹스|소미미디어|AK\s*커뮤니케이션즈|길찾기|거북이북스|노블엔진|시리얼|코믹|comics?/i;
const MANGA_TITLE = /코믹스|만화|웹툰|애장판|완전판\s*\d|comics?\b|\bvol\.?\s*\d/i;
const SF_PUB = /아작|허블|구픽|폴라북스|오멜라스|행복한책읽기|그래비티북스|알마\s*SF/i;
const SF_TITLE = /\bSF\b|SF\s*(소설|단편|앤솔러지)|판타지\s*소설/i;

export function guessGenre(b: { title: string; publisher?: string | null }): Genre | null {
  const pub = b.publisher ?? '', t = b.title;
  if (MANGA_PUB.test(pub) || MANGA_TITLE.test(t)) return 'manga';
  if (SF_PUB.test(pub) || SF_TITLE.test(t)) return 'sf';
  return null;
}
