import type { Tod } from './types';

/** 해 뜨고 지는 시각. 날짜만으로 계산(위치 권한 불필요). 기본 서울(UTC+9). 오차 수 분.
 *  날짜는 그 장소의 날짜로 잡는다(휴대폰 시간대가 달라도 하루가 어긋나지 않게). */
export function sunTimes(d: Date = new Date(), lat = 37.57, lon = 126.98, tzHours = 9) {
  const rad = Math.PI / 180;
  const loc = new Date(d.getTime() + tzHours * 3600e3);
  const y = loc.getUTCFullYear();
  const base = Date.UTC(y, loc.getUTCMonth(), loc.getUTCDate());
  const n = Math.round((base - Date.UTC(y, 0, 0)) / 864e5);
  const dec = -23.44 * Math.cos(((2 * Math.PI) / 365) * (n + 10)) * rad;
  const B = (2 * Math.PI * (n - 81)) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const cosW =
    (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
  const w0 = Math.acos(Math.max(-1, Math.min(1, cosW))) / rad;
  const noon = 720 - 4 * lon - eot; // 분, UTC
  return { rise: new Date(base + (noon - 4 * w0) * 6e4), set: new Date(base + (noon + 4 * w0) * 6e4) };
}

/** 새벽 = 해 뜨기 1시간 전~뜬 뒤 30분, 낮 = ~해 지기 45분 전, 노을 = ~해 진 뒤 30분, 그 밖 = 밤 */
export function autoTod(now: Date = new Date()): Tod {
  const { rise, set } = sunTimes(now);
  const m = 60e3, t = now.getTime(), r = rise.getTime(), s = set.getTime();
  if (t >= r - 60 * m && t < r + 30 * m) return '새벽';
  if (t >= r + 30 * m && t < s - 45 * m) return '낮';
  if (t >= s - 45 * m && t < s + 30 * m) return '노을';
  return '밤';
}

export const hm = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
