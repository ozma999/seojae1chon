/** 서재 이름을 비워 둘 때 붙여 주는 이름(앞말 + 뒷말) */
const A = ['새벽', '달빛', '다락', '골목', '창가', '빗소리', '구름', '느긋한', '반짝', '오후', '책벌레', '모퉁이', '고양이', '별빛', '낮잠'];
const B = ['서가', '서재', '책방', '책장', '문고', '도서실', '책다락'];
export const DEFAULT_ROOM_NAME = '나의 서재';
export function randomRoomName(rnd: () => number = Math.random) {
  return `${A[Math.floor(rnd() * A.length)]} ${B[Math.floor(rnd() * B.length)]}`;
}
export const cleanRoomName = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, 20);
