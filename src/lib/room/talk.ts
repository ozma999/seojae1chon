// 일촌 방문 말풍선: 정해 둔 문장만 쓴다(자유 채팅 없음). 그 서재의 실제 책을 넣어 대화처럼 보이게.
import type { LibraryEntry } from '../data/types';
import { seriesProgress } from './stats';

const cut = (s: string, n = 14) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** [방문자가 거는 말, 주인의 대답] 을 무작위로 하나 고른다 */
export function makeLines(host: LibraryEntry[], mine: LibraryEntry[], opts: { scene?: string; rnd?: () => number } = {}) {
  const rnd = opts.rnd ?? Math.random;
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const mineIsbn = new Set(mine.map((e) => e.isbn));
  const shared = host.filter((e) => mineIsbn.has(e.isbn));
  const brag = host.filter((e) => e.bragAt);
  const done = seriesProgress(host).filter((s) => s.have >= 3);
  const gens: (() => [string, string] | null)[] = [
    () => (host.length ? [`『${cut(pick(host).title)}』 재밌어?`, pick(['응, 꼭 읽어 봐!', '아직 못 읽었어 ㅎㅎ', '두 번 읽었어!', '빌려줄까?'])] : null),
    () => (shared.length ? [`『${cut(pick(shared).title)}』 나도 있어!`, pick(['취향 통했다!', '역시 우리 일촌', '어디까지 읽었어?'])] : null),
    () => (done.length ? [`${cut(pick(done).name, 10)} 시리즈 많이 모았네!`, pick(['완결까지 가 보자고', '다음 권 기다리는 중', '이거 하나는 자신 있어'])] : null),
    () => (brag.length ? ['자랑 책장 멋지다', pick(['제일 아끼는 책들이야', '하나씩 골라 꽂았지', '고르느라 한참 걸렸어'])] : null),
    () => [`책이 ${host.length.toLocaleString()}권이나 되네`, pick(['아직 멀었어~', '방이 좁아지는 중', '조금씩 모았어'])],
    () => (opts.scene ? [`창밖이 ${opts.scene}네`, pick(['여기 앉아 있으면 시간 가는 줄 몰라', '밤에 보면 더 예뻐', '그래서 이 방이 좋아'])] : null),
    () => [pick(['나도 이런 서재 갖고 싶다', '여기 아늑하다', '구경 잘하고 갈게']), pick(['자주 놀러 와!', '언제든 와', '다음엔 네 서재 갈게'])],
  ];
  return () => {
    for (let i = 0; i < 8; i++) { const r = pick(gens)(); if (r) return r; }
    return ['안녕!', '어서 와!'];
  };
}
