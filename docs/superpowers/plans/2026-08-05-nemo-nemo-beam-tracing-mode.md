# 네모네모빔 트레이싱 모드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 레퍼런스 모드를 창 모드(기존 `ReferenceWindow`)와 트레이싱 모드(신규)로 분리한다. 트레이싱 모드는 캔버스 배경에 참고 이미지를 은은하게 깔아두고, 투명도·크기·위치·회전을 조절해가며 따라 그릴 수 있게 한다.

**Architecture:** 새 데이터 모델 `TracingImage`(캔버스 네이티브 좌표계, 세션 메모리 전용)를 추가한다. `PixelCanvas.tsx`가 이 배열을 픽셀 데이터보다 먼저(항상 맨 뒤에) 그리고, 조정 중인 이미지 하나에만 이동·크기·회전 오버레이 손잡이를 띄운다. wide 레이아웃은 이미지마다 `TracingControlWindow`(레퍼런스 창과 같은 미니 창 시각 언어)를, narrow 레이아웃은 이미 있는 "아이콘 → 플로팅 리스트 팝업" 패턴에 끼워 넣는 `TracingListPanel`(LayerPanel 스타일)을 쓴다. 두 레이아웃 모두 `Editor.tsx`가 들고 있는 같은 `tracingImages` 배열을 공유한다. 레퍼런스 창의 파일/드래그드롭/클립보드 붙여넣기 로직은 `useImageFileLoader` 훅으로 뽑아 재사용한다.

**Tech Stack:** Next.js 16(App Router) + React 19 + TypeScript. 새 의존성 없음.

## Global Constraints

- 이 프로젝트에는 자동화된 테스트 스위트가 없다. 각 태스크는 `npx tsc --noEmit -p tsconfig.json`(타입 검사)과 `npm run lint`(ESLint) 통과, UI가 바뀌는 태스크는 `npm run dev` 브라우저 수동 확인으로 검증한다.
- 설명 문구(버튼 title, placeholder 등)는 프로젝트의 한국어 문체 규칙(번역투 금지, 조사로 직결, 반복 회피)을 따른다.
- 이 Work(`5_PixelArtMaker`)의 밝은 OS 창 스타일(`bg-white`, `shadow-md`/`shadow-2xl`, `text-gray-500/700`, 활성 강조 `violet-500`/`bg-violet-50 text-violet-700`, 아이콘 버튼 `h-5 w-5`~`h-8 w-8`)을 그대로 따른다.
- 트레이싱 이미지·창 위치·조정 상태는 전부 세션 메모리 전용이다 — 저장(JSON 내보내기/자동저장/`assetLibrary.ts`)에 절대 포함하지 않는다. 저장 포맷 변경 없음.
- narrow(`Editor.tsx`의 `narrow` 상태, `NARROW_BREAKPOINT = 820`)에서는 창 모드(레퍼런스 창) 버튼을 아예 숨기고 트레이싱 모드만 제공한다.
- 트레이싱 이미지는 실제 픽셀 데이터가 아니다 — `exportPixelArt.ts`(PNG/SVG/JPG/JSON 내보내기)는 이 플랜에서 전혀 손대지 않는다.
- 커밋 메시지는 한글로 쓰고, `Co-Authored-By` 트레일러를 붙이지 않는다.
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/`가 기본 작업 디렉터리다. 아래 모든 상대 경로는 이 디렉터리 기준이다.
- **`Editor.tsx`는 이 플랜을 쓰는 동안에도 다른 세션(프레임 모드 구현)이 동시에 커밋하고 있었다** — Task 8·9·10의 "(현재 N번째 줄)"은 계획 작성 시점의 힌트일 뿐이며, 실행 시점에는 더 밀려 있을 수 있다. 실제 위치는 줄 번호가 아니라 각 스텝에 그대로 옮겨 적은 코드 스니펫(교체 전/삽입 지점 앞뒤 코드)의 **텍스트 내용**으로 찾는다 — 편집 전에 반드시 그 스니펫을 파일에서 검색해 지금도 그대로 있는지 먼저 확인한다. `PixelCanvas.tsx`/`useKeyboardShortcuts.ts`/`ReferenceWindow.tsx`/`types.ts`는 다른 세션이 손대지 않는 파일이라 줄 번호가 비교적 안정적이다.

---

### Task 1: 데이터 모델 — `types.ts`

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/types.ts`

**Interfaces:**
- Produces: `TracingImage` 타입, `DEFAULT_TRACING_OPACITY`, `MIN_TRACING_SIZE` 상수.

- [ ] **Step 1: 타입·상수 추가**

`export const ONION_SKIN_OPACITY = 0.25;` 줄(현재 86번째 줄) 다음, `export type Point = { x: number; y: number };` 앞에 추가:

```ts

// 트레이싱 모드에서 캔버스 배경에 깔아두는 참고 이미지. 캔버스 네이티브
// 픽셀 좌표계(그리드 단위)에 위치·크기·회전각을 가지므로, 캔버스를 확대·
// 스크롤하면 PixelCanvas의 기존 scale 변환을 그대로 타고 함께 움직인다.
// 세션 메모리에만 존재한다 — 저장(JSON/자동저장)에 포함되지 않는다.
export type TracingImage = {
  id: string;
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number; // 자유각, 0~360
  opacity: number; // 0~1
};

export const DEFAULT_TRACING_OPACITY = 0.5;
// 그리드 단위 — 너무 작아지면 손잡이로 조작할 수 없게 되는 것을 막는다.
export const MIN_TRACING_SIZE = 8;
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음(아직 이 타입을 쓰는 코드가 없으므로 기존 동작에 영향 없음).

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/types.ts
git commit -m "feat: 트레이싱 이미지 타입·상수 추가"
```

---

### Task 2: `useImageFileLoader` 훅 추출 + `ReferenceWindow.tsx` 리팩터

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/useImageFileLoader.ts`
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ReferenceWindow.tsx`

**Interfaces:**
- Produces: `useImageFileLoader(onLoaded: (image: HTMLImageElement) => void): { loadFile: (file: File) => void; handleDrop: (e: React.DragEvent<HTMLDivElement>) => void; handlePasteFromClipboard: () => Promise<void>; isDragOver: boolean; setIsDragOver: (v: boolean) => void }`. Task 3·4에서 그대로 재사용한다.

이 태스크는 **순수 리팩터**다 — `ReferenceWindow`의 동작(파일 선택/드래그드롭/클립보드 붙여넣기로 이미지 불러오기)은 한 글자도 바뀌지 않는다.

- [ ] **Step 1: 훅 파일 작성**

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 파일 선택·드래그드롭·클립보드 붙여넣기로 이미지를 불러오는 공통 로직 —
// ReferenceWindow(레퍼런스 창)와 트레이싱 이미지 추가 UI가 함께 쓴다.
// 불러온 이미지의 objectURL은 컴포넌트가 사라지거나 이 훅 인스턴스에서
// 새 이미지로 바뀔 때 스스로 정리한다.
export function useImageFileLoader(onLoaded: (image: HTMLImageElement) => void) {
  const [isDragOver, setIsDragOver] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const loadFile = useCallback(
    (file: File) => {
      const img = new Image();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      img.onload = () => onLoaded(img);
      img.src = url;
    },
    [onLoaded],
  );

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        loadFile(new File([blob], "clipboard-image", { type: imageType }));
        return;
      }
    } catch {
      // 클립보드 접근 실패 — 무시(파일 선택으로 대신 진행할 수 있음)
    }
  }, [loadFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) loadFile(file);
    },
    [loadFile],
  );

  return {
    loadFile,
    handleDrop,
    handlePasteFromClipboard,
    isDragOver,
    setIsDragOver,
  };
}
```

- [ ] **Step 2: `ReferenceWindow.tsx`가 훅을 쓰도록 교체**

`import { RefObject, useCallback, useEffect, useRef, useState } from "react";`(현재 4번째 줄) 다음 줄에 추가:

```ts
import { useImageFileLoader } from "./useImageFileLoader";
```

다음 블록(현재 93~173번째 줄, `const [image, setImage] = useState<HTMLImageElement | null>(null);`부터 `handleDrop` 선언 끝까지)을 찾는다. 이 중 `objectUrlRef` 선언(현재 111번째 줄), `loadFile` 선언(현재 132~142번째 줄), 정리용 `useEffect`(현재 144~148번째 줄), `handlePasteFromClipboard`(현재 150~163번째 줄), `handleDrop`(현재 165~173번째 줄)을 **삭제**하고, `const [isDragOver, setIsDragOver] = useState(false);`(현재 95번째 줄)도 삭제한다. 대신 원래 `objectUrlRef` 자리에 훅 호출 한 줄을 추가한다:

```ts
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const { loadFile, handleDrop, handlePasteFromClipboard, isDragOver, setIsDragOver } =
    useImageFileLoader((img) => {
      setImage(img);
      setZoom(1);
    });
```

(원래 `loadFile` 안에서 하던 `setImage(img); setZoom(1);`를 그대로 `onLoaded` 콜백으로 옮겼을 뿐, 나머지 동작은 동일하다.)

- [ ] **Step 3: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음. (`objectUrlRef`/`useRef` import가 더 이상 이 파일에서 안 쓰이면 미사용 import 경고가 날 수 있다 — `ReferenceWindow.tsx`는 `windowDragRef`/`resizeRef`/`panRef`/`canvasRef`/`viewportRef`에 여전히 `useRef`를 쓰므로 import 자체는 유지한다.)

- [ ] **Step 4: 브라우저 수동 확인**

Run: `npm run dev` → `/nemo-nemo-beam` 접속 → 메뉴 바 "레퍼런스" 클릭 → 뜬 창에 이미지를 드래그드롭/파일 선택/클립보드 붙여넣기로 각각 불러와 정상 표시되는지 확인. 스포이트 도구로 그 위를 클릭해 색이 뽑히는지도 확인(리팩터 전과 동일하게 동작해야 한다).

- [ ] **Step 5: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/useImageFileLoader.ts app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/ReferenceWindow.tsx
git commit -m "refactor: 이미지 파일 로딩 로직을 useImageFileLoader 훅으로 추출"
```

---

### Task 3: `TracingControlWindow.tsx` (신규, wide 전용)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/TracingControlWindow.tsx`

**Interfaces:**
- Consumes: Task 1의 `TracingImage`, Task 2의 `useImageFileLoader`.
- Produces: `TracingControlWindow` 컴포넌트, props `{ tracing: TracingImage | null; isActive: boolean; boundsRef: RefObject<HTMLDivElement | null>; zIndex: number; spawnIndex: number; minimized: boolean; onFocus: () => void; onToggleMinimize: () => void; onClose: () => void; onImageLoaded: (image: HTMLImageElement) => void; onOpacityChange: (opacity: number) => void; onToggleAdjust: () => void }`.

이 태스크는 컴포넌트만 만든다 — 아직 `Editor.tsx`에서 렌더링하지 않으므로 브라우저에서 직접 볼 수는 없다(Task 9에서 배선).

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { Minus, Pencil, X } from "lucide-react";
import { RefObject, useCallback, useRef, useState } from "react";
import { CURSOR_MOVE, CURSOR_POINTING } from "./cursors";
import { TracingImage } from "./types";
import { useImageFileLoader } from "./useImageFileLoader";

const WINDOW_WIDTH = 220;
const TITLE_BAR_HEIGHT = 32;
// ReferenceWindow.tsx와 같은 이유로, 창 전체를 편집기 경계 안에 완전히
// 가두지 않고 제목표시줄 일부만 항상 안쪽에 남게 한다.
const MIN_VISIBLE_PX = 16;
const SPAWN_CASCADE_STEP = 28;
const SPAWN_CASCADE_WRAP = 8;

// 트레이싱 이미지 1장당 뜨는 미니 컨트롤 창(wide 전용) — ReferenceWindow와
// 같은 제목표시줄 드래그·최소화·닫기·계단식 배치를 쓰지만, 뷰포트·줌·
// 스포이트는 없다. 이미지 자체의 이동·크기·회전은 캔버스 위에서 직접
// 조작한다("조정" 버튼으로 켜고 끈다) — 이 창은 불러오기·투명도·삭제만
// 담당한다. 닫기(X)는 이 트레이싱 이미지 자체를 완전히 삭제한다.
export default function TracingControlWindow({
  tracing,
  isActive,
  boundsRef,
  zIndex,
  spawnIndex,
  minimized,
  onFocus,
  onToggleMinimize,
  onClose,
  onImageLoaded,
  onOpacityChange,
  onToggleAdjust,
}: {
  tracing: TracingImage | null;
  isActive: boolean;
  boundsRef: RefObject<HTMLDivElement | null>;
  zIndex: number;
  spawnIndex: number;
  minimized: boolean;
  onFocus: () => void;
  onToggleMinimize: () => void;
  onClose: () => void;
  onImageLoaded: (image: HTMLImageElement) => void;
  onOpacityChange: (opacity: number) => void;
  onToggleAdjust: () => void;
}) {
  const cascade = (spawnIndex % SPAWN_CASCADE_WRAP) * SPAWN_CASCADE_STEP;
  const [pos, setPos] = useState({ x: 160 + cascade, y: 110 + cascade });
  const windowDragRef = useRef<{ offsetX: number; offsetY: number } | null>(
    null,
  );

  const {
    loadFile,
    handleDrop,
    handlePasteFromClipboard,
    isDragOver,
    setIsDragOver,
  } = useImageFileLoader(onImageLoaded);

  const getBounds = useCallback(() => {
    const root = boundsRef.current;
    if (!root) return null;
    const rect = root.getBoundingClientRect();
    return { left: 0, top: 0, right: rect.width, bottom: rect.height };
  }, [boundsRef]);

  const toLocalPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = boundsRef.current?.getBoundingClientRect();
      return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
    },
    [boundsRef],
  );

  const clampPos = useCallback(
    (nextPos: { x: number; y: number }) => {
      const bounds = getBounds();
      if (!bounds) return nextPos;
      const minX = bounds.left + MIN_VISIBLE_PX - WINDOW_WIDTH;
      const maxX = bounds.right - MIN_VISIBLE_PX;
      const minY = bounds.top + MIN_VISIBLE_PX - TITLE_BAR_HEIGHT;
      const maxY = bounds.bottom - MIN_VISIBLE_PX;
      return {
        x: Math.min(Math.max(nextPos.x, minX), maxX),
        y: Math.min(Math.max(nextPos.y, minY), maxY),
      };
    },
    [getBounds],
  );

  const handleTitleDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const local = toLocalPoint(e.clientX, e.clientY);
      windowDragRef.current = {
        offsetX: local.x - pos.x,
        offsetY: local.y - pos.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [pos, toLocalPoint],
  );
  const handleTitleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!windowDragRef.current) return;
      const local = toLocalPoint(e.clientX, e.clientY);
      setPos(
        clampPos({
          x: local.x - windowDragRef.current.offsetX,
          y: local.y - windowDragRef.current.offsetY,
        }),
      );
    },
    [clampPos, toLocalPoint],
  );
  const handleTitleUp = useCallback(() => {
    windowDragRef.current = null;
  }, []);

  return (
    <div
      className="pointer-events-auto fixed flex flex-col bg-white shadow-2xl"
      style={{ left: pos.x, top: pos.y, width: WINDOW_WIDTH, zIndex }}
      onPointerDownCapture={onFocus}
    >
      <div
        onPointerDown={handleTitleDown}
        onPointerMove={handleTitleMove}
        onPointerUp={handleTitleUp}
        onPointerCancel={handleTitleUp}
        className="flex touch-none items-center justify-between bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
        style={{ cursor: CURSOR_MOVE }}
      >
        <span>트레이싱</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMinimize}
            onPointerDown={(e) => e.stopPropagation()}
            title={minimized ? "펼치기" : "최소화"}
            className="flex h-5 w-5 items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            title="삭제"
            className="flex h-5 w-5 items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="flex flex-col gap-2 p-2">
          {!tracing ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center gap-2 p-3 text-center transition-colors ${
                isDragOver ? "bg-violet-50" : ""
              }`}
            >
              <p className="text-[10px] text-gray-400">
                이미지를 여기로 드래그하거나 파일을 선택하세요
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] && loadFile(e.target.files[0])
                }
                className="text-xs text-gray-600"
                style={{ cursor: CURSOR_POINTING }}
              />
              <button
                onClick={handlePasteFromClipboard}
                className="bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200"
              >
                클립보드에서 붙여넣기
              </button>
            </div>
          ) : (
            <>
              <img
                src={tracing.image.src}
                alt=""
                className="h-16 w-full bg-gray-50 object-contain"
              />
              <label className="flex items-center gap-2 text-[10px] text-gray-500">
                투명도
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(tracing.opacity * 100)}
                  onChange={(e) =>
                    onOpacityChange(Number(e.target.value) / 100)
                  }
                  className="flex-1"
                />
                <span className="w-7 shrink-0 text-right">
                  {Math.round(tracing.opacity * 100)}%
                </span>
              </label>
              <button
                onClick={onToggleAdjust}
                className={`flex items-center justify-center gap-1 px-2 py-1 text-[10px] ${
                  isActive
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Pencil className="h-3 w-3" />
                {isActive ? "조정 중" : "조정"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음. (아직 아무도 이 컴포넌트를 import하지 않으므로 "선언했지만 안 쓴다"는 경고는 나지 않는다 — 파일 자체는 export만 하는 모듈이다.)

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/TracingControlWindow.tsx
git commit -m "feat: 트레이싱 미니 컨트롤 창 컴포넌트 추가"
```

---

### Task 4: `TracingListPanel.tsx` (신규, narrow 전용)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/TracingListPanel.tsx`

**Interfaces:**
- Consumes: Task 1의 `TracingImage`, Task 2의 `useImageFileLoader`.
- Produces: `TracingListPanel` 컴포넌트, props `{ tracingImages: TracingImage[]; activeTracingId: string | null; onAdd: (image: HTMLImageElement) => void; onOpacityChange: (id: string, opacity: number) => void; onToggleAdjust: (id: string) => void; onDelete: (id: string) => void }`.

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { Pencil, Plus, X } from "lucide-react";
import { CURSOR_POINTING } from "./cursors";
import { TracingImage } from "./types";
import { useImageFileLoader } from "./useImageFileLoader";

// narrow 레이아웃에서 트레이싱 이미지 목록을 보여주는 패널 — LayerPanel과
// 같은 세로 목록 스타일이다. Editor.tsx가 openFloatingPanel === "tracing"일
// 때 기존 아이콘→플로팅 팝업 패턴 안에 그대로 끼워 넣는다. wide 전용인
// TracingControlWindow(자유 드래그 미니 창)와 달리 창 위치·zIndex 상태가
// 없다 — tracingImages 배열만 그대로 순회해서 그린다.
export default function TracingListPanel({
  tracingImages,
  activeTracingId,
  onAdd,
  onOpacityChange,
  onToggleAdjust,
  onDelete,
}: {
  tracingImages: TracingImage[];
  activeTracingId: string | null;
  onAdd: (image: HTMLImageElement) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onToggleAdjust: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { loadFile, handlePasteFromClipboard } = useImageFileLoader(onAdd);

  return (
    <div className="flex flex-col gap-2">
      {tracingImages.map((t) => (
        <div key={t.id} className="flex items-center gap-2 bg-gray-50 p-2">
          <img
            src={t.image.src}
            alt=""
            className="h-10 w-10 shrink-0 bg-white object-contain"
          />
          <div className="flex flex-1 flex-col gap-1">
            <label className="flex items-center gap-2 text-[10px] text-gray-500">
              투명도
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(t.opacity * 100)}
                onChange={(e) =>
                  onOpacityChange(t.id, Number(e.target.value) / 100)
                }
                className="flex-1"
              />
              <span className="w-7 shrink-0 text-right">
                {Math.round(t.opacity * 100)}%
              </span>
            </label>
            <button
              onClick={() => onToggleAdjust(t.id)}
              className={`flex w-fit items-center gap-1 px-2 py-0.5 text-[10px] ${
                activeTracingId === t.id
                  ? "bg-violet-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Pencil className="h-3 w-3" />
              {activeTracingId === t.id ? "조정 중" : "조정"}
            </button>
          </div>
          <button
            onClick={() => onDelete(t.id)}
            title="삭제"
            className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <label
        className="flex items-center justify-center gap-1 bg-gray-100 py-2 text-xs text-gray-600 hover:bg-gray-200"
        style={{ cursor: CURSOR_POINTING }}
      >
        <Plus className="h-3.5 w-3.5" />
        이미지 추가
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
          className="hidden"
        />
      </label>
      <button
        onClick={handlePasteFromClipboard}
        className="bg-gray-100 px-2 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200"
      >
        클립보드에서 붙여넣기
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/TracingListPanel.tsx
git commit -m "feat: 트레이싱 이미지 목록 패널(narrow용) 컴포넌트 추가"
```

---

### Task 5: `PixelCanvas.tsx` (1/2) — 배경 렌더링

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx`

**Interfaces:**
- Consumes: Task 1의 `TracingImage`.
- Produces: `PixelCanvas`에 새 prop `tracingImages: TracingImage[]` 추가(렌더링만, 아직 조정 오버레이는 없음 — Task 6에서 추가).

- [ ] **Step 1: import 추가**

기존(현재 41번째 줄):

```ts
import { nextZoomStep, Point, SelectMode, Tool } from "./types";
```

다음으로 교체:

```ts
import { nextZoomStep, Point, SelectMode, Tool, TracingImage } from "./types";
```

- [ ] **Step 2: prop 추가**

destructure 목록의 `activeLayerLocked,`(현재 192번째 줄) 다음 줄에 추가:

```ts
  tracingImages,
```

타입 블록의 `activeLayerLocked: boolean;`(현재 291번째 줄) 다음 줄에 추가:

```ts
  // 트레이싱 모드에서 캔버스 배경에 깔아두는 참고 이미지들 — 항상 픽셀
  // 데이터보다 먼저(맨 뒤에) 그린다. 실제 픽셀에는 절대 섞이지 않는다.
  tracingImages: TracingImage[];
```

- [ ] **Step 3: 배경 렌더링 추가**

`render` 콜백 안, `ctx.clearRect(0, 0, canvas.width, canvas.height);`(현재 455번째 줄) 다음, `const visibleBase =`(현재 459번째 줄) 앞에 추가:

```ts
      // belowComposite/활성 레이어/aboveComposite/그리드보다 먼저 그려서
      // 항상 맨 뒤에 깔리게 한다 — 실제 픽셀 데이터가 아니라 눈으로 보는
      // 보조선이므로 exportPixelArt.ts는 이 캔버스를 아예 참조하지 않는다.
      // imageSmoothingEnabled는 이미 위에서 false로 설정했다(픽셀아트답게
      // 확대해도 흐려지지 않는다).
      for (const t of tracingImages) {
        ctx.save();
        ctx.globalAlpha = t.opacity;
        const cx = (t.x + t.width / 2) * scale;
        const cy = (t.y + t.height / 2) * scale;
        ctx.translate(cx, cy);
        ctx.rotate((t.rotationDeg * Math.PI) / 180);
        ctx.drawImage(
          t.image,
          (-t.width / 2) * scale,
          (-t.height / 2) * scale,
          t.width * scale,
          t.height * scale,
        );
        ctx.restore();
      }
```

- [ ] **Step 4: 의존성 배열에 추가**

`render` 콜백의 의존성 배열에서 `activeLayerOpacity,`(현재 780번째 줄) 다음 줄에 추가:

```ts
      tracingImages,
```

(`useEffect(() => { render(workingRef.current); }, [pixels, selectionMask, render]);`는 `render` 자체를 의존성으로 이미 갖고 있으므로, `tracingImages`가 바뀔 때마다 `render`의 정체성이 바뀌어 이 effect가 자동으로 다시 그린다 — 별도 수정 불필요.)

- [ ] **Step 5: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: `tracingImages` prop을 아직 아무도 전달하지 않아 `Editor.tsx`에서 타입 에러가 날 수 있다 — 이 태스크는 `PixelCanvas.tsx`만 범위이므로, `Editor.tsx`의 에러는 Task 10(prop 배선)까지는 **예상된 실패**로 남겨둔다. `PixelCanvas.tsx` 자체에는 에러가 없어야 한다.

- [ ] **Step 6: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx
git commit -m "feat: PixelCanvas가 트레이싱 이미지를 배경으로 그리도록 확장"
```

---

### Task 6: `PixelCanvas.tsx` (2/2) — 이동·크기·회전 조정 오버레이

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx`

**Interfaces:**
- Consumes: Task 1의 `TracingImage`, Task 5의 `tracingImages` prop.
- Produces: `PixelCanvas`에 새 prop `activeTracingImage: TracingImage | null`, `onActiveTracingChange: (patch: Partial<Pick<TracingImage, "x" | "y" | "width" | "height" | "rotationDeg">>) => void`, `onActiveTracingDeselect: () => void` 추가.

- [ ] **Step 1: prop 추가**

destructure 목록의 `tracingImages,`(Task 5에서 추가) 다음 줄에 추가:

```ts
  activeTracingImage,
  onActiveTracingChange,
  onActiveTracingDeselect,
```

타입 블록의 `tracingImages: TracingImage[];`(Task 5에서 추가) 다음 줄에 추가:

```ts
  // 지금 캔버스 위에서 이동·크기·회전 손잡이가 떠 있는 대상(한 번에 하나만).
  activeTracingImage: TracingImage | null;
  onActiveTracingChange: (
    patch: Partial<Pick<TracingImage, "x" | "y" | "width" | "height" | "rotationDeg">>,
  ) => void;
  // 오버레이 바깥 캔버스를 클릭했을 때(선택 해제).
  onActiveTracingDeselect: () => void;
```

- [ ] **Step 2: import 추가**

Task 5에서 바꾼 줄:

```ts
import { nextZoomStep, Point, SelectMode, Tool, TracingImage } from "./types";
```

다음으로 교체:

```ts
import {
  MIN_TRACING_SIZE,
  nextZoomStep,
  Point,
  SelectMode,
  Tool,
  TracingImage,
} from "./types";
```

- [ ] **Step 3: 조정 손잡이 상태·핸들러 추가**

`handleImageResizeMove` 선언 끝(현재 1413~1429번째 줄) 다음, `// pendingShape 오버레이도...` 주석(현재 1431번째 줄) 앞에 추가:

```ts
  // 트레이싱 이미지 조정(이동·크기·회전) — pendingImage와 같은 독립 오버레이
  // 패턴이지만 커밋/취소 개념이 없다(픽셀에 구워지는 대상이 아니라 이미
  // 항상 라이브 상태이므로, 손을 떼면 그 값 그대로 유지된다).
  const tracingDragRef = useRef<{ offsetX: number; offsetY: number } | null>(
    null,
  );
  const tracingResizeRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const tracingRotateRef = useRef<{
    centerX: number;
    centerY: number;
    startAngle: number;
    startRotationDeg: number;
  } | null>(null);

  const handleTracingInteractionEnd = useCallback(() => {
    tracingDragRef.current = null;
    tracingResizeRef.current = null;
    tracingRotateRef.current = null;
  }, []);

  const handleTracingBodyDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!activeTracingImage) return;
      const point = toRawGridPoint(e);
      if (!point) return;
      tracingDragRef.current = {
        offsetX: point.x - activeTracingImage.x,
        offsetY: point.y - activeTracingImage.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [activeTracingImage, toRawGridPoint],
  );
  const handleTracingBodyMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!tracingDragRef.current) return;
      const point = toRawGridPoint(e);
      if (!point) return;
      onActiveTracingChange({
        x: point.x - tracingDragRef.current.offsetX,
        y: point.y - tracingDragRef.current.offsetY,
      });
    },
    [toRawGridPoint, onActiveTracingChange],
  );

  const handleTracingResizeDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!activeTracingImage) return;
      tracingResizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: activeTracingImage.width,
        startHeight: activeTracingImage.height,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [activeTracingImage],
  );
  const handleTracingResizeMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!tracingResizeRef.current || !activeTracingImage) return;
      const rawDx = (e.clientX - tracingResizeRef.current.startX) / scale;
      const rawDy = (e.clientY - tracingResizeRef.current.startY) / scale;
      // 회전된 상자의 로컬(회전 전) 좌표계로 화면 드래그량을 되돌려
      // 계산한다 — 그래야 돌아간 상태에서도 모서리를 당기면 그 방향으로
      // 자연스럽게 커진다. (참고: 중심 기준 회전이라 크기가 바뀌면 중심도
      // 함께 이동해, 회전된 상태에서 리사이즈하면 상자가 살짝 미끄러지듯
      // 보일 수 있다 — 알려진 단순화이며, 회전 전에 크기부터 맞추면 없다.)
      const rad = (-activeTracingImage.rotationDeg * Math.PI) / 180;
      const dx = rawDx * Math.cos(rad) - rawDy * Math.sin(rad);
      const dy = rawDx * Math.sin(rad) + rawDy * Math.cos(rad);
      onActiveTracingChange({
        width: Math.max(
          MIN_TRACING_SIZE,
          Math.round(tracingResizeRef.current.startWidth + dx),
        ),
        height: Math.max(
          MIN_TRACING_SIZE,
          Math.round(tracingResizeRef.current.startHeight + dy),
        ),
      });
    },
    [scale, activeTracingImage, onActiveTracingChange],
  );

  const handleTracingRotateDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!activeTracingImage) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const centerX =
        rect.left +
        (activeTracingImage.x + activeTracingImage.width / 2) * scale;
      const centerY =
        rect.top +
        (activeTracingImage.y + activeTracingImage.height / 2) * scale;
      tracingRotateRef.current = {
        centerX,
        centerY,
        startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
        startRotationDeg: activeTracingImage.rotationDeg,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [activeTracingImage, scale],
  );
  const handleTracingRotateMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = tracingRotateRef.current;
      if (!start) return;
      const angle = Math.atan2(
        e.clientY - start.centerY,
        e.clientX - start.centerX,
      );
      const deltaDeg = ((angle - start.startAngle) * 180) / Math.PI;
      onActiveTracingChange({
        rotationDeg: (start.startRotationDeg + deltaDeg + 360) % 360,
      });
    },
    [onActiveTracingChange],
  );
```

- [ ] **Step 4: 캔버스 클릭 시 선택 해제 가드 추가**

`handlePointerDown` 콜백 맨 앞, `if (e.button !== 0) return;`(현재 859번째 줄) 다음 줄에 추가:

```ts
      if (activeTracingImage) {
        onActiveTracingDeselect();
        return;
      }
```

이 콜백의 의존성 배열 `getFullComposite,`(현재 1080번째 줄) 다음 줄에 추가:

```ts
      activeTracingImage,
      onActiveTracingDeselect,
```

- [ ] **Step 5: 오버레이 JSX 추가**

`{pendingImage && ( ... )}` 블록(현재 1768~1830번째 줄) 다음, `{pendingShape &&`(현재 1831번째 줄) 앞에 추가:

```tsx
      {activeTracingImage && (
        <div
          className="absolute z-10 touch-none border-2 border-dashed border-violet-500"
          style={{
            left: activeTracingImage.x * scale,
            top: activeTracingImage.y * scale,
            width: activeTracingImage.width * scale,
            height: activeTracingImage.height * scale,
            transform: `rotate(${activeTracingImage.rotationDeg}deg)`,
            transformOrigin: "center",
            cursor: CURSOR_DRAGGING,
          }}
          onPointerDown={handleTracingBodyDown}
          onPointerMove={handleTracingBodyMove}
          onPointerUp={handleTracingInteractionEnd}
          onPointerCancel={handleTracingInteractionEnd}
        >
          {/* 크기 조절 — 우하단 모서리, 상자와 함께 회전한다(부모 transform 상속). */}
          <div
            className="absolute -right-1.5 -bottom-1.5 h-4 w-4 touch-none rounded-full bg-violet-500 shadow-[0_0_0_2px_#ffffff]"
            style={{ cursor: CURSOR_NWSE_RESIZE }}
            onPointerDown={handleTracingResizeDown}
            onPointerMove={handleTracingResizeMove}
            onPointerUp={handleTracingInteractionEnd}
            onPointerCancel={handleTracingInteractionEnd}
          />
          {/* 회전 — 상단 중앙에서 위로 띄운 손잡이. 중심 기준 각도 변화를
              그대로 rotationDeg에 더한다(자유각). */}
          <div
            className="absolute -top-6 left-1/2 h-3 w-3 -translate-x-1/2 touch-none rounded-full bg-violet-500 shadow-[0_0_0_2px_#ffffff]"
            style={{ cursor: CURSOR_GRAB }}
            onPointerDown={handleTracingRotateDown}
            onPointerMove={handleTracingRotateMove}
            onPointerUp={handleTracingInteractionEnd}
            onPointerCancel={handleTracingInteractionEnd}
          />
        </div>
      )}
```

- [ ] **Step 6: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: `PixelCanvas.tsx` 자체는 에러 없음. `Editor.tsx`는 아직 새 prop 3개를 안 넘겨 에러가 날 수 있다 — Task 10까지 예상된 실패로 남긴다.

- [ ] **Step 7: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/PixelCanvas.tsx
git commit -m "feat: PixelCanvas에 트레이싱 이미지 이동·크기·회전 조정 오버레이 추가"
```

---

### Task 7: `useKeyboardShortcuts.ts` — Escape로 조정 해제

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/useKeyboardShortcuts.ts`

**Interfaces:**
- Consumes: 없음(Editor.tsx가 Task 10에서 실제 값을 넘긴다).
- Produces: `useKeyboardShortcuts`에 새 옵션 `hasActiveTracing?: boolean`, `onCancelActiveTracing?: () => void` 추가.

- [ ] **Step 1: 옵션 추가**

destructure 목록의 `onCancelPendingShape,`(현재 59번째 줄) 다음 줄에 추가:

```ts
  hasActiveTracing,
  onCancelActiveTracing,
```

타입 블록의 `onCancelPendingShape?: () => void;`(현재 89번째 줄) 다음 줄에 추가:

```ts
  // 트레이싱 이미지 조정 손잡이가 떠 있으면, Enter/Esc 우선순위 중
  // pendingImage/pendingShape 다음·선택 해제보다는 앞선 순서로 Escape가
  // 조정 상태부터 해제한다.
  hasActiveTracing?: boolean;
  onCancelActiveTracing?: () => void;
```

- [ ] **Step 2: Escape 분기 확장**

기존:

```ts
      if (e.key === "Escape") {
        if (hasPendingImage) onCancelPendingImage?.();
        else if (hasPendingShape) onCancelPendingShape?.();
        else onClearSelection?.();
        return;
      }
```

다음으로 교체:

```ts
      if (e.key === "Escape") {
        if (hasPendingImage) onCancelPendingImage?.();
        else if (hasPendingShape) onCancelPendingShape?.();
        else if (hasActiveTracing) onCancelActiveTracing?.();
        else onClearSelection?.();
        return;
      }
```

- [ ] **Step 3: 의존성 배열에 추가**

의존성 배열의 `onCancelPendingShape,`(현재 215번째 줄) 다음 줄에 추가:

```ts
    hasActiveTracing,
    onCancelActiveTracing,
```

- [ ] **Step 4: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음(둘 다 선택적 prop이라 호출부를 안 바꿔도 깨지지 않는다).

- [ ] **Step 5: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/useKeyboardShortcuts.ts
git commit -m "feat: Escape로 트레이싱 이미지 조정 상태를 해제하는 옵션 추가"
```

---

### Task 8: `Editor.tsx` (1/3) — 상태·핸들러·메뉴 바

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 1의 `TracingImage`/`DEFAULT_TRACING_OPACITY`.
- Produces: `tracingMode`, `tracingImages`, `activeTracingId`, `tracingWindows` 상태와 `openTracingWindow`, `bringTracingWindowToFront`, `toggleTracingWindowMinimized`, `handleTracingImageLoaded`, `handleTracingListAdd`, `handleTracingOpacityChange`, `handleTracingDelete`, `handleToggleTracingAdjust`, `activeTracingImage`, `handleActiveTracingChange`, `handleTracingDeselect` — Task 9·10에서 그대로 쓴다.

- [ ] **Step 1: import 추가**

`./types`를 import하는 블록(닫는 줄이 `} from "./types";`)을 찾는다. 이 블록 안에 다른 세션이 이미 `DEFAULT_FRAME_DURATION_MS`, `MAX_LAYERS`, `ONION_SKIN_OPACITY` 등을 추가해 뒀을 수 있다 — 그 목록에 상관없이, **알파벳 순서를 지켜** `DEFAULT_TRACING_OPACITY`와 `TracingImage`를 추가한다(예: 목록이 `CANVAS_PRESETS, DEFAULT_CANVAS_BG_COLOR, DEFAULT_FRAME_DURATION_MS, MAX_CANVAS_SIZE, ...`라면 `DEFAULT_TRACING_OPACITY`는 `DEFAULT_FRAME_DURATION_MS`와 `MAX_CANVAS_SIZE` 사이에, `TracingImage`는 목록 끝 `Tool`과 `ZOOM_STEPS` 사이에 들어간다).

- [ ] **Step 2: 상태·핸들러 추가**

`bringReferenceWindowToFront` 선언 끝(현재 314~320번째 줄) 다음, `const [showGrid, setShowGrid] = useState(true);`(현재 321번째 줄) 앞에 추가:

```ts
  // 트레이싱 모드 — 캔버스 배경에 참고 이미지를 깔아두고 따라 그리는 기능.
  // 레퍼런스 창과 완전히 독립된 기능이라 동시에 켤 수 있다. tracingMode는
  // 오직 렌더링 표시 여부만 결정하고, 꺼도 tracingImages/tracingWindows는
  // 그대로 남는다(다시 켜면 복원). 탭(문서)별이 아니라 레퍼런스 창과 같은
  // 스코프(편집기 세션 전체)에서 공유한다.
  const [tracingMode, setTracingMode] = useState(false);
  const [tracingImages, setTracingImages] = useState<TracingImage[]>([]);
  // 지금 캔버스 위에서 이동·크기·회전 손잡이가 떠 있는 대상 — 한 번에
  // 하나만 조정할 수 있다.
  const [activeTracingId, setActiveTracingId] = useState<string | null>(null);
  // 미니 컨트롤 창(wide 전용) 자체의 위치·최소화 상태 — tracingImages와
  // id로 짝을 이루는 병렬 배열이다. narrow(TracingListPanel)는 쓰지 않는다.
  const [tracingWindows, setTracingWindows] = useState<
    { id: string; zIndex: number; spawnIndex: number; minimized: boolean }[]
  >([]);
  const tracingZRef = useRef(60);
  const tracingSpawnRef = useRef(0);
  const openTracingWindow = useCallback(() => {
    tracingZRef.current += 1;
    const spawnIndex = tracingSpawnRef.current;
    tracingSpawnRef.current += 1;
    setTracingWindows((ws) => [
      ...ws,
      { id: uid(), zIndex: tracingZRef.current, spawnIndex, minimized: false },
    ]);
  }, []);
  const bringTracingWindowToFront = useCallback((id: string) => {
    tracingZRef.current += 1;
    const z = tracingZRef.current;
    setTracingWindows((ws) =>
      ws.map((w) => (w.id === id ? { ...w, zIndex: z } : w)),
    );
  }, []);
  const toggleTracingWindowMinimized = useCallback((id: string) => {
    setTracingWindows((ws) =>
      ws.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)),
    );
  }, []);
  // 이미지를 처음 불러왔을 때 — 캔버스 안에 전체가 들어오도록 맞추고
  // 가운데 정렬한다(ReferenceWindow의 fitScale과 같은 관례: 배율 1 =
  // 화면 맞춤). id는 wide에서는 미리 만들어 둔 tracingWindows 항목의 id를
  // 그대로 받고, narrow(handleTracingListAdd)에서는 새로 만든다.
  const handleTracingImageLoaded = useCallback(
    (id: string, image: HTMLImageElement) => {
      const fitScale = Math.min(
        doc.width / image.naturalWidth,
        doc.height / image.naturalHeight,
      );
      const w = image.naturalWidth * fitScale;
      const h = image.naturalHeight * fitScale;
      setTracingImages((imgs) => [
        ...imgs,
        {
          id,
          image,
          x: (doc.width - w) / 2,
          y: (doc.height - h) / 2,
          width: w,
          height: h,
          rotationDeg: 0,
          opacity: DEFAULT_TRACING_OPACITY,
        },
      ]);
    },
    [doc.width, doc.height],
  );
  // narrow의 TracingListPanel은 wide의 tracingWindows 같은 "미리 만들어 둔
  // 빈 창"이 없다 — 이미지를 고르는 즉시 새 id로 바로 추가한다.
  const handleTracingListAdd = useCallback(
    (image: HTMLImageElement) => {
      handleTracingImageLoaded(uid(), image);
    },
    [handleTracingImageLoaded],
  );
  const handleTracingOpacityChange = useCallback(
    (id: string, opacity: number) => {
      setTracingImages((imgs) =>
        imgs.map((t) => (t.id === id ? { ...t, opacity } : t)),
      );
    },
    [],
  );
  // 미니 창의 닫기(X)와 리스트 패널의 삭제 버튼이 공유하는 단일 삭제
  // 핸들러 — 창 항목과 이미지 데이터를 함께 지우고, 지금 그 이미지를
  // 조정 중이었다면 조정 상태도 함께 해제한다.
  const handleTracingDelete = useCallback((id: string) => {
    setTracingWindows((ws) => ws.filter((w) => w.id !== id));
    setTracingImages((imgs) => imgs.filter((t) => t.id !== id));
    setActiveTracingId((cur) => (cur === id ? null : cur));
  }, []);
  const handleToggleTracingAdjust = useCallback((id: string) => {
    setActiveTracingId((cur) => (cur === id ? null : id));
  }, []);
  const activeTracingImage =
    tracingImages.find((t) => t.id === activeTracingId) ?? null;
  const handleActiveTracingChange = useCallback(
    (
      patch: Partial<
        Pick<TracingImage, "x" | "y" | "width" | "height" | "rotationDeg">
      >,
    ) => {
      setTracingImages((imgs) =>
        imgs.map((t) => (t.id === activeTracingId ? { ...t, ...patch } : t)),
      );
    },
    [activeTracingId],
  );
  const handleTracingDeselect = useCallback(() => {
    setActiveTracingId(null);
  }, []);
```

- [ ] **Step 3: 메뉴 바 버튼 수정**

기존 "레퍼런스" 버튼 블록(현재 1940~1950번째 줄):

```tsx
        <button
          onClick={openReferenceWindow}
          title="참고 이미지 창을 새로 엽니다. 여러 개를 동시에 띄울 수 있습니다(저장되지 않음)"
          className={`px-2 py-1 text-xs ${
            referenceWindows.length > 0
              ? "bg-violet-50 text-violet-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          레퍼런스
        </button>
```

다음으로 교체:

```tsx
        {!narrow && (
          <button
            onClick={openReferenceWindow}
            title="참고 이미지 창을 새로 엽니다. 여러 개를 동시에 띄울 수 있습니다(저장되지 않음)"
            className={`px-2 py-1 text-xs ${
              referenceWindows.length > 0
                ? "bg-violet-50 text-violet-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            레퍼런스
          </button>
        )}
        <button
          onClick={() => setTracingMode((v) => !v)}
          title="캔버스 배경에 참고 이미지를 깔아두고 따라 그립니다(저장되지 않음)"
          className={`px-2 py-1 text-xs ${
            tracingMode
              ? "bg-violet-50 text-violet-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          트레이싱
        </button>
        {tracingMode && !narrow && (
          <button
            onClick={openTracingWindow}
            title="트레이싱 이미지를 추가합니다"
            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
          >
            + 이미지
          </button>
        )}
```

- [ ] **Step 4: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음(`tracingWindows`/`activeTracingImage` 등을 아직 아무 데도 안 쓰지만, 전부 컴포넌트 안에서 선언된 지역 변수라 미사용 경고가 아니라 "일부만 쓰인다"는 정상 상태다 — `handleTracingImageLoaded` 등은 Step 3의 버튼에서 쓰는 `openTracingWindow`를 통해 이미 참조 그래프에 들어와 있다. 만약 특정 변수의 "정의했지만 안 쓴다" ESLint 경고가 나면, 이는 Task 9·10에서 실제로 쓰이게 되므로 지금 단계에서는 무시하고 다음 태스크로 진행한다).

- [ ] **Step 5: 브라우저 수동 확인**

Run: `npm run dev` → `/nemo-nemo-beam` 접속 → 메뉴 바에 "레퍼런스"와 "트레이싱" 버튼이 나란히 보이는지 확인. "트레이싱"을 누르면 강조 색으로 바뀌고 "+ 이미지" 버튼이 나타나는지, 다시 누르면 사라지는지 확인(아직 캔버스에는 아무 변화 없음 — 정상, PixelCanvas 배선은 Task 10). 편집기 창을 좁혀 narrow로 만들면 "레퍼런스" 버튼이 사라지고 "트레이싱"만 남는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: Editor에 트레이싱 모드 상태·핸들러·메뉴 바 토글 추가"
```

---

### Task 9: `Editor.tsx` (2/3) — wide 미니 창 + narrow 리스트 팝업 배선

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 3의 `TracingControlWindow`, Task 4의 `TracingListPanel`, Task 8의 모든 상태·핸들러.

- [ ] **Step 1: import 추가**

`import LayerPanel from "./LayerPanel";` 다음 줄에 추가:

```ts
import TracingControlWindow from "./TracingControlWindow";
import TracingListPanel from "./TracingListPanel";
```

lucide-react import 블록을 찾는다(계획 작성 시점 기준 다음과 같다 — 다른 세션이 항목을 더 추가해 뒀을 수 있으니, 그 목록에 상관없이 알파벳 순서로 `Image as ImageIcon`만 끼워 넣는다. `Layers as LayersIcon`과 같은 별칭 관례 — 전역 `Image` 생성자와 이름이 겹치는 것을 피한다):

```ts
import {
  Download,
  Image as ImageIcon,
  ImagePlus,
  Layers as LayersIcon,
  Minus,
  Plus,
  Save,
  X,
} from "lucide-react";
```

- [ ] **Step 2: wide 미니 창 렌더링**

`{referenceWindows.map((w) => ( ... ))}` 블록(현재 2678~2689번째 줄) 다음, `</div>`(컴포넌트 최상위 rootRef div를 닫는 줄, 현재 2690번째 줄) 앞에 추가:

```tsx
      {tracingMode &&
        tracingWindows.map((w) => (
          <TracingControlWindow
            key={w.id}
            tracing={tracingImages.find((t) => t.id === w.id) ?? null}
            isActive={activeTracingId === w.id}
            boundsRef={rootRef}
            zIndex={w.zIndex}
            spawnIndex={w.spawnIndex}
            minimized={w.minimized}
            onFocus={() => bringTracingWindowToFront(w.id)}
            onToggleMinimize={() => toggleTracingWindowMinimized(w.id)}
            onClose={() => handleTracingDelete(w.id)}
            onImageLoaded={(image) => handleTracingImageLoaded(w.id, image)}
            onOpacityChange={(opacity) =>
              handleTracingOpacityChange(w.id, opacity)
            }
            onToggleAdjust={() => handleToggleTracingAdjust(w.id)}
          />
        ))}
```

- [ ] **Step 3: narrow `openFloatingPanel`에 `"tracing"` 추가**

기존(현재 393~395번째 줄):

```ts
  const [openFloatingPanel, setOpenFloatingPanel] = useState<
    "layers" | "import" | "export" | null
  >(null);
```

다음으로 교체:

```ts
  const [openFloatingPanel, setOpenFloatingPanel] = useState<
    "layers" | "import" | "export" | "tracing" | null
  >(null);
```

- [ ] **Step 4: narrow 아이콘 컬럼 + 팝업 내용 확장**

`panelTitle` 계산(현재 2270~2275번째 줄):

```ts
              const panelTitle =
                openFloatingPanel === "layers"
                  ? "레이어"
                  : openFloatingPanel === "import"
                    ? "이미지 불러오기"
                    : "내보내기";
```

다음으로 교체:

```ts
              const panelTitle =
                openFloatingPanel === "layers"
                  ? "레이어"
                  : openFloatingPanel === "import"
                    ? "이미지 불러오기"
                    : openFloatingPanel === "export"
                      ? "내보내기"
                      : "트레이싱";
```

아이콘 컬럼의 "내보내기" 버튼(현재 2329~2343번째 줄) 다음, `{openFloatingPanel && (`(현재 2344번째 줄) 앞에 추가:

```tsx
                  {tracingMode && (
                    <button
                      onClick={() =>
                        setOpenFloatingPanel((p) =>
                          p === "tracing" ? null : "tracing",
                        )
                      }
                      title="트레이싱"
                      className={`flex h-8 w-8 items-center justify-center transition-colors ${
                        openFloatingPanel === "tracing"
                          ? "bg-violet-500 text-white"
                          : "bg-white text-gray-500 shadow-md hover:bg-gray-50"
                      }`}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                  )}
```

팝업 안 내용 선택(현재 2357~2361번째 줄):

```tsx
                        {openFloatingPanel === "layers"
                          ? layerPanel
                          : openFloatingPanel === "import"
                            ? importPanel
                            : exportPanel}
```

다음으로 교체:

```tsx
                        {openFloatingPanel === "layers" ? (
                          layerPanel
                        ) : openFloatingPanel === "import" ? (
                          importPanel
                        ) : openFloatingPanel === "export" ? (
                          exportPanel
                        ) : (
                          <TracingListPanel
                            tracingImages={tracingImages}
                            activeTracingId={activeTracingId}
                            onAdd={handleTracingListAdd}
                            onOpacityChange={handleTracingOpacityChange}
                            onToggleAdjust={(id) => {
                              handleToggleTracingAdjust(id);
                              setOpenFloatingPanel(null);
                            }}
                            onDelete={handleTracingDelete}
                          />
                        )}
```

(팝업을 열어둔 채로 "조정"을 누르면 `w-72` 팝업이 캔버스 상당 부분을 가려 손잡이를 조작하기 어려우므로, `onToggleAdjust`에서 팝업을 함께 닫는다.)

- [ ] **Step 5: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음.

- [ ] **Step 6: 브라우저 수동 확인**

Run: `npm run dev` → `/nemo-nemo-beam` 접속 → "트레이싱" 켜고 "+ 이미지" 클릭 → 미니 창이 계단식으로 뜨는지, 드래그로 옮길 수 있는지, 파일 선택/드래그드롭/붙여넣기로 이미지를 불러오면 썸네일·투명도 슬라이더·"조정" 버튼이 나타나는지 확인. 여러 개를 열어 겹쳐 보이는지, 최소화·닫기(X)가 되는지 확인. 편집기를 narrow로 좁힌 뒤 아이콘 컬럼에 트레이싱 아이콘이 나타나는지, 눌렀을 때 리스트 팝업이 뜨는지, "+ 이미지 추가"로 불러온 이미지가 목록에 나타나는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: Editor에 트레이싱 미니 창(wide)·목록 팝업(narrow) UI 배선"
```

---

### Task 10: `Editor.tsx` (3/3) — PixelCanvas·키보드 단축키 배선(기능 완성)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 6의 `PixelCanvas` 새 prop 3개, Task 7의 `useKeyboardShortcuts` 새 옵션 2개, Task 8의 `activeTracingImage`/`handleActiveTracingChange`/`handleTracingDeselect`.

이 태스크가 끝나면 트레이싱 모드가 실제로 캔버스에 보이고 조작 가능해진다 — 지금까지의 모든 태스크가 여기서 하나로 합쳐진다.

- [ ] **Step 1: `PixelCanvas`에 prop 전달**

`<PixelCanvas ... bottomToolbarPortalTarget={secondaryToolbarPortal} />`의 `bottomToolbarPortalTarget={secondaryToolbarPortal}` 줄 다음에 추가:

```tsx
                  tracingImages={tracingMode ? tracingImages : []}
                  activeTracingImage={tracingMode ? activeTracingImage : null}
                  onActiveTracingChange={handleActiveTracingChange}
                  onActiveTracingDeselect={handleTracingDeselect}
```

(`tracingMode`가 꺼져 있으면 빈 배열/`null`을 넘겨, 데이터는 그대로 두되 화면에는 아무것도 안 보이게 한다 — "tracingMode는 렌더링 표시 여부만 결정한다"는 설계를 여기 한 곳에서 만족시킨다.)

- [ ] **Step 2: `useKeyboardShortcuts`에 옵션 전달**

`useKeyboardShortcuts({ ... })` 호출의 `onCancelPendingShape: handlePendingShapeCancel,`(현재 1461번째 줄) 다음 줄에 추가:

```ts
    hasActiveTracing: !!activeTracingId,
    onCancelActiveTracing: handleTracingDeselect,
```

- [ ] **Step 3: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음 — Task 5·6에서 남겨둔 "예상된 실패"가 여기서 해소되어야 한다.

- [ ] **Step 4: 브라우저 수동 확인 (전체 시나리오)**

Run: `npm run dev` → `/nemo-nemo-beam` 접속.

1. "트레이싱" 켜고 "+ 이미지"로 이미지를 하나 불러온다 — 캔버스 중앙에 은은하게(기본 투명도 50%) 배경으로 깔리는지 확인.
2. 미니 창의 투명도 슬라이더를 움직이면 캔버스 위 이미지도 실시간으로 옅어지고 진해지는지 확인.
3. "조정" 버튼을 누르면 캔버스 위 이미지에 점선 테두리·우하단 크기 손잡이·상단 회전 손잡이가 뜨는지 확인.
4. 테두리 안(본체)을 드래그하면 이미지가 이동하는지, 우하단 손잡이를 드래그하면 커지고 줄어드는지, 상단 손잡이를 드래그하면 자유각으로 회전하는지 확인.
5. 캔버스를 확대(Ctrl/Cmd+휠 또는 +/- 버튼)했을 때 트레이싱 이미지와 조정 손잡이가 그림과 같은 비율로 함께 확대되는지 확인.
6. 조정 중에 캔버스의 빈 곳(오버레이 바깥)을 클릭하면 손잡이가 사라지고(그림이 그려지지는 않아야 한다), Escape 키로도 같은 방식으로 해제되는지 확인.
7. 스포이트 도구를 선택하고 트레이싱 이미지 위를 클릭했을 때 트레이싱 이미지가 아니라 그 아래 실제 캔버스 픽셀(또는 배경색)에서 색이 뽑히는지 확인(트레이싱 이미지는 스포이트를 지원하지 않는다).
8. 이미지를 2장 이상 불러와 겹쳐두고, 각각 다른 미니 창의 "조정"을 눌러 전환하면 항상 하나의 손잡이만 뜨는지 확인.
9. "트레이싱"을 끄면 캔버스에서 이미지가 사라지고, 다시 켜면 위치·투명도·회전이 그대로 복원되는지 확인.
10. 탭을 새로 만들거나 전환해도 앱이 죽지 않고, 트레이싱 이미지가 그대로 보이는지(다른 캔버스 크기 기준으로도 죽지 않고 표시되는지) 확인.
11. 편집기를 narrow로 좁혀 같은 시나리오(투명도·조정·삭제)를 리스트 팝업으로 반복 — "조정"을 누르면 팝업이 자동으로 닫히고 캔버스 위 손잡이가 바로 보이는지 확인.
12. 창을 저장(Ctrl/Cmd+S)한 뒤 다시 열어, 저장된 파일에 트레이싱 이미지 관련 데이터가 전혀 없고(그림 자체만 저장됨) 그림이 깨지지 않는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: 트레이싱 모드를 PixelCanvas·키보드 단축키에 배선해 기능을 완성"
```

---

### Task 11: 전체 빌드 확인

**Files:** 없음(검증 전용 태스크).

- [ ] **Step 1: 프로덕션 빌드**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 2: 레퍼런스 창 회귀 확인(수동)**

`/nemo-nemo-beam`에서 "레퍼런스" 창을 열어 Task 2 리팩터 이후에도 이미지 불러오기·확대·이동·스포이트 색 추출이 전과 동일하게 동작하는지 다시 한번 확인한다(트레이싱 기능과 별개로 계속 동작해야 한다).

- [ ] **Step 3: 다른 Work·페이지 회귀 확인(수동)**

`/playground`에서 다른 Work(특히 `2_VisualNovelStudio`처럼 `5_PixelArtMaker`의 자산 라이브러리를 참조하는 화면)를 열어 정상 동작하는지 확인한다 — 이번 플랜은 `assetLibrary.ts`(저장 포맷)를 건드리지 않으므로 영향이 없어야 한다.

- [ ] **Step 4: 커밋(변경 사항이 있는 경우에만)**

이 태스크에서 코드 변경이 없다면 커밋할 것이 없다.
