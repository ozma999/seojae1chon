'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { BookInfo } from '@/lib/books/nl';
import type { AddMethod, LibraryEntry, Profile, Repo } from '@/lib/data/types';
import { demoRepo } from '@/lib/data/demo';
import { liveRepo } from '@/lib/data/live';
import { isLive } from '@/lib/supabase/env';
import { defaultLook } from '@/lib/room/look';
import type { ArtManifest, RoomBook, Tod } from '@/lib/room/types';
import { pickLevel } from '@/lib/room/logic';

export const toRoomBook = (e: LibraryEntry): RoomBook => ({
  id: e.id, title: e.title, pages: e.pages, hardcover: e.hardcover, size: e.size, format: e.format, genre: e.genre,
  series: e.series, vol: e.vol, look: e.look ?? defaultLook(e.isbn), bragAt: e.bragAt,
});

interface Ctx {
  mode: Repo['mode'];
  /** 서재산책·초대 등 화면별 호출용 */
  repo: Repo;
  ready: boolean;
  error: string | null;
  profile: Profile | null;
  entries: LibraryEntry[];
  roomBooks: RoomBook[];
  tod: Tod | null;
  /** 지금 방 단계의 자랑 책장 칸 수 */
  bragSlots: number;
  setTod: (t: Tod | null) => void;
  toast: string | null;
  say: (msg: string) => void;
  reload: () => Promise<void>;
  lookup: Repo['lookup'];
  add: (b: BookInfo, method: AddMethod, format?: 'paper' | 'ebook') => Promise<LibraryEntry>;
  addMany: (books: BookInfo[], method: AddMethod) => Promise<LibraryEntry[]>;
  remove: (id: string) => Promise<void>;
  updateEntry: Repo['updateEntry'];
  updateProfile: Repo['updateProfile'];
}
const LibraryCtx = createContext<Ctx | null>(null);
export const useLibrary = () => {
  const c = useContext(LibraryCtx);
  if (!c) throw new Error('LibraryProvider missing');
  return c;
};

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const repo = useMemo<Repo>(() => (isLive() ? liveRepo() : demoRepo()), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tod, setTod] = useState<Tod | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [art, setArt] = useState<ArtManifest | null>(null);
  useEffect(() => { fetch('/art/manifest.json').then((r) => r.json()).then(setArt, () => {}); }, []);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const say = useCallback((m: string) => {
    setToast(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);
  const reload = useCallback(async () => {
    try {
      const d = await repo.load();
      setProfile(d.profile);
      setEntries(d.entries);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }, [repo]);
  useEffect(() => {
    let alive = true;
    repo.load().then(
      (d) => { if (alive) { setProfile(d.profile); setEntries(d.entries); setReady(true); } },
      (e: Error) => { if (alive) { setError(e.message); setReady(true); } },
    );
    return () => { alive = false; };
  }, [repo]);

  const roomBooks = useMemo(() => entries.map(toRoomBook), [entries]);
  const value: Ctx = {
    mode: repo.mode, repo, ready, error, profile, entries, tod, setTod, toast, say, reload,
    roomBooks,
    bragSlots: useMemo(() => (art ? art.levels[pickLevel(art, roomBooks).li].brag.reduce((a, b) => a + b[2], 0) : 3), [art, roomBooks]),
    lookup: repo.lookup,
    add: async (b, method, format) => {
      const e = await repo.add(b, { method, format });
      setEntries((x) => [...x, e]);
      return e;
    },
    addMany: async (books, method) => {
      const es = await repo.addMany(books, { method });
      setEntries((x) => [...x, ...es.filter((e) => !x.some((y) => y.id === e.id))]);
      return es;
    },
    remove: async (id) => { await repo.remove(id); setEntries((x) => x.filter((e) => e.id !== id)); },
    updateEntry: async (id, patch) => {
      await repo.updateEntry(id, patch);
      setEntries((x) => x.map((e) => (e.id === id ? { ...e, ...patch, genre: 'userGenre' in patch ? patch.userGenre ?? e.genre : e.genre } : e)));
    },
    updateProfile: async (patch) => {
      await repo.updateProfile(patch);
      setProfile((p) => (p ? { ...p, ...patch } : p));
    },
  };
  return <LibraryCtx.Provider value={value}>{children}</LibraryCtx.Provider>;
}
