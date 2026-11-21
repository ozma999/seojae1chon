import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ supabaseService: () => null }));
import { kakaoSearch, normalizeKakao } from '@/lib/books/kakao';
import { missingVols, sameSeries, seriesKey } from '@/lib/books/series';
import { clearLookupCache, lookupBooks, seriesVolumes } from '@/lib/books/store';

const ck = (b: string) => { const s = [...b].reduce((a, c, i) => a + Number(c) * (i % 2 ? 3 : 1), 0); return b + ((10 - (s % 10)) % 10); };
const isbn = (n: number) => ck('978893600' + String(n).padStart(3, '0'));
const D = (title: string, n: number, publisher = '대원씨아이') => ({ title, isbn: `89360000${n} ${isbn(n)}`, publisher, authors: ['오다 에이치로'], datetime: '2002-01-01T00:00:00.000+09:00', thumbnail: 'https://t/x.jpg' });
const K = (docs: unknown[], isEnd = true) => new Response(JSON.stringify({ meta: { is_end: isEnd }, documents: docs }));

describe('카카오 정리', () => {
  it('ISBN 13자리 고르기, 날짜, 시리즈 추출', () => {
    expect(normalizeKakao(D('원피스 104', 104))).toMatchObject({ isbn: isbn(104), series: '원피스', vol: 104, pubDate: '2002-01-01', pages: null, coverUrl: 'https://t/x.jpg' });
    expect(normalizeKakao({ title: 'x', isbn: '' })).toBeNull();
  });
  it('키는 헤더로, 401은 한국어 오류', async () => {
    const f = vi.fn().mockResolvedValue(K([D('원피스 1', 1)]));
    await kakaoSearch('KEY', { title: '원피스' }, f);
    expect(f.mock.calls[0][1].headers.Authorization).toBe('KakaoAK KEY');
    expect(String(f.mock.calls[0][0])).toContain('target=title');
    await expect(kakaoSearch('K', { title: 'a' }, vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))).rejects.toThrow('키를 확인');
  });
});

describe('시리즈 비교(느슨하게)', () => {
  it('영문 병기·괄호는 무시, 판 이름은 구분', () => {
    expect(sameSeries('원피스 = ONE PIECE', '원피스')).toBe(true);
    expect(sameSeries('원피스 ONE PIECE', '원 피스')).toBe(true);
    expect(sameSeries('원피스 애장판', '원피스')).toBe(false);
    expect(seriesKey('ONE PIECE')).toBe('onepiece');
  });
  it('빠진 권', () => expect(missingVols([1, 2, 4, 7])).toEqual([3, 5, 6]));
});

afterEach(() => { vi.unstubAllGlobals(); delete process.env.KAKAO_REST_KEY; clearLookupCache(); });
describe('카카오 키가 있을 때', () => {
  it('제목 검색은 카카오, 영문 병기 제목도 같은 시리즈로 정렬', async () => {
    process.env.KAKAO_REST_KEY = 'k';
    const f = vi.fn().mockResolvedValueOnce(K([D('원피스 3', 3), D('원피스 ONE PIECE 1', 1), D('원피스 2', 2), D('해적 이야기', 90)]));
    vi.stubGlobal('fetch', f);
    const r = await lookupBooks({ title: '원피스' });
    expect(r.source).toBe('kakao');
    expect(r.books.map((b) => b.vol)).toEqual([1, 2, 3]);
    expect(String(f.mock.calls[0][0])).toContain('dapi.kakao.com');
  });
  it('시리즈 전체: 여러 쪽 + 빠진 권은 따로 찾기', async () => {
    process.env.KAKAO_REST_KEY = 'k';
    const f = vi.fn()
      .mockResolvedValueOnce(K([D('원피스 1', 1), D('원피스 2', 2)], false))
      .mockResolvedValueOnce(K([D('원피스 ONE PIECE 5', 5), D('원피스 애장판 3', 33)], true))
      .mockResolvedValueOnce(K([D('원피스 3', 3)]))     // 3권 따로
      .mockResolvedValueOnce(K([]));                    // 4권은 못 찾음
    vi.stubGlobal('fetch', f);
    const r = await seriesVolumes('원피스', '대원씨아이');
    expect(r.map((b) => b.vol)).toEqual([1, 2, 3, 5]);
    expect(f).toHaveBeenCalledTimes(4);
  });
});
