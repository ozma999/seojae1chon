import type { BookInfo } from '../books/nl';
import type { BookLook, Genre, ItemId } from '../room/types';

export type AddMethod = 'barcode' | 'photo' | 'search' | 'manual';
export interface LibraryEntry extends BookInfo {
  id: string;
  /** 사용자가 고친 장르(없으면 null) */
  userGenre: Genre | null;
  verified: boolean;
  method: AddMethod;
  comment: string | null;
  bragAt: number | null;
  bragText: string | null;
  look: BookLook | null;
  addedAt: number;
}
export interface Profile {
  id: string;
  roomName: string;
  hair: number;
  outfit: number;
  itemsOff: ItemId[];
  /** 'founding' = 최초 가족(FAMILY 코드로 가입). 사진 촬영 등록 등 먼저 여는 기능용 */
  cohort?: string | null;
}
export interface RoomSummary {
  id: string;
  roomName: string;
  hair: number;
  outfit: number;
  books: number;
  brag: number;
  lastAdded: number | null;
  isMe: boolean;
  cohort?: string | null;
}
export interface InviteCode { code: string; uses: number; maxUses: number; expiresAt: number | null }
export interface Repo {
  mode: 'demo' | 'live';
  load(): Promise<{ profile: Profile; entries: LibraryEntry[] }>;
  lookup(q: { isbn?: string; title?: string }): Promise<BookInfo[]>;
  /** 시리즈의 모든 권(1권부터) */
  seriesVolumes(series: string, publisher?: string | null): Promise<BookInfo[]>;
  add(info: BookInfo, opts: { method: AddMethod; format?: 'paper' | 'ebook' }): Promise<LibraryEntry>;
  /** 여러 권 한 번에(이미 있는 책은 건너뜀) */
  addMany(infos: BookInfo[], opts: { method: AddMethod }): Promise<LibraryEntry[]>;
  remove(id: string): Promise<void>;
  updateEntry(id: string, patch: { userGenre?: Genre | null; comment?: string | null; bragAt?: number | null; bragText?: string | null }): Promise<void>;
  updateProfile(patch: Partial<Omit<Profile, 'id'>>): Promise<void>;
  // 서재산책
  listRooms(): Promise<RoomSummary[]>;
  loadRoom(id: string): Promise<{ profile: Profile; entries: LibraryEntry[] }>;
  visit(id: string): Promise<void>;
  todayVisits(): Promise<number>;
  // 초대
  myInvites(): Promise<InviteCode[]>;
  createInvite(): Promise<string>;
}
