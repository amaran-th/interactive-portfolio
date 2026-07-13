import { hexToRgba, rgbaToHex } from "./hsv";
import { MAX_PALETTE_COLORS } from "./types";

type Rgba = [number, number, number, number];

function colorDistance(a: Rgba, b: Rgba): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 + ((a[3] - b[3]) * 255) ** 2);
}

// 드래그 시작·끝 색을 steps단계로 나눠 밴딩된 그라데이션을 만든다 — 픽셀아트는
// 색상 수가 적어 부드러운 그라데이션보다 계단식이 매체 특성에 더 맞는다.
// 각 계단색은 기존 팔레트에 이미 있으면 재사용하고, 없으면 새로 추가하되
// MAX_PALETTE_COLORS를 넘기지 않도록 가장 가까운 기존 색으로 대체한다.
export function applyGradient(
  pixels: number[],
  palette: string[],
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  startHex: string,
  endHex: string,
  steps = 8,
): { pixels: number[]; palette: string[] } {
  const startRgba = hexToRgba(startHex);
  const endRgba = hexToRgba(endHex);

  const stepColors: Rgba[] = [];
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    stepColors.push([
      Math.round(startRgba[0] + (endRgba[0] - startRgba[0]) * t),
      Math.round(startRgba[1] + (endRgba[1] - startRgba[1]) * t),
      Math.round(startRgba[2] + (endRgba[2] - startRgba[2]) * t),
      startRgba[3] + (endRgba[3] - startRgba[3]) * t,
    ]);
  }

  const nextPalette = palette.slice();
  const stepIndices: number[] = stepColors.map((c) => {
    if (c[3] <= 0.02) return -1; // 거의 완전히 투명하면 인덱스 없이 -1로 취급
    const hex = rgbaToHex(c[0], c[1], c[2], c[3]);
    const existing = nextPalette.findIndex((p) => p.toLowerCase() === hex.toLowerCase());
    if (existing >= 0) return existing;
    if (nextPalette.length < MAX_PALETTE_COLORS) {
      nextPalette.push(hex);
      return nextPalette.length - 1;
    }
    let bestIdx = 0;
    let bestDist = Infinity;
    nextPalette.forEach((p, i) => {
      const d = colorDistance(hexToRgba(p), c);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    return bestIdx;
  });

  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy || 1;
  const nextPixels = pixels.slice();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / lenSq));
      const stepIdx = Math.min(steps - 1, Math.floor(t * steps));
      nextPixels[y * width + x] = stepIndices[stepIdx];
    }
  }

  return { pixels: nextPixels, palette: nextPalette };
}
