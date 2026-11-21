'use client';
// 데모 모드: Supabase 없이 이 브라우저(localStorage)에만 저장한다
import type { BookInfo } from '../books/nl';
import type { AddMethod, LibraryEntry, Profile, Repo } from './types';
import catalog from './demo-catalog.json';

const KEY = 'seojae-demo-v1';
interface Saved { profile: Profile; entries: LibraryEntry[] }
type CatalogBook = BookInfo & { own: boolean; brag: boolean; comment: string | null };
export const DEMO_CATALOG = catalog as CatalogBook[];

const entryOf = (b: BookInfo, method: AddMethod, extra: Partial<LibraryEntry> = {}): LibraryEntry => ({
  ...b, id: crypto.randomUUID(), userGenre: null, verified: method === 'barcode' || method === 'photo', method,
  comment: null, bragAt: null, bragText: null, look: null, addedAt: Date.now(), ...extra,
});
function seed(empty: boolean): Saved {
  const t = Date.now();
  return {
    profile: { id: 'demo', roomName: '나의 서재', hair: 0, outfit: 0, itemsOff: [] },
    entries: empty ? [] : DEMO_CATALOG.filter((b) => b.own).map((b, i) =>
      entryOf(b, 'barcode', { comment: b.comment, bragAt: b.brag ? t + i : null, addedAt: t - i })),
  };
}
const read = (): Saved | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; } };
const write = (s: Saved) => localStorage.setItem(KEY, JSON.stringify(s));

export function demoReset(empty: boolean) { write(seed(empty)); }

/** 서재 단계를 보려고 넣는 가짜 책(쪽수·장르 무작위) */
export function demoFill(n: number) {
  const s = read() ?? seed(false);
  const genres = ['lit', 'lit', 'sf', 'hum', 'manga'] as const;
  let r = s.entries.length + 1;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const k = s.entries.length + 1;
    s.entries.push(entryOf({
      isbn: `demo-${k}`, title: `데모 도서 ${String(k).padStart(4, '0')}`, author: '데모 작가', publisher: null, pubDate: null,
      pages: 120 + Math.floor(rnd() * 500), size: rnd() < 0.12 ? 'big' : 'mid', heightMm: null, hardcover: rnd() < 0.15,
      format: rnd() < 0.15 ? 'ebook' : 'paper', series: null, vol: null, setIsbn: null, coverUrl: null, addCode: null,
      genre: genres[Math.floor(rnd() * genres.length)], genreSource: 'default',
    }, 'photo'));
  }
  write(s);
}

export function demoRepo(): Repo {
  const get = () => read() ?? (write(seed(false)), read()!);
  const save = (f: (s: Saved) => void) => { const s = get(); f(s); write(s); };
  return {
    mode: 'demo',
    async load() { return get(); },
    async lookup(q) {
      const r = await fetch(`/api/books/lookup?${new URLSearchParams(q.isbn ? { isbn: q.isbn } : { q: q.title ?? '' })}`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? '검색 실패');
      return (await r.json()).books as BookInfo[];
    },
    async add(info, { method, format }) {
      const e = entryOf({ ...info, format: format ?? info.format }, method);
      save((s) => {
        if (s.entries.some((x) => x.isbn === e.isbn && x.format === e.format)) throw new Error('이미 서재에 있는 책이에요');
        s.entries.push(e);
      });
      return e;
    },
    async remove(id) { save((s) => { s.entries = s.entries.filter((e) => e.id !== id); }); },
    async updateEntry(id, patch) {
      save((s) => {
        const e = s.entries.find((x) => x.id === id);
        if (!e) return;
        if (patch.bragAt && e.bragAt === null && s.entries.filter((x) => x.bragAt !== null).length >= 12) throw new Error('자랑 책장은 12칸까지예요');
        Object.assign(e, patch);
      });
    },
    async updateProfile(patch) { save((s) => Object.assign(s.profile, patch)); },
  };
}
