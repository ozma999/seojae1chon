'use client';
// 실서비스 모드: Supabase(RLS) + 서버 API
import type { BookInfo } from '../books/nl';
import type { ItemId } from '../room/types';
import { ENTRY_SELECT, rowToEntry, type Row } from './live-shared';
import { supabaseBrowser } from '../supabase/client';
import type { LibraryEntry, Repo } from './types';

export function liveRepo(): Repo {
  const sb = supabaseBrowser();
  const uid = async () => {
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new Error('로그인이 필요해요');
    return data.user.id;
  };
  return {
    mode: 'live',
    async load() {
      const id = await uid();
      const [p, e] = await Promise.all([
        sb.from('profiles').select('*').eq('id', id).single(),
        sb.from('user_books').select(ENTRY_SELECT).eq('user_id', id).order('created_at'),
      ]);
      if (p.error) throw p.error;
      if (e.error) throw e.error;
      return {
        profile: { id, roomName: p.data.room_name, hair: p.data.hair, outfit: p.data.outfit, itemsOff: p.data.items_off as ItemId[] },
        entries: (e.data as unknown as Row[]).map(rowToEntry),
      };
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
      const { error } = await sb.from('profiles').update(row).eq('id', await uid());
      if (error) throw error;
    },
  };
}
