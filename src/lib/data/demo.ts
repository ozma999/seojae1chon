'use client';
// 데모 모드: Supabase 없이 이 브라우저(localStorage)에만 저장한다
import type { BookInfo } from '../books/nl';
import type { AddMethod, InviteCode, LibraryEntry, Profile, Repo, RoomSummary } from './types';
import catalog from './demo-catalog.json';

const KEY = 'seojae-demo-v1';
interface Saved { profile: Profile; entries: LibraryEntry[]; invites?: InviteCode[] }
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

/** 가짜 책(쪽수·장르 무작위, seed가 같으면 같은 책) */
function fakeBooks(n: number, start: number, seedN: number, genres: readonly LibraryEntry['genre'][] = ['lit', 'lit', 'sf', 'hum', 'manga']) {
  let r = seedN;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const out: LibraryEntry[] = [];
  for (let i = 0; i < n; i++) {
    const k = start + i;
    out.push(entryOf({
      isbn: `demo-${seedN}-${k}`, title: `데모 도서 ${String(k).padStart(4, '0')}`, author: '데모 작가', publisher: null, pubDate: null,
      pages: 120 + Math.floor(rnd() * 500), size: rnd() < 0.12 ? 'big' : 'mid', heightMm: null, hardcover: rnd() < 0.15,
      format: rnd() < 0.15 ? 'ebook' : 'paper', series: null, vol: null, setIsbn: null, coverUrl: null, addCode: null,
      genre: genres[Math.floor(rnd() * genres.length)], genreSource: 'default',
    }, 'photo', { id: `fake-${seedN}-${k}` }));
  }
  return out;
}
/** 서재 단계를 보려고 넣는 가짜 책 */
export function demoFill(n: number) {
  const s = read() ?? seed(false);
  s.entries.push(...fakeBooks(n, s.entries.length + 1, s.entries.length + 1).map((e) => ({ ...e, id: crypto.randomUUID() })));
  write(s);
}

// 데모 서재산책: 고정된 가짜 친구 두 명
const FRIENDS = [
  { id: 'demo-friend-1', roomName: '새벽서가', hair: 4, outfit: 4, n: 240, seed: 11, genres: ['lit', 'lit', 'hum'] as const, brag: 3 },
  { id: 'demo-friend-2', roomName: '만화방 주인', hair: 6, outfit: 2, n: 820, seed: 23, genres: ['manga', 'manga', 'sf'] as const, brag: 5 },
];
function friendRoom(id: string) {
  const f = FRIENDS.find((x) => x.id === id);
  if (!f) throw new Error('없는 서재예요');
  const entries = fakeBooks(f.n, 1, f.seed, f.genres);
  entries.slice(0, f.brag).forEach((e, i) => { e.bragAt = 1 + i; e.bragText = i === 0 ? '제일 아끼는 책' : null; });
  return { profile: { id: f.id, roomName: f.roomName, hair: f.hair, outfit: f.outfit, itemsOff: [] }, entries };
}

export function demoRepo(): Repo {
  const get = () => read() ?? (write(seed(false)), read()!);
  const save = (f: (s: Saved) => void) => { const s = get(); f(s); write(s); };
  return {
    mode: 'demo',
    async load() { return get(); },
    async seriesVolumes(series, publisher) {
      const r = await fetch(`/api/books/series?${new URLSearchParams({ name: series, ...(publisher ? { publisher } : {}) })}`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? '시리즈를 불러오지 못했어요');
      return (await r.json()).books as BookInfo[];
    },
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
    async addMany(infos, { method }) {
      const out: LibraryEntry[] = [];
      save((s) => {
        for (const b of infos) {
          if (s.entries.some((x) => x.isbn === b.isbn && x.format === b.format)) continue;
          const e = entryOf(b, method); s.entries.push(e); out.push(e);
        }
      });
      return out;
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
    async listRooms() {
      const s = get();
      const me: RoomSummary = { id: 'demo', roomName: s.profile.roomName, hair: s.profile.hair, outfit: s.profile.outfit,
        books: s.entries.length, brag: s.entries.filter((e) => e.bragAt !== null).length, lastAdded: null, isMe: true };
      return [me, ...FRIENDS.map((f) => ({ id: f.id, roomName: f.roomName, hair: f.hair, outfit: f.outfit, books: f.n, brag: f.brag, lastAdded: null, isMe: false }))];
    },
    async loadRoom(id) { return id === 'demo' ? get() : friendRoom(id); },
    async visit() {},
    async todayVisits() { return 2; },
    async myInvites() { return get().invites ?? []; },
    async createInvite() {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => A[b % 32]).join('');
      save((s) => {
        s.invites = s.invites ?? [];
        if (s.invites.filter((i) => i.uses < i.maxUses).length >= 5) throw new Error('사용하지 않은 초대 코드가 5개 있어요');
        s.invites.unshift({ code, uses: 0, maxUses: 1, expiresAt: Date.now() + 30 * 864e5 });
      });
      return code;
    },
  };
}
