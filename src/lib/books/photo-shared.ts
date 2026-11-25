// 사진 등록: 서버·화면 공통
export type PhotoModelKey = 'haiku' | 'sonnet' | 'opus';
export const PHOTO_MODEL_LABEL: Record<PhotoModelKey, string> = { haiku: '빠름 · Haiku', sonnet: '기본 · Sonnet', opus: '정밀 · Opus' };
export interface SpineRead { title: string; volume: number | null; author: string | null; publisher: string | null; confidence: 'high' | 'low' }
export interface ScanResult { books: SpineRead[]; model: PhotoModelKey; servedBy: string; inTok: number; outTok: number; costKrw: number; ms: number; used: number; limit: number }
/** 목록 한 줄 → 검색어(제목 + 권수). 판 이름은 검색을 흐리므로 뺀다 */
export const spineQuery = (b: SpineRead) => [b.title.replace(/\s*(애장판|완전판|신장판)\s*/g, ' ').trim(), b.volume ?? ''].join(' ').trim();
