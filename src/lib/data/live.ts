'use client';
// 실서비스 모드: Supabase(RLS) + 서버 API
import type { BookInfo } from '../books/nl';
import type { ItemId } from '../room/types';
import { ENTRY_SELECT, rowToEntry, type Row } from './live-shared';
import { supabaseBrowser } from '../supabase/client';
import type { InviteCode, LibraryEntry, Profile, Repo, RoomSummary } from './types';

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
