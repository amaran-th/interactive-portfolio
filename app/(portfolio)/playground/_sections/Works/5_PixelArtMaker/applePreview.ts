// 캔버스 크기를 고를 때 "이 해상도로 그리면 대충 이 정도로 뭉개진다"를 감으로
// 보여주기 위한 아주 단순한 16x16 사과 기준 그림. 실제 그림 소재가 아니라
// 해상도 비교용 참조 이미지라 정교할 필요는 없다.
const APPLE_ROWS = [
  "0000000000000000",
  "0000000440000000",
  "0000033340000000",
  "0000111100000000",
  "0001111111000000",
  "0011111111100000",
  "0111111111110000",
  "0111111111110000",
  "1111111111111000",
  "1111111111111000",
  "1111111111111000",
  "0111111111110000",
  "0111111111110000",
  "0011111111100000",
  "0001111111000000",
  "0000000000000000",
];

const APPLE_CHAR_COLOR: Record<string, string> = {
  "1": "#dc2626",
  "3": "#22c55e",
  "4": "#78350f",
};

export const APPLE_SIZE = 16;

const applePalette: string[] = [];
const paletteIndexOf = new Map<string, number>();
export const applePixels: number[] = [];

for (const row of APPLE_ROWS) {
  for (const ch of row) {
    if (ch === "0") {
      applePixels.push(-1);
      continue;
    }
    let idx = paletteIndexOf.get(ch);
    if (idx === undefined) {
      idx = applePalette.length;
      applePalette.push(APPLE_CHAR_COLOR[ch]);
      paletteIndexOf.set(ch, idx);
    }
    applePixels.push(idx);
  }
}

export { applePalette };
