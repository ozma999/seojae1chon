'use client';
// 데모 모드: Supabase 없이 이 브라우저(localStorage)에만 저장한다
import type { BookInfo } from '../books/nl';
import type { AddMethod, ForestBook, ForestLoan, GuestNote, InviteCode, LibraryEntry, Profile, Repo, RoomSummary } from './types';
import catalog from './demo-catalog.json';

const KEY = 'seojae-demo-v1';
interface Saved { profile: Profile; entries: LibraryEntry[]; invites?: InviteCode[]; guestbook?: GuestNote[]; forest?: { books: ForestBook[]; loans: ForestLoan[] } }
type CatalogBook = BookInfo & { own: boolean; brag: boolean; comment: string | null };
export const DEMO_CATALOG = catalog as CatalogBook[];

const entryOf = (b: BookInfo, method: AddMethod, extra: Partial<LibraryEntry> = {}): LibraryEntry => ({
  ...b, id: crypto.randomUUID(), userGenre: null, verified: method === 'barcode' || method === 'photo', method,
  comment: null, bragAt: null, bragText: null, look: null, addedAt: Date.now(), ...extra,
});
function seed(empty: boolean): Saved {
  const t = Date.now();
  return {
    profile: { id: 'demo', roomName: '나의 서재', hair: 1, outfit: 0, itemsOff: [] },
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
    // 데모: 일촌은 예시 친구들, 방명록은 이 브라우저에만
    async ilchonState(id) { return id === 'demo' ? 'self' : 'ilchon'; },
    async ilchonRequest() { return 'ilchon'; },
    async ilchonAccept() {},
    async ilchonRemove() {},
    async ilchonRequests() { return []; },
    async guestbook(host) {
      const all = get().guestbook ?? [];
      if (host === 'demo' && !all.some((g) => g.host === 'demo')) {
        return [{ id: 1, host: 'demo', author: { id: 'demo-friend-1', roomName: '새벽서가', hair: 4, outfit: 4 }, body: '서재 구경 잘하고 가요! 다음엔 제 서재도 놀러 오세요', kind: 'note', isbn: null, createdAt: Date.now() - 3600e3, readAt: null }];
      }
      return all.filter((g) => g.host === host).sort((a, b) => b.createdAt - a.createdAt);
    },
    async writeGuestbook(host, body, opts) {
      save((s) => {
        const p = s.profile;
        const title = opts?.isbn ? (friendRoom(host).entries.find((e) => e.isbn === opts.isbn)?.title ?? null) : null;
        (s.guestbook ??= []).push({ id: Date.now(), host, author: { id: 'demo', roomName: p.roomName, hair: p.hair, outfit: p.outfit }, body, kind: opts?.kind ?? 'note', isbn: opts?.isbn ?? null, bookTitle: title, createdAt: Date.now(), readAt: null });
      });
    },
    async deleteGuestbook(id) { save((s) => { s.guestbook = (s.guestbook ?? []).filter((g) => g.id !== id); }); },
    async unreadGuestbook() { return 0; },
    async markGuestbookRead() {},
    // 데모 도서관숲: 예시 책 목록 + 이 브라우저에만 남는 대여 기록
    async forest() {
      const s = get();
      if (!s.forest) {
        const t = Date.now(), f1 = { id: 'demo-friend-1', roomName: '새벽서가', hair: 4, outfit: 4 };
        const books: ForestBook[] = DEMO_CATALOG.slice(0, 24).map((b, i) => ({ id: 'fb' + i, isbn: b.isbn, title: b.title, author: b.author, publisher: b.publisher, series: b.series, vol: b.vol,
          coverUrl: b.coverUrl, genre: b.genre, copies: 1, shelf: i < 12 ? '위 칸' : '아래 칸', addedAt: t - i * 864e5, out: [] }));
        const loans: ForestLoan[] = [
          { id: 'l1', bookId: 'fb2', isbn: books[2].isbn, title: books[2].title, vol: books[2].vol, user: f1, borrowedAt: t - 3 * 864e5, dueAt: t + 11 * 864e5, returnedAt: null },
          { id: 'l0', bookId: 'fb5', isbn: books[5].isbn, title: books[5].title, vol: books[5].vol, user: f1, borrowedAt: t - 20 * 864e5, dueAt: t - 6 * 864e5, returnedAt: t - 7 * 864e5 },
        ];
        save((x) => { x.forest = { books, loans }; });
      }
      const F = get().forest!;
      const books = F.books.map((b) => ({ ...b, out: F.loans.filter((l) => l.bookId === b.id && !l.returnedAt) }));
      return { library: { id: 'demo-forest', slug: 'forest', name: '도서관숲', place: '그린팩토리 5F 입구(데모)', loanDays: 7 }, books, canManage: true };
    },
    async forestActivity() { return [...(get().forest?.loans ?? [])].sort((a, b) => Math.max(b.borrowedAt, b.returnedAt ?? 0) - Math.max(a.borrowedAt, a.returnedAt ?? 0)); },
    async forestBorrow(isbn) {
      save((s) => {
        const F = s.forest!, b = F.books.find((x) => x.isbn === isbn);
        if (!b) throw new Error('이 도서관에 없는 책이에요');
        const out = F.loans.filter((l) => l.bookId === b.id && !l.returnedAt);
        if (out.some((l) => l.user.id === 'demo')) throw new Error('이미 빌린 책이에요');
        if (out.length >= b.copies) throw new Error('지금은 모두 대여 중이에요');
        const p = s.profile, t = Date.now();
        F.loans.push({ id: 'l' + t, bookId: b.id, isbn, title: b.title, vol: b.vol, user: { id: 'demo', roomName: p.roomName, hair: p.hair, outfit: p.outfit }, borrowedAt: t, dueAt: t + 7 * 864e5, returnedAt: null, extended: 0 });
      });
    },
    async forestReturn(by) {
      save((s) => {
        const l = s.forest!.loans.find((x) => !x.returnedAt && (by.loanId ? x.id === by.loanId : x.isbn === by.isbn && x.user.id === 'demo'));
        if (!l) throw new Error('반납할 대여 기록이 없어요');
        l.returnedAt = Date.now();
      });
    },
    async forestExtend(loanId) {
      let d = 0;
      save((s) => { const l = s.forest!.loans.find((x) => x.id === loanId); if (!l) return; if ((l.extended ?? 0) >= 1) throw new Error('연장은 한 번만 할 수 있어요'); l.dueAt = Math.max(l.dueAt, Date.now()) + 7 * 864e5; l.extended = 1; d = l.dueAt; });
      return d;
    },
    async forestAdd(isbns) {
      let added = 0;
      for (const isbn of isbns) {
        const s = get();
        if (s.forest?.books.some((b) => b.isbn === isbn)) continue;
        const [b] = await this.lookup({ isbn }).catch(() => []);
        if (!b) continue;
        save((x) => { x.forest!.books.unshift({ id: 'fb' + Date.now() + added, isbn, title: b.title, author: b.author, publisher: b.publisher, series: b.series, vol: b.vol, coverUrl: b.coverUrl, genre: b.genre, copies: 1, shelf: null, addedAt: Date.now(), out: [] }); });
        added++;
      }
      return { added, skipped: isbns.length - added };
    },
    async forestRemove(bookId) { save((s) => { s.forest!.books = s.forest!.books.filter((b) => b.id !== bookId); }); },
    async forestUpdate(bookId, patch) { save((s) => { const b = s.forest!.books.find((x) => x.id === bookId); if (b) Object.assign(b, patch); }); },
  };
}
