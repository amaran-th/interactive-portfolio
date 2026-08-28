import { hexToRgba, rgbaToHex } from "./hsv";
import type { Point } from "./types";
import type { BlendMode, PixelLayer } from "../_shared/assetLibrary";

// 픽셀은 트루컬러다 — hex 문자열이거나, 투명이면 null.
export type PixelValue = string | null;

// 알파가 있는 색을 이미 칠해진 픽셀 위에 다시 찍으면 두 색이 합성된다(표준
// src-over 알파 합성) — 새 색이 완전 불투명이거나 기존 픽셀이 비어 있으면
// 굳이 섞을 필요 없이 그대로 얹는 것과 결과가 같아 지름길로 처리한다.
export function compositePixel(dst: PixelValue, src: string): PixelValue {
  const [, , , srcA] = hexToRgba(src);
  if (srcA >= 1 || dst === null) return src;
  const [dr, dg, db, dstA] = hexToRgba(dst);
  const [sr, sg, sb] = hexToRgba(src);
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0.002) return null;
  return rgbaToHex(
    (sr * srcA + dr * dstA * (1 - srcA)) / outA,
    (sg * srcA + dg * dstA * (1 - srcA)) / outA,
    (sb * srcA + db * dstA * (1 - srcA)) / outA,
    outA,
  );
}

export function createGrid(width: number, height: number): PixelValue[] {
  return new Array(width * height).fill(null);
}

export type LayerAdjustments = Pick<
  PixelLayer,
  "brightness" | "contrast" | "saturation" | "temperature" | "tint"
>;

// 색보정 다섯 개를 정해진 순서(색온도·틴트 → 밝기 → 대비 → 채도)로 차례로
// 적용한다 — 화이트밸런스를 먼저 잡아야 그 뒤의 밝기·대비가 최종 색 기준으로
// 자연스럽게 걸린다. 다섯 값이 전부 0(또는 없음)이면 원본을 그대로 돌려줘
// 불필요한 재계산을 피한다. 이 함수는 화면에 보여줄 때만 불리고, 실제
// 저장된 픽셀 값은 절대 바꾸지 않는다.
export function applyAdjustments(
  value: PixelValue,
  adjustments: LayerAdjustments,
): PixelValue {
  const {
    brightness = 0,
    contrast = 0,
    saturation = 0,
    temperature = 0,
    tint = 0,
  } = adjustments;
  if (
    value === null ||
    (brightness === 0 &&
      contrast === 0 &&
      saturation === 0 &&
      temperature === 0 &&
      tint === 0)
  ) {
    return value;
  }
  const [r0, g0, b0, a] = hexToRgba(value);
  let r = r0;
  let g = g0;
  let b = b0;

  // 색온도(따뜻함↔차가움)·틴트(마젠타↔그린) — 정확한 CIE 기반 화이트밸런스가
  // 아니라 사진 편집 도구들이 흔히 쓰는 채널 이동 근사치다.
  r += (temperature / 100) * 40;
  b -= (temperature / 100) * 40;
  g += (tint / 100) * 40;
  r -= (tint / 100) * 20;
  b -= (tint / 100) * 20;

  // 밝기 — 세 채널에 동일하게 더한다.
  r += (brightness / 100) * 255;
  g += (brightness / 100) * 255;
  b += (brightness / 100) * 255;

  // 대비 — 128을 기준으로 밀어낸다(표준 대비 공식).
  if (contrast !== 0) {
    const c = contrast * 2.55;
    const factor = (259 * (c + 255)) / (255 * (259 - c));
    r = factor * (r - 128) + 128;
    g = factor * (g - 128) + 128;
    b = factor * (b - 128) + 128;
  }

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  // 채도 — luma(밝기) 축을 기준으로 원색과의 거리를 늘리거나 줄인다. HSV의
  // s만 조절하는 방식은 v(=max 채널)가 그대로 남아 -100에서도 무채색이
  // 아니라 흰색이 되는 문제가 있어(순색 빨강 #ff0000 → v=1,s=0 → 흰색),
  // 대신 CSS filter: saturate()와 같은 luma 보간을 쓴다. factor는
  // -100→0(완전 무채색=회색), 0→1(원본), 100→2(두 배 채도)로 매핑된다.
  if (saturation !== 0) {
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const factor = 1 + saturation / 100;
    r = luma + (r - luma) * factor;
    g = luma + (g - luma) * factor;
    b = luma + (b - luma) * factor;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
  }

  return rgbaToHex(r, g, b, a);
}

// 0~1로 정규화된 채널 값 기준 표준 블렌드 공식(W3C 합성 스펙과 동일 계열,
// 포토샵 블렌드 모드와 결과가 같다).
function blendChannel(dst: number, src: number, mode: BlendMode): number {
  switch (mode) {
    case "multiply":
      return dst * src;
    case "screen":
      return 1 - (1 - dst) * (1 - src);
    case "overlay":
      return dst <= 0.5 ? 2 * dst * src : 1 - 2 * (1 - dst) * (1 - src);
    case "darken":
      return Math.min(dst, src);
    case "lighten":
      return Math.max(dst, src);
    case "color-dodge":
      return src >= 1 ? 1 : Math.min(1, dst / (1 - src));
    case "color-burn":
      return src <= 0 ? 0 : 1 - Math.min(1, (1 - dst) / src);
    case "normal":
    default:
      return src;
  }
}

// dst·src 픽셀(hex)의 RGB 채널마다 blendChannel을 적용해 섞은 색을 돌려준다.
// dst가 비어있으면(투명) 섞을 대상이 없으므로 src를 그대로 돌려준다 — 배경이
// 없는 곳에서는 블렌드 모드가 사실상 아무 효과가 없다는 뜻이다. dst가
// 반투명이면(알파 < 1) 표준 합성 공식대로 배경 알파만큼만 블렌드 결과를
// 섞고 나머지는 src 그대로 둔다(Co = (1-αb)·Cs + αb·B(Cb,Cs)) — 그러지
// 않으면 배경이 10% 알파든 100% 알파든 블렌드가 똑같이 강하게 걸린다.
// 알파는 src의 것을 그대로 들고 나가고, 실제 투명도 반영은 호출부
// (compositeOnto)가 opacity로 이어서 한다.
function blendColor(dst: PixelValue, src: string, mode: BlendMode): string {
  if (mode === "normal" || dst === null) return src;
  const [dr, dg, db, da] = hexToRgba(dst);
  const [sr, sg, sb, sa] = hexToRgba(src);
  const mix = (d: number, s: number) =>
    (1 - da) * s + da * blendChannel(d / 255, s / 255, mode) * 255;
  return rgbaToHex(mix(dr, sr), mix(dg, sg), mix(db, sb), sa);
}

// 레이어 투명도를 픽셀 알파에 곱해 적용한다 — opacity가 1이면 원본 그대로,
// 0이면(완전 투명) 합성에 아무 영향이 없다.
export function applyOpacityToPixel(
  value: PixelValue,
  opacity: number,
): PixelValue {
  if (value === null || opacity >= 1) return value;
  if (opacity <= 0) return null;
  const [r, g, b, a] = hexToRgba(value);
  return rgbaToHex(r, g, b, a * opacity);
}

// src 레이어를 자신의 투명도(srcOpacity)·블렌드 모드·보정까지 반영해 dst 위에
// 겹쳐 합성한다 — 레이어 하나를 그 아래 결과 위에 얹는 기본 단위 연산.
// srcBlendMode·srcAdjustments는 선택적이라 기존 3-인자 호출부(핵심은 그대로
// normal 블렌드 + 보정 없음)는 코드 변경 없이 그대로 동작한다.
export function compositeOnto(
  dst: PixelValue[],
  src: PixelValue[],
  srcOpacity: number,
  srcBlendMode: BlendMode = "normal",
  srcAdjustments?: LayerAdjustments,
): PixelValue[] {
  const out = dst.slice();
  for (let i = 0; i < src.length; i++) {
    const adjusted = srcAdjustments
      ? applyAdjustments(src[i], srcAdjustments)
      : src[i];
    const s = applyOpacityToPixel(adjusted, srcOpacity);
    if (s === null) continue;
    const blended =
      srcBlendMode === "normal" ? s : blendColor(out[i], s, srcBlendMode);
    out[i] = compositePixel(out[i], blended);
  }
  return out;
}

// 보이는 레이어만, 배열 순서(아래→위)대로 차례로 겹쳐 하나의 평면 이미지로
// 합성한다 — 저장·내보내기·썸네일처럼 레이어를 모르는 곳에서 쓰는 최종 결과.
export function compositeLayers(
  layers: PixelLayer[],
  width: number,
  height: number,
): PixelValue[] {
  let out = createGrid(width, height);
  for (const layer of layers) {
    if (!layer.visible) continue;
    out = compositeOnto(
      out,
      layer.pixels,
      layer.opacity,
      layer.blendMode ?? "normal",
      layer,
    );
  }
  return out;
}

// compositeLayers와 달리 빈 캔버스가 아니라 이미 채워진 base 위에서 시작해,
// layers를 아래→위 순서로 각자의 블렌드 모드·보정을 적용해가며 겹쳐 올린다.
// PixelCanvas가 활성 레이어 위쪽 레이어들을 "실제로 지금 화면에 보이는
// 배경"(활성 레이어까지 합성된 visibleBase) 위에 얹을 때 쓴다 — 빈 캔버스
// 위에서 미리 평탄화하면 위 레이어의 블렌드 모드가 진짜 배경을 못 보고
// 계산돼(dst===null이라 블렌드가 무효화됨) 화면에서 사라져 보인다.
export function compositeLayersOnto(
  base: PixelValue[],
  layers: PixelLayer[],
): PixelValue[] {
  let out = base;
  for (const layer of layers) {
    if (!layer.visible) continue;
    out = compositeOnto(
      out,
      layer.pixels,
      layer.opacity,
      layer.blendMode ?? "normal",
      layer,
    );
  }
  return out;
}

// layers(아래→위 순서) 중 [fromIndex, toIndex] 구간만 합성한다 — PixelCanvas가
// 활성 레이어 아래/위의 배경·전경을 미리 만들어둘 때 쓴다. 구간에 보이는
// 레이어가 하나도 없으면(범위를 벗어나거나 전부 숨김) null을 돌려준다.
export function compositeLayerRange(
  layers: PixelLayer[],
  fromIndex: number,
  toIndex: number,
  width: number,
  height: number,
): PixelValue[] | null {
  if (fromIndex > toIndex || fromIndex >= layers.length || toIndex < 0) {
    return null;
  }
  const slice = layers
    .slice(Math.max(0, fromIndex), Math.min(layers.length, toIndex + 1))
    .filter((l) => l.visible);
  if (slice.length === 0) return null;
  return compositeLayers(slice, width, height);
}

// 빈 레이어 하나를 만든다 — id는 호출부(Editor)가 uid()로 발급해 넘긴다.
export function createLayer(
  id: string,
  name: string,
  width: number,
  height: number,
): PixelLayer {
  return {
    id,
    name,
    pixels: createGrid(width, height),
    visible: true,
    opacity: 1,
    locked: false,
  };
}

// 최근접 이웃 리샘플링 — 이미지 불러오기로 캔버스에 띄운 이미지를 드래그로
// 크기 조절할 때, 원본 해상도(srcWidth×srcHeight)를 목표 크기(dstWidth×dstHeight)로
// 다시 맞춘다. 픽셀아트는 부드러운 보간보다 이 방식이 매체 특성에 맞는다.
export function resamplePixelValues(
  src: PixelValue[],
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): PixelValue[] {
  const out = new Array<PixelValue>(dstWidth * dstHeight);
  for (let y = 0; y < dstHeight; y++) {
    const sy = Math.min(srcHeight - 1, Math.floor((y / dstHeight) * srcHeight));
    for (let x = 0; x < dstWidth; x++) {
      const sx = Math.min(srcWidth - 1, Math.floor((x / dstWidth) * srcWidth));
      out[y * dstWidth + x] = src[sy * srcWidth + sx];
    }
  }
  return out;
}

export function flipHorizontal(
  pixels: PixelValue[],
  width: number,
  height: number,
): PixelValue[] {
  const out = new Array<PixelValue>(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[y * width + (width - 1 - x)] = pixels[y * width + x];
    }
  }
  return out;
}

export function flipVertical(
  pixels: PixelValue[],
  width: number,
  height: number,
): PixelValue[] {
  const out = new Array<PixelValue>(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[(height - 1 - y) * width + x] = pixels[y * width + x];
    }
  }
  return out;
}

// 90도 회전 — direction=1이면 시계 방향, -1이면 반시계 방향. 정사각형이
// 아니면 결과의 가로세로가 서로 바뀌므로 새 width/height를 함께 돌려준다.
export function rotate90(
  pixels: PixelValue[],
  width: number,
  height: number,
  direction: 1 | -1,
): { pixels: PixelValue[]; width: number; height: number } {
  const outWidth = height;
  const outHeight = width;
  const out = new Array<PixelValue>(outWidth * outHeight);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = pixels[y * width + x];
      const [nx, ny] =
        direction === 1
          ? [outWidth - 1 - y, x] // 시계 방향
          : [y, outHeight - 1 - x]; // 반시계 방향
      out[ny * outWidth + nx] = value;
    }
  }
  return { pixels: out, width: outWidth, height: outHeight };
}

// 불러온 이미지 오버레이 등 0/90/180/270도 회전이 필요한 곳에서 쓴다 —
// rotate90(시계/반시계 한 번)과 달리 원하는 각도를 한 번에 지정할 수 있다.
export function rotatePixelValuesBy(
  pixels: PixelValue[],
  width: number,
  height: number,
  rotation: 0 | 90 | 180 | 270,
): { pixels: PixelValue[]; width: number; height: number } {
  if (rotation === 0) return { pixels, width, height };
  if (rotation === 180) {
    const out = new Array<PixelValue>(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        out[(height - 1 - y) * width + (width - 1 - x)] = pixels[y * width + x];
      }
    }
    return { pixels: out, width, height };
  }
  return rotate90(pixels, width, height, rotation === 90 ? 1 : -1);
}

// "캔버스 크기 수정"은 그림을 다시 샘플링(확대·축소)하는 게 아니라 경계만 바꾼다
// (왼쪽 위를 기준으로 자르거나 투명하게 늘린다) — 이미지 가져오기의
// resamplePixelGrid(비율 재배치)와는 다른, 실제 캔버스 도구들의 일반적인
// "캔버스 크기" 동작이다.
export function resizeGrid(
  pixels: PixelValue[],
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): PixelValue[] {
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

// 여러 레이어의 불투명 픽셀을 하나의 집합으로 보고 그 경계 상자를 구한다.
// 전부 완전히 투명하면(정렬할 내용이 없으면) null을 돌려준다.
export function unionBoundingBox(
  pixelLists: PixelValue[][],
  width: number,
  height: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pixels of pixelLists) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels[y * width + x] === null) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

// pixels를 (dx, dy)만큼 평행이동한 같은 크기의 새 그리드를 돌려준다.
// 캔버스 밖으로 나가는 픽셀은 잘리고, 새로 드러나는 자리는 투명(null)으로 채운다.
export function shiftPixels(
  pixels: PixelValue[],
  width: number,
  height: number,
  dx: number,
  dy: number,
): PixelValue[] {
  const out = new Array<PixelValue>(width * height).fill(null);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = x - dx;
      const srcY = y - dy;
      if (srcX < 0 || srcY < 0 || srcX >= width || srcY >= height) continue;
      out[y * width + x] = pixels[srcY * width + srcX];
    }
  }
  return out;
}

export function idx(width: number, x: number, y: number): number {
  return y * width + x;
}

export function inBounds(
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

export function getPixel(
  pixels: PixelValue[],
  width: number,
  x: number,
  y: number,
): PixelValue {
  return pixels[idx(width, x, y)];
}

export function setPixel(
  pixels: PixelValue[],
  width: number,
  x: number,
  y: number,
  color: PixelValue,
): PixelValue[] {
  const next = pixels.slice();
  const i = idx(width, x, y);
  next[i] = color === null ? null : compositePixel(next[i], color);
  return next;
}

// Bresenham 직선 — 두 점 사이의 모든 격자 좌표를 반환
export function linePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x: number; y: number }[] {
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

export function rectOutlinePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x: number; y: number }[] {
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

export function rectFillPoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x: number; y: number }[] {
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
export function circleFillPoints(
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number }[] {
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
export function circleOutlinePoints(
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let x = radius;
  let y = 0;
  let err = 0;
  while (x >= y) {
    points.push(
      { x: cx + x, y: cy + y },
      { x: cx + y, y: cy + x },
      { x: cx - y, y: cy + x },
      { x: cx - x, y: cy + y },
      { x: cx - x, y: cy - y },
      { x: cx - y, y: cy - x },
      { x: cx + y, y: cy - x },
      { x: cx + x, y: cy - y },
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

// 직선/사각형/원 도형 도구가 공유하는 좌표 계산 — 두 정의점(x0,y0)-(x1,y1)과
// 채움 여부만 있으면 실제 찍힐 좌표 목록이 나온다. 드래그 중 미리보기(PixelCanvas)와
// 확정 시점의 실제 커밋(Editor)이 항상 똑같은 모양을 그리도록 한 곳에 모아 둔다.
export function shapeToolPoints(
  tool: "line" | "rect" | "circle",
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  filled: boolean,
): Point[] {
  if (tool === "line") return linePoints(x0, y0, x1, y1);
  if (tool === "rect") {
    return filled
      ? rectFillPoints(x0, y0, x1, y1)
      : rectOutlinePoints(x0, y0, x1, y1);
  }
  const radius = Math.round(Math.hypot(x1 - x0, y1 - y0));
  return filled
    ? circleFillPoints(x0, y0, radius)
    : circleOutlinePoints(x0, y0, radius);
}

// 도형 좌표 하나하나를 브러시 크기만큼 정사각 블록으로 확장한다(plotPoint의
// 브러시 확장과 같은 규칙) — 그라데이션 채우기 미리보기·확정이 실제 브러시
// 크기를 반영한 모양과 어긋나지 않게 한다. 중복 좌표는 한 번만 담는다.
export function expandPoints(
  shapePoints: Point[],
  width: number,
  height: number,
  brushSize: number,
): Point[] {
  const half = Math.floor(brushSize / 2);
  const seen = new Map<number, Point>();
  for (const { x, y } of shapePoints) {
    for (let dy = 0; dy < brushSize; dy++) {
      for (let dx = 0; dx < brushSize; dx++) {
        const bx = x - half + dx;
        const by = y - half + dy;
        if (bx < 0 || by < 0 || bx >= width || by >= height) continue;
        const key = by * width + bx;
        if (!seen.has(key)) seen.set(key, { x: bx, y: by });
      }
    }
  }
  return [...seen.values()];
}

// 4방향 floodFill — target 색과 같은 연결된 영역을 replacement로 교체
export function floodFill(
  pixels: PixelValue[],
  width: number,
  height: number,
  startX: number,
  startY: number,
  replacement: PixelValue,
): PixelValue[] {
  const target = getPixel(pixels, width, startX, startY);
  if (target === replacement) return pixels;
  const next = pixels.slice();
  const stack: { x: number; y: number }[] = [{ x: startX, y: startY }];
  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    if (!inBounds(width, height, x, y)) continue;
    if (next[idx(width, x, y)] !== target) continue;
    next[idx(width, x, y)] = replacement;
    stack.push(
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    );
  }
  return next;
}

// 마법봉 — target 색과 연결된 픽셀 인덱스 집합(마스크)을 반환
export function wandMask(
  pixels: PixelValue[],
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
    stack.push(
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    );
  }
  return visited;
}

// 마법봉(전역) — 이어져 있는지와 무관하게, 캔버스 전체에서 target과 같은 색을
// 가진 모든 픽셀을 선택한다. 같은 색을 화면 곳곳에 흩어 칠했을 때 한 번에
// 고르는 용도(예: 선택 영역 일괄 색상 수정과 함께 쓰기 위함).
export function wandMaskGlobal(
  pixels: PixelValue[],
  width: number,
  startX: number,
  startY: number,
): Set<number> {
  const target = getPixel(pixels, width, startX, startY);
  const matched = new Set<number>();
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] === target) matched.add(i);
  }
  return matched;
}

// 짝수-홀수 규칙(even-odd rule) 레이 캐스팅 — 드래그 경로를 그대로 다각형의
// 꼭짓점으로 삼아 닫힌 도형으로 취급한다(마지막 점과 첫 점을 자동으로 잇는다).
function pointInPolygon(px: number, py: number, points: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// 올가미(자유 선택) — 드래그 경로(픽셀 격자 좌표)를 다각형으로 보고 내부에
// 속한 칸을 모두 고른다. 경로의 바운딩 박스 안에서만 판정해, 캔버스 전체를
// 훑지 않고도 충분히 빠르게 동작한다.
export function lassoMask(
  width: number,
  height: number,
  points: Point[],
): Set<number> {
  const mask = new Set<number>();
  if (points.length < 3) return mask;
  let minX = width - 1;
  let maxX = 0;
  let minY = height - 1;
  let maxY = 0;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  minX = Math.max(0, minX);
  minY = Math.max(0, minY);
  maxX = Math.min(width - 1, maxX);
  maxY = Math.min(height - 1, maxY);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) mask.add(y * width + x);
    }
  }
  return mask;
}
