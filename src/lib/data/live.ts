'use client';
// 실서비스 모드: Supabase(RLS) + 서버 API
import type { BookInfo } from '../books/nl';
import type { ItemId } from '../room/types';
import { ENTRY_SELECT, rowToEntry, type Row } from './live-shared';
import { supabaseBrowser } from '../supabase/client';
import type { Forest, ForestBook, ForestLoan, GuestNote, IlchonState, InviteCode, LibraryEntry, Profile, Repo, RoomSummary, Who } from './types';

export function liveRepo(): Repo {
  const sb = supabaseBrowser();
  const uid = async () => {
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new Error('로그인이 필요해요');
    return data.user.id;
  };
  async function loadUser(id: string): Promise<{ profile: Profile; entries: LibraryEntry[] }> {
    const [p, e] = await Promise.all([
      sb.from('profiles').select('*').eq('id', id).single(),
      sb.from('user_books').select(ENTRY_SELECT).eq('user_id', id).order('created_at'),
    ]);
    if (p.error) throw new Error(p.error.message);
    if (e.error) throw new Error(e.error.message);
    return {
      profile: { id, roomName: p.data.room_name, hair: p.data.hair, outfit: p.data.outfit, itemsOff: p.data.items_off as ItemId[], cohort: p.data.cohort ?? null,
        title: p.data.title ?? null, picks: p.data.picks ?? {} },
      entries: (e.data as unknown as Row[]).map(rowToEntry),
    };
  }
  return {
    mode: 'live',
    async load() { return loadUser(await uid()); },
    async loadRoom(id) { return loadUser(id); },
    async listRooms() {
      const { data, error } = await sb.rpc('room_list');
      if (error) throw new Error(error.message);
      return (data as { id: string; room_name: string; hair: number; outfit: number; books: number; brag: number; last_added: string | null; is_me: boolean; cohort: string | null; title?: string | null }[])
        .map((r): RoomSummary => ({ id: r.id, roomName: r.room_name, hair: r.hair, outfit: r.outfit, books: r.books, brag: r.brag,
          lastAdded: r.last_added ? Date.parse(r.last_added) : null, isMe: r.is_me, cohort: r.cohort, title: r.title ?? null }));
    },
    async visit(id) {
      const me = await uid();
      if (me === id) return;
      const { error } = await sb.from('visits').insert({ host: id });
      if (error && error.code !== '23505') throw new Error(error.message);   // 오늘 이미 방문했으면 무시
    },
    async todayVisits() {
      const { data, error } = await sb.rpc('today_visits');
      if (error) throw new Error(error.message);
      return data as number;
    },
    async myInvites() {
      const { data, error } = await sb.from('invite_codes').select('code,uses,max_uses,expires_at').eq('created_by', await uid()).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data as { code: string; uses: number; max_uses: number; expires_at: string | null }[])
        .map((r): InviteCode => ({ code: r.code, uses: r.uses, maxUses: r.max_uses, expiresAt: r.expires_at ? Date.parse(r.expires_at) : null }));
    },
    async createInvite() {
      const { data, error } = await sb.rpc('create_invite');
      if (error) throw new Error(error.message);
      return data as string;
    },
    // ---- 일촌 ----
    async ilchonState(id) {
      const { data, error } = await sb.rpc('ilchon_state', { other: id });
      if (error) return 'none';   // 마이그레이션 전
      return data as IlchonState;
    },
    async ilchonRequest(id) {
      const { data, error } = await sb.rpc('ilchon_request', { other: id });
      if (error) throw new Error(error.message);
      return data as IlchonState;
    },
    async ilchonAccept(id) { const { error } = await sb.rpc('ilchon_accept', { other: id }); if (error) throw new Error(error.message); },
    async ilchonRemove(id) { const { error } = await sb.rpc('ilchon_remove', { other: id }); if (error) throw new Error(error.message); },
    async ilchonRequests() {
      const { data, error } = await sb.rpc('ilchon_requests');
      if (error) return [];
      return (data as { id: string; room_name: string; hair: number; outfit: number; created_at: string }[])
        .map((r) => ({ id: r.id, roomName: r.room_name, hair: r.hair, outfit: r.outfit, createdAt: Date.parse(r.created_at) }));
    },
    // ---- 방명록 ----
    async guestbook(host) {
      const { data, error } = await sb.from('guestbook')
        .select('id,host,body,kind,isbn,created_at,read_at,author:profiles!guestbook_author_fkey(id,room_name,hair,outfit),book:books(title)')
        .eq('host', host).order('created_at', { ascending: false }).limit(100);
      if (error) { if (/guestbook/.test(error.message)) return []; throw new Error(error.message); }
      type R = { id: number; host: string; body: string; kind: 'note' | 'borrow'; isbn: string | null; created_at: string; read_at: string | null;
        author: { id: string; room_name: string; hair: number; outfit: number } | null; book: { title: string } | null };
      return (data as unknown as R[]).map((r): GuestNote => ({
        id: r.id, host: r.host, body: r.body, kind: r.kind, isbn: r.isbn, bookTitle: r.book?.title ?? null,
        author: { id: r.author?.id ?? '', roomName: r.author?.room_name ?? '(알 수 없음)', hair: r.author?.hair ?? 1, outfit: r.author?.outfit ?? 0 },
        createdAt: Date.parse(r.created_at), readAt: r.read_at ? Date.parse(r.read_at) : null,
      }));
    },
    async writeGuestbook(host, body, opts) {
      const { error } = await sb.from('guestbook').insert({ host, body: body.trim().slice(0, 200), kind: opts?.kind ?? 'note', isbn: opts?.isbn ?? null });
      if (error) throw new Error(/row-level security/.test(error.message) ? '일촌만 방명록을 남길 수 있어요' : error.message);
    },
    async deleteGuestbook(id) { const { error } = await sb.from('guestbook').delete().eq('id', id); if (error) throw new Error(error.message); },
    async unreadGuestbook() {
      const { count, error } = await sb.from('guestbook').select('id', { count: 'exact', head: true }).eq('host', await uid()).is('read_at', null);
      return error ? 0 : count ?? 0;
    },
    // ---- 도서관숲 ----
    async forest() {
      const { data: lib, error } = await sb.from('libraries').select('*').eq('slug', 'forest').maybeSingle();
      if (error || !lib) return null;   // 마이그레이션 전
      const [{ data: rows, error: e2 }, { data: can }] = await Promise.all([
        sb.from('library_books').select('id,isbn,copies,shelf,created_at,book:books(title,author,publisher,series,vol,cover_url,genre),loans(*)').eq('library_id', lib.id),
        sb.rpc('library_manager', { lib: lib.id }),
      ]);
      if (e2) throw new Error(e2.message);
      type L = { id: string; user_id: string; borrowed_at: string; due_at: string; returned_at: string | null; extended?: number };
      type R = { id: string; isbn: string; copies: number; shelf: string | null; created_at: string; loans: L[];
        book: { title: string; author: string | null; publisher: string | null; series: string | null; vol: number | null; cover_url: string | null; genre: LibraryEntry['genre'] } | null };
      const list = (rows ?? []) as unknown as R[];
      const ids = [...new Set(list.flatMap((r) => r.loans.filter((l) => !l.returned_at).map((l) => l.user_id)))];
      const who = new Map<string, Who>();
      if (ids.length) {
        const { data: ps } = await sb.from('profiles').select('id,room_name,hair,outfit').in('id', ids);
        ((ps ?? []) as { id: string; room_name: string; hair: number; outfit: number }[]).forEach((p) => who.set(p.id, { id: p.id, roomName: p.room_name, hair: p.hair, outfit: p.outfit }));
      }
      const books = list.map((r): ForestBook => ({
        id: r.id, isbn: r.isbn, title: r.book?.title ?? r.isbn, author: r.book?.author ?? null, publisher: r.book?.publisher ?? null,
        series: r.book?.series ?? null, vol: r.book?.vol ?? null, coverUrl: r.book?.cover_url ?? null, genre: r.book?.genre ?? 'lit',
        copies: r.copies, shelf: r.shelf, addedAt: Date.parse(r.created_at),
        out: r.loans.filter((l) => !l.returned_at).map((l) => ({ id: l.id, bookId: r.id, isbn: r.isbn, title: r.book?.title ?? r.isbn, vol: r.book?.vol ?? null,
          user: who.get(l.user_id) ?? { id: l.user_id, roomName: '(알 수 없음)', hair: 1, outfit: 0 }, borrowedAt: Date.parse(l.borrowed_at), dueAt: Date.parse(l.due_at), returnedAt: null, extended: l.extended ?? 0 })),
      }));
      return { library: { id: lib.id, slug: lib.slug, name: lib.name, place: lib.place, loanDays: lib.loan_days }, books, canManage: !!can } satisfies Forest;
    },
    async forestActivity() {
      const { data, error } = await sb.from('loans')
        .select('id,borrowed_at,due_at,returned_at,user:profiles!loans_user_id_fkey(id,room_name,hair,outfit),lb:library_books(id,isbn,book:books(title,vol))')
        .order('borrowed_at', { ascending: false }).limit(80);
      if (error) return [];
      type R = { id: string; borrowed_at: string; due_at: string; returned_at: string | null; user: { id: string; room_name: string; hair: number; outfit: number } | null;
        lb: { id: string; isbn: string; book: { title: string; vol: number | null } | null } | null };
      return (data as unknown as R[]).map((r): ForestLoan => ({
        id: r.id, bookId: r.lb?.id ?? '', isbn: r.lb?.isbn ?? '', title: r.lb?.book?.title ?? '', vol: r.lb?.book?.vol ?? null,
        user: { id: r.user?.id ?? '', roomName: r.user?.room_name ?? '(알 수 없음)', hair: r.user?.hair ?? 1, outfit: r.user?.outfit ?? 0 },
        borrowedAt: Date.parse(r.borrowed_at), dueAt: Date.parse(r.due_at), returnedAt: r.returned_at ? Date.parse(r.returned_at) : null,
      }));
    },
    async forestBorrow(isbn) { const { error } = await sb.rpc('forest_borrow', { p_isbn: isbn }); if (error) throw new Error(error.message); },
    async forestReturn(by) { const { error } = await sb.rpc('forest_return', { p_isbn: by.isbn ?? null, p_loan: by.loanId ?? null }); if (error) throw new Error(error.message); },
    async forestExtend(loanId) { const { data, error } = await sb.rpc('forest_extend', { p_loan: loanId }); if (error) throw new Error(error.message); return Date.parse(data as string); },
    async forestAdd(isbns) {
      const r = await fetch('/api/forest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ isbns }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? '등록 실패');
      return j as { added: number; skipped: number };
    },
    async forestRemove(bookId) { const { error } = await sb.from('library_books').delete().eq('id', bookId); if (error) throw new Error(error.message); },
    async forestUpdate(bookId, patch) { const { error } = await sb.from('library_books').update(patch).eq('id', bookId); if (error) throw new Error(error.message); },
    async markGuestbookRead() { await sb.from('guestbook').update({ read_at: new Date().toISOString() }).eq('host', await uid()).is('read_at', null); },
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
      const r = await fetch('/api/library', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isbn: info.isbn, method, format: format ?? info.format }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '추가 실패');
      return j.entry as LibraryEntry;
    },
    async addMany(infos, { method }) {
      const r = await fetch('/api/library', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isbns: infos.map((b) => b.isbn), method }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? '추가 실패');
      return j.entries as LibraryEntry[];
    },
    async remove(id) { const { error } = await sb.from('user_books').delete().eq('id', id); if (error) throw error; },
    async updateEntry(id, patch) {
      const row: Record<string, unknown> = {};
      if ('userGenre' in patch) row.genre = patch.userGenre;
      if ('comment' in patch) row.comment = patch.comment;
      if ('bragAt' in patch) row.brag_at = patch.bragAt ? new Date(patch.bragAt).toISOString() : null;
      if ('bragText' in patch) row.brag_text = patch.bragText;
      if ('readStatus' in patch) row.read_status = patch.readStatus;
      if ('rating' in patch) row.rating = patch.rating;
      if ('lendable' in patch) row.lendable = patch.lendable;
      const { error } = await sb.from('user_books').update(row).eq('id', id);
      if (error) throw new Error(error.message);
    },
    async updateProfile(patch) {
      const row: Record<string, unknown> = {};
      if (patch.roomName !== undefined) row.room_name = patch.roomName;
      if (patch.hair !== undefined) row.hair = patch.hair;
      if (patch.outfit !== undefined) row.outfit = patch.outfit;
      if (patch.itemsOff !== undefined) row.items_off = patch.itemsOff;
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.picks !== undefined) row.picks = patch.picks;
      const { error } = await sb.from('profiles').update(row).eq('id', await uid());
      if (error) throw error;
    },
  };
}
