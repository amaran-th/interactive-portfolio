import type { MirrorMode } from './types';

export function createGrid(width: number, height: number): number[] {
  return new Array(width * height).fill(-1);
}

// "캔버스 크기 수정"은 그림을 다시 샘플링(확대·축소)하는 게 아니라 경계만 바꾼다
// (왼쪽 위를 기준으로 자르거나 투명하게 늘린다) — 이미지 가져오기의
// resamplePixelGrid(비율 재배치)와는 다른, 실제 캔버스 도구들의 일반적인
// "캔버스 크기" 동작이다.
export function resizeGrid(pixels: number[], oldWidth: number, oldHeight: number, newWidth: number, newHeight: number): number[] {
  const next = createGrid(newWidth, newHeight);
  const copyWidth = Math.min(oldWidth, newWidth);
  const copyHeight = Math.min(oldHeight, newHeight);
  for (let y = 0; y < copyHeight; y++) {
    for (let x = 0; x < copyWidth; x++) {
      next[idx(newWidth, x, y)] = pixels[idx(oldWidth, x, y)];
    }
  }
  return next;
}

export function idx(width: number, x: number, y: number): number {
  return y * width + x;
}

export function inBounds(width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

export function getPixel(pixels: number[], width: number, x: number, y: number): number {
  return pixels[idx(width, x, y)];
}

export function setPixel(
  pixels: number[],
  width: number,
  x: number,
  y: number,
  colorIndex: number,
): number[] {
  const next = pixels.slice();
  next[idx(width, x, y)] = colorIndex;
  return next;
}

// Bresenham 직선 — 두 점 사이의 모든 격자 좌표를 반환
export function linePoints(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    points.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

export function rectOutlinePoints(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  const points: { x: number; y: number }[] = [];
  for (let x = left; x <= right; x++) {
    points.push({ x, y: top }, { x, y: bottom });
  }
  for (let y = top; y <= bottom; y++) {
    points.push({ x: left, y }, { x: right, y });
  }
  return points;
}

export function rectFillPoints(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  const points: { x: number; y: number }[] = [];
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) points.push({ x, y });
  }
  return points;
}

// 미드포인트 원 알고리즘의 채운 버전 — 외곽선 좌표를 찍는 대신, 같은 반복에서
// 나오는 각 행(y)마다 좌우 대칭 구간을 수평으로 채운다.
export function circleFillPoints(cx: number, cy: number, radius: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let x = radius;
  let y = 0;
  let err = 0;
  while (x >= y) {
    for (let px = cx - x; px <= cx + x; px++) {
      points.push({ x: px, y: cy + y }, { x: px, y: cy - y });
    }
    for (let px = cx - y; px <= cx + y; px++) {
      points.push({ x: px, y: cy + x }, { x: px, y: cy - x });
    }
    y += 1;
    err += 1 + 2 * y;
    if (2 * (err - x) + 1 > 0) {
      x -= 1;
      err += 1 - 2 * x;
    }
  }
  return points;
}

// 미드포인트 원 알고리즘(외곽선)
export function circleOutlinePoints(cx: number, cy: number, radius: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let x = radius;
  let y = 0;
  let err = 0;
  while (x >= y) {
    points.push(
      { x: cx + x, y: cy + y }, { x: cx + y, y: cy + x },
      { x: cx - y, y: cy + x }, { x: cx - x, y: cy + y },
      { x: cx - x, y: cy - y }, { x: cx - y, y: cy - x },
      { x: cx + y, y: cy - x }, { x: cx + x, y: cy - y },
    );
    y += 1;
    err += 1 + 2 * y;
    if (2 * (err - x) + 1 > 0) {
      x -= 1;
      err += 1 - 2 * x;
    }
  }
  return points;
}

export function mirrorPoints(
  width: number,
  height: number,
  mode: MirrorMode,
  x: number,
  y: number,
): { x: number; y: number }[] {
  const base = { x, y };
  if (mode === "none") return [base];
  const h = { x: width - 1 - x, y };
  const v = { x, y: height - 1 - y };
  const hv = { x: width - 1 - x, y: height - 1 - y };
  if (mode === "horizontal") return [base, h];
  if (mode === "vertical") return [base, v];
  return [base, h, v, hv];
}

// 4방향 floodFill — target 색과 같은 연결된 영역을 replacement로 교체
export function floodFill(
  pixels: number[],
  width: number,
  height: number,
  startX: number,
  startY: number,
  replacement: number,
): number[] {
  const target = getPixel(pixels, width, startX, startY);
  if (target === replacement) return pixels;
  const next = pixels.slice();
  const stack: { x: number; y: number }[] = [{ x: startX, y: startY }];
  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    if (!inBounds(width, height, x, y)) continue;
    if (next[idx(width, x, y)] !== target) continue;
    next[idx(width, x, y)] = replacement;
    stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }
  return next;
}

// 마법봉 — target 색과 연결된 픽셀 인덱스 집합(마스크)을 반환
export function wandMask(
  pixels: number[],
  width: number,
  height: number,
  startX: number,
  startY: number,
): Set<number> {
  const target = getPixel(pixels, width, startX, startY);
  const visited = new Set<number>();
  const stack: { x: number; y: number }[] = [{ x: startX, y: startY }];
  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    if (!inBounds(width, height, x, y)) continue;
    const i = idx(width, x, y);
    if (visited.has(i)) continue;
    if (pixels[i] !== target) continue;
    visited.add(i);
    stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
  }
  return visited;
}
