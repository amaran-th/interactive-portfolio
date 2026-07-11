# 픽셀아트 메이커 라이트모드 + 레트로 데스크탑 재디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 픽셀아트 메이커(Work #5)를 다크 테마에서 라이트 테마로 전환하고, 테두리·라운딩 없는 각진 모던 크롬 + 도트 폰트(Mona) + 도트로 그린 휴지통 + 원형 HSV 색상환 팔레트로 재디자인한다. 기능 로직(그리기 도구, 선택, 저장/내보내기, 데스크탑 드래그 등)은 전혀 변경하지 않는다 — 시각 레이어만 교체한다.

**Architecture:** 각 컴포넌트의 Tailwind 클래스를 다크(`bg-gray-950`/`border-white/10` 계열)에서 라이트(`bg-white`/`shadow-*` 계열, 바이올렛 포인트)로 치환한다. 새로 추가되는 두 컴포넌트(`ColorWheel.tsx`, `TrashIcon.tsx`)는 이 프로젝트가 이미 쓰는 "순수 함수 + `<canvas>` 렌더링" 패턴을 그대로 따른다. 폰트는 `next/font/local`로 이 Work 트리 안에서만 지역적으로 적용해 사이트 전역 폰트에 영향을 주지 않는다.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, `next/font/local`. 테스트 스위트 없음 — 각 태스크는 `npm run lint` + `npx tsc --noEmit -p .` + 수동 브라우저 검증으로 마무리한다.

## Global Constraints

- 적용 범위: 픽셀아트 메이커(`5_PixelArtMaker/` 전체 + `app/(services)/pixel-art-maker/page.tsx`)만 — 다른 Work·사이트 전역 다크 테마 컨벤션에는 영향 없음
- 배경 `#ffffff`, 포인트 컬러 바이올렛(`violet-500`/`violet-600`), 테두리(`border-*`)·라운딩(`rounded-*`) 클래스 전면 금지 — 분리는 `shadow-*`(필요 시 inset 화살표 값 포함)로만
- 폰트: `public/fonts/Mona12.ttf`(400)/`Mona12-Bold.ttf`(700)를 `next/font/local`로 로드, `5_PixelArtMaker/fonts.ts`에 정의
- 휴지통은 `lucide-react` 아이콘이 아니라 도트로 그린 `<canvas>` 컴포넌트(평상시/드래그오버 2상태)
- 색상환은 원형 HSV 휴/채도 휠 + 명도 슬라이더, 팔레트 색상 개수 제한(`MAX_PALETTE_COLORS = 16`, `types.ts`에 이미 정의됨) 그대로 유지
- 기존 기능 로직(드로잉 도구, undo/redo, 선택·이동, 저장/내보내기, 데스크탑 드래그·다중선택·컨텍스트 메뉴·휴지통 삭제 흐름)은 절대 변경하지 않는다 — 이미 구현·리뷰 완료된 상태
- 페이지 레이아웃: 다른 서비스 페이지처럼 `max-w-*` 제한을 두지 않고 뷰포트 전체를 채운다(PC 특화)

---

## File Map

| 파일 | 변화 |
| --- | --- |
| `5_PixelArtMaker/hsv.ts` | **신규** — hex↔RGB↔HSV 변환 순수 함수 |
| `5_PixelArtMaker/fonts.ts` | **신규** — Mona 폰트를 `next/font/local`로 로드 |
| `5_PixelArtMaker/ColorWheel.tsx` | **신규** — 원형 색상환 + 명도 슬라이더 + 팔레트 스와치 |
| `5_PixelArtMaker/TrashIcon.tsx` | **신규** — 도트로 그린 휴지통(평상시/드래그오버) |
| `5_PixelArtMaker/PixelCanvas.tsx` | 수정 — 캔버스 내부 gridline/선택 오버레이 색상 + 바깥 className 라이트 테마로 |
| `5_PixelArtMaker/Toolbar.tsx` | 수정 — 라이트 테마 클래스 |
| `5_PixelArtMaker/NewCanvasDialog.tsx` | 수정 — 라이트 테마 클래스 |
| `5_PixelArtMaker/ImportPanel.tsx` | 수정 — 라이트 테마 클래스 |
| `5_PixelArtMaker/Editor.tsx` | 수정 — 라이트 테마 헤더, `PalettePanel` → `ColorWheel`로 교체 |
| `5_PixelArtMaker/PalettePanel.tsx` | **삭제** — `ColorWheel.tsx`로 대체 |
| `5_PixelArtMaker/Desktop.tsx` | 수정 — 라이트 테마, `TrashIcon` 연결(호버 상태 추적) |
| `5_PixelArtMaker/DesktopIcon.tsx` | 수정 — 라이트 테마 클래스 |
| `5_PixelArtMaker/ContextMenu.tsx` | 수정 — 라이트 테마 클래스 |
| `5_PixelArtMaker/ConfirmDialog.tsx` | 수정 — 라이트 테마 클래스 |
| `5_PixelArtMaker/PixelArtMaker.tsx` | 수정 — Mona 폰트 래퍼 div 추가 |
| `app/(services)/pixel-art-maker/page.tsx` | 수정 — `max-w-4xl` 제거, 전체 화면 레이아웃 |

---

## Task 1: HSV 색상 변환 유틸 + Mona 폰트 로더

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/hsv.ts`
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/fonts.ts`

**Interfaces:**
- Consumes: 없음 (`fonts.ts`는 `public/fonts/Mona12.ttf`, `Mona12-Bold.ttf` 파일 참조 — 이미 리포에 존재)
- Produces: `hsv.ts`에서 `hexToRgb`, `rgbToHex`, `hsvToRgb`, `rgbToHsv` / `fonts.ts`에서 `monaFont`(`next/font/local` 반환값, `.className` 보유)

- [ ] **Step 1: `hsv.ts` 작성**

```typescript
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// h: 0-360, s: 0-1, v: 0-1 -> [r, g, b] 각 0-255
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
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

// r,g,b: 0-255 -> [h(0-360), s(0-1), v(0-1)]
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
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
```

- [ ] **Step 2: `fonts.ts` 작성**

```typescript
import localFont from "next/font/local";

export const monaFont = localFont({
  src: [
    { path: "../../../../../../public/fonts/Mona12.ttf", weight: "400", style: "normal" },
    { path: "../../../../../../public/fonts/Mona12-Bold.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
});
```

- [ ] **Step 3: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음 (`fonts.ts`의 상대 경로가 틀렸다면 `Module not found` 타입 에러로 즉시 드러남 — 그 경우 실제 파일 위치 기준으로 경로를 다시 계산해 수정)

- [ ] **Step 4: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/hsv.ts" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/fonts.ts"
git commit -m "feat: HSV 색상 변환 유틸 + Mona 도트 폰트 로더 추가"
```

---

## Task 2: ColorWheel 컴포넌트

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ColorWheel.tsx`

**Interfaces:**
- Consumes: `hsv.ts`(`hexToRgb`, `rgbToHex`, `hsvToRgb`, `rgbToHsv`), `types.ts`(`MAX_PALETTE_COLORS`)
- Produces: `<ColorWheel palette={string[]} activeColorIndex={number} onSelect={(index: number) => void} onChangeActiveColor={(hex: string) => void} onAddColor={(hex: string) => void} onRemoveColor={(index: number) => void} />`

- [ ] **Step 1: `ColorWheel.tsx` 작성**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from "./hsv";
import { MAX_PALETTE_COLORS } from "./types";

const WHEEL_SIZE = 120;

export default function ColorWheel({
  palette,
  activeColorIndex,
  onSelect,
  onChangeActiveColor,
  onAddColor,
  onRemoveColor,
}: {
  palette: string[];
  activeColorIndex: number;
  onSelect: (index: number) => void;
  onChangeActiveColor: (hex: string) => void;
  onAddColor: (hex: string) => void;
  onRemoveColor: (index: number) => void;
}) {
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const draggingWheelRef = useRef(false);
  const activeHex = palette[activeColorIndex] ?? "#000000";
  const [hsv, setHsv] = useState<[number, number, number]>(() => rgbToHsv(...hexToRgb(activeHex)));

  // 활성 색상이 바뀌면(스와치 클릭, 스포이트 등) 색상환도 그 색의 H/S/V로 동기화한다.
  useEffect(() => {
    setHsv(rgbToHsv(...hexToRgb(activeHex)));
  }, [activeHex]);

  const drawWheel = useCallback((value: number) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = WHEEL_SIZE;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2;
    const imageData = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx + 0.5;
        const dy = y - cy + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const i = (y * size + x) * 4;
        if (dist > radius) continue; // 알파 0(투명) 유지
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const hue = (angle + 360) % 360;
        const sat = Math.min(1, dist / radius);
        const [r, g, b] = hsvToRgb(hue, sat, value);
        imageData.data[i] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  useEffect(() => {
    drawWheel(hsv[2]);
  }, [hsv, drawWheel]);

  const applyWheelPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = wheelRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const radius = rect.width / 2;
      const dist = Math.min(radius, Math.sqrt(dx * dx + dy * dy));
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const hue = (angle + 360) % 360;
      const sat = radius === 0 ? 0 : dist / radius;
      const nextHsv: [number, number, number] = [hue, sat, hsv[2]];
      setHsv(nextHsv);
      onChangeActiveColor(rgbToHex(...hsvToRgb(...nextHsv)));
    },
    [hsv, onChangeActiveColor],
  );

  const handleWheelDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      draggingWheelRef.current = true;
      wheelRef.current?.setPointerCapture(e.pointerId);
      applyWheelPoint(e.clientX, e.clientY);
    },
    [applyWheelPoint],
  );

  const handleWheelMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingWheelRef.current) return;
      applyWheelPoint(e.clientX, e.clientY);
    },
    [applyWheelPoint],
  );

  const handleWheelUp = useCallback(() => {
    draggingWheelRef.current = false;
  }, []);

  const handleValueChange = useCallback(
    (v: number) => {
      const nextHsv: [number, number, number] = [hsv[0], hsv[1], v];
      setHsv(nextHsv);
      onChangeActiveColor(rgbToHex(...hsvToRgb(...nextHsv)));
    },
    [hsv, onChangeActiveColor],
  );

  const markerRadius = (WHEEL_SIZE / 2) * hsv[1];
  const markerX = WHEEL_SIZE / 2 + Math.cos((hsv[0] * Math.PI) / 180) * markerRadius;
  const markerY = WHEEL_SIZE / 2 + Math.sin((hsv[0] * Math.PI) / 180) * markerRadius;

  const isFull = palette.length >= MAX_PALETTE_COLORS;

  return (
    <div className="flex flex-col gap-3 bg-white p-3 shadow-md">
      <div className="relative mx-auto" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
        <canvas
          ref={wheelRef}
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          className="cursor-crosshair touch-none rounded-full"
          onPointerDown={handleWheelDown}
          onPointerMove={handleWheelMove}
          onPointerUp={handleWheelUp}
          onPointerCancel={handleWheelUp}
        />
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_#ffffff,0_1px_3px_rgba(0,0,0,0.35)]"
          style={{ left: markerX, top: markerY, backgroundColor: activeHex }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(hsv[2] * 100)}
        onChange={(e) => handleValueChange(Number(e.target.value) / 100)}
        className="w-full"
      />
      <p className="text-xs font-semibold text-gray-500">
        팔레트 ({palette.length}/{MAX_PALETTE_COLORS})
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {palette.map((color, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            onDoubleClick={() => onRemoveColor(index)}
            title={`${color} — 더블클릭으로 제거`}
            className={`h-6 w-6 ${index === activeColorIndex ? "ring-2 ring-violet-500" : "ring-1 ring-black/10"}`}
            style={{ backgroundColor: color }}
          />
        ))}
        <button
          disabled={isFull}
          onClick={() => onAddColor(rgbToHex(...hsvToRgb(...hsv)))}
          title={isFull ? "팔레트가 가득 찼습니다" : "현재 색상환 값을 새 스와치로 추가"}
          className="flex h-6 w-6 items-center justify-center bg-gray-100 text-xs text-gray-500 shadow-sm disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ColorWheel.tsx"
git commit -m "feat: 원형 HSV 색상환 컴포넌트 추가"
```

---

## Task 3: 도트 휴지통 아이콘

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/TrashIcon.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `<TrashIcon active={boolean} />` — `active=false`면 닫힌 뚜껑, `true`면 열린 뚜껑

- [ ] **Step 1: `TrashIcon.tsx` 작성**

```tsx
"use client";

import { useEffect, useRef } from "react";

const SIZE = 40;
const GRID = 8;

// 8x8 픽셀 그리드. 0=투명, 1=외곽선, 2=몸통 채우기, 3=뚜껑 손잡이
const CLOSED_GRID = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 3, 3, 3, 3, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
];

// 뚜껑이 위로 열려 튀어나온 모양
const OPEN_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
];

const COLORS: Record<number, string> = {
  1: "#27272a",
  2: "#e4e4e7",
  3: "#8b5cf6",
};

export default function TrashIcon({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const grid = active ? OPEN_GRID : CLOSED_GRID;
    const cell = SIZE / GRID;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const v = grid[y][x];
        if (v === 0) continue;
        ctx.fillStyle = COLORS[v];
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }, [active]);

  return <canvas ref={canvasRef} className="shadow-sm" style={{ imageRendering: "pixelated" }} />;
}
```

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/TrashIcon.tsx"
git commit -m "feat: 도트로 그린 휴지통 아이콘(평상시/드래그오버 2상태) 추가"
```

---

## Task 4: PixelCanvas 라이트 테마

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx`

**Interfaces:**
- Consumes: 없음 (기존 파일의 클래스/색상 상수만 교체, 로직 무변경)

- [ ] **Step 1: gridline·선택 오버레이 색상 및 canvas className 교체**

`render` 함수 안의 gridline 색상(다크 배경용 흰색 → 라이트 배경용 어두운 회색)을 교체한다:

```tsx
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
```
→
```tsx
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
```

선택 오버레이 색상(블루 → 바이올렛 포인트로 통일)을 교체한다:

```tsx
      if (mask && mask.size > 0) {
        ctx.fillStyle = "rgba(96, 165, 250, 0.35)";
        ctx.strokeStyle = "rgba(96, 165, 250, 0.9)";
```
→
```tsx
      if (mask && mask.size > 0) {
        ctx.fillStyle = "rgba(139, 92, 246, 0.3)";
        ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
```

캔버스 엘리먼트의 className(테두리 제거, 그림자로)을 교체한다:

```tsx
      className="cursor-crosshair touch-none rounded-lg border border-white/10"
```
→
```tsx
      className="cursor-crosshair touch-none shadow-md"
```

- [ ] **Step 2: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 3: 브라우저 확인**

Run: `npm run dev`, `/pixel-art-maker` 접속 → 새 캔버스를 열어 격자선이 옅은 검정으로, select/wand 선택 시 오버레이가 바이올렛 톤으로 보이는지 확인

- [ ] **Step 4: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx"
git commit -m "feat: PixelCanvas 라이트 테마(격자·선택 오버레이 색상, 테두리 제거)"
```

---

## Task 5: Toolbar / NewCanvasDialog / ImportPanel 라이트 테마

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Toolbar.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/NewCanvasDialog.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ImportPanel.tsx`

**Interfaces:**
- Consumes: 없음 (클래스만 교체, 로직 무변경, props/시그니처 동일)

- [ ] **Step 1: `Toolbar.tsx` 전체 교체**

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
    <div className="flex flex-col gap-3 bg-white p-3 shadow-md">
      <div className="grid grid-cols-5 gap-1.5">
        {TOOLS.map(({ tool: t, icon: Icon, label, key }) => (
          <button
            key={t}
            onClick={() => onToolChange(t)}
            title={`${label} (${key})`}
            className={`flex h-8 w-8 items-center justify-center transition-colors ${
              tool === t ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onUndo} disabled={!canUndo} className="flex h-7 w-7 items-center justify-center bg-gray-100 text-gray-600 disabled:opacity-30">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className="flex h-7 w-7 items-center justify-center bg-gray-100 text-gray-600 disabled:opacity-30">
          <Redo2 className="h-4 w-4" />
        </button>
        <div className="ml-auto flex gap-1 text-[10px] text-gray-500">
          {(["none", "horizontal", "vertical", "both"] as MirrorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onMirrorChange(m)}
              className={`px-1.5 py-1 ${mirror === m ? "bg-violet-500 text-white" : "bg-gray-100"}`}
            >
              {m === "none" ? "미러 없음" : m === "horizontal" ? "좌우" : m === "vertical" ? "상하" : "좌우상하"}
            </button>
          ))}
        </div>
      </div>
      <p className="flex items-center gap-1 text-[10px] text-gray-400">
        <Copy className="h-3 w-3" /> Ctrl+C/V 복사·붙여넣기 · Ctrl+Z/Y 실행취소·다시실행
      </p>
    </div>
  );
}
```

- [ ] **Step 2: `NewCanvasDialog.tsx` 전체 교체**

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-72 bg-white p-4 shadow-xl">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">새 픽셀아트</h2>
        <div className="flex flex-col gap-2">
          {CANVAS_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onSelect(preset.width, preset.height)}
              className="bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 hover:bg-violet-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="mt-3 w-full py-2 text-xs text-gray-400 hover:text-gray-900">
          취소
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `ImportPanel.tsx` 전체 교체**

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
    <div className="flex flex-col gap-3 bg-white p-3 shadow-md">
      <p className="text-xs font-semibold text-gray-500">이미지를 픽셀아트로 변환</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="text-xs text-gray-600"
      />

      {preview && (
        <>
          <label className="flex items-center justify-between text-xs text-gray-600">
            픽셀 크기
            <input
              type="range"
              min={8}
              max={128}
              value={pixelSize}
              onChange={(e) => handleOptionChange(Number(e.target.value), antiAlias, maxColors)}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-gray-600">
            안티에일리어싱
            <input
              type="checkbox"
              checked={antiAlias}
              onChange={(e) => handleOptionChange(pixelSize, e.target.checked, maxColors)}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-gray-600">
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
                className="h-5 w-5 ring-1 ring-black/10"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <button
            onClick={() => onConfirm(preview)}
            className="bg-violet-500 py-2 text-xs font-semibold text-white hover:bg-violet-600"
          >
            가져오기
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 5: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Toolbar.tsx" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/NewCanvasDialog.tsx" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ImportPanel.tsx"
git commit -m "feat: Toolbar/NewCanvasDialog/ImportPanel 라이트 테마 적용"
```

---

## Task 6: Editor에 ColorWheel 연결 + 라이트 테마, PalettePanel 삭제

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`
- Delete: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PalettePanel.tsx`

**Interfaces:**
- Consumes: `ColorWheel.tsx`(Task 2에서 생성)
- Produces: `Editor`에 새 핸들러 `handleChangeActiveColor(hex: string): void` 추가(색상환 조작 시 활성 팔레트 색상을 직접 갱신)

- [ ] **Step 1: `Editor.tsx` 전체 교체**

```tsx
"use client";

import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPixelArt, PixelArt, savePixelArt, uid } from "../_shared/assetLibrary";
import ColorWheel from "./ColorWheel";
import ImportPanel from "./ImportPanel";
import NewCanvasDialog from "./NewCanvasDialog";
import PixelCanvas from "./PixelCanvas";
import Toolbar from "./Toolbar";
import { useCanvasHistory } from "./useCanvasHistory";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useSelection } from "./useSelection";
import { createGrid, getPixel } from "./pixelGrid";
import { exportAsJPG, exportAsJSON, exportAsPNG, exportAsSVG } from "./exportPixelArt";
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
  const [hasMetaEdits, setHasMetaEdits] = useState(false);

  const history = useCanvasHistory(doc?.pixels ?? []);
  const selection = useSelection();

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

  const handleAddColor = useCallback(
    (hex: string) => {
      const newIndex = palette.length;
      setDoc((d) => (d ? { ...d, palette: [...d.palette, hex] } : d));
      setActiveColorIndex(newIndex);
      setHasMetaEdits(true);
    },
    [palette],
  );

  const handleRemoveColor = useCallback((index: number) => {
    setDoc((d) => (d ? { ...d, palette: d.palette.filter((_, i) => i !== index) } : d));
    setHasMetaEdits(true);
  }, []);

  // 색상환을 조작하면 현재 활성 팔레트 스와치 자체의 값을 실시간으로 갱신한다
  // (새 색을 "추가"하는 게 아니라 지금 선택된 색을 "수정"하는 것이 기본 동작).
  const handleChangeActiveColor = useCallback(
    (hex: string) => {
      setDoc((d) => {
        if (!d) return d;
        const nextPalette = d.palette.slice();
        nextPalette[activeColorIndex] = hex;
        return { ...d, palette: nextPalette };
      });
      setHasMetaEdits(true);
    },
    [activeColorIndex],
  );

  const handlePickColor = useCallback((colorIndex: number) => {
    setActiveColorIndex(colorIndex);
  }, []);

  if (needsSize || !doc) {
    return <NewCanvasDialog onSelect={handleCreate} onCancel={onExit} />;
  }

  return (
    <div className="flex h-full flex-col bg-white text-gray-900">
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-3">
        <button onClick={onExit} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setHasMetaEdits(true);
          }}
          className="flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none"
        />
        <button onClick={handleSave} className="flex items-center gap-1.5 bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-600">
          <Save className="h-3.5 w-3.5" /> 저장
        </button>
        <div className="flex gap-1">
          <button onClick={() => doc && exportAsPNG({ ...doc, pixels: history.present })} className="bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200">
            PNG
          </button>
          <button onClick={() => doc && exportAsSVG({ ...doc, pixels: history.present })} className="bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200">
            SVG
          </button>
          <button onClick={() => doc && exportAsJSON({ ...doc, pixels: history.present })} className="bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200">
            JSON
          </button>
          <button
            onClick={() => doc && exportAsJPG({ ...doc, pixels: history.present })}
            title="JPG는 손실 압축이라 팔레트 색상 경계가 흐려질 수 있습니다"
            className="bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200"
          >
            JPG
          </button>
        </div>
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
          <ColorWheel
            palette={palette}
            activeColorIndex={activeColorIndex}
            onSelect={setActiveColorIndex}
            onChangeActiveColor={handleChangeActiveColor}
            onAddColor={handleAddColor}
            onRemoveColor={handleRemoveColor}
          />
          <ImportPanel
            onConfirm={(imported) => {
              setDoc((d) =>
                d
                  ? { ...d, width: imported.width, height: imported.height, palette: imported.palette }
                  : d,
              );
              history.reset(imported.pixels);
              setHasMetaEdits(true);
            }}
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

- [ ] **Step 2: `PalettePanel.tsx` 삭제**

```bash
rm "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PalettePanel.tsx"
```

- [ ] **Step 3: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음 (다른 파일이 `PalettePanel`을 더 이상 import하지 않는지 확인 — `Editor.tsx`가 유일한 사용처였으므로 삭제해도 깨지지 않아야 함)

- [ ] **Step 4: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx"
git rm "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PalettePanel.tsx"
git commit -m "feat: Editor에 ColorWheel 연결, 라이트 테마 적용, PalettePanel 제거"
```

---

## Task 7: Desktop / DesktopIcon / ContextMenu / ConfirmDialog 라이트 테마 + 휴지통 연결

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Desktop.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/DesktopIcon.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ContextMenu.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ConfirmDialog.tsx`

**Interfaces:**
- Consumes: `TrashIcon.tsx`(Task 3에서 생성)

- [ ] **Step 1: `DesktopIcon.tsx` 전체 교체**

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
      className={`flex w-20 flex-col items-center gap-1 p-2 ${selected ? "bg-violet-100" : "hover:bg-gray-100"}`}
      onPointerDown={onPointerDownIcon}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <canvas ref={canvasRef} className="shadow-sm" style={{ imageRendering: "pixelated" }} />
      <span className="w-full truncate text-center text-[10px] text-gray-600">{art.name}</span>
    </div>
  );
}
```

- [ ] **Step 2: `ContextMenu.tsx` 전체 교체**

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
    <div ref={ref} style={{ left: x, top: y }} className="fixed z-50 w-40 overflow-hidden bg-white py-1 shadow-xl">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-violet-50"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `ConfirmDialog.tsx` 전체 교체**

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-72 bg-white p-4 shadow-xl">
        <p className="mb-4 text-sm text-gray-900">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-900">
            취소
          </button>
          <button onClick={onConfirm} className="bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `Desktop.tsx` 전체 교체**

```tsx
"use client";

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
import TrashIcon from "./TrashIcon";
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
  const [trashHover, setTrashHover] = useState(false);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const startBoxSelect = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const rect = containerRef.current?.getBoundingClientRect();
      const offsetX = rect?.left ?? 0;
      const offsetY = rect?.top ?? 0;
      const x0 = e.clientX - offsetX;
      const y0 = e.clientY - offsetY;
      setBox({ x0, y0, x1: x0, y1: y0 });
      setSelected(new Set());

      const move = (ev: PointerEvent) => setBox({ x0, y0, x1: ev.clientX - offsetX, y1: ev.clientY - offsetY });
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
    },
    [items, positions],
  );

  const startIconDrag = useCallback(
    (art: PixelArt, e: React.PointerEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(art.id)) next.delete(art.id);
          else next.add(art.id);
          return next;
        });
        return;
      }

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
    setTrashHover(false);
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
      className="relative h-full w-full overflow-hidden bg-white"
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
          className="pointer-events-none absolute bg-violet-500/10 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.6)]"
          style={{
            left: Math.min(box.x0, box.x1),
            top: Math.min(box.y0, box.y1),
            width: Math.abs(box.x1 - box.x0),
            height: Math.abs(box.y1 - box.y0),
          }}
        />
      )}

      <div
        onPointerEnter={() => setTrashHover(true)}
        onPointerLeave={() => setTrashHover(false)}
        onPointerUp={handleTrashDrop}
        className="absolute bottom-4 right-4"
        title="선택한 아이콘을 여기로 드래그해 삭제"
      >
        <TrashIcon active={trashHover} />
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

- [ ] **Step 5: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 6: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Desktop.tsx" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/DesktopIcon.tsx" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ContextMenu.tsx" "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ConfirmDialog.tsx"
git commit -m "feat: Desktop 라이트 테마 + 도트 휴지통 연결(호버 상태 추적)"
```

---

## Task 8: Mona 폰트 적용 + 페이지 전체화면 레이아웃 + 통합 검증

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelArtMaker.tsx`
- Modify: `app/(services)/pixel-art-maker/page.tsx`

**Interfaces:**
- Consumes: `fonts.ts`(Task 1에서 생성)

- [ ] **Step 1: `PixelArtMaker.tsx` 전체 교체**

```tsx
"use client";

import { useCallback, useState } from "react";
import { useUnsavedChangesWarning } from "../_shared/useUnsavedChangesWarning";
import Desktop from "./Desktop";
import Editor from "./Editor";
import { monaFont } from "./fonts";

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

  return (
    <div className={`${monaFont.className} h-full w-full`}>
      {screen.view === "editor" ? (
        <Editor docId={screen.docId} onDirtyChange={setIsDirty} onExit={closeEditor} />
      ) : (
        <Desktop onOpen={(id) => openEditor(id)} onCreate={() => openEditor(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: `app/(services)/pixel-art-maker/page.tsx`의 레이아웃을 전체화면으로 교체**

기존 `max-w-4xl`로 폭을 제한하던 wrapper `<div>`를 제거하고 `<PixelArtMaker />`가 뷰포트 전체를 차지하도록 한다. 파일 전체를 다음으로 교체한다:

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
    <main className="h-dvh w-full overflow-hidden">
      <PixelArtMaker />
    </main>
  );
}
```

- [ ] **Step 3: lint + 타입 확인**

Run: `npm run lint && npx tsc --noEmit -p .`
Expected: 오류 없음

- [ ] **Step 4: 브라우저 통합 검증**

Run: `npm run dev`

1. `/pixel-art-maker` 접속 — 다른 서비스 페이지와 달리 여백 없이 화면 전체를 차지하는지, 배경이 흰색인지, Mona 폰트가 라벨/메뉴 텍스트에 적용됐는지 확인
2. 배경 우클릭 → "새로 만들기" → 크기 프리셋 선택 → 편집기 진입. 테두리·라운딩 없이 그림자로만 카드가 구분되는지 확인
3. 색상환을 드래그해 색이 바뀌는지, 명도 슬라이더를 움직이면 휠 전체 밝기가 바뀌는지 확인. 스와치를 클릭하면 색상환이 그 색으로 동기화되는지 확인. "+"로 새 스와치 추가 시 활성 색상이 그 스와치로 바뀌는지 확인
4. 펜슬로 그리기 → select 도구로 영역 선택 → 선택 영역에 바이올렛 오버레이가 보이는지 확인 → move 도구로 빠르게 드래그해 이동 → 시작~도착 사이에 자취가 남지 않는지 확인(이번 세션에서 수정한 버그)
5. 데스크탑에서 아이콘 여러 개를 Ctrl/Cmd+클릭으로 개별 다중선택 → 함께 드래그되는지 확인
6. 선택된 아이콘을 휴지통으로 드래그 → 휴지통 아이콘이 호버 시 뚜껑 열린 모양으로 바뀌는지, 확인 모달이 뜨는지 확인
7. 저장 후 데스크탑에 아이콘이 라이트 테마로 올바르게 보이는지 확인
8. 콘솔 에러가 없는지 확인

- [ ] **Step 5: commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelArtMaker.tsx" "app/(services)/pixel-art-maker/page.tsx"
git commit -m "feat: Mona 폰트 적용 + 페이지 전체화면 레이아웃(PC 특화)"
```

## 남은 작업 (이 플랜 범위 밖)

- `public/playground/pixel-art-maker.png`/`.svg` 썸네일 실제 캡처(재디자인 완료 후 진행)
- 비트 음악 메이커는 별도 브레인스토밍·플랜 필요
