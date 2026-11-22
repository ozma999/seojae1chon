'use client';
// 바코드 읽기: 브라우저에 BarcodeDetector가 있으면(안드로이드 크롬) 그것을, 없으면(아이폰 사파리 등) zxing WASM 대체품을 쓴다
export interface Detector { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> }
declare global { interface Window { BarcodeDetector?: new (o: { formats: string[] }) => Detector } }

let cached: Promise<Detector> | null = null;
export function getDetector(): Promise<Detector> {
  return (cached ??= (async () => {
    if (typeof window !== 'undefined' && window.BarcodeDetector) {
      try { return new window.BarcodeDetector({ formats: ['ean_13'] }); } catch { /* 지원 형식이 없으면 대체품으로 */ }
    }
    const m = await import('barcode-detector/ponyfill');
    // WASM은 외부 CDN이 아니라 우리 사이트(public/wasm)에서
    m.setZXingModuleOverrides({ locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? '/wasm/zxing_reader.wasm' : prefix + path) });
    return new m.BarcodeDetector({ formats: ['ean_13'] }) as unknown as Detector;
  })());
}
/** 카메라가 있는 브라우저면 바코드 찍기를 보여준다(아이폰 포함) */
export const canUseCamera = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
