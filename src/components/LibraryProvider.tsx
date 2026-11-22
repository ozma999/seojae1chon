'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { shelfTitle } from '@/lib/room/stats';
import type { BookInfo } from '@/lib/books/nl';
import type { AddMethod, LibraryEntry, Profile, Repo } from '@/lib/data/types';
import { demoRepo } from '@/lib/data/demo';
import { liveRepo } from '@/lib/data/live';
import { isLive } from '@/lib/supabase/env';
import { defaultLook } from '@/lib/room/look';
import type { ArtManifest, RoomBook, Tod } from '@/lib/room/types';
import { pickLevel } from '@/lib/room/logic';

/** 서버 저장 전 화면에 먼저 보여줄 항목 */
const tempEntry = (b: BookInfo, method: AddMethod): LibraryEntry => ({
  ...b, id: `tmp-${b.isbn}-${b.format}`, userGenre: null, verified: method === 'barcode' || method === 'photo', method,
  comment: null, bragAt: null, bragText: null, look: null, addedAt: Date.now(),
});
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
  /** 뒤에서 진행 중인 작업(시리즈 꽂기 등) */
  jobs: { id: number; label: string }[];
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
  const [jobs, setJobs] = useState<{ id: number; label: string }[]>([]);
  const jobSeq = useRef(0);
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

  // 장르를 모르는 책(카카오 결과 등)은 뒤에서 장르를 정해 달라고 한 번씩 부탁한다(규칙 → AI). 바뀌면 다시 읽는다
  const tried = useRef(new Set<string>());
  useEffect(() => {
    if (repo.mode !== 'live' || !ready) return;
    const isbns = entries.filter((e) => e.genreSource === 'default' && !e.userGenre && !e.id.startsWith('tmp') && !tried.current.has(e.isbn)).map((e) => e.isbn);
    if (!isbns.length) return;
    const t = setTimeout(() => {
      isbns.forEach((i) => tried.current.add(i));
      fetch('/api/books/classify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ isbns }) })
        .then((r) => r.json()).then((j: { updated?: number }) => { if (j.updated) reload(); }, () => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [repo.mode, ready, entries, reload]);

  // 칭호가 바뀌면 서재산책 목록에 보이도록 저장(조용히, 실패해도 무시 — 마이그레이션 전일 수 있다)
  const title = useMemo(() => (ready && profile ? shelfTitle(entries.filter((e) => !e.id.startsWith('tmp'))) : null), [ready, profile, entries]);
  useEffect(() => {
    if (repo.mode !== 'live' || !title || !profile || profile.title === title) return;
    const t = setTimeout(() => { repo.updateProfile({ title }).then(() => setProfile((p) => p && { ...p, title }), () => {}); }, 2000);
    return () => clearTimeout(t);
  }, [repo, title, profile]);

  const roomBooks = useMemo(() => entries.map(toRoomBook), [entries]);
  const value: Ctx = {
    mode: repo.mode, repo, ready, jobs, error, profile, entries, tod, setTod, toast, say, reload,
    roomBooks,
    bragSlots: useMemo(() => (art ? art.levels[pickLevel(art, roomBooks).li].brag.reduce((a, b) => a + b[2], 0) : 3), [art, roomBooks]),
    lookup: repo.lookup,
    // 화면에는 바로 꽂고(임시 항목), 서버 저장은 뒤에서. 실패하면 되돌리고 알린다
    add: async (b, method, format) => {
      const tmp = tempEntry({ ...b, format: format ?? b.format }, method);
      setEntries((x) => [...x, tmp]);
      try {
        const e = await repo.add(b, { method, format });
        setEntries((x) => x.map((y) => (y.id === tmp.id ? e : y)));
        return e;
      } catch (err) {
        setEntries((x) => x.filter((y) => y.id !== tmp.id));
        throw err;
      }
    },
    addMany: async (books, method) => {
      const temps = books.map((b) => tempEntry(b, method));
      setEntries((x) => [...x, ...temps.filter((t) => !x.some((y) => y.isbn === t.isbn && y.format === t.format))]);
      const id = ++jobSeq.current;
      setJobs((j) => [...j, { id, label: `${books.length}권 꽂는 중` }]);
      try {
        const es = await repo.addMany(books, { method });
        const tmpIds = new Set(temps.map((t) => t.id));
        setEntries((x) => [...x.filter((y) => !tmpIds.has(y.id) && !es.some((e) => e.id === y.id)), ...es]);
        return es;
      } catch (err) {
        const tmpIds = new Set(temps.map((t) => t.id));
        setEntries((x) => x.filter((y) => !tmpIds.has(y.id)));
        throw err;
      } finally {
        setJobs((j) => j.filter((x) => x.id !== id));
      }
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
