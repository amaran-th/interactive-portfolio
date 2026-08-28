export function hexToRgb(hex: string): [number, number, number] {
  // 항상 RRGGBB 6자리만 읽는다 — 알파가 붙은 8자리(#rrggbbaa) 입력이 들어오면
  // 전체를 하나의 32비트 정수로 파싱하게 되는데, 그러면 JS의 비트 연산이 32비트
  // "부호 있는" 정수로 다뤄 R 채널이 부호 비트에 걸려 버리고, 시프트 폭(16/8)도
  // 24비트 레이아웃 기준이라 실제로는 G·B·알파 바이트를 R·G·B로 잘못 읽어온다.
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// #rrggbb 또는 #rrggbbaa 모두 읽는다 — 알파 자리가 없으면 완전 불투명(1)으로 취급한다.
export function hexToRgba(hex: string): [number, number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const clean = hex.replace("#", "");
  const a = clean.length >= 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}

// 완전 불투명(a=1)일 때는 기존 6자리 hex를 그대로 유지해 저장된 작품과의
// 하위 호환을 지킨다 — 투명도가 실제로 쓰일 때만 8자리(#rrggbbaa)로 확장한다.
export function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const base = rgbToHex(r, g, b);
  if (a >= 1) return base;
  const alphaHex = Math.max(0, Math.min(255, Math.round(a * 255)))
    .toString(16)
    .padStart(2, "0");
  return `${base}${alphaHex}`;
}

// h: 0-360, s: 0-1, v: 0-1 -> [r, g, b] 각 0-255
export function hsvToRgb(
  h: number,
  s: number,
  v: number,
): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// 두 hex 색을 t(0~1) 비율로 선형 보간한다 — 안티에일리어싱 텍스트를 실제
// 픽셀에 구울 때 배경색과 글자색을 섞어 하나의 불투명 색으로 만드는 데 쓴다.
export function mixHex(hexA: string, hexB: string, t: number): string {
  const [ar, ag, ab] = hexToRgba(hexA);
  const [br, bg, bb] = hexToRgba(hexB);
  return rgbaToHex(
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t,
    1,
  );
}

// r,g,b: 0-255 -> [h(0-360), s(0-1), v(0-1)]
export function rgbToHsv(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s, v];
}
