/** 하이픈·공백 제거 후 ISBN-10/13 검증. ISBN-10은 13으로 바꾼다. 틀리면 null */
export function normalizeIsbn(raw: string): string | null {
  const s = raw.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (s.length === 13 && /^\d{13}$/.test(s)) {
    const sum = [...s.slice(0, 12)].reduce((a, ch, i) => a + Number(ch) * (i % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(s[12]) ? s : null;
  }
  if (s.length === 10 && /^\d{9}[\dX]$/.test(s)) {
    const sum = [...s].reduce((a, ch, i) => a + (ch === 'X' ? 10 : Number(ch)) * (10 - i), 0);
    if (sum % 11 !== 0) return null;
    const body = '978' + s.slice(0, 9);
    const s13 = [...body].reduce((a, ch, i) => a + Number(ch) * (i % 2 ? 3 : 1), 0);
    return body + ((10 - (s13 % 10)) % 10);
  }
  return null;
}
