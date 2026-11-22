// 아이폰 바코드 인식용 zxing WASM을 public/wasm 으로 복사(외부 CDN 대신 우리 사이트에서 제공). npm install 때 자동 실행
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
const src = 'node_modules/zxing-wasm/dist/reader/zxing_reader.wasm';
if (existsSync(src)) {
  mkdirSync('public/wasm', { recursive: true });
  copyFileSync(src, 'public/wasm/zxing_reader.wasm');
  console.log('copied zxing_reader.wasm → public/wasm');
}
