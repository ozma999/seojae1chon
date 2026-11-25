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
  /** 읽기 기록: 읽고 싶음 / 읽는 중 / 다 읽음 */
  readStatus?: ReadStatus | null;
  /** 별점 1~5 */
  rating?: number | null;
  /** 빌려줄 수 있어요 */
  lendable?: boolean;
}
export type ReadStatus = 'want' | 'reading' | 'done';
export interface Who { id: string; roomName: string; hair: number; outfit: number }
export interface ForestLoan { id: string; bookId: string; isbn: string; title: string; vol: number | null; user: Who; borrowedAt: number; dueAt: number; returnedAt: number | null; extended?: number }
export interface ForestBook { id: string; isbn: string; title: string; author: string | null; publisher: string | null; series: string | null; vol: number | null;
  coverUrl: string | null; genre: LibraryEntry['genre']; copies: number; shelf: string | null; addedAt: number; out: ForestLoan[] }
export interface Forest { library: { id: string; slug: string; name: string; place: string | null; loanDays: number }; books: ForestBook[]; canManage: boolean }
export type IlchonState = 'self' | 'ilchon' | 'sent' | 'received' | 'none';
export interface GuestNote { id: number; host: string; author: { id: string; roomName: string; hair: number; outfit: number }; body: string; kind: 'note' | 'borrow'; isbn: string | null; bookTitle?: string | null; createdAt: number; readAt: number | null }
export interface IlchonRequest { id: string; roomName: string; hair: number; outfit: number; createdAt: number }
export interface Profile {
  id: string;
  roomName: string;
  hair: number;
  outfit: number;
  itemsOff: ItemId[];
  /** 'founding' = 태초가족(FAMILY 코드로 가입). 사진 촬영 등록 등 먼저 여는 기능용 */
  cohort?: string | null;
  /** 서재 성향 칭호(서재산책 목록에 보이도록 저장해 둔다) */
  title?: string | null;
  /** 꾸미기에서 고른 모양·색: { rug: 'b', 'rug.c': 2 } */
  picks?: Record<string, string | number>;
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
  title?: string | null;
}
export interface InviteCode { code: string; uses: number; maxUses: number; expiresAt: number | null }
export interface Repo {
  mode: 'demo' | 'live';
  load(): Promise<{ profile: Profile; entries: LibraryEntry[] }>;
  lookup(q: { isbn?: string; title?: string; author?: string }): Promise<BookInfo[]>;
  /** 시리즈의 모든 권(1권부터) */
  seriesVolumes(series: string, publisher?: string | null): Promise<BookInfo[]>;
  add(info: BookInfo, opts: { method: AddMethod; format?: 'paper' | 'ebook' }): Promise<LibraryEntry>;
  /** 여러 권 한 번에(이미 있는 책은 건너뜀) */
  addMany(infos: BookInfo[], opts: { method: AddMethod }): Promise<LibraryEntry[]>;
  remove(id: string): Promise<void>;
  updateEntry(id: string, patch: { userGenre?: Genre | null; comment?: string | null; bragAt?: number | null; bragText?: string | null; readStatus?: ReadStatus | null; rating?: number | null; lendable?: boolean }): Promise<void>;
  updateProfile(patch: Partial<Omit<Profile, 'id'>>): Promise<void>;
  // 서재산책
  listRooms(): Promise<RoomSummary[]>;
  loadRoom(id: string): Promise<{ profile: Profile; entries: LibraryEntry[] }>;
  visit(id: string): Promise<void>;
  todayVisits(): Promise<number>;
  // 초대
  myInvites(): Promise<InviteCode[]>;
  createInvite(): Promise<string>;
  // 일촌
  ilchonState(id: string): Promise<IlchonState>;
  ilchonRequest(id: string): Promise<IlchonState>;
  ilchonAccept(id: string): Promise<void>;
  ilchonRemove(id: string): Promise<void>;
  ilchonRequests(): Promise<IlchonRequest[]>;
  // 방명록(일촌평)
  guestbook(host: string): Promise<GuestNote[]>;
  writeGuestbook(host: string, body: string, opts?: { kind?: 'note' | 'borrow'; isbn?: string | null }): Promise<void>;
  deleteGuestbook(id: number): Promise<void>;
  unreadGuestbook(): Promise<number>;
  markGuestbookRead(): Promise<void>;
  // 도서관숲(함께 쓰는 실제 책장)
  forest(): Promise<Forest | null>;
  forestActivity(): Promise<ForestLoan[]>;
  forestBorrow(isbn: string): Promise<void>;
  forestReturn(by: { isbn?: string; loanId?: string }): Promise<void>;
  forestExtend(loanId: string): Promise<number>;
  forestAdd(isbns: string[]): Promise<{ added: number; skipped: number }>;
  forestRemove(bookId: string): Promise<void>;
  forestUpdate(bookId: string, patch: { copies?: number; shelf?: string | null }): Promise<void>;
}
