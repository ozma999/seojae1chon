export type Tod = '새벽' | '낮' | '노을' | '밤';
export type ThemeKey = 'attic' | 'space' | 'manga' | 'study';
export type Genre = 'lit' | 'sf' | 'manga' | 'hum';
export type ItemId =
  | 'rug' | 'pile' | 'plant' | 'lamp' | 'deco' | 'chair'
  | 'pendant' | 'valance' | 'ladder' | 'globe' | 'cushion';

/** public/art/manifest.json — art/rooms.py → art/split_art.py 가 만든다 */
export interface ArtManifest {
  levels: ArtLevel[];
  avatar: { img: string; w: number; h: number; hairs: string[]; outfits: string[] };
  itemdefs: { id: ItemId; th: number; name: string }[];
  themes: Record<ThemeKey, { name: string; genre: Genre; scene: string }>;
  tods: Tod[];
  pal: [number, number, number][];
}
export interface ArtLevel {
  name: string;
  W: number;
  H: number;
  bg: Record<ThemeKey, string>;
  win: { x: number; y: number; img: Record<ThemeKey, Record<Tod, string>> }[];
  items: { id: ItemId; x: number; y: number; kind: 'wall' | 'floor'; base: number; img: string }[];
  /** [x0, x1, 바닥 y, 최대 높이] */
  slots: [number, number, number, number][];
  /** [x0, 바닥 y, 칸 수] */
  brag: [number, number, number][];
  foot: [number, number];
  sidecap: number;
  cap: number;
  lights: { id: ItemId; x: number; y: number; rx: number; ry: number }[];
}

/** 방에 그리기 위해 필요한 책 정보(DB 행에서 만든다) */
export interface RoomBook {
  id: string;
  title: string;
  pages: number | null;
  hardcover: boolean;
  size: 'small' | 'mid' | 'big';
  format: 'paper' | 'ebook';
  genre: Genre;
  series?: string | null;
  vol?: number | null;
  look: BookLook;
  /** 자랑 책장에 꽂은 시각(ms). null이면 일반 책장 */
  bragAt: number | null;
}
export interface BookLook {
  c1: string; // 바탕
  c2: string; // 띠·무늬
  tc: string; // 글자
  pat: 'band' | 'circle' | 'split' | 'grid' | 'stripe' | 'frame';
}

export interface RoomState {
  books: RoomBook[];
  /** 사용자가 끈 아이템 */
  itemsOff: ItemId[];
  hair: number;
  outfit: number;
  /** null이면 대표 책이 정한다 */
  theme: ThemeKey | null;
  /** null이면 휴대폰 시각 */
  tod: Tod | null;
}
