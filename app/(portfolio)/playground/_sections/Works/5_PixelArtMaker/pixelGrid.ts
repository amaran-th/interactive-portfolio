import type { MirrorMode } from './types';

export function createGrid(width: number, height: number): number[] {
  return new Array(width * height).fill(-1);
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
