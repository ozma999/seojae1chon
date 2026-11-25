'use client';
// 책장 사진을 AI에 보내기 좋게: 방향 바로잡기 → 넓으면 겹치게 두 조각 → 긴 변 1568px 이하 JPEG
const MAX = 1568;
export async function photoTiles(file: File): Promise<string[]> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const W = bmp.width, H = bmp.height, ov = 0.12;
  const parts: [number, number, number, number][] =
    W > H * 1.15 ? [[0, 0, W * (0.5 + ov / 2), H], [W * (0.5 - ov / 2), 0, W * (0.5 + ov / 2), H]]
    : H > W * 1.15 ? [[0, 0, W, H * (0.5 + ov / 2)], [0, H * (0.5 - ov / 2), W, H * (0.5 + ov / 2)]]
    : [[0, 0, W, H]];
  const out: string[] = [];
  for (const [x, y, w, h] of parts) {
    const k = Math.min(1, MAX / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    const ctx = c.getContext('2d')!; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, x, y, w, h, 0, 0, c.width, c.height);
    out.push(c.toDataURL('image/jpeg', 0.86));
  }
  bmp.close();
  return out;
}
