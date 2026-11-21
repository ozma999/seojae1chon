import type { BookLook } from './types';

// 표지 정보가 없을 때 쓰는 책 모양. 색은 방 32색(PAL32) 안의 짝에서 고른다.
const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const P = {
  red: hex(204, 74, 60), redD: hex(150, 50, 44), blue: hex(62, 110, 180), navy: hex(44, 68, 126), navyD: hex(30, 40, 80),
  green: hex(90, 158, 90), greenD: hex(58, 110, 68), yellow: hex(232, 184, 74), yellowD: hex(180, 136, 52),
  cream: hex(236, 222, 186), wallD: hex(176, 156, 124), pink: hex(224, 140, 156), teal: hex(62, 162, 154),
  orange: hex(224, 122, 58), purple: hex(138, 92, 160), grey: hex(140, 140, 152), greyD: hex(98, 98, 110),
  white: hex(246, 242, 232), wallS: hex(210, 194, 162), O: hex(27, 22, 38),
};
const PAIRS: [string, string, string][] = [
  [P.red, P.redD, P.white], [P.blue, P.navy, P.white], [P.green, P.greenD, P.white], [P.yellow, P.yellowD, P.O],
  [P.cream, P.wallD, P.O], [P.navy, P.navyD, P.white], [P.pink, P.redD, P.white], [P.teal, P.greenD, P.white],
  [P.orange, P.redD, P.white], [P.purple, P.navyD, P.white], [P.grey, P.greyD, P.white], [P.white, P.wallS, P.O],
];
const PATS: BookLook['pat'][] = ['band', 'circle', 'split', 'grid', 'stripe', 'frame'];

export function hashStr(s: string) {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
/** ISBN(없으면 제목)으로 정해지는 기본 모양. 같은 책은 누구 서재에서나 같은 모양 */
export function defaultLook(key: string): BookLook {
  const h = hashStr(key);
  const [c1, c2, tc] = PAIRS[h % PAIRS.length];
  return { c1, c2, tc, pat: PATS[(h >>> 8) % PATS.length] };
}
export const EBOOK_MARK = hex(126, 249, 255);
