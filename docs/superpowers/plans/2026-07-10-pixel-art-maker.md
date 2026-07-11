# 픽셀아트 메이커 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 데스크탑 은유 UI를 가진 범용 픽셀아트 편집기 Work를 새로 만든다. 캐릭터/표정 같은 도메인 개념 없이, 낱개 픽셀아트를 그리거나 사진을 픽셀화해서 만들고, 공유 자산 라이브러리에 저장해 다른 Work(비주얼 노벨 메이커 등)에서 재사용할 수 있게 한다.

**Architecture:** 그리드 조작은 순수 함수(`pixelGrid.ts`, `pixelate.ts`)로 분리해 테스트 가능하게 만들고, React 컴포넌트는 그 위에 포인터 이벤트를 얹는 얇은 레이어로 둔다. 화면은 `Desktop`(라이브러리 아이콘 목록)과 `Editor`(캔버스 편집) 둘로 나뉘고, `PixelArtMaker.tsx`가 그 사이를 전환한다. 저장은 `Works/_shared/assetLibrary.ts`라는 전역 공유 모듈(localStorage 기반)에 쓴다 — 이 모듈은 향후 비트 음악 메이커·비주얼 노벨 메이커 v2도 그대로 재사용한다.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. 테스트 스위트 없음(프로젝트 컨벤션) — 각 태스크는 `npm run lint` + 브라우저 수동 검증으로 마무리한다. 새 외부 의존성 추가 없음(기존 `lucide-react`만 아이콘에 사용).

## Global Constraints

- 서버/DB/외부 인프라 사용 금지 — 모든 저장은 `localStorage` (`docs/superpowers/specs/2026-07-10-vn-asset-ecosystem-design.md`)
- 팔레트 색상 개수 제한: 작품당 최대 16색 (`MAX_PALETTE_COLORS = 16`)
- 캔버스 크기 프리셋(용도 구분 없음): `16x16 / 32x32 / 64x64 / 160x90`
- Export 형식: PNG / SVG / JSON / JPG (JPG는 손실 압축 경고 문구 포함)
- 다크 테마: `bg-gray-950`, `text-white`, `white/5`·`white/10` 글래스모피즘 톤 유지 (`CLAUDE.md`)
- 새 설명 문구(툴팁 등)는 번역투 없이 명확한 한국어로 작성 (`CLAUDE.md` Writing Guidelines)
- 드래그는 외부 라이브러리 없이 네이티브 Pointer Events로 구현 (`4_YearlyReceipt/EditView.tsx`의 기존 패턴 재사용)

---

## File Map

| 파일 | 변화 |
| --- | --- |
| `Works/_shared/assetLibrary.ts` | **신규** — 공유 자산 라이브러리 (localStorage, `pixelArt`/`beatPatterns` 컬렉션) |
| `Works/5_PixelArtMaker/types.ts` | **신규** — `Tool`, `MirrorMode`, `SelectionMask` 등 로컬 타입 |
| `Works/5_PixelArtMaker/pixelGrid.ts` | **신규** — 그리드 순수 함수(생성/조회/설정, floodFill, 선/사각/원, 미러, 마법봉) |
| `Works/5_PixelArtMaker/useCanvasHistory.ts` | **신규** — undo/redo 스택 훅 |
| `Works/5_PixelArtMaker/PixelCanvas.tsx` | **신규** — 캔버스 렌더링 + 포인터 이벤트 → 도구 디스패치 |
| `Works/5_PixelArtMaker/useSelection.ts` | **신규** — 마퀴/마법봉 선택, 이동, 복사-붙여넣기 |
| `Works/5_PixelArtMaker/PalettePanel.tsx` | **신규** — 팔레트 색상 관리 UI |
| `Works/5_PixelArtMaker/Toolbar.tsx` | **신규** — 도구 버튼 |
| `Works/5_PixelArtMaker/useKeyboardShortcuts.ts` | **신규** — 단축키 바인딩 |
| `Works/5_PixelArtMaker/NewCanvasDialog.tsx` | **신규** — 크기 프리셋 선택 모달 |
| `Works/5_PixelArtMaker/Editor.tsx` | **신규** — 편집기 화면 조립 |
| `Works/5_PixelArtMaker/pixelate.ts` | **신규** — 이미지→픽셀아트 변환 순수 함수 |
| `Works/5_PixelArtMaker/ImportPanel.tsx` | **신규** — 이미지 업로드 + 픽셀화 미리보기 모달 |
| `Works/5_PixelArtMaker/exportPixelArt.ts` | **신규** — PNG/SVG/JSON/JPG 내보내기 |
| `Works/5_PixelArtMaker/useDesktopLayout.ts` | **신규** — 아이콘 위치 로컬 저장 |
| `Works/5_PixelArtMaker/Desktop.tsx` | **신규** — 데스크탑 화면(아이콘, 다중선택, 우클릭 메뉴, 휴지통) |
| `Works/5_PixelArtMaker/DesktopIcon.tsx` | **신규** — 개별 아이콘(썸네일 + 드래그) |
| `Works/5_PixelArtMaker/ContextMenu.tsx` | **신규** — 범용 우클릭 메뉴 |
| `Works/5_PixelArtMaker/ConfirmDialog.tsx` | **신규** — 범용 확인 모달 |
| `Works/5_PixelArtMaker/PixelArtMaker.tsx` | **신규** — 최상위 셸(Desktop↔Editor 전환, 미저장 경고 연결) |
| `app/(services)/pixel-art-maker/page.tsx` | **신규** — 라우트 + 메타데이터 |
| `Works/data.tsx` | 수정 — Work #5 항목 추가 |

---

## Task 1: 공유 자산 라이브러리 모듈

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/_shared/assetLibrary.ts`

**Interfaces:**
- Produces: `PixelArt` 타입, `listPixelArt()`, `getPixelArt(id)`, `savePixelArt(art)`, `renamePixelArt(id, name)`, `deletePixelArt(ids: string[])`, `duplicatePixelArt(id)`, `uid()`

- [ ] **Step 1: `assetLibrary.ts` 작성**

```typescript
const LIBRARY_KEY = "playground-asset-library";

export type PixelArt = {
  id: string;
  name: string;
  width: number;
  height: number;
  palette: string[]; // hex 색상
  pixels: number[]; // length = width*height, palette 인덱스, -1 = 투명
  createdAt: number;
};

export type BeatTrack = {
  wave: "square" | "triangle" | "noise";
  steps: (string | null)[];
};

export type BeatPattern = {
  id: string;
  name: string;
  type: "bgm" | "sfx";
  bpm: number;
  tracks: BeatTrack[];
  createdAt: number;
};

type AssetLibrary = {
  pixelArt: PixelArt[];
  beatPatterns: BeatPattern[];
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function loadLibrary(): AssetLibrary {
  if (typeof window === "undefined") return { pixelArt: [], beatPatterns: [] };
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return { pixelArt: [], beatPatterns: [] };
    const parsed = JSON.parse(raw) as Partial<AssetLibrary>;
    return {
      pixelArt: parsed.pixelArt ?? [],
      beatPatterns: parsed.beatPatterns ?? [],
    };
  } catch {
    return { pixelArt: [], beatPatterns: [] };
  }
}

function saveLibrary(lib: AssetLibrary) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
  } catch {}
}

export function listPixelArt(): PixelArt[] {
  return loadLibrary().pixelArt;
}

export function getPixelArt(id: string): PixelArt | undefined {
  return loadLibrary().pixelArt.find((p) => p.id === id);
}

export function savePixelArt(art: PixelArt): void {
  const lib = loadLibrary();
  const idx = lib.pixelArt.findIndex((p) => p.id === art.id);
  if (idx >= 0) lib.pixelArt[idx] = art;
  else lib.pixelArt.push(art);
  saveLibrary(lib);
}

export function renamePixelArt(id: string, name: string): void {
  const lib = loadLibrary();
  const item = lib.pixelArt.find((p) => p.id === id);
  if (!item) return;
  item.name = name;
  saveLibrary(lib);
}

export function deletePixelArt(ids: string[]): void {
  const lib = loadLibrary();
  lib.pixelArt = lib.pixelArt.filter((p) => !ids.includes(p.id));
  saveLibrary(lib);
}

export function duplicatePixelArt(id: string): PixelArt | undefined {
  const lib = loadLibrary();
  const item = lib.pixelArt.find((p) => p.id === id);
  if (!item) return undefined;
  const copy: PixelArt = {
    ...item,
    id: uid(),
    name: `${item.name} 사본`,
    pixels: item.pixels.slice(),
    palette: item.palette.slice(),
    createdAt: Date.now(),
  };
  lib.pixelArt.push(copy);
  saveLibrary(lib);
  return copy;
}
```

- [ ] **Step 2: lint 확인**

Run: `npm run lint`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add app/\(portfolio\)/playground/_sections/Works/_shared/assetLibrary.ts
git commit -m "feat: 공유 자산 라이브러리 모듈 추가"
```

---

## Task 2: 픽셀 그리드 순수 함수

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/types.ts`
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/pixelGrid.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수, 외부 의존 없음)
- Produces: `Tool`, `MirrorMode` 타입 / `createGrid`, `idx`, `getPixel`, `setPixel`, `floodFill`, `drawLine`, `drawRectOutline`, `drawCircleOutline`, `mirrorPoints`, `wandMask`

- [ ] **Step 1: `types.ts` 작성**

```typescript
export type Tool =
  | "pencil"
  | "eraser"
  | "bucket"
  | "eyedropper"
  | "line"
  | "rect"
  | "circle"
  | "select"
  | "move"
  | "wand";

export type MirrorMode = "none" | "horizontal" | "vertical" | "both";

export const CANVAS_PRESETS = [
  { label: "16 × 16", width: 16, height: 16 },
  { label: "32 × 32", width: 32, height: 32 },
  { label: "64 × 64", width: 64, height: 64 },
  { label: "160 × 90", width: 160, height: 90 },
] as const;

export const MAX_PALETTE_COLORS = 16;

export type Point = { x: number; y: number };
```

- [ ] **Step 2: `pixelGrid.ts` 작성**

```typescript
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
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
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
```

- [ ] **Step 3: lint 확인**

Run: `npm run lint`
Expected: 오류 없음

- [ ] **Step 4: commit**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/types.ts app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/pixelGrid.ts
git commit -m "feat: 픽셀아트 메이커 그리드 순수 함수 추가"
```

---

## Task 3: undo/redo 히스토리 훅

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/useCanvasHistory.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `useCanvasHistory(initial: number[])` → `{ present: number[], push(next: number[]): void, undo(): void, redo(): void, canUndo: boolean, canRedo: boolean, reset(next: number[]): void }`

- [ ] **Step 1: `useCanvasHistory.ts` 작성**

`canUndo`/`canRedo`는 렌더 중에 `ref.current`를 읽지 않도록 별도 `useState`로 관리한다(이 프로젝트의 `react-hooks/refs` lint 규칙이 렌더 중 ref 읽기를 금지함) — 스택을 변경하는 각 콜백 안에서만 `.current.length`를 읽어 state로 반영한다.

```typescript
import { useCallback, useRef, useState } from "react";

const HISTORY_LIMIT = 50;

export function useCanvasHistory(initial: number[]) {
  const [present, setPresent] = useState(initial);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<number[][]>([]);
  const redoStack = useRef<number[][]>([]);

  const push = useCallback(
    (next: number[]) => {
      undoStack.current.push(present);
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
      redoStack.current = [];
      setPresent(next);
      setCanUndo(true);
      setCanRedo(false);
    },
    [present],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(present);
    setPresent(prev);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, [present]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(present);
    setPresent(next);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  }, [present]);

  const reset = useCallback((next: number[]) => {
    undoStack.current = [];
    redoStack.current = [];
    setPresent(next);
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { present, push, undo, redo, reset, canUndo, canRedo };
}
```

- [ ] **Step 2: lint 확인**

Run: `npm run lint`

- [ ] **Step 3: commit**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/useCanvasHistory.ts
git commit -m "feat: 픽셀아트 메이커 undo/redo 히스토리 훅 추가"
```

---

## Task 4: PixelCanvas — 렌더링 + 펜슬/지우개/버켓/스포이트

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx`

**Interfaces:**
- Consumes: `pixelGrid.ts`(`getPixel`,`setPixel`,`linePoints`,`floodFill`,`mirrorPoints`), `types.ts`(`Tool`,`MirrorMode`)
- Produces: `<PixelCanvas>` props `{ width, height, palette, pixels, tool, mirror, activeColorIndex, onStrokeEnd(next: number[]): void, onPickColor(colorIndex: number): void }`. `onStrokeEnd`는 포인터업 시 1회만 호출(히스토리 스택에 1개 항목만 쌓기 위함).

- [ ] **Step 1: `PixelCanvas.tsx` 작성**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { floodFill, getPixel, linePoints, mirrorPoints, setPixel } from "./pixelGrid";
import { MirrorMode, Tool } from "./types";

const CELL_SIZE = 16; // 화면상 픽셀 1칸의 기본 표시 크기(px), zoom으로 배율 적용

export default function PixelCanvas({
  width,
  height,
  palette,
  pixels,
  tool,
  mirror,
  activeColorIndex,
  onStrokeEnd,
  onPickColor,
}: {
  width: number;
  height: number;
  palette: string[];
  pixels: number[];
  tool: Tool;
  mirror: MirrorMode;
  activeColorIndex: number;
  onStrokeEnd: (next: number[]) => void;
  onPickColor: (colorIndex: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const workingRef = useRef<number[]>(pixels);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    workingRef.current = pixels;
  }, [pixels]);

  const render = useCallback(
    (data: number[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = CELL_SIZE * zoom;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const colorIndex = getPixel(data, width, x, y);
          if (colorIndex < 0) continue;
          ctx.fillStyle = palette[colorIndex] ?? "#ff00ff";
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, height * scale);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(width * scale, y * scale);
        ctx.stroke();
      }
    },
    [width, height, palette, zoom],
  );

  useEffect(() => {
    render(pixels);
  }, [pixels, render]);

  const toGridPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scale = CELL_SIZE * zoom;
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * height);
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      void scale;
      return { x, y };
    },
    [width, height, zoom],
  );

  const plotPoint = useCallback(
    (data: number[], x: number, y: number, colorIndex: number) => {
      let next = data;
      for (const p of mirrorPoints(width, height, mirror, x, y)) {
        next = setPixel(next, width, p.x, p.y, colorIndex);
      }
      return next;
    },
    [width, height, mirror],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const point = toGridPoint(e);
      if (!point) return;
      canvasRef.current?.setPointerCapture(e.pointerId);

      if (tool === "eyedropper") {
        const colorIndex = getPixel(workingRef.current, width, point.x, point.y);
        if (colorIndex >= 0) onPickColor(colorIndex);
        return;
      }

      if (tool === "bucket") {
        const next = floodFill(workingRef.current, width, height, point.x, point.y, activeColorIndex);
        if (next !== workingRef.current) {
          workingRef.current = next;
          render(next);
          onStrokeEnd(next);
        }
        return;
      }

      if (tool === "pencil" || tool === "eraser") {
        drawingRef.current = true;
        lastPointRef.current = point;
        const colorIndex = tool === "eraser" ? -1 : activeColorIndex;
        const next = plotPoint(workingRef.current, point.x, point.y, colorIndex);
        workingRef.current = next;
        render(next);
      }
    },
    [tool, width, height, activeColorIndex, toGridPoint, plotPoint, render, onStrokeEnd, onPickColor],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      if (tool !== "pencil" && tool !== "eraser") return;
      const point = toGridPoint(e);
      if (!point || !lastPointRef.current) return;
      const colorIndex = tool === "eraser" ? -1 : activeColorIndex;
      let next = workingRef.current;
      for (const p of linePoints(lastPointRef.current.x, lastPointRef.current.y, point.x, point.y)) {
        next = plotPoint(next, p.x, p.y, colorIndex);
      }
      lastPointRef.current = point;
      workingRef.current = next;
      render(next);
    },
    [tool, activeColorIndex, toGridPoint, plotPoint, render],
  );

  const handlePointerUp = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    onStrokeEnd(workingRef.current);
  }, [onStrokeEnd]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((z) => Math.min(8, Math.max(1, z + (e.deltaY < 0 ? 1 : -1))));
  }, []);

  // 스타일러스 호버 취소, 시스템 제스처 등으로 pointerup 없이 스트로크가 끊길 때 안전하게 커밋한다.
  const handlePointerCancel = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    onStrokeEnd(workingRef.current);
  }, [onStrokeEnd]);

  return (
    <canvas
      ref={canvasRef}
      className="cursor-crosshair touch-none rounded-lg border border-white/10"
      style={{ imageRendering: "pixelated" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
      onWheel={handleWheel}
    />
  );
}
```

- [ ] **Step 2: lint 확인**

Run: `npm run lint`

- [ ] **Step 3: 임시 사용처로 브라우저 검증**

`Editor.tsx`가 아직 없으므로 `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelArtMaker.tsx`에 아래 임시 코드를 작성해 `npm run dev` 후 `/pixel-art-maker`(Task 13에서 라우트 생성 전이라 임시로 `app/(services)/rough-visual-novel-maker/page.tsx` 옆에 스크래치 라우트를 만들어도 되고, 간단히는 아래처럼 Storybook 없이 브라우저 콘솔로 확인) 확인이 번거로우면 이 스텝은 Task 13 이후 통합 검증으로 미뤄도 된다. 지금은 타입 체크만으로 충분:

Run: `npx tsc --noEmit -p .`
Expected: `PixelCanvas.tsx` 관련 오류 없음

- [ ] **Step 4: commit**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx
git commit -m "feat: 픽셀 캔버스 렌더링 + 펜슬/지우개/버켓/스포이트 도구 추가"
```

---

## Task 5: 도형 도구(직선/사각형/원) + 미러 드로잉

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx`

**Interfaces:**
- Consumes: `pixelGrid.ts`(`rectOutlinePoints`,`circleOutlinePoints`)의 신규 사용
- Produces: 기존 `PixelCanvas` props 변경 없음 — `line`/`rect`/`circle` 도구 동작 추가

도형 도구는 `pointerdown`에서 시작점을 기록하고, `pointermove` 동안 시작점 기준 미리보기를 그리다가, `pointerup`에서 확정한다(중간에 원본 pixels 위에 미리보기를 얹었다가, up 시점에만 `onStrokeEnd` 호출).

- [ ] **Step 1: `PixelCanvas.tsx` 전체 교체**

Task 4의 파일에 도형 상태(`shapeStartRef`)와 `line`/`rect`/`circle` 분기를 더한 최종본으로 전체 교체한다:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  circleOutlinePoints,
  floodFill,
  getPixel,
  linePoints,
  mirrorPoints,
  rectOutlinePoints,
  setPixel,
} from "./pixelGrid";
import { MirrorMode, Tool } from "./types";

const CELL_SIZE = 16;

export default function PixelCanvas({
  width,
  height,
  palette,
  pixels,
  tool,
  mirror,
  activeColorIndex,
  onStrokeEnd,
  onPickColor,
}: {
  width: number;
  height: number;
  palette: string[];
  pixels: number[];
  tool: Tool;
  mirror: MirrorMode;
  activeColorIndex: number;
  onStrokeEnd: (next: number[]) => void;
  onPickColor: (colorIndex: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const workingRef = useRef<number[]>(pixels);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    workingRef.current = pixels;
  }, [pixels]);

  const render = useCallback(
    (data: number[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = CELL_SIZE * zoom;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const colorIndex = getPixel(data, width, x, y);
          if (colorIndex < 0) continue;
          ctx.fillStyle = palette[colorIndex] ?? "#ff00ff";
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, height * scale);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(width * scale, y * scale);
        ctx.stroke();
      }
    },
    [width, height, palette, zoom],
  );

  useEffect(() => {
    render(pixels);
  }, [pixels, render]);

  const toGridPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * height);
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      return { x, y };
    },
    [width, height],
  );

  const plotPoint = useCallback(
    (data: number[], x: number, y: number, colorIndex: number) => {
      let next = data;
      for (const p of mirrorPoints(width, height, mirror, x, y)) {
        next = setPixel(next, width, p.x, p.y, colorIndex);
      }
      return next;
    },
    [width, height, mirror],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const point = toGridPoint(e);
      if (!point) return;
      canvasRef.current?.setPointerCapture(e.pointerId);

      if (tool === "eyedropper") {
        const colorIndex = getPixel(workingRef.current, width, point.x, point.y);
        if (colorIndex >= 0) onPickColor(colorIndex);
        return;
      }

      if (tool === "bucket") {
        const next = floodFill(workingRef.current, width, height, point.x, point.y, activeColorIndex);
        if (next !== workingRef.current) {
          workingRef.current = next;
          render(next);
          onStrokeEnd(next);
        }
        return;
      }

      if (tool === "line" || tool === "rect" || tool === "circle") {
        drawingRef.current = true;
        shapeStartRef.current = point;
        return;
      }

      if (tool === "pencil" || tool === "eraser") {
        drawingRef.current = true;
        lastPointRef.current = point;
        const colorIndex = tool === "eraser" ? -1 : activeColorIndex;
        const next = plotPoint(workingRef.current, point.x, point.y, colorIndex);
        workingRef.current = next;
        render(next);
      }
    },
    [tool, width, height, activeColorIndex, toGridPoint, plotPoint, render, onStrokeEnd, onPickColor],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;

      if (tool === "line" || tool === "rect" || tool === "circle") {
        const point = toGridPoint(e);
        if (!point || !shapeStartRef.current) return;
        const start = shapeStartRef.current;
        let shapePoints: { x: number; y: number }[];
        if (tool === "line") {
          shapePoints = linePoints(start.x, start.y, point.x, point.y);
        } else if (tool === "rect") {
          shapePoints = rectOutlinePoints(start.x, start.y, point.x, point.y);
        } else {
          const radius = Math.round(Math.hypot(point.x - start.x, point.y - start.y));
          shapePoints = circleOutlinePoints(start.x, start.y, radius);
        }
        let next = pixels;
        for (const p of shapePoints) {
          if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) continue;
          next = plotPoint(next, p.x, p.y, activeColorIndex);
        }
        workingRef.current = next;
        render(next);
        return;
      }

      if (tool !== "pencil" && tool !== "eraser") return;
      const point = toGridPoint(e);
      if (!point || !lastPointRef.current) return;
      const colorIndex = tool === "eraser" ? -1 : activeColorIndex;
      let next = workingRef.current;
      for (const p of linePoints(lastPointRef.current.x, lastPointRef.current.y, point.x, point.y)) {
        next = plotPoint(next, p.x, p.y, colorIndex);
      }
      lastPointRef.current = point;
      workingRef.current = next;
      render(next);
    },
    [tool, width, height, activeColorIndex, pixels, toGridPoint, plotPoint, render],
  );

  const handlePointerUp = useCallback(() => {
    if (tool === "line" || tool === "rect" || tool === "circle") {
      if (!shapeStartRef.current) return;
      shapeStartRef.current = null;
      drawingRef.current = false;
      onStrokeEnd(workingRef.current);
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    onStrokeEnd(workingRef.current);
  }, [tool, onStrokeEnd]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((z) => Math.min(8, Math.max(1, z + (e.deltaY < 0 ? 1 : -1))));
  }, []);

  // 스타일러스 호버 취소, 시스템 제스처 등으로 pointerup 없이 스트로크가 끊길 때 안전하게 커밋한다.
  // handlePointerUp과 도구별 분기(예: select는 onStrokeEnd를 호출하지 않음)가 완전히 같아야 하므로 그대로 재사용한다.
  const handlePointerCancel = handlePointerUp;

  return (
    <canvas
      ref={canvasRef}
      className="cursor-crosshair touch-none rounded-lg border border-white/10"
      style={{ imageRendering: "pixelated" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
      onWheel={handleWheel}
    />
  );
}
```

- [ ] **Step 2: lint 확인**

Run: `npm run lint`

- [ ] **Step 3: 타입 확인**

Run: `npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 4: commit**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx
git commit -m "feat: 픽셀 캔버스에 도형 도구(직선/사각형/원) 추가"
```

---

## Task 6: 선택 도구 — 마퀴/마법봉/이동/복사-붙여넣기

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/useSelection.ts`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx`

**Interfaces:**
- Consumes: `pixelGrid.ts`(`wandMask`,`getPixel`,`setPixel`)
- Produces: `useSelection()` → `{ mask: Set<number> | null, setMask, clipboard, copy(pixels, width): void, paste(pixels, width, height, atX, atY, activeColorIndex): number[] }`. `PixelCanvas`에 `selectTool` 관련 props 추가: `selectionMask`, `onSelectionChange(mask: Set<number> | null): void`

- [ ] **Step 1: `useSelection.ts` 작성**

```typescript
import { useCallback, useState } from "react";
import { getPixel, idx, setPixel } from "./pixelGrid";

type Clip = { w: number; h: number; cells: { dx: number; dy: number; colorIndex: number }[] };

export function useSelection() {
  const [mask, setMask] = useState<Set<number> | null>(null);
  const [clipboard, setClipboard] = useState<Clip | null>(null);

  const copy = useCallback(
    (pixels: number[], width: number) => {
      if (!mask || mask.size === 0) return;
      const xs: number[] = [];
      const ys: number[] = [];
      mask.forEach((i) => {
        xs.push(i % width);
        ys.push(Math.floor(i / width));
      });
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const cells = Array.from(mask).map((i) => {
        const x = i % width;
        const y = Math.floor(i / width);
        return { dx: x - minX, dy: y - minY, colorIndex: pixels[i] };
      });
      const w = Math.max(...xs) - minX + 1;
      const h = Math.max(...ys) - minY + 1;
      setClipboard({ w, h, cells });
    },
    [mask],
  );

  const paste = useCallback(
    (pixels: number[], width: number, height: number, atX: number, atY: number): number[] => {
      if (!clipboard) return pixels;
      let next = pixels;
      for (const cell of clipboard.cells) {
        const x = atX + cell.dx;
        const y = atY + cell.dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        next = setPixel(next, width, x, y, cell.colorIndex);
      }
      return next;
    },
    [clipboard],
  );

  return { mask, setMask, clipboard, copy, paste };
}

// 선택 마스크를 (dx, dy)만큼 이동: 원래 자리는 비우고(-1) 새 자리로 색을 옮긴다.
export function moveSelection(
  pixels: number[],
  width: number,
  height: number,
  mask: Set<number>,
  dx: number,
  dy: number,
): { pixels: number[]; mask: Set<number> } {
  const moved: { x: number; y: number; colorIndex: number }[] = [];
  let next = pixels.slice();
  mask.forEach((i) => {
    const x = i % width;
    const y = Math.floor(i / width);
    moved.push({ x: x + dx, y: y + dy, colorIndex: getPixel(pixels, width, x, y) });
    next[i] = -1;
  });
  const nextMask = new Set<number>();
  for (const m of moved) {
    if (m.x < 0 || m.y < 0 || m.x >= width || m.y >= height) continue;
    next = setPixel(next, width, m.x, m.y, m.colorIndex);
    nextMask.add(idx(width, m.x, m.y));
  }
  return { pixels: next, mask: nextMask };
}
```

- [ ] **Step 2: `PixelCanvas.tsx` 전체 교체**

Task 5의 파일에 `selectionMask`/`onSelectionChange` props와 `wand`/`select`/`move` 분기를 더한 최종본으로 전체 교체한다:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  circleOutlinePoints,
  floodFill,
  getPixel,
  linePoints,
  mirrorPoints,
  rectOutlinePoints,
  setPixel,
  wandMask,
} from "./pixelGrid";
import { MirrorMode, Tool } from "./types";
import { moveSelection } from "./useSelection";

const CELL_SIZE = 16;

export default function PixelCanvas({
  width,
  height,
  palette,
  pixels,
  tool,
  mirror,
  activeColorIndex,
  selectionMask,
  onSelectionChange,
  onStrokeEnd,
  onPickColor,
}: {
  width: number;
  height: number;
  palette: string[];
  pixels: number[];
  tool: Tool;
  mirror: MirrorMode;
  activeColorIndex: number;
  selectionMask: Set<number> | null;
  onSelectionChange: (mask: Set<number> | null) => void;
  onStrokeEnd: (next: number[]) => void;
  onPickColor: (colorIndex: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const workingRef = useRef<number[]>(pixels);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    workingRef.current = pixels;
  }, [pixels]);

  const render = useCallback(
    (data: number[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = CELL_SIZE * zoom;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const colorIndex = getPixel(data, width, x, y);
          if (colorIndex < 0) continue;
          ctx.fillStyle = palette[colorIndex] ?? "#ff00ff";
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, height * scale);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(width * scale, y * scale);
        ctx.stroke();
      }
    },
    [width, height, palette, zoom],
  );

  useEffect(() => {
    render(pixels);
  }, [pixels, render]);

  const toGridPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * height);
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      return { x, y };
    },
    [width, height],
  );

  const plotPoint = useCallback(
    (data: number[], x: number, y: number, colorIndex: number) => {
      let next = data;
      for (const p of mirrorPoints(width, height, mirror, x, y)) {
        next = setPixel(next, width, p.x, p.y, colorIndex);
      }
      return next;
    },
    [width, height, mirror],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const point = toGridPoint(e);
      if (!point) return;
      canvasRef.current?.setPointerCapture(e.pointerId);

      if (tool === "eyedropper") {
        const colorIndex = getPixel(workingRef.current, width, point.x, point.y);
        if (colorIndex >= 0) onPickColor(colorIndex);
        return;
      }

      if (tool === "bucket") {
        const next = floodFill(workingRef.current, width, height, point.x, point.y, activeColorIndex);
        if (next !== workingRef.current) {
          workingRef.current = next;
          render(next);
          onStrokeEnd(next);
        }
        return;
      }

      if (tool === "wand") {
        onSelectionChange(wandMask(workingRef.current, width, height, point.x, point.y));
        return;
      }

      if (tool === "select") {
        shapeStartRef.current = point;
        drawingRef.current = true;
        return;
      }

      if (tool === "move" && selectionMask) {
        lastPointRef.current = point;
        drawingRef.current = true;
        return;
      }

      if (tool === "line" || tool === "rect" || tool === "circle") {
        drawingRef.current = true;
        shapeStartRef.current = point;
        return;
      }

      if (tool === "pencil" || tool === "eraser") {
        drawingRef.current = true;
        lastPointRef.current = point;
        const colorIndex = tool === "eraser" ? -1 : activeColorIndex;
        const next = plotPoint(workingRef.current, point.x, point.y, colorIndex);
        workingRef.current = next;
        render(next);
      }
    },
    [tool, width, height, activeColorIndex, selectionMask, toGridPoint, plotPoint, render, onStrokeEnd, onPickColor, onSelectionChange],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;

      if (tool === "select" && shapeStartRef.current) {
        const point = toGridPoint(e);
        if (!point) return;
        const start = shapeStartRef.current;
        const minX = Math.min(start.x, point.x);
        const maxX = Math.max(start.x, point.x);
        const minY = Math.min(start.y, point.y);
        const maxY = Math.max(start.y, point.y);
        const next = new Set<number>();
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) next.add(y * width + x);
        }
        onSelectionChange(next);
        return;
      }

      if (tool === "move" && selectionMask && lastPointRef.current) {
        const point = toGridPoint(e);
        if (!point) return;
        const dx = point.x - lastPointRef.current.x;
        const dy = point.y - lastPointRef.current.y;
        if (dx === 0 && dy === 0) return;
        const result = moveSelection(workingRef.current, width, height, selectionMask, dx, dy);
        workingRef.current = result.pixels;
        onSelectionChange(result.mask);
        lastPointRef.current = point;
        render(result.pixels);
        return;
      }

      if (tool === "line" || tool === "rect" || tool === "circle") {
        const point = toGridPoint(e);
        if (!point || !shapeStartRef.current) return;
        const start = shapeStartRef.current;
        let shapePoints: { x: number; y: number }[];
        if (tool === "line") {
          shapePoints = linePoints(start.x, start.y, point.x, point.y);
        } else if (tool === "rect") {
          shapePoints = rectOutlinePoints(start.x, start.y, point.x, point.y);
        } else {
          const radius = Math.round(Math.hypot(point.x - start.x, point.y - start.y));
          shapePoints = circleOutlinePoints(start.x, start.y, radius);
        }
        let next = pixels;
        for (const p of shapePoints) {
          if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) continue;
          next = plotPoint(next, p.x, p.y, activeColorIndex);
        }
        workingRef.current = next;
        render(next);
        return;
      }

      if (tool !== "pencil" && tool !== "eraser") return;
      const point = toGridPoint(e);
      if (!point || !lastPointRef.current) return;
      const colorIndex = tool === "eraser" ? -1 : activeColorIndex;
      let next = workingRef.current;
      for (const p of linePoints(lastPointRef.current.x, lastPointRef.current.y, point.x, point.y)) {
        next = plotPoint(next, p.x, p.y, colorIndex);
      }
      lastPointRef.current = point;
      workingRef.current = next;
      render(next);
    },
    [tool, width, height, activeColorIndex, pixels, selectionMask, toGridPoint, plotPoint, render, onSelectionChange],
  );

  // 맨 앞에서 drawingRef를 한 번만 검사·소비하도록 통일한다 — pointerup 처리 후 브라우저가
  // 뒤이어 보내는 lostpointercapture(그리고 handlePointerCancel의 재사용)가 같은 제스처를
  // 두 번 커밋하지 않도록 이 함수 자체를 멱등하게 만든다.
  const handlePointerUp = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    if (tool === "select") {
      shapeStartRef.current = null;
      return;
    }
    if (tool === "line" || tool === "rect" || tool === "circle") {
      shapeStartRef.current = null;
      onStrokeEnd(workingRef.current);
      return;
    }
    lastPointRef.current = null;
    onStrokeEnd(workingRef.current);
  }, [tool, onStrokeEnd]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((z) => Math.min(8, Math.max(1, z + (e.deltaY < 0 ? 1 : -1))));
  }, []);

  // 스타일러스 호버 취소, 시스템 제스처 등으로 pointerup 없이 스트로크가 끊길 때 안전하게 커밋한다.
  // handlePointerUp과 도구별 분기가 완전히 같아야 하고, 위쪽의 drawingRef 가드 덕분에 pointerup
  // 이후 뒤늦게 발생하는 lostpointercapture에 대해서도 안전하게(중복 커밋 없이) 재사용할 수 있다.
  const handlePointerCancel = handlePointerUp;

  return (
    <canvas
      ref={canvasRef}
      className="cursor-crosshair touch-none rounded-lg border border-white/10"
      style={{ imageRendering: "pixelated" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
      onWheel={handleWheel}
    />
  );
}
```

- [ ] **Step 3: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 4: commit**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/useSelection.ts app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx
git commit -m "feat: 선택 도구(마퀴/마법봉/이동/복사-붙여넣기) 추가"
```

---

## Task 7: 팔레트 패널

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PalettePanel.tsx`

**Interfaces:**
- Consumes: `types.ts`(`MAX_PALETTE_COLORS`)
- Produces: `<PalettePanel>` props `{ palette: string[], activeColorIndex: number, onSelect(index: number): void, onAddColor(hex: string): void, onRemoveColor(index: number): void }`

- [ ] **Step 1: `PalettePanel.tsx` 작성**

```tsx
"use client";

import { useState } from "react";
import { MAX_PALETTE_COLORS } from "./types";

export default function PalettePanel({
  palette,
  activeColorIndex,
  onSelect,
  onAddColor,
  onRemoveColor,
}: {
  palette: string[];
  activeColorIndex: number;
  onSelect: (index: number) => void;
  onAddColor: (hex: string) => void;
  onRemoveColor: (index: number) => void;
}) {
  const [hex, setHex] = useState("#ffffff");
  const isFull = palette.length >= MAX_PALETTE_COLORS;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-semibold text-gray-400">
        팔레트 ({palette.length}/{MAX_PALETTE_COLORS})
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {palette.map((color, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            onDoubleClick={() => onRemoveColor(index)}
            title={`${color} — 더블클릭으로 제거`}
            className={`h-6 w-6 rounded border-2 ${
              index === activeColorIndex ? "border-white" : "border-white/20"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          className="h-7 w-9 rounded border border-white/10 bg-transparent"
        />
        <button
          disabled={isFull}
          onClick={() => onAddColor(hex)}
          className="flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white disabled:opacity-40"
        >
          {isFull ? "팔레트가 가득 찼습니다" : "색상 추가"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: lint 확인**

Run: `npm run lint`

- [ ] **Step 3: commit**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/PalettePanel.tsx
git commit -m "feat: 팔레트 패널 추가"
```

---

## Task 8: 툴바 + 단축키

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Toolbar.tsx`
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/useKeyboardShortcuts.ts`

**Interfaces:**
- Consumes: `types.ts`(`Tool`,`MirrorMode`)
- Produces: `<Toolbar>` props `{ tool, onToolChange, mirror, onMirrorChange, canUndo, canRedo, onUndo, onRedo }` / `useKeyboardShortcuts({ onToolChange, onUndo, onRedo, onCopy, onPaste, onMirrorToggle })`

- [ ] **Step 1: `Toolbar.tsx` 작성**

```tsx
"use client";

import { Circle, Copy, Eraser, Minus, MousePointer2, Move, Paintbrush, PaintBucket, Pipette, Redo2, Square, Undo2, Wand2 } from "lucide-react";
import { MirrorMode, Tool } from "./types";

const TOOLS: { tool: Tool; icon: typeof Paintbrush; label: string; key: string }[] = [
  { tool: "pencil", icon: Paintbrush, label: "펜슬", key: "B" },
  { tool: "eraser", icon: Eraser, label: "지우개", key: "E" },
  { tool: "bucket", icon: PaintBucket, label: "채우기", key: "G" },
  { tool: "eyedropper", icon: Pipette, label: "스포이트", key: "I" },
  { tool: "line", icon: Minus, label: "직선", key: "U" },
  { tool: "rect", icon: Square, label: "사각형", key: "U" },
  { tool: "circle", icon: Circle, label: "원", key: "U" },
  { tool: "select", icon: MousePointer2, label: "선택", key: "M" },
  { tool: "move", icon: Move, label: "이동", key: "V" },
  { tool: "wand", icon: Wand2, label: "자동 선택", key: "W" },
];

export default function Toolbar({
  tool,
  onToolChange,
  mirror,
  onMirrorChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  mirror: MirrorMode;
  onMirrorChange: (mode: MirrorMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="grid grid-cols-5 gap-1.5">
        {TOOLS.map(({ tool: t, icon: Icon, label, key }) => (
          <button
            key={t}
            onClick={() => onToolChange(t)}
            title={`${label} (${key})`}
            className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
              tool === t ? "bg-white text-gray-950" : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onUndo} disabled={!canUndo} className="flex h-7 w-7 items-center justify-center rounded bg-white/5 text-gray-300 disabled:opacity-30">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className="flex h-7 w-7 items-center justify-center rounded bg-white/5 text-gray-300 disabled:opacity-30">
          <Redo2 className="h-4 w-4" />
        </button>
        <div className="ml-auto flex gap-1 text-[10px] text-gray-400">
          {(["none", "horizontal", "vertical", "both"] as MirrorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onMirrorChange(m)}
              className={`rounded px-1.5 py-1 ${mirror === m ? "bg-white text-gray-950" : "bg-white/5"}`}
            >
              {m === "none" ? "미러 없음" : m === "horizontal" ? "좌우" : m === "vertical" ? "상하" : "좌우상하"}
            </button>
          ))}
        </div>
      </div>
      <p className="flex items-center gap-1 text-[10px] text-gray-500">
        <Copy className="h-3 w-3" /> Ctrl+C/V 복사·붙여넣기 · Ctrl+Z/Y 실행취소·다시실행
      </p>
    </div>
  );
}
```

- [ ] **Step 2: `useKeyboardShortcuts.ts` 작성**

```typescript
import { useEffect } from "react";
import { MirrorMode, Tool } from "./types";

const TOOL_KEYS: Record<string, Tool> = {
  b: "pencil",
  e: "eraser",
  g: "bucket",
  i: "eyedropper",
  u: "line",
  m: "select",
  v: "move",
  w: "wand",
};

export function useKeyboardShortcuts({
  onToolChange,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onMirrorToggle,
}: {
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onMirrorToggle: (mode: MirrorMode) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        onRedo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        onCopy();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        onPaste();
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "h") {
        onMirrorToggle("horizontal");
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "v") {
        onMirrorToggle("vertical");
        return;
      }
      const tool = TOOL_KEYS[e.key.toLowerCase()];
      if (tool) onToolChange(tool);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToolChange, onUndo, onRedo, onCopy, onPaste, onMirrorToggle]);
}
```

- [ ] **Step 3: lint 확인**

Run: `npm run lint`

- [ ] **Step 4: commit**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Toolbar.tsx app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/useKeyboardShortcuts.ts
git commit -m "feat: 툴바 + 단축키 추가"
```

---

## Task 9: 새 캔버스 다이얼로그 + Editor 화면 조립

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/NewCanvasDialog.tsx`
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: `assetLibrary.ts`(`PixelArt`,`getPixelArt`,`savePixelArt`,`uid`), `types.ts`(`CANVAS_PRESETS`,`Tool`,`MirrorMode`), `PixelCanvas.tsx`, `Toolbar.tsx`, `PalettePanel.tsx`, `useCanvasHistory.ts`, `useSelection.ts`, `useKeyboardShortcuts.ts`
- Produces: `<Editor>` props `{ docId: string | null, onDirtyChange(dirty: boolean): void, onExit(): void }` — `docId=null`이면 새 캔버스(크기 선택 다이얼로그부터 시작), 문자열이면 기존 문서 로드

- [ ] **Step 1: `NewCanvasDialog.tsx` 작성**

```tsx
"use client";

import { CANVAS_PRESETS } from "./types";

export default function NewCanvasDialog({
  onSelect,
  onCancel,
}: {
  onSelect: (width: number, height: number) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-72 rounded-xl border border-white/10 bg-gray-950 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">새 픽셀아트</h2>
        <div className="flex flex-col gap-2">
          {CANVAS_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onSelect(preset.width, preset.height)}
              className="rounded-lg bg-white/5 px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="mt-3 w-full rounded-lg py-2 text-xs text-gray-500 hover:text-white">
          취소
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `Editor.tsx` 작성**

```tsx
"use client";

import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPixelArt, PixelArt, savePixelArt, uid } from "../_shared/assetLibrary";
import NewCanvasDialog from "./NewCanvasDialog";
import PalettePanel from "./PalettePanel";
import PixelCanvas from "./PixelCanvas";
import Toolbar from "./Toolbar";
import { useCanvasHistory } from "./useCanvasHistory";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useSelection } from "./useSelection";
import { createGrid, getPixel } from "./pixelGrid";
import { MirrorMode, Tool } from "./types";

function blankDoc(width: number, height: number): PixelArt {
  return {
    id: uid(),
    name: "제목 없음",
    width,
    height,
    palette: ["#ffffff", "#000000"],
    pixels: createGrid(width, height),
    createdAt: Date.now(),
  };
}

export default function Editor({
  docId,
  onDirtyChange,
  onExit,
}: {
  docId: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onExit: () => void;
}) {
  const [doc, setDoc] = useState<PixelArt | null>(() => (docId ? getPixelArt(docId) ?? null : null));
  const [needsSize, setNeedsSize] = useState(docId === null && !doc);
  const [tool, setTool] = useState<Tool>("pencil");
  const [mirror, setMirror] = useState<MirrorMode>("none");
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [name, setName] = useState(doc?.name ?? "제목 없음");

  const history = useCanvasHistory(doc?.pixels ?? []);
  const selection = useSelection();
  // 픽셀 편집이 아닌 변경(이름 변경, 팔레트 추가/제거)도 "저장 안 한 변경사항"으로 잡기 위한 별도 플래그.
  // history.canUndo만으로는 이 두 경우를 놓친다.
  const [hasMetaEdits, setHasMetaEdits] = useState(false);

  useEffect(() => {
    onDirtyChange(history.canUndo || hasMetaEdits);
  }, [history.canUndo, hasMetaEdits, onDirtyChange]);

  const handleCreate = useCallback(
    (width: number, height: number) => {
      const fresh = blankDoc(width, height);
      setDoc(fresh);
      setName(fresh.name);
      history.reset(fresh.pixels);
      setNeedsSize(false);
      setHasMetaEdits(false);
    },
    [history],
  );

  const handleStrokeEnd = useCallback(
    (next: number[]) => {
      history.push(next);
    },
    [history],
  );

  const handleSave = useCallback(() => {
    if (!doc) return;
    const toSave: PixelArt = { ...doc, name, pixels: history.present };
    savePixelArt(toSave);
    setDoc(toSave);
    history.reset(toSave.pixels);
    setHasMetaEdits(false);
  }, [doc, name, history]);

  useKeyboardShortcuts({
    onToolChange: setTool,
    onUndo: history.undo,
    onRedo: history.redo,
    onCopy: () => doc && selection.copy(history.present, doc.width),
    onPaste: () => {
      if (!doc) return;
      const next = selection.paste(history.present, doc.width, doc.height, 0, 0);
      history.push(next);
    },
    onMirrorToggle: setMirror,
  });

  const palette = useMemo(() => doc?.palette ?? [], [doc]);

  const handleAddColor = useCallback((hex: string) => {
    setDoc((d) => (d ? { ...d, palette: [...d.palette, hex] } : d));
    setHasMetaEdits(true);
  }, []);

  const handleRemoveColor = useCallback((index: number) => {
    setDoc((d) => (d ? { ...d, palette: d.palette.filter((_, i) => i !== index) } : d));
    setHasMetaEdits(true);
  }, []);

  const handlePickColor = useCallback((colorIndex: number) => {
    setActiveColorIndex(colorIndex);
  }, []);

  if (needsSize || !doc) {
    return (
      <NewCanvasDialog
        onSelect={handleCreate}
        onCancel={onExit}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-950 text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <button onClick={onExit} className="rounded-full p-2 text-gray-500 hover:bg-white/8 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setHasMetaEdits(true);
          }}
          className="flex-1 bg-transparent text-sm font-semibold text-white outline-none"
        />
        <button onClick={handleSave} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-950">
          <Save className="h-3.5 w-3.5" /> 저장
        </button>
      </div>
      <div className="flex flex-1 gap-4 overflow-auto p-4">
        <div className="flex flex-col gap-3">
          <Toolbar
            tool={tool}
            onToolChange={setTool}
            mirror={mirror}
            onMirrorChange={setMirror}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={history.undo}
            onRedo={history.redo}
          />
          <PalettePanel
            palette={palette}
            activeColorIndex={activeColorIndex}
            onSelect={setActiveColorIndex}
            onAddColor={handleAddColor}
            onRemoveColor={handleRemoveColor}
          />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <PixelCanvas
            width={doc.width}
            height={doc.height}
            palette={palette}
            pixels={history.present}
            tool={tool}
            mirror={mirror}
            activeColorIndex={activeColorIndex}
            selectionMask={selection.mask}
            onSelectionChange={selection.setMask}
            onStrokeEnd={handleStrokeEnd}
            onPickColor={handlePickColor}
          />
        </div>
      </div>
    </div>
  );
}

// getPixel은 다른 태스크(Import 미리보기)에서 재사용하기 위해 re-export
export { getPixel };
```

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음 — `PixelCanvas` props 불일치가 있으면 Task 6에서 추가한 `selectionMask`/`onSelectionChange` 시그니처와 맞춰 수정한다.

- [ ] **Step 3: commit**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/NewCanvasDialog.tsx app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: 새 캔버스 다이얼로그 + 편집기 화면 조립"
```

---

## Task 10: 이미지 → 픽셀아트 변환(import)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/pixelate.ts`
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ImportPanel.tsx`

**Interfaces:**
- Consumes: 없음(브라우저 Canvas API만 사용)
- Produces: `pixelateImage(image: HTMLImageElement, targetWidth: number, targetHeight: number, antiAlias: boolean): { width, height, palette: string[], pixels: number[] }`, `quantizeColors(palette: string[], pixels: number[], maxColors: number): { palette: string[], pixels: number[] }`, `mergeColors(palette: string[], pixels: number[], indexA: number, indexB: number): { palette: string[], pixels: number[] }`, `<ImportPanel>` props `{ onConfirm(doc: { width, height, palette: string[], pixels: number[] }): void }`

- [ ] **Step 1: `pixelate.ts` 작성**

```typescript
function hex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function pixelateImage(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  antiAlias: boolean,
): { width: number; height: number; palette: string[]; pixels: number[] } {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = antiAlias;
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  const { data } = ctx.getImageData(0, 0, targetWidth, targetHeight);

  const palette: string[] = [];
  const paletteIndex = new Map<string, number>();
  const pixels: number[] = new Array(targetWidth * targetHeight);

  for (let i = 0; i < targetWidth * targetHeight; i++) {
    const o = i * 4;
    const a = data[o + 3];
    if (a < 128) {
      pixels[i] = -1;
      continue;
    }
    const colorHex = hex(data[o], data[o + 1], data[o + 2]);
    let idx = paletteIndex.get(colorHex);
    if (idx === undefined) {
      idx = palette.length;
      palette.push(colorHex);
      paletteIndex.set(colorHex, idx);
    }
    pixels[i] = idx;
  }

  return { width: targetWidth, height: targetHeight, palette, pixels };
}

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// 팔레트가 maxColors를 넘으면, 가장 가까운 색 쌍부터 순서대로 병합해 개수를 줄인다.
// curPalette.length > 1 가드: maxColors가 0 이하로 들어와도 무한루프에 빠지지 않는다(더 합칠 색이 없으면 멈춘다).
export function quantizeColors(
  palette: string[],
  pixels: number[],
  maxColors: number,
): { palette: string[]; pixels: number[] } {
  let curPalette = palette.slice();
  let curPixels = pixels.slice();

  while (curPalette.length > maxColors && curPalette.length > 1) {
    let bestPair: [number, number] = [0, 1];
    let bestDist = Infinity;
    for (let i = 0; i < curPalette.length; i++) {
      for (let j = i + 1; j < curPalette.length; j++) {
        const d = colorDistance(curPalette[i], curPalette[j]);
        if (d < bestDist) {
          bestDist = d;
          bestPair = [i, j];
        }
      }
    }
    const merged = mergeColors(curPalette, curPixels, bestPair[0], bestPair[1]);
    curPalette = merged.palette;
    curPixels = merged.pixels;
  }

  return { palette: curPalette, pixels: curPixels };
}

// indexB를 indexA로 합치고, 팔레트에서 indexB를 제거하며 뒤 인덱스를 당긴다.
// indexA가 indexB보다 뒤에 있으면(indexA > indexB) indexB 제거로 인해 indexA 자신의 위치도 하나 당겨지므로,
// "합쳐진 색이 가리켜야 할 최종 인덱스"(targetIndex)를 별도로 계산해 그 값으로 통일한다.
export function mergeColors(
  palette: string[],
  pixels: number[],
  indexA: number,
  indexB: number,
): { palette: string[]; pixels: number[] } {
  const targetIndex = indexA > indexB ? indexA - 1 : indexA;
  const nextPixels = pixels.map((p) => {
    if (p === indexB) return targetIndex;
    return p > indexB ? p - 1 : p;
  });
  const nextPalette = palette.filter((_, i) => i !== indexB);
  return { palette: nextPalette, pixels: nextPixels };
}
```

- [ ] **Step 2: `ImportPanel.tsx` 작성**

```tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { mergeColors, pixelateImage, quantizeColors } from "./pixelate";

type Preview = { width: number; height: number; palette: string[]; pixels: number[] };

export default function ImportPanel({
  onConfirm,
}: {
  onConfirm: (doc: Preview) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pixelSize, setPixelSize] = useState(32);
  const [antiAlias, setAntiAlias] = useState(false);
  const [maxColors, setMaxColors] = useState(8);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const runPixelate = useCallback(
    (img: HTMLImageElement, size: number, aa: boolean, colors: number) => {
      const raw = pixelateImage(img, size, size, aa);
      const quantized = quantizeColors(raw.palette, raw.pixels, colors);
      setPreview({ width: raw.width, height: raw.height, palette: quantized.palette, pixels: quantized.pixels });
    },
    [],
  );

  const handleFile = useCallback(
    (file: File) => {
      const img = new Image();
      img.onload = () => {
        setImageEl(img);
        runPixelate(img, pixelSize, antiAlias, maxColors);
      };
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      img.src = url;
    },
    [pixelSize, antiAlias, maxColors, runPixelate],
  );

  const handleOptionChange = useCallback(
    (size: number, aa: boolean, colors: number) => {
      setPixelSize(size);
      setAntiAlias(aa);
      setMaxColors(colors);
      if (imageEl) runPixelate(imageEl, size, aa, colors);
    },
    [imageEl, runPixelate],
  );

  const handleMergeClick = useCallback(
    (indexA: number, indexB: number) => {
      if (!preview) return;
      const merged = mergeColors(preview.palette, preview.pixels, indexA, indexB);
      setPreview({ ...preview, palette: merged.palette, pixels: merged.pixels });
    },
    [preview],
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-semibold text-gray-400">이미지를 픽셀아트로 변환</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="text-xs text-gray-300"
      />

      {preview && (
        <>
          <label className="flex items-center justify-between text-xs text-gray-300">
            픽셀 크기
            <input
              type="range"
              min={8}
              max={128}
              value={pixelSize}
              onChange={(e) => handleOptionChange(Number(e.target.value), antiAlias, maxColors)}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-gray-300">
            안티에일리어싱
            <input
              type="checkbox"
              checked={antiAlias}
              onChange={(e) => handleOptionChange(pixelSize, e.target.checked, maxColors)}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-gray-300">
            대표 색상 개수
            <input
              type="range"
              min={2}
              max={16}
              value={maxColors}
              onChange={(e) => handleOptionChange(pixelSize, antiAlias, Number(e.target.value))}
            />
          </label>

          <div className="flex flex-wrap gap-1">
            {preview.palette.map((color, i) => (
              <button
                key={i}
                title="더블클릭하면 다음 색상과 병합됩니다"
                onDoubleClick={() => preview.palette.length > 1 && handleMergeClick(i, (i + 1) % preview.palette.length)}
                className="h-5 w-5 rounded border border-white/20"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <button
            onClick={() => onConfirm(preview)}
            className="rounded-lg bg-white py-2 text-xs font-semibold text-gray-950"
          >
            가져오기
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: lint 확인**

Run: `npm run lint`

- [ ] **Step 4: commit**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/pixelate.ts app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/ImportPanel.tsx
git commit -m "feat: 이미지 픽셀화 import 기능 추가"
```

---

## Task 11: Editor에 Import 패널 연결

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: `ImportPanel.tsx`

- [ ] **Step 1: `Editor.tsx`의 팔레트 패널 아래에 `ImportPanel` 추가**

import 문에 추가:

```tsx
import ImportPanel from "./ImportPanel";
```

`<PalettePanel .../>` 다음 줄에 추가:

```tsx
          <ImportPanel
            onConfirm={(imported) => {
              setDoc((d) =>
                d
                  ? { ...d, width: imported.width, height: imported.height, palette: imported.palette }
                  : d,
              );
              history.reset(imported.pixels);
              // history.reset은 canUndo를 false로 되돌리므로, import로 들어온 미저장 상태를
              // 놓치지 않도록 hasMetaEdits를 직접 true로 세운다(폭/높이/팔레트가 바뀐 실질적 편집).
              setHasMetaEdits(true);
            }}
          />
```

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx"
git commit -m "feat: 편집기에 이미지 import 패널 연결"
```

---

## Task 12: 내보내기(PNG/SVG/JSON/JPG)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/exportPixelArt.ts`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: `assetLibrary.ts`(`PixelArt`)
- Produces: `exportAsPNG(doc, scale?)`, `exportAsJPG(doc, scale?)`, `exportAsSVG(doc)`, `exportAsJSON(doc)` — 전부 `(doc: PixelArt) => void`이며 즉시 파일 다운로드를 트리거

- [ ] **Step 1: `exportPixelArt.ts` 작성**

```typescript
import { PixelArt } from "../_shared/assetLibrary";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function renderToCanvas(doc: PixelArt, scale: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = doc.width * scale;
  canvas.height = doc.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      const colorIndex = doc.pixels[y * doc.width + x];
      if (colorIndex < 0) continue;
      ctx.fillStyle = doc.palette[colorIndex] ?? "#ff00ff";
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

export function exportAsPNG(doc: PixelArt, scale = 8): void {
  renderToCanvas(doc, scale).toBlob((blob) => {
    if (blob) triggerDownload(blob, `${doc.name}.png`);
  }, "image/png");
}

export function exportAsJPG(doc: PixelArt, scale = 8): void {
  const canvas = renderToCanvas(doc, scale);
  // JPG는 알파를 지원하지 않으므로 검은 배경을 먼저 채운다
  const ctx = canvas.getContext("2d")!;
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, `${doc.name}.jpg`);
  }, "image/jpeg", 0.92);
}

export function exportAsSVG(doc: PixelArt): void {
  const rects: string[] = [];
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      const colorIndex = doc.pixels[y * doc.width + x];
      if (colorIndex < 0) continue;
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${doc.palette[colorIndex]}"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${doc.width} ${doc.height}" shape-rendering="crispEdges">${rects.join("")}</svg>`;
  triggerDownload(new Blob([svg], { type: "image/svg+xml" }), `${doc.name}.svg`);
}

export function exportAsJSON(doc: PixelArt): void {
  triggerDownload(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }), `${doc.name}.json`);
}
```

- [ ] **Step 2: `Editor.tsx` 헤더에 내보내기 버튼 추가**

import 문에 추가:

```tsx
import { exportAsJPG, exportAsJSON, exportAsPNG, exportAsSVG } from "./exportPixelArt";
```

저장 버튼 옆(`<button onClick={handleSave} ...>` 다음)에 내보내기 드롭다운을 추가한다:

```tsx
        <div className="flex gap-1">
          <button onClick={() => doc && exportAsPNG({ ...doc, pixels: history.present })} className="rounded-lg bg-white/10 px-2 py-1.5 text-[10px] text-white">PNG</button>
          <button onClick={() => doc && exportAsSVG({ ...doc, pixels: history.present })} className="rounded-lg bg-white/10 px-2 py-1.5 text-[10px] text-white">SVG</button>
          <button onClick={() => doc && exportAsJSON({ ...doc, pixels: history.present })} className="rounded-lg bg-white/10 px-2 py-1.5 text-[10px] text-white">JSON</button>
          <button
            onClick={() => doc && exportAsJPG({ ...doc, pixels: history.present })}
            title="JPG는 손실 압축이라 팔레트 색상 경계가 흐려질 수 있습니다"
            className="rounded-lg bg-white/10 px-2 py-1.5 text-[10px] text-white"
          >
            JPG
          </button>
        </div>
```

- [ ] **Step 3: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`

- [ ] **Step 4: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/exportPixelArt.ts" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx"
git commit -m "feat: PNG/SVG/JSON/JPG 내보내기 추가"
```

---

## Task 13: 데스크탑 레이아웃 저장소 + 데스크탑 화면

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/useDesktopLayout.ts`
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/DesktopIcon.tsx`
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ContextMenu.tsx`
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ConfirmDialog.tsx`
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Desktop.tsx`

**Interfaces:**
- Consumes: `assetLibrary.ts`(`listPixelArt`,`deletePixelArt`,`renamePixelArt`,`duplicatePixelArt`,`PixelArt`), `exportPixelArt.ts`
- Produces: `<Desktop>` props `{ onOpen(id: string): void, onCreate(): void }`

- [ ] **Step 1: `useDesktopLayout.ts` 작성**

```typescript
const LAYOUT_KEY = "pixel-art-desktop-layout";
const GRID_STEP = 96;

type Position = { x: number; y: number };

function loadLayout(): Record<string, Position> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLayout(layout: Record<string, Position>) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {}
}

export function getIconPosition(id: string, fallbackIndex: number): Position {
  const layout = loadLayout();
  if (layout[id]) return layout[id];
  const perRow = 6;
  const col = fallbackIndex % perRow;
  const row = Math.floor(fallbackIndex / perRow);
  return { x: col * GRID_STEP + 16, y: row * GRID_STEP + 16 };
}

export function setIconPosition(id: string, x: number, y: number): void {
  const layout = loadLayout();
  const snappedX = Math.round(x / GRID_STEP) * GRID_STEP;
  const snappedY = Math.round(y / GRID_STEP) * GRID_STEP;
  layout[id] = { x: snappedX, y: snappedY };
  saveLayout(layout);
}

export function removeIconPositions(ids: string[]): void {
  const layout = loadLayout();
  for (const id of ids) delete layout[id];
  saveLayout(layout);
}
```

- [ ] **Step 2: `ContextMenu.tsx` 작성**

```tsx
"use client";

import { useEffect, useRef } from "react";

export type ContextMenuItem = { label: string; onClick: () => void };

export default function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ left: x, top: y }}
      className="fixed z-50 w-40 overflow-hidden rounded-lg border border-white/10 bg-gray-900 py-1 shadow-xl"
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className="block w-full px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-white/10"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `ConfirmDialog.tsx` 작성**

```tsx
"use client";

export default function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-72 rounded-xl border border-white/10 bg-gray-950 p-4">
        <p className="mb-4 text-sm text-white">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white">
            취소
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white">
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `DesktopIcon.tsx` 작성**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { PixelArt } from "../_shared/assetLibrary";

export default function DesktopIcon({
  art,
  x,
  y,
  selected,
  onPointerDownIcon,
  onDoubleClick,
  onContextMenu,
}: {
  art: PixelArt;
  x: number;
  y: number;
  selected: boolean;
  onPointerDownIcon: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 48;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const scale = size / Math.max(art.width, art.height);
    for (let py = 0; py < art.height; py++) {
      for (let px = 0; px < art.width; px++) {
        const colorIndex = art.pixels[py * art.width + px];
        if (colorIndex < 0) continue;
        ctx.fillStyle = art.palette[colorIndex] ?? "#ff00ff";
        ctx.fillRect(px * scale, py * scale, scale, scale);
      }
    }
  }, [art]);

  return (
    <div
      style={{ left: x, top: y, position: "absolute" }}
      className={`flex w-20 flex-col items-center gap-1 rounded-lg p-2 ${selected ? "bg-white/15" : "hover:bg-white/5"}`}
      onPointerDown={onPointerDownIcon}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <canvas ref={canvasRef} className="rounded border border-white/10" style={{ imageRendering: "pixelated" }} />
      <span className="w-full truncate text-center text-[10px] text-gray-300">{art.name}</span>
    </div>
  );
}
```

- [ ] **Step 5: `Desktop.tsx` 작성**

```tsx
"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deletePixelArt,
  duplicatePixelArt,
  listPixelArt,
  PixelArt,
  renamePixelArt,
} from "../_shared/assetLibrary";
import ConfirmDialog from "./ConfirmDialog";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";
import DesktopIcon from "./DesktopIcon";
import { exportAsJPG, exportAsJSON, exportAsPNG, exportAsSVG } from "./exportPixelArt";
import { getIconPosition, removeIconPositions, setIconPosition } from "./useDesktopLayout";

type Menu = { x: number; y: number; items: ContextMenuItem[] } | null;

export default function Desktop({
  onOpen,
  onCreate,
}: {
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const [items, setItems] = useState<PixelArt[]>([]);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<Menu>(null);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    const list = listPixelArt();
    setItems(list);
    const pos: Record<string, { x: number; y: number }> = {};
    list.forEach((art, i) => {
      pos[art.id] = getIconPosition(art.id, i);
    });
    setPositions(pos);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startBoxSelect = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // 아이콘은 컨테이너(position: relative) 기준 절대좌표(top/left)로 배치되므로,
    // 박스 선택 좌표도 뷰포트 기준(clientX/Y)이 아니라 컨테이너 기준으로 변환해야
    // 페이지 안에 여백/스크롤이 있어도 실제 아이콘 위치와 정확히 맞아떨어진다.
    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = rect?.left ?? 0;
    const offsetY = rect?.top ?? 0;
    const x0 = e.clientX - offsetX;
    const y0 = e.clientY - offsetY;
    setBox({ x0, y0, x1: x0, y1: y0 });
    setSelected(new Set());

    const move = (ev: PointerEvent) =>
      setBox({ x0, y0, x1: ev.clientX - offsetX, y1: ev.clientY - offsetY });
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const curX = ev.clientX - offsetX;
      const curY = ev.clientY - offsetY;
      const minX = Math.min(x0, curX);
      const maxX = Math.max(x0, curX);
      const minY = Math.min(y0, curY);
      const maxY = Math.max(y0, curY);
      const next = new Set<string>();
      for (const art of items) {
        const p = positions[art.id];
        if (!p) continue;
        if (p.x + 80 >= minX && p.x <= maxX && p.y + 80 >= minY && p.y <= maxY) next.add(art.id);
      }
      setSelected(next);
      setBox(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [items, positions]);

  const startIconDrag = useCallback(
    (art: PixelArt, e: React.PointerEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const group = selected.has(art.id) ? Array.from(selected) : [art.id];
      if (!selected.has(art.id)) setSelected(new Set([art.id]));

      const startX = e.clientX;
      const startY = e.clientY;
      const startPositions = group.map((id) => ({ id, ...positions[id] }));

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        setPositions((prev) => {
          const next = { ...prev };
          for (const sp of startPositions) next[sp.id] = { x: sp.x + dx, y: sp.y + dy };
          return next;
        });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setPositions((prev) => {
          for (const sp of startPositions) {
            const p = prev[sp.id];
            if (p) setIconPosition(sp.id, p.x, p.y);
          }
          return prev;
        });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [selected, positions],
  );

  const handleTrashDrop = useCallback(() => {
    if (selected.size === 0) return;
    setPendingDelete(Array.from(selected));
  }, [selected]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    deletePixelArt(pendingDelete);
    removeIconPositions(pendingDelete);
    setSelected(new Set());
    setPendingDelete(null);
    refresh();
  }, [pendingDelete, refresh]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-gray-950"
      onPointerDown={startBoxSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({
          x: e.clientX,
          y: e.clientY,
          items: [{ label: "새로 만들기", onClick: onCreate }],
        });
      }}
    >
      {items.map((art) => {
        const p = positions[art.id];
        if (!p) return null;
        return (
          <DesktopIcon
            key={art.id}
            art={art}
            x={p.x}
            y={p.y}
            selected={selected.has(art.id)}
            onPointerDownIcon={(e) => startIconDrag(art, e)}
            onDoubleClick={() => onOpen(art.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenu({
                x: e.clientX,
                y: e.clientY,
                items: [
                  {
                    label: "이름 바꾸기",
                    onClick: () => {
                      const next = window.prompt("새 이름", art.name);
                      if (next) {
                        renamePixelArt(art.id, next);
                        refresh();
                      }
                    },
                  },
                  { label: "PNG로 내보내기", onClick: () => exportAsPNG(art) },
                  { label: "SVG로 내보내기", onClick: () => exportAsSVG(art) },
                  { label: "JSON으로 내보내기", onClick: () => exportAsJSON(art) },
                  { label: "JPG로 내보내기 (손실 압축)", onClick: () => exportAsJPG(art) },
                  {
                    label: "복제",
                    onClick: () => {
                      duplicatePixelArt(art.id);
                      refresh();
                    },
                  },
                ],
              });
            }}
          />
        );
      })}

      {box && (
        <div
          className="pointer-events-none absolute border border-white/40 bg-white/10"
          style={{
            left: Math.min(box.x0, box.x1),
            top: Math.min(box.y0, box.y1),
            width: Math.abs(box.x1 - box.x0),
            height: Math.abs(box.y1 - box.y0),
          }}
        />
      )}

      <div
        onPointerUp={handleTrashDrop}
        className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400"
        title="선택한 아이콘을 여기로 드래그해 삭제"
      >
        <Trash2 className="h-5 w-5" />
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {pendingDelete && (
        <ConfirmDialog
          message={`${pendingDelete.length}개 항목을 삭제하시겠습니까?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 7: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/useDesktopLayout.ts" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/DesktopIcon.tsx" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ContextMenu.tsx" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ConfirmDialog.tsx" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Desktop.tsx"
git commit -m "feat: 데스크탑 홈 화면(아이콘, 다중선택, 우클릭 메뉴, 휴지통) 추가"
```

---

## Task 14: 최상위 셸 + 라우트 + Works 등록 + 통합 검증

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelArtMaker.tsx`
- Create: `app/(services)/pixel-art-maker/page.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/data.tsx`

**Interfaces:**
- Consumes: `Desktop.tsx`, `Editor.tsx`, `../_shared/useUnsavedChangesWarning.ts`(Task는 이미 존재 — 이전 세션에서 구현됨)

- [ ] **Step 1: `PixelArtMaker.tsx` 작성**

```tsx
"use client";

import { useCallback, useState } from "react";
import { useUnsavedChangesWarning } from "../_shared/useUnsavedChangesWarning";
import Desktop from "./Desktop";
import Editor from "./Editor";

type Screen = { view: "desktop" } | { view: "editor"; docId: string | null };

export default function PixelArtMaker() {
  const [screen, setScreen] = useState<Screen>({ view: "desktop" });
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesWarning(isDirty);

  const openEditor = useCallback((docId: string | null) => {
    setIsDirty(false);
    setScreen({ view: "editor", docId });
  }, []);

  const closeEditor = useCallback(() => {
    setIsDirty(false);
    setScreen({ view: "desktop" });
  }, []);

  if (screen.view === "editor") {
    return <Editor docId={screen.docId} onDirtyChange={setIsDirty} onExit={closeEditor} />;
  }

  return <Desktop onOpen={(id) => openEditor(id)} onCreate={() => openEditor(null)} />;
}
```

- [ ] **Step 2: `app/(services)/pixel-art-maker/page.tsx` 작성**

```tsx
import PixelArtMaker from "@/app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelArtMaker";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "픽셀아트 메이커",
  description: "바탕화면처럼 저장된 픽셀아트를 관리하고 편집하는 도구입니다.",
  icons: {
    icon: "/playground/pixel-art-maker.svg",
  },

  openGraph: {
    title: `픽셀아트 메이커`,
    description: "바탕화면처럼 저장된 픽셀아트를 관리하고 편집하는 도구입니다.",
    images: [
      {
        url: "/playground/pixel-art-maker.png",
        alt: "픽셀아트 메이커",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `픽셀아트 메이커`,
    description: "바탕화면처럼 저장된 픽셀아트를 관리하고 편집하는 도구입니다.",
    images: ["/playground/pixel-art-maker.png"],
  },
};

export default function PixelArtMakerPage() {
  return (
    <main className="flex h-dvh justify-center overflow-hidden">
      <div className="h-full w-full max-w-4xl">
        <PixelArtMaker />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: `Works/data.tsx`에 Work #5 항목 추가**

`data.tsx` 상단 import 목록에 추가:

```tsx
import PixelArtMaker from "./5_PixelArtMaker/PixelArtMaker";
```

`works` 배열의 마지막 항목(`id: 4`, 올해의 영수증 만들기) 뒤에 콤마를 확인하고 아래 항목을 추가한다:

```tsx
  {
    id: 5,
    title: "픽셀아트 메이커",
    description: `게임적 장치 없이, 단축키·이미지 import·내보내기가 잘 된 실사용 가능한 픽셀아트 편집기입니다. 저장한 작품이 PC 바탕화면처럼 아이콘으로 쌓입니다.

  🖥️ 바탕화면 UI: 저장된 작품이 아이콘으로 표시되고, 더블클릭하면 편집창이 열립니다. 빈 곳을 우클릭하면 새 작업을 시작할 수 있습니다.

  🖌️ 편집 도구: 펜슬·지우개·채우기·스포이트, 직선·사각형·원 도형 툴, 좌우/상하 대칭 드로잉, 선택·이동·복사-붙여넣기, 색상/알파 기준 자동 선택을 지원합니다. 단축키로 대부분의 작업이 가능합니다.

  📷 이미지 import: 사진을 업로드하면 픽셀 크기와 안티에일리어싱을 조절하며 미리보기로 확인한 뒤 가져올 수 있습니다. 추출된 색상은 대표색 개수로 자동/수동 병합해 팔레트를 정리합니다.

  💾 내보내기: PNG·SVG·JSON·JPG로 내보낼 수 있고, 저장한 작품은 비주얼 노벨 메이커 등 다른 Work에서 그대로 재사용됩니다.`,
    period: "2026.07.10 - ",
    platforms: [{ type: "pc", specialized: true }, { type: "mobile" }],
    content: <PixelArtMaker />,
    thumbnail: "/playground/pixel-art-maker.png",
    path: "/pixel-art-maker",
  },
```

- [ ] **Step 4: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 5: 브라우저 수동 검증**

Run: `npm run dev`

1. `http://localhost:3000/pixel-art-maker` 접속 — 빈 데스크탑이 보이는지 확인
2. 배경 우클릭 → "새로 만들기" → 크기 프리셋 선택 → 편집기 진입 확인
3. 펜슬로 몇 픽셀 그리고, 지우개·버켓·스포이트·도형 도구를 각각 시도
4. `Ctrl+Z`/`Ctrl+Shift+Z`로 실행취소·다시실행 동작 확인
5. 팔레트에 색상 추가 후 16개 채우면 "팔레트가 가득 찼습니다" 문구로 바뀌는지 확인
6. 이미지 하나를 import해 픽셀 크기·안티에일리어싱·대표색 개수를 조절하며 미리보기가 갱신되는지 확인 후 "가져오기"
7. "저장" → 뒤로가기 → 데스크탑에 아이콘이 나타나는지 확인
8. 아이콘 더블클릭으로 재편집, 우클릭으로 이름 바꾸기·내보내기(4종 파일이 실제로 다운로드되는지)·복제 확인
9. 아이콘 여러 개를 박스 드래그로 다중 선택 후 함께 드래그해 위치가 유지되는지, 새로고침 후에도 위치가 유지되는지 확인
10. 선택된 아이콘을 휴지통으로 드래그 → 확인 모달이 뜨는지, 취소/삭제 각각 정상 동작하는지 확인
11. 편집 중(저장 전) 탭을 새로고침 시도 → 브라우저 기본 확인창이 뜨는지 확인 (Task 14 이전 세션에서 만든 `useUnsavedChangesWarning` 재사용 확인)
12. `/playground` 아카이브 페이지에서 Work #5 카드가 정상 노출되는지 확인

- [ ] **Step 6: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelArtMaker.tsx" "app/(services)/pixel-art-maker/page.tsx" "app/(portfolio)/playground/_sections/Works/data.tsx"
git commit -m "feat: 픽셀아트 메이커 라우트 및 Works 등록"
```

---

## 남은 작업 (이 플랜 범위 밖)

- `public/playground/pixel-art-maker.png` / `.svg` 썸네일 실제 캡처 — 다른 Work들처럼 완성 후 스크린샷을 찍어 교체 필요(현재 `data.tsx`가 참조하는 경로에 파일이 없으면 깨진 이미지로 보임)
- 비트 음악 메이커, 비주얼 노벨 메이커 v2는 각각 별도 브레인스토밍·플랜 필요(`docs/superpowers/specs/2026-07-10-vn-asset-ecosystem-design.md`의 빌드 순서 참고)
