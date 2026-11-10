// 색 변환과 CSS 문자열. 색상 스포이트·팔레트 추출기가 같이 쓴다.
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

export type Rgb = { r: number; g: number; b: number };

const hex2 = (n: number) => n.toString(16).padStart(2, "0");

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// h는 0~359, s·l은 0~100 정수로 반올림한다.
export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h: Math.round(h) % 360, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export const formatHex = rgbToHex;

export function formatRgb({ r, g, b }: Rgb): string {
  return `rgb(${r} ${g} ${b})`;
}

export function formatHsl(rgb: Rgb): string {
  const { h, s, l } = rgbToHsl(rgb);
  return `hsl(${h} ${s}% ${l}%)`;
}

// 견본 위 글자를 흰색으로 쓸지 고를 때 쓴다(Rec. 601 luma).
export function isDark({ r, g, b }: Rgb): boolean {
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

// EyeDropper 결과처럼 HEX나 rgb() 문자열로 들어온 색을 읽는다.
export function parseColor(text: string): Rgb | null {
  const fromHex = hexToRgb(text);
  if (fromHex) return fromHex;
  const m = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(text.trim());
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  if (r > 255 || g > 255 || b > 255) return null;
  return { r, g, b };
}
