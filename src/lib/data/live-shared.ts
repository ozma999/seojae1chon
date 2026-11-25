import type { BookInfo } from '../books/nl';
import type { Genre } from '../room/types';
import type { AddMethod, LibraryEntry } from './types';

export interface Row {
  id: string; isbn: string; format: 'paper' | 'ebook'; verified: boolean; method: AddMethod; genre: Genre | null;
  comment: string | null; brag_at: string | null; brag_text: string | null; created_at: string;
  read_status?: LibraryEntry['readStatus']; rating?: number | null; lendable?: boolean;
  books: {
    title: string; author: string | null; publisher: string | null; pub_date: string | null; pages: number | null;
    height_mm: number | null; size: 'small' | 'mid' | 'big'; hardcover: boolean; series: string | null; vol: number | null;
    set_isbn: string | null; cover_url: string | null; add_code: string | null; genre: Genre;
    genre_source: BookInfo['genreSource']; look: LibraryEntry['look']; translators?: string | null;
  };
}
export const ENTRY_SELECT = '*,books(*)';   // 마이그레이션 전후 모두 돌아가게(새 열이 없어도 오류 없음)
export function rowToEntry(r: Row): LibraryEntry {
  const b = r.books;
  return {
    id: r.id, isbn: r.isbn, title: b.title, author: b.author, publisher: b.publisher, pubDate: b.pub_date, pages: b.pages,
    size: b.size, heightMm: b.height_mm, hardcover: b.hardcover, format: r.format, series: b.series, vol: b.vol,
    setIsbn: b.set_isbn, coverUrl: b.cover_url, addCode: b.add_code, genre: r.genre ?? b.genre, genreSource: b.genre_source, translators: b.translators ?? null,
    userGenre: r.genre, verified: r.verified, method: r.method, comment: r.comment,
    bragAt: r.brag_at ? Date.parse(r.brag_at) : null, bragText: r.brag_text, look: b.look, addedAt: Date.parse(r.created_at),
    readStatus: r.read_status ?? null, rating: r.rating ?? null, lendable: r.lendable ?? false,
  };
}

