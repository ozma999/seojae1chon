export type Tod = '새벽' | '낮' | '노을' | '밤';
export type ThemeKey = 'attic' | 'space' | 'manga' | 'study';
export type Genre = 'lit' | 'sf' | 'manga' | 'hum';
export type ItemId =
  | 'desklamp' | 'rug' | 'pile' | 'plant' | 'lamp' | 'deco' | 'chair'
  | 'pendant' | 'valance' | 'ladder' | 'globe' | 'cushion';

/** public/art/manifest.json — art/rooms.py → art/split_art.py 가 만든다 */
export interface ArtManifest {
  levels: ArtLevel[];
  avatar: { img: string; w: number; h: number; hairs: string[]; outfits: string[] };
  /** vars: 꾸미기 선택지(첫 번째가 기본). key = 모양 글자(+색 번호), 예: 'b1' */
  itemdefs: { id: ItemId; th: number; name: string; vars?: { key: string; name: string }[] }[];
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
  items: { id: ItemId; x: number; y: number; kind: 'wall' | 'floor'; base: number; img: string; var?: string }[];
  /** [x0, x1, 바닥 y, 최대 높이] */
  slots: [number, number, number, number][];
  /** [x0, 바닥 y, 칸 수] */
  brag: [number, number, number][];
  foot: [number, number];
  sidecap: number;
  cap: number;
  /** shape: 이 모양일 때만 쓰는 조명 범위 */
  lights: { id: ItemId; x: number; y: number; rx: number; ry: number; shape?: string }[];
  /** 움직이는 효과 자리: 샹들리에 모양별 불빛(glow)·유리구슬 끝(sparkle) */
  fx?: { pendant?: Record<string, { glow: [number, number][]; sparkle: [number, number][] }> };
  /** 캐릭터가 걷는 바닥(발 위치 다각형)·물건 자리·들를 곳 */
  walk?: { poly: [number, number][]; blocks: [number, number, number, number][];
    poi: { kind: 'sofa' | 'plant' | 'window' | 'shelf'; x: number; y: number; face: 'front' | 'back' | 'left' | 'right' }[] };
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
  /** 꾸미기에서 고른 모양·색 { rug: 'b1' } */
  picks?: Record<string, string | number>;
}
