/** 글자 단위 줄바꿈(한글 제목·문구용). 넘치면 마지막 줄 끝을 … 로 */
export function wrapChars(text: string, maxW: number, measure: (s: string) => number, maxLines: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const ch of text) {
    if (measure(line + ch) > maxW && line) {
      out.push(line);
      line = ch.trimStart();
      if (out.length === maxLines) break;
    } else line += ch;
  }
  if (out.length < maxLines && line) out.push(line);
  const used = out.join('').replace(/\s/g, '').length;
  if (used < text.replace(/\s/g, '').length) {
    let last = out[out.length - 1];
    while (last && measure(last + '…') > maxW) last = last.slice(0, -1);
    out[out.length - 1] = last + '…';
  }
  return out;
}
