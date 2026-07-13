import { hexToRgba, rgbaToHex } from "./hsv";
import { MAX_PALETTE_COLORS, Point } from "./types";

export type Rgba = [number, number, number, number];

function colorDistance(a: Rgba, b: Rgba): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
      (a[1] - b[1]) ** 2 +
      (a[2] - b[2]) ** 2 +
      ((a[3] - b[3]) * 255) ** 2,
  );
}

// 색을 팔레트 인덱스로 바꾼다 — 이미 있으면 재사용하고, 없으면 새로 추가하되
// MAX_PALETTE_COLORS를 넘기지 않도록 가장 가까운 기존 색으로 대체한다.
// 그라데이션·텍스트 안티에일리어싱·도형 그라데이션 채우기가 모두 이 규칙을
// 공유한다(팔레트가 무한정 늘어나지 않도록 하는 이 프로젝트의 기본 원칙).
export function resolvePaletteIndex(
  hex: string,
  palette: string[],
): { index: number; palette: string[] } {
  const existing = palette.findIndex(
    (p) => p.toLowerCase() === hex.toLowerCase(),
  );
  if (existing >= 0) return { index: existing, palette };
  if (palette.length < MAX_PALETTE_COLORS) {
    return { index: palette.length, palette: [...palette, hex] };
  }
  const target = hexToRgba(hex);
  let bestIdx = 0;
  let bestDist = Infinity;
  palette.forEach((p, i) => {
    const d = colorDistance(hexToRgba(p), target);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  });
  return { index: bestIdx, palette };
}

// 시작·끝 색을 steps단계로 나눠 밴딩된 색 목록을 만든다 — 픽셀아트는 색상 수가
// 적어 부드러운 그라데이션보다 계단식이 매체 특성에 더 맞는다.
export function buildGradientSteps(
  startHex: string,
  endHex: string,
  steps: number,
): Rgba[] {
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
  return stepColors;
}

// (x,y)를 (x0,y0)-(x1,y1) 축에 투영해 0~1 사이 위치를 구한다 — 그 축 방향으로
// 얼마나 진행했는지를 나타내며, steps 색 목록에서 몇 번째 계단인지 고르는 데 쓴다.
export function projectT(
  x: number,
  y: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy || 1;
  return Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / lenSq));
}

export function stepColorAt(stepColors: Rgba[], t: number): Rgba {
  const idx = Math.min(
    stepColors.length - 1,
    Math.floor(t * stepColors.length),
  );
  return stepColors[idx];
}

// 점 집합의 바운딩 박스 중심을 지나는, angleDeg 방향의 그라데이션 축을 만든다 —
// 도형·텍스트처럼 드래그로 축을 직접 지정하지 않는 그라데이션 채우기에 쓴다.
export function bboxGradientAxis(
  points: Point[],
  angleDeg: number,
): { x0: number; y0: number; x1: number; y1: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const halfLen = Math.max(1, Math.hypot(maxX - minX, maxY - minY)) / 2 + 1;
  return {
    x0: cx - dx * halfLen,
    y0: cy - dy * halfLen,
    x1: cx + dx * halfLen,
    y1: cy + dy * halfLen,
  };
}

// 드래그 시작·끝 색을 steps단계로 나눠 밴딩된 그라데이션을 캔버스 전체에 채운다.
// 각 계단색은 resolvePaletteIndex로 팔레트에 반영한다.
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
  const stepColors = buildGradientSteps(startHex, endHex, steps);

  let nextPalette = palette.slice();
  const stepIndices: number[] = stepColors.map((c) => {
    if (c[3] <= 0.02) return -1; // 거의 완전히 투명하면 인덱스 없이 -1로 취급
    const hex = rgbaToHex(c[0], c[1], c[2], c[3]);
    const resolved = resolvePaletteIndex(hex, nextPalette);
    nextPalette = resolved.palette;
    return resolved.index;
  });

  const nextPixels = pixels.slice();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = projectT(x, y, x0, y0, x1, y1);
      const stepIdx = Math.min(steps - 1, Math.floor(t * steps));
      nextPixels[y * width + x] = stepIndices[stepIdx];
    }
  }

  return { pixels: nextPixels, palette: nextPalette };
}
