# 네모네모빔 레퍼런스/트레이싱 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 독립적으로 구현된 레퍼런스 창(참고 모드)과 트레이싱 모드를 하나의 "레퍼런스" 개념으로 합친다 — 레퍼런스 항목 하나가 같은 이미지 데이터 위에서 참고 모드(뷰포트 확대·이동·스포이트)와 트레이싱 모드(캔버스 배경 오버레이, 이동·크기·회전 조정)를 오갈 수 있다. 기본값은 참고 모드.

**Architecture:** `PixelCanvas.tsx`는 전혀 변경하지 않는다 — 이미 "그릴 배경 이미지 배열"(`TracingImage[]`)만 받는 구조라, `Editor.tsx`가 통합 데이터 중 트레이싱 모드인 것만 걸러 넘기면 된다. `ReferenceWindow.tsx`가 모드 토글과 두 가지 body(참고 모드는 기존 뷰포트, 트레이싱 모드는 `TracingControlWindow`에서 흡수한 썸네일+투명도+조정 UI)를 갖도록 확장되고, `TracingControlWindow.tsx`는 삭제된다. `Editor.tsx`는 창 UI 상태(`referenceWindows`)와 데이터(`referenceItems`)를 분리해서 관리하는 기존 패턴을 그대로 유지한다.

**Tech Stack:** Next.js 16(App Router) + React 19 + TypeScript. 새 의존성 없음.

## Global Constraints

- 이 프로젝트에는 자동화된 테스트 스위트가 없다. 각 태스크는 `npx tsc --noEmit -p tsconfig.json`(타입 검사)과 `npm run lint`(ESLint) 통과, UI가 바뀌는 태스크는 `npm run dev` 브라우저 수동 확인으로 검증한다.
- **`Editor.tsx`는 다른 세션이 동시에 활발히 편집 중이다.** 각 태스크에 적어 둔 "현재 N번째 줄"은 계획 작성 시점의 힌트일 뿐이다 — 실제 위치는 줄 번호가 아니라 각 스텝에 그대로 옮겨 적은 코드 스니펫(교체 전/삽입 지점 앞뒤 코드)의 **텍스트 내용**으로 찾는다. 편집 전에 반드시 그 스니펫을 파일에서 검색해 지금도 그대로 있는지 먼저 확인한다. 커밋은 이 플랜이 명시한 파일만 정확한 경로로 스테이징하고(`git add -A`/`git add .` 금지), 스테이징 직후 바로 커밋한다.
- `PixelCanvas.tsx`, `useKeyboardShortcuts.ts`, `useImageFileLoader.ts`, `TracingListPanel.tsx`, `types.ts`의 `TracingImage`/`DEFAULT_TRACING_OPACITY`/`MIN_TRACING_SIZE`는 이 플랜에서 **변경하지 않는다** — 이미 리뷰를 통과한 채 그대로 재사용된다.
- 레퍼런스 항목의 모든 데이터(이미지·모드·트레이싱 지오메트리)는 세션 메모리 전용이다 — 저장(JSON/자동저장)에 절대 포함하지 않는다. 저장 포맷 변경 없음.
- 밝은 OS 창 스타일(`bg-white`, `shadow-2xl`, `text-gray-500/700`, 활성 강조 `bg-violet-50 text-violet-700`/`bg-violet-500 text-white`)을 그대로 따른다.
- 커밋 메시지는 한글로 쓰고, `Co-Authored-By` 트레일러를 붙이지 않는다.
- `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/`가 기본 작업 디렉터리다. 아래 모든 상대 경로는 이 디렉터리 기준이다.

---

### Task 1: 데이터 모델 — `types.ts`

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/types.ts`

**Interfaces:**
- Produces: `ReferenceMode`, `ReferenceItem`, `DEFAULT_REFERENCE_MODE`.
- Consumes: 기존 `TracingImage`(변경 없음, 그대로 재사용).

- [ ] **Step 1: 타입·상수 추가**

`export const MIN_TRACING_SIZE = 8;` 줄(현재 105번째 줄) 다음, `export type Point = { x: number; y: number };` 앞에 추가:

```ts

export type ReferenceMode = "lookup" | "tracing"; // 참고 모드 / 트레이싱 모드

// 레퍼런스 창 하나가 다루는 통합 데이터 — 참고 모드로 보다가 트레이싱 모드로
// 전환해도 같은 이미지·id를 유지한다. 세션 메모리 전용, 저장 안 됨(TracingImage와
// 동일한 정책).
export type ReferenceItem = {
  id: string;
  image: HTMLImageElement | null; // 아직 안 불러왔으면 null
  mode: ReferenceMode;
  // 트레이싱 모드에 처음 들어갈 때 한 번만 채워지고, 이후 참고 모드로 돌아가도
  // 유지된다(모드를 오가도 캔버스 위 위치·크기·회전·투명도를 기억하기 위함).
  // TracingImage와 필드가 같지만 id/image가 빠진 부분집합이라 별도 타입으로 뺀다.
  tracingGeometry: Omit<TracingImage, "id" | "image"> | null;
};

export const DEFAULT_REFERENCE_MODE: ReferenceMode = "lookup";
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음(아직 이 타입들을 쓰는 코드가 없으므로 기존 동작에 영향 없음).

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/types.ts
git commit -m "feat: 레퍼런스 모드·항목 통합 타입 추가"
```

---

### Task 2: `ReferenceWindow.tsx` — 참고/트레이싱 듀얼 모드로 확장

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/ReferenceWindow.tsx`

**Interfaces:**
- Consumes: Task 1의 `ReferenceMode`, `TracingImage`(기존), `MIN_TRACING_SIZE`는 이 컴포넌트에서 직접 쓰지 않는다(캔버스 위 리사이즈는 `PixelCanvas.tsx`가 담당, 이 창은 표시·조정 트리거만).
- Produces: `ReferenceWindow` 컴포넌트의 새 props(아래 Step 2의 전체 시그니처). Task 4가 이 시그니처로 호출한다.

**중요 — 예상된 간극:** 이 태스크가 끝나면 `Editor.tsx`의 기존 `<ReferenceWindow ...>` 호출부(아직 옛날 props만 전달)가 새로 추가된 필수 prop들이 없어 타입 에러를 낸다 — **이건 정상이다.** Task 3·4가 그 호출부를 다시 배선할 때까지 남겨 둔다. 이 태스크는 `ReferenceWindow.tsx` 자체가 에러 없이 컴파일되는지만 확인한다.

- [ ] **Step 1: 전체 파일 교체**

`ReferenceWindow.tsx` 전체를 다음으로 교체한다(기존 로직은 최대한 그대로 유지하면서 모드 분기만 추가했다 — `git diff`로 리뷰할 때 어디가 진짜 바뀐 로직인지 알아보기 쉽도록, 아래 새 코드의 주석에 "(신규)"/"(기존과 동일)" 표시를 참고한다):

```tsx
"use client";

import { Minus, Pencil, Plus, X } from "lucide-react";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useImageFileLoader } from "./useImageFileLoader";
import {
  CURSOR_CROSSHAIR,
  CURSOR_GRAB,
  CURSOR_MOVE,
  CURSOR_NWSE_RESIZE,
  CURSOR_POINTING,
} from "./cursors";
import Magnifier, { MAGNIFIER_RADIUS, MagnifierGrid } from "./Magnifier";
import { ReferenceMode, TracingImage } from "./types";

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 360;
const MIN_WIDTH = 240;
const MIN_HEIGHT = 200;
// 트레이싱 모드일 때는 참고 모드처럼 뷰포트를 자유 리사이즈할 이유가 없다
// (TracingControlWindow가 쓰던 고정 폭을 그대로 가져온다) — 창 높이는 내용에
// 맞춰 자동으로 정해진다.
const TRACING_WINDOW_WIDTH = 220;
const TITLE_BAR_HEIGHT = 32;
const ZOOM_STEPS = [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8];
// 편집기 창(rootRef) 자체가 overflow-hidden이라, 이 창이 그 경계 밖으로 나가는
// 부분은 저절로 잘려 안 보이게 된다 — 그래서 완전히 가두지 않고, 최소한
// 제목표시줄의 일부(이 값만큼)만은 항상 안쪽에 남아있도록만 막는다. 그래야
// 아무리 멀리 밀어내도 다시 붙잡아 되돌릴 손잡이가 사라지지 않으면서도,
// 나머지 대부분은 자유롭게 밖으로 나가 잘려 보일 수 있다(예전엔 창 전체가
// 편집기 안에 완전히 갇혀 있어서 상단 바 쪽으로도 끝까지 밀어붙일 수
// 없었다). TITLE_BAR_HEIGHT보다 반드시 작아야 위쪽으로 나가는 게 허용된다.
const MIN_VISIBLE_PX = 16;
// 창을 여러 개 띄울 때 완전히 겹쳐 보이지 않도록 창마다 계단식으로 살짝씩
// 어긋난 기본 위치를 준다 — 실제 OS 창 관리자의 cascade 배치 관례와 같다.
const SPAWN_CASCADE_STEP = 28;
const SPAWN_CASCADE_WRAP = 8;

function nextZoomStep(current: number, direction: 1 | -1): number {
  const idx = ZOOM_STEPS.indexOf(current);
  if (idx === -1) return 1;
  return ZOOM_STEPS[
    Math.min(ZOOM_STEPS.length - 1, Math.max(0, idx + direction))
  ];
}

// 캔버스 네이티브 좌표(x,y) 한 칸의 색을 헥스로 뽑는다 — 스포이트로 실제
// 색을 뽑을 때와 확대경에 미리 보여줄 때 모두 이 함수 하나로 계산해, 확대경에
// 보이는 색과 실제로 뽑히는 색이 항상 일치하게 한다.
function sampleHex(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
): string | null {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const d = ctx.getImageData(x, y, 1, 1).data;
  return `#${[d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

// 편집기 세션 안에서 열고 닫는 일회성 레퍼런스 창 — 붙여넣거나 불러온 이미지를
// localStorage 등 어디에도 저장하지 않는다(닫으면 그냥 사라진다). 같은 이미지를
// 두 가지 방식으로 쓸 수 있다: 참고 모드(뷰포트로 확대·이동해 보면서 스포이트로
// 색을 뽑는다)와 트레이싱 모드(캔버스 배경에 깔아두고 이동·크기·회전을 조정하며
// 따라 그린다, 조정 자체는 캔버스 위에서 이루어지고 이 창은 트리거·투명도만
// 담당한다). 모드를 오가도 이미지와 트레이싱 지오메트리(위치·크기·회전)는
// 유지된다 — Editor가 이 두 가지를 이 창의 생애주기보다 오래 들고 있는다.
export default function ReferenceWindow({
  onClose,
  onPickColor,
  boundsRef,
  eyedropperActive,
  zIndex,
  spawnIndex,
  onFocus,
  mode,
  onModeChange,
  image,
  onImageLoaded,
  tracingGeometry,
  isAdjusting,
  onToggleAdjust,
  onOpacityChange,
}: {
  onClose: () => void;
  onPickColor: (hex: string) => void;
  // 이 창이 자유롭게 움직이고 커질 수는 있어도, 편집기 창(rootRef) 밖으로는
  // 나갈 수 없게 한다 — rootRef는 이미 편집기 창과 정확히 같은 크기·위치라
  // 별도의 가운데 정렬 계산 없이 그 경계를 그대로 쓰면 된다.
  boundsRef: RefObject<HTMLDivElement | null>;
  // 편집기에서 스포이트 도구를 선택한 상태일 때만(그리고 참고 모드일 때만
  // 실제로 뷰포트가 떠서 클릭할 수 있다) 클릭이 색 추출로 이어진다.
  eyedropperActive: boolean;
  // 여러 창을 동시에 띄울 수 있어, 마지막으로 만진 창이 항상 맨 앞에 오도록
  // Editor가 관리하는 z-index를 그대로 받아 쓴다.
  zIndex: number;
  // 창이 열릴 때 한 번만 정해지는 순번 — 기본 위치를 계단식으로 어긋나게
  // 배치하는 데만 쓰고, 포커스가 바뀌어도 값 자체는 변하지 않는다.
  spawnIndex: number;
  // 창의 아무 곳이나 누르면 Editor에 알려 이 창을 맨 앞으로 올리게 한다.
  onFocus: () => void;
  // (신규) 지금 이 창이 참고 모드인지 트레이싱 모드인지 — Editor의
  // ReferenceItem.mode를 그대로 받는다.
  mode: ReferenceMode;
  onModeChange: (mode: ReferenceMode) => void;
  // (신규) 이미지 자체는 이제 이 창의 로컬 상태가 아니라 Editor가 들고 있다 —
  // 모드를 오가도 같은 이미지를 써야 하므로 창 하나에 가둘 수 없다.
  image: HTMLImageElement | null;
  onImageLoaded: (image: HTMLImageElement) => void;
  // (신규) 트레이싱 모드 전용 지오메트리 — mode === "tracing"일 때만 읽는다.
  // 아직 한 번도 트레이싱 모드에 들어간 적 없으면 null(Editor가 처음 진입 시
  // 채워 준다).
  tracingGeometry: Omit<TracingImage, "id" | "image"> | null;
  // (신규) 지금 캔버스 위에서 이 항목의 이동·크기·회전 손잡이가 떠 있는지.
  isAdjusting: boolean;
  onToggleAdjust: () => void;
  // (신규) 트레이싱 지오메트리의 투명도만 바꾼다.
  onOpacityChange: (opacity: number) => void;
}) {
  const cascade = (spawnIndex % SPAWN_CASCADE_WRAP) * SPAWN_CASCADE_STEP;
  const [pos, setPos] = useState({ x: 160 + cascade, y: 110 + cascade });
  const [size, setSize] = useState({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });
  const [minimized, setMinimized] = useState(false);
  const [zoom, setZoom] = useState(1);
  const {
    loadFile,
    handleDrop,
    handlePasteFromClipboard,
    isDragOver,
    setIsDragOver,
  } = useImageFileLoader((img) => {
    onImageLoaded(img);
    setZoom(1);
  });
  // 캔버스 자체 배율(zoom)과는 별개로, "100%"가 실제 픽셀 1:1이 아니라
  // "지금 창 안에 이미지 전체가 보이는 크기"를 뜻하게 한다 — 메인 캔버스의
  // 배율 1 = 화면 맞춤 관례와 통일한다. 실제 표시 크기 = 원본 크기 ×
  // fitScale × zoom. (참고 모드 전용 — 트레이싱 모드는 안 쓴다.)
  const [fitScale, setFitScale] = useState(1);
  // 스포이트 도구가 활성화된 동안 커서를 따라다니는 확대경 위치 — 그리드
  // 좌표(캔버스 네이티브 픽셀)와 화면 좌표(확대경을 띄울 위치)를 함께 든다.
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const windowDragRef = useRef<{ offsetX: number; offsetY: number } | null>(
    null,
  );
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  // 클릭(색 추출)과 드래그(화면 이동)를 구분한다 — 손을 뗄 때까지 일정 거리
  // 이상 움직이지 않았으면 클릭으로 본다.
  const panRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);

  // (신규) 창의 실제 폭 — 참고 모드는 자유 리사이즈된 size.width, 트레이싱
  // 모드는 고정폭. clampPos·outer div 스타일이 모두 이 값을 쓴다.
  const windowWidth = mode === "tracing" ? TRACING_WINDOW_WIDTH : size.width;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || mode !== "lookup") return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0);
  }, [image, mode]);

  // 이미지를 새로 불러올 때마다 창 안에 전체가 들어오는 배율을 다시 잰다 —
  // 메인 캔버스의 "배율 1 = 화면 맞춤" 관례와 통일해, zoom=1(100%)이 실제
  // 픽셀 1:1이 아니라 "지금 창 안에 전체가 보이는 크기"를 뜻하게 한다.
  // (참고 모드 전용 — 트레이싱 모드는 뷰포트 자체가 없다.)
  useEffect(() => {
    const container = viewportRef.current;
    if (!container || !image || mode !== "lookup") return;
    const update = () => {
      const availW = container.clientWidth;
      const availH = container.clientHeight;
      if (availW === 0 || availH === 0) return;
      setFitScale(
        Math.min(availW / image.naturalWidth, availH / image.naturalHeight),
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [image, mode]);

  // 편집기 창(rootRef)에 transition-transform(scale)이 걸려 있어, 그 자식인
  // 이 창(position: fixed)의 containing block이 뷰포트가 아니라 rootRef
  // 자신이 된다 — 즉 top/left는 뷰포트 좌표가 아니라 rootRef 왼쪽 위를
  // 원점으로 하는 좌표로 해석된다. bounds도 같은 원점(로컬 좌표)으로 맞춰야
  // pos와 어긋나지 않는다(뷰포트 좌표로 재면 rootRef 자신의 화면 위치만큼
  // 항상 아래·오른쪽으로 밀려 보이는 문제가 있었다).
  const getBounds = useCallback(() => {
    const root = boundsRef.current;
    if (!root) return null;
    const rect = root.getBoundingClientRect();
    return { left: 0, top: 0, right: rect.width, bottom: rect.height };
  }, [boundsRef]);

  // 마우스의 뷰포트 좌표(clientX/Y)를 rootRef 기준 로컬 좌표로 바꾼다 —
  // pos/bounds가 모두 이 좌표계를 쓰므로 드래그 계산도 항상 이걸 거친다.
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
      const minX = bounds.left + MIN_VISIBLE_PX - windowWidth;
      const maxX = bounds.right - MIN_VISIBLE_PX;
      const minY = bounds.top + MIN_VISIBLE_PX - TITLE_BAR_HEIGHT;
      const maxY = bounds.bottom - MIN_VISIBLE_PX;
      return {
        x: Math.min(Math.max(nextPos.x, minX), maxX),
        y: Math.min(Math.max(nextPos.y, minY), maxY),
      };
    },
    [getBounds, windowWidth],
  );

  // 창이 뜬 직후, 그리고 브라우저 창 크기가 바뀌어 배경화면 상자 자체가
  // 작아질 때도 손잡이(제목표시줄 일부)가 화면 밖으로 완전히 나가지 않게
  // 다시 당겨 넣는다.
  useEffect(() => {
    setPos((p) => clampPos(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const handler = () => {
      setPos((p) => clampPos(p));
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [clampPos]);

  // 제목표시줄을 드래그해 창을 옮긴다 — pos는 rootRef 기준 로컬 좌표이므로
  // 마우스의 뷰포트 좌표(clientX/Y)도 먼저 로컬로 바꿔야 어긋나지 않는다.
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

  const handleResizeDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: size.width,
        startHeight: size.height,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [size],
  );
  const handleResizeMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!resizeRef.current) return;
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      const bounds = getBounds();
      const maxWidth = bounds ? bounds.right - pos.x : Infinity;
      const maxHeight = bounds ? bounds.bottom - pos.y : Infinity;
      setSize({
        width: Math.min(
          maxWidth,
          Math.max(MIN_WIDTH, resizeRef.current.startWidth + dx),
        ),
        height: Math.min(
          maxHeight,
          Math.max(MIN_HEIGHT, resizeRef.current.startHeight + dy),
        ),
      });
    },
    [getBounds, pos],
  );
  const handleResizeUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  // Ctrl/Cmd+휠로 확대·축소 — 메인 캔버스와 같은 관례. (참고 모드 전용.)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => nextZoomStep(z, e.deltaY < 0 ? 1 : -1));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const container = viewportRef.current;
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: container?.scrollLeft ?? 0,
        scrollTop: container?.scrollTop ?? 0,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );
  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (eyedropperActive) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const x = Math.floor(
            ((e.clientX - rect.left) / rect.width) * canvas.width,
          );
          const y = Math.floor(
            ((e.clientY - rect.top) / rect.height) * canvas.height,
          );
          setHover(
            x >= 0 && y >= 0 && x < canvas.width && y < canvas.height
              ? { x, y, screenX: e.clientX, screenY: e.clientY }
              : null,
          );
        }
      } else if (hover) {
        setHover(null);
      }

      const p = panRef.current;
      if (!p) return;
      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) p.moved = true;
      const container = viewportRef.current;
      if (container && p.moved) {
        container.scrollLeft = p.scrollLeft - dx;
        container.scrollTop = p.scrollTop - dy;
      }
    },
    [eyedropperActive, hover],
  );
  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const p = panRef.current;
      panRef.current = null;
      if (!p || p.moved) return;
      if (!eyedropperActive) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(
        ((e.clientX - rect.left) / rect.width) * canvas.width,
      );
      const y = Math.floor(
        ((e.clientY - rect.top) / rect.height) * canvas.height,
      );
      const hex = sampleHex(canvas, x, y);
      if (hex) onPickColor(hex);
    },
    [onPickColor, eyedropperActive],
  );

  return (
    <div
      className="pointer-events-auto fixed flex flex-col bg-white shadow-2xl"
      style={{
        left: pos.x,
        top: pos.y,
        width: windowWidth,
        height: minimized || mode === "tracing" ? undefined : size.height,
        zIndex,
      }}
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
        <span>레퍼런스</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized((m) => !m)}
            onPointerDown={(e) => e.stopPropagation()}
            title={minimized ? "펼치기" : "최소화"}
            className="flex h-5 w-5 items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            title="닫기(저장되지 않고 사라집니다)"
            className="flex h-5 w-5 items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* (신규) 모드 토글 — 참고 모드는 같은 이미지를 뷰포트로 보고,
              트레이싱 모드는 캔버스 배경에 깔아 따라 그린다. */}
          <div className="flex shrink-0 border-b border-gray-100 text-[10px]">
            <button
              onClick={() => onModeChange("lookup")}
              className={`flex-1 py-1 ${
                mode === "lookup"
                  ? "bg-violet-50 font-semibold text-violet-700"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              참고
            </button>
            <button
              onClick={() => onModeChange("tracing")}
              className={`flex-1 py-1 ${
                mode === "tracing"
                  ? "bg-violet-50 font-semibold text-violet-700"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              트레이싱
            </button>
          </div>

          {!image ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center transition-colors ${
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
          ) : mode === "lookup" ? (
            <>
              <div
                ref={viewportRef}
                className="flex flex-1 [align-items:safe_center] [justify-content:safe_center] overflow-auto bg-gray-50"
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  onPointerLeave={() => setHover(null)}
                  className="touch-none shadow-sm"
                  style={{
                    imageRendering: "pixelated",
                    width: image.naturalWidth * fitScale * zoom,
                    height: image.naturalHeight * fitScale * zoom,
                    cursor: eyedropperActive ? CURSOR_CROSSHAIR : CURSOR_GRAB,
                  }}
                />
              </div>
              {eyedropperActive &&
                hover &&
                (() => {
                  const canvas = canvasRef.current;
                  if (!canvas) return null;
                  const grid: MagnifierGrid = [];
                  for (
                    let dy = -MAGNIFIER_RADIUS;
                    dy <= MAGNIFIER_RADIUS;
                    dy++
                  ) {
                    const row: (string | null)[] = [];
                    for (
                      let dx = -MAGNIFIER_RADIUS;
                      dx <= MAGNIFIER_RADIUS;
                      dx++
                    ) {
                      row.push(sampleHex(canvas, hover.x + dx, hover.y + dy));
                    }
                    grid.push(row);
                  }
                  return (
                    <Magnifier
                      screenX={hover.screenX}
                      screenY={hover.screenY}
                      grid={grid}
                      centerHex={sampleHex(canvas, hover.x, hover.y)}
                    />
                  );
                })()}
              <div className="flex items-center justify-between gap-2 bg-gray-50 px-2 py-1">
                <span className="truncate text-[9px] text-gray-400">
                  {eyedropperActive
                    ? "클릭: 색 추출 · 드래그: 이동 · Ctrl/Cmd+휠: 확대"
                    : "드래그: 이동 · Ctrl/Cmd+휠: 확대 · 스포이트 도구 선택 시 클릭으로 색 추출"}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => setZoom((z) => nextZoomStep(z, -1))}
                    disabled={zoom <= ZOOM_STEPS[0]}
                    title="축소"
                    className="flex h-5 w-5 items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-9 text-center text-[9px] tabular-nums text-gray-500">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => nextZoomStep(z, 1))}
                    disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                    title="확대"
                    className="flex h-5 w-5 items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            // (신규) 트레이싱 모드 본문 — TracingControlWindow.tsx에서 흡수.
            <div className="flex flex-col gap-2 p-2">
              <img
                src={image.src}
                alt=""
                className="h-16 w-full bg-gray-50 object-contain"
              />
              <label className="flex items-center gap-2 text-[10px] text-gray-500">
                투명도
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((tracingGeometry?.opacity ?? 1) * 100)}
                  onChange={(e) =>
                    onOpacityChange(Number(e.target.value) / 100)
                  }
                  className="flex-1"
                />
                <span className="w-7 shrink-0 text-right">
                  {Math.round((tracingGeometry?.opacity ?? 1) * 100)}%
                </span>
              </label>
              <button
                onClick={onToggleAdjust}
                className={`flex items-center justify-center gap-1 px-2 py-1 text-[10px] ${
                  isAdjusting
                    ? "bg-violet-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Pencil className="h-3 w-3" />
                {isAdjusting ? "조정 중" : "조정"}
              </button>
            </div>
          )}
          {/* 크기 조절 손잡이 — 참고 모드에서만, 우하단 모서리를 드래그하면
              늘고 준다(트레이싱 모드는 고정폭·자동높이라 리사이즈가 없다). */}
          {mode === "lookup" && (
            <div
              onPointerDown={handleResizeDown}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeUp}
              onPointerCancel={handleResizeUp}
              title="드래그해서 창 크기 조절"
              className="absolute right-0 bottom-0 h-4 w-4 touch-none"
              style={{
                cursor: CURSOR_NWSE_RESIZE,
                background:
                  "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.2) 50%)",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: `ReferenceWindow.tsx` 자체는 에러 없음. `Editor.tsx`의 `<ReferenceWindow ...>` 호출부에서 새 필수 prop들이 없다는 타입 에러가 날 것이다 — 이는 Task 4까지 **예상된 실패**로 남겨둔다(Task 5의 `PixelCanvas` 확장 때와 같은 패턴).

- [ ] **Step 3: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/ReferenceWindow.tsx
git commit -m "feat: ReferenceWindow가 참고/트레이싱 듀얼 모드를 지원하도록 확장"
```

---

### Task 3: `Editor.tsx` (1/2) — 통합 상태·핸들러 추가(기존 것은 그대로 둠)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`

**Interfaces:**
- Consumes: Task 1의 `ReferenceItem`/`ReferenceMode`/`DEFAULT_REFERENCE_MODE`.
- Produces: `referenceItems`, `activeReferenceId` 상태와 `handleReferenceImageLoaded`, `handleReferenceListAdd`, `handleReferenceModeChange`, `handleReferenceOpacityChange`, `handleReferenceDelete`, `handleToggleReferenceAdjust`, `handleActiveReferenceGeometryChange`, `handleReferenceDeselect`, `tracingCanvasImages`, `activeTracingCanvasImage` — Task 4가 이걸로 JSX를 다시 배선한다.

이 태스크는 **순수 추가**다 — 기존 `tracingMode`/`tracingImages`/`tracingWindows`/`handleTracing*`/`closeReferenceWindow` 등은 전혀 건드리지 않는다(아직 JSX가 그것들을 쓰고 있으므로). Task 4가 JSX를 새 것으로 바꾸면서 옛 것들을 정리한다.

- [ ] **Step 1: import 추가**

`./types` import 블록에서 `SELECT_TOOL_CATEGORY,` 다음 줄(현재 96번째 줄 부근)에 `ReferenceItem`을, `Tool,` 다음 줄에 `TracingImage,`가 이미 있으므로 그 사이 알파벳 순서에 맞게 추가한다. 정확히는 현재:

```ts
  SELECT_TOOL_CATEGORY,
  SelectMode,
  Tool,
  TracingImage,
  ZOOM_STEPS,
} from "./types";
```

를 다음으로 교체:

```ts
  ReferenceItem,
  ReferenceMode,
  SELECT_TOOL_CATEGORY,
  SelectMode,
  Tool,
  TracingImage,
  ZOOM_STEPS,
} from "./types";
```

(참고: `DEFAULT_REFERENCE_MODE`는 `DEFAULT_FRAME_DURATION_MS`와 `DEFAULT_TRACING_OPACITY` 사이, 알파벳 순서에 맞춰 같은 import 블록에 추가한다.)

- [ ] **Step 2: 통합 상태·핸들러 추가**

`handleTracingDeselect` 선언 끝(Task 2 이전 기준 현재 494~496번째 줄, `const [showGrid, setShowGrid] = useState(true);` 바로 앞) 다음에 추가한다 — 기존 `handleTracingDeselect` 코드는 지우지 않고, 그 뒤에 새 블록을 이어 붙인다:

```ts
  // (신규) 레퍼런스/트레이싱 통합 — 레퍼런스 항목 하나가 참고 모드와
  // 트레이싱 모드를 오갈 수 있다. referenceItems가 그 데이터(이미지·모드·
  // 트레이싱 지오메트리)를 들고, referenceWindows(기존)가 창 UI 상태(위치·
  // z-index)를 든다 — 이 둘은 id로 짝을 이루는 병렬 배열이다.
  const [referenceItems, setReferenceItems] = useState<ReferenceItem[]>([]);
  // 지금 캔버스 위에서 이동·크기·회전 손잡이가 떠 있는 대상 — 트레이싱
  // 모드인 항목에만 의미가 있다(참고 모드에서는 "조정" 버튼 자체가 없다).
  const [activeReferenceId, setActiveReferenceId] = useState<string | null>(
    null,
  );
  // 이미지를 처음 불러왔을 때 데이터 항목을 만든다 — 기본 모드는 참고 모드.
  // id는 wide에서는 미리 만들어 둔 referenceWindows 항목의 id를 그대로
  // 받고, narrow(handleReferenceListAdd)에서는 새로 만든다.
  const handleReferenceImageLoaded = useCallback(
    (id: string, image: HTMLImageElement) => {
      setReferenceItems((items) => [
        ...items,
        {
          id,
          image,
          mode: DEFAULT_REFERENCE_MODE,
          tracingGeometry: null,
        },
      ]);
    },
    [],
  );
  // narrow의 TracingListPanel은 wide처럼 미리 만들어 둔 "빈 창"이 없다 —
  // 이미지를 고르는 즉시 새 id로 바로 추가하되, narrow는 참고 모드 뷰가
  // 없으므로 트레이싱 모드로 강제하고 지오메트리도 바로 계산해 채운다
  // (캔버스에 맞춰 가운데 정렬한 fit 크기 — ReferenceWindow의 fitScale과
  // 같은 관례: 배율 1 = 화면 맞춤).
  const handleReferenceListAdd = useCallback(
    (image: HTMLImageElement) => {
      const id = uid();
      const fitScale = Math.min(
        doc.width / image.naturalWidth,
        doc.height / image.naturalHeight,
      );
      const w = image.naturalWidth * fitScale;
      const h = image.naturalHeight * fitScale;
      setReferenceItems((items) => [
        ...items,
        {
          id,
          image,
          mode: "tracing",
          tracingGeometry: {
            x: (doc.width - w) / 2,
            y: (doc.height - h) / 2,
            width: w,
            height: h,
            rotationDeg: 0,
            opacity: DEFAULT_TRACING_OPACITY,
          },
        },
      ]);
    },
    [doc.width, doc.height],
  );
  // 모드를 바꾼다. "tracing"으로 처음 들어가는 순간(tracingGeometry가 아직
  // null)이면 캔버스에 맞춰 가운데 정렬한 fit 크기로 한 번만 채운다 — 이미
  // 값이 있으면(참고 모드를 거쳐 다시 트레이싱으로 돌아온 경우) 그대로
  // 둔다(모드를 오가도 위치를 기억). 반대로 "tracing"에서 다른 모드로
  // 바뀌는데 그 항목이 조정 중이었다면 조정 상태도 함께 해제한다 — 안
  // 그러면 손잡이가 안 보이는 모드를 거쳤다가 나중에 다시 트레이싱으로
  // 돌아왔을 때 손잡이가 뜬금없이 다시 나타난다.
  const handleReferenceModeChange = useCallback(
    (id: string, mode: ReferenceMode) => {
      setReferenceItems((items) =>
        items.map((r) => {
          if (r.id !== id) return r;
          if (mode !== "tracing" || r.tracingGeometry || !r.image) {
            return { ...r, mode };
          }
          const fitScale = Math.min(
            doc.width / r.image.naturalWidth,
            doc.height / r.image.naturalHeight,
          );
          const w = r.image.naturalWidth * fitScale;
          const h = r.image.naturalHeight * fitScale;
          return {
            ...r,
            mode,
            tracingGeometry: {
              x: (doc.width - w) / 2,
              y: (doc.height - h) / 2,
              width: w,
              height: h,
              rotationDeg: 0,
              opacity: DEFAULT_TRACING_OPACITY,
            },
          };
        }),
      );
      if (mode !== "tracing") {
        setActiveReferenceId((cur) => (cur === id ? null : cur));
      }
    },
    [doc.width, doc.height],
  );
  const handleReferenceOpacityChange = useCallback(
    (id: string, opacity: number) => {
      setReferenceItems((items) =>
        items.map((r) =>
          r.id === id && r.tracingGeometry
            ? { ...r, tracingGeometry: { ...r.tracingGeometry, opacity } }
            : r,
        ),
      );
    },
    [],
  );
  // 창의 닫기(X)와 narrow 리스트 패널의 삭제 버튼이 공유하는 단일 삭제
  // 핸들러 — 창 항목과 데이터 항목을 함께 지우고, 지금 그 항목을 조정
  // 중이었다면 조정 상태도 함께 해제한다.
  const handleReferenceDelete = useCallback((id: string) => {
    setReferenceWindows((ws) => ws.filter((w) => w.id !== id));
    setReferenceItems((items) => items.filter((r) => r.id !== id));
    setActiveReferenceId((cur) => (cur === id ? null : cur));
  }, []);
  const handleToggleReferenceAdjust = useCallback((id: string) => {
    setActiveReferenceId((cur) => (cur === id ? null : id));
  }, []);
  const activeReferenceItem =
    referenceItems.find((r) => r.id === activeReferenceId) ?? null;
  const handleActiveReferenceGeometryChange = useCallback(
    (
      patch: Partial<
        Pick<TracingImage, "x" | "y" | "width" | "height" | "rotationDeg">
      >,
    ) => {
      setReferenceItems((items) =>
        items.map((r) =>
          r.id === activeReferenceId && r.tracingGeometry
            ? { ...r, tracingGeometry: { ...r.tracingGeometry, ...patch } }
            : r,
        ),
      );
    },
    [activeReferenceId],
  );
  const handleReferenceDeselect = useCallback(() => {
    setActiveReferenceId(null);
  }, []);
  // PixelCanvas·narrow 리스트 패널(둘 다 TracingImage[]를 받는다)에 넘길
  // 배열 — 이미지가 있고 트레이싱 모드인 항목만 걸러 TracingImage 모양으로
  // 편다. 이 파생 하나를 두 소비처가 함께 쓴다.
  const tracingCanvasImages: TracingImage[] = referenceItems
    .filter(
      (
        r,
      ): r is ReferenceItem & {
        image: HTMLImageElement;
        tracingGeometry: NonNullable<ReferenceItem["tracingGeometry"]>;
      } =>
        r.mode === "tracing" && r.image !== null && r.tracingGeometry !== null,
    )
    .map((r) => ({ id: r.id, image: r.image, ...r.tracingGeometry }));
  const activeTracingCanvasImage: TracingImage | null =
    activeReferenceItem?.mode === "tracing" &&
    activeReferenceItem.image &&
    activeReferenceItem.tracingGeometry
      ? {
          id: activeReferenceItem.id,
          image: activeReferenceItem.image,
          ...activeReferenceItem.tracingGeometry,
        }
      : null;
```

- [ ] **Step 3: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: `ReferenceWindow.tsx` 호출부의 기존 타입 에러(Task 2에서 예상된 것)는 여전히 남아있다 — 그 외 새 에러는 없어야 한다. `tracingCanvasImages`/`activeTracingCanvasImage` 등 새로 만든 값들을 아직 아무 데도 안 쓴다는 "미사용" 경고가 날 수 있다 — Task 4에서 쓰이므로 지금은 무시하고 넘어간다.

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git commit -m "feat: Editor에 레퍼런스/트레이싱 통합 상태·핸들러 추가"
```

---

### Task 4: `Editor.tsx` (2/2) — JSX 재배선 + 옛 코드 정리(기능 완성)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx`
- Delete: `app/(portfolio)/playground/_sections/Works/5_PixelArtMaker/TracingControlWindow.tsx`

**Interfaces:**
- Consumes: Task 2의 `ReferenceWindow` 새 props, Task 3의 모든 상태·핸들러·파생값.

이 태스크가 끝나면 병합이 실제로 동작한다 — 지금까지의 모든 태스크가 여기서 하나로 합쳐진다. 옛 트레이싱 전용 코드(`tracingMode`, `tracingImages`, `tracingWindows`, `openTracingWindow`, `bringTracingWindowToFront`, `toggleTracingWindowMinimized`, `handleTracingImageLoaded`, `handleTracingListAdd`, `handleTracingOpacityChange`, `handleTracingDelete`, `handleToggleTracingAdjust`, `activeTracingImage`, `handleActiveTracingChange`, `handleTracingDeselect`, `closeReferenceWindow`, `TracingControlWindow` import)를 이 태스크에서 전부 지운다 — Step 2~6에서 그 자리를 대신하는 JSX가 들어가면 더는 아무도 참조하지 않게 되기 때문이다.

- [ ] **Step 1: import 정리**

`import TracingControlWindow from "./TracingControlWindow";` 줄을 삭제한다(`import TracingListPanel from "./TracingListPanel";`는 그대로 둔다 — narrow에서 계속 쓴다).

- [ ] **Step 2: 옛 트레이싱 전용 상태·핸들러 삭제**

Task 3에서 추가한 새 블록 **바로 앞**에 있는, `// 트레이싱 모드 — 캔버스 배경에 참고 이미지를 깔아두고 따라 그리는 기능.` 주석부터 `const handleTracingDeselect = useCallback(() => { setActiveTracingId(null); }, []);` 끝까지(현재 387~496번째 줄 부근 — 정확히는 Task 3에서 새로 추가한 블록의 시작 지점 바로 앞까지) 전체를 **삭제**한다. 삭제 범위를 정확히 확인하는 방법: `const [tracingMode, setTracingMode] = useState(false);`로 시작해서 Task 3에서 추가한 `// (신규) 레퍼런스/트레이싱 통합` 주석 직전까지가 삭제 대상이다.

같은 방식으로, `openReferenceWindow`와 `bringReferenceWindowToFront` 선언 사이에 있는 다음 블록도 삭제한다(정확한 텍스트로 검색해서 찾는다):

```ts
  const closeReferenceWindow = useCallback((id: string) => {
    setReferenceWindows((ws) => ws.filter((w) => w.id !== id));
  }, []);
```

`handleReferenceDelete`(Task 3)가 창 항목과 데이터 항목을 함께 지우는 더 완전한 버전이라 이제 안 쓴다.

- [ ] **Step 3: 메뉴 바를 "레퍼런스" 버튼 하나로 축소**

기존(Task 2 이전 기준 현재 2444~2476번째 줄 부근):

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

다음으로 교체:

```tsx
        {!narrow && (
          <button
            onClick={openReferenceWindow}
            title="참고 이미지 창을 새로 엽니다. 참고 모드(뷰포트로 보기)와 트레이싱 모드(캔버스 배경에 깔아 따라 그리기)를 창 안에서 오갈 수 있습니다. 여러 개를 동시에 띄울 수 있습니다(저장되지 않음)"
            className={`px-2 py-1 text-xs ${
              referenceWindows.length > 0
                ? "bg-violet-50 text-violet-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            레퍼런스
          </button>
        )}
```

(narrow에서는 여전히 이 버튼 자체를 숨긴다 — 참고 모드의 자유 드래그 뷰포트 UX가 narrow에 안 맞는다는 기존 판단은 유지, narrow는 아래 Step 5의 아이콘 컬럼 진입점을 쓴다.)

- [ ] **Step 4: `<PixelCanvas>`에 새 파생값 전달**

기존(Task 5 이전 기준 현재 2691~2694번째 줄 부근):

```tsx
                    tracingImages={tracingMode ? tracingImages : []}
                    activeTracingImage={tracingMode ? activeTracingImage : null}
                    onActiveTracingChange={handleActiveTracingChange}
                    onActiveTracingDeselect={handleTracingDeselect}
```

다음으로 교체(전역 on/off 플래그가 없어졌으므로 삼항 없이 파생값을 그대로 넘긴다 — `PixelCanvas`가 받는 prop 이름·타입은 안 바뀐다):

```tsx
                    tracingImages={tracingCanvasImages}
                    activeTracingImage={activeTracingCanvasImage}
                    onActiveTracingChange={handleActiveReferenceGeometryChange}
                    onActiveTracingDeselect={handleReferenceDeselect}
```

- [ ] **Step 5: narrow 아이콘 컬럼 — "트레이싱" → "레퍼런스", 상시 노출**

기존(현재 2936~2952번째 줄 부근):

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

다음으로 교체(Layers/Import/Export 버튼과 동일하게 조건 없이 항상 노출 — `openFloatingPanel`의 `"tracing"` 값 자체는 그대로 재사용한다, 타입을 다시 바꿀 필요 없음):

```tsx
                  <button
                    onClick={() =>
                      setOpenFloatingPanel((p) =>
                        p === "tracing" ? null : "tracing",
                      )
                    }
                    title="레퍼런스"
                    className={`flex h-8 w-8 items-center justify-center transition-colors ${
                      openFloatingPanel === "tracing"
                        ? "bg-violet-500 text-white"
                        : "bg-white text-gray-500 shadow-md hover:bg-gray-50"
                    }`}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
```

`panelTitle` 계산(현재 2845~2852번째 줄 부근)의 마지막 분기 `"트레이싱"`도 `"레퍼런스"`로 바꾼다:

```ts
              const panelTitle =
                openFloatingPanel === "layers"
                  ? "레이어"
                  : openFloatingPanel === "import"
                    ? "이미지 불러오기"
                    : openFloatingPanel === "export"
                      ? "내보내기"
                      : "레퍼런스";
```

`TracingListPanel` 호출부(현재 2973~2983번째 줄 부근)의 데이터 소스를 새 파생값으로 교체:

```tsx
                          <TracingListPanel
                            tracingImages={tracingCanvasImages}
                            activeTracingId={activeReferenceId}
                            onAdd={handleReferenceListAdd}
                            onOpacityChange={handleReferenceOpacityChange}
                            onToggleAdjust={(id) => {
                              handleToggleReferenceAdjust(id);
                              setOpenFloatingPanel(null);
                            }}
                            onDelete={handleReferenceDelete}
                          />
```

- [ ] **Step 6: 창 렌더링 통합 — `referenceWindows.map` 하나로**

기존(현재 3301~3333번째 줄 부근, `<ReferenceWindow>` 블록과 `{tracingMode && tracingWindows.map(...)}` 블록 둘 다):

```tsx
      {referenceWindows.map((w) => (
        <ReferenceWindow
          key={w.id}
          boundsRef={rootRef}
          eyedropperActive={tool === "eyedropper"}
          onPickColor={handlePickColor}
          onClose={() => closeReferenceWindow(w.id)}
          zIndex={w.zIndex}
          spawnIndex={w.spawnIndex}
          onFocus={() => bringReferenceWindowToFront(w.id)}
        />
      ))}

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

다음 **하나**로 교체:

```tsx
      {referenceWindows.map((w) => {
        const item = referenceItems.find((r) => r.id === w.id) ?? null;
        return (
          <ReferenceWindow
            key={w.id}
            boundsRef={rootRef}
            eyedropperActive={tool === "eyedropper"}
            onPickColor={handlePickColor}
            onClose={() => handleReferenceDelete(w.id)}
            zIndex={w.zIndex}
            spawnIndex={w.spawnIndex}
            onFocus={() => bringReferenceWindowToFront(w.id)}
            mode={item?.mode ?? DEFAULT_REFERENCE_MODE}
            onModeChange={(mode) => handleReferenceModeChange(w.id, mode)}
            image={item?.image ?? null}
            onImageLoaded={(image) => handleReferenceImageLoaded(w.id, image)}
            tracingGeometry={item?.tracingGeometry ?? null}
            isAdjusting={activeReferenceId === w.id}
            onToggleAdjust={() => handleToggleReferenceAdjust(w.id)}
            onOpacityChange={(opacity) =>
              handleReferenceOpacityChange(w.id, opacity)
            }
          />
        );
      })}
```

- [ ] **Step 7: `TracingControlWindow.tsx` 삭제**

```bash
rm app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/TracingControlWindow.tsx
```

- [ ] **Step 8: 타입 검사**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: 에러 없음 — Task 2·3에서 남겨둔 "예상된 실패"가 여기서 전부 해소되어야 한다. `tracingMode`/`activeTracingId` 등 옛 이름을 참조하는 코드가 하나라도 남아있으면 `Cannot find name` 에러가 나므로, 그런 에러가 있다면 Step 2의 삭제 범위를 놓친 것이다.

- [ ] **Step 9: 브라우저 수동 확인 (전체 시나리오)**

Run: `npm run dev` → `/nemo-nemo-beam` 접속.

1. 메뉴 바에 "레퍼런스" 버튼 하나만 있는지(옛 "트레이싱"/"+ 이미지" 버튼이 사라졌는지) 확인.
2. "레퍼런스"를 눌러 새 창을 연다 — 제목표시줄 아래 "참고 | 트레이싱" 토글이 보이는지, 기본이 "참고"로 선택돼 있는지 확인.
3. 이미지를 파일 선택/드래그드롭/클립보드 붙여넣기로 불러온다 — 참고 모드 뷰포트(확대·이동·스포이트)가 기존과 동일하게 동작하는지 확인.
4. "트레이싱" 탭을 누른다 — 창 본문이 썸네일+투명도 슬라이더+"조정" 버튼으로 바뀌고, 캔버스 배경에 그 이미지가 은은하게(기본 투명도 50%) 나타나는지 확인.
5. "조정"을 눌러 캔버스 위에서 이동·크기·회전 손잡이로 조작해본다 — 정상 동작 확인.
6. 다시 "참고" 탭으로 돌아간다 — 캔버스에서 이미지가 사라지고(트레이싱 모드가 아니므로) 뷰포트가 다시 보이는지, "조정" 손잡이도 캔버스에서 사라지는지 확인.
7. 다시 "트레이싱" 탭으로 돌아간다 — 아까 조정했던 위치·크기·회전·투명도가 그대로 유지돼 있는지(기억) 확인.
8. 창을 최소화(➖)했다가 펼쳐서 정상 동작하는지 확인.
9. 창을 여러 개 열어 각각 독립적으로 모드를 다르게(하나는 참고, 하나는 트레이싱) 설정해도 서로 간섭 없이 동작하는지 확인.
10. 창을 닫으면(X) 데이터도 함께 사라지는지(다시 열어도 안 남아있는지) 확인.
11. 편집기를 narrow로 좁힌다 — 사이드 아이콘 컬럼에 "레퍼런스" 아이콘이 (열린 항목이 없어도) 항상 보이는지 확인. 클릭해 리스트 팝업을 열고 "+ 이미지 추가"로 이미지를 불러오면 바로 트레이싱 모드로 캔버스에 나타나는지, "조정"을 누르면 팝업이 닫히고 캔버스 손잡이가 뜨는지 확인.
12. 저장(Ctrl/Cmd+S) 후 다시 열어 레퍼런스 데이터가 전혀 저장되지 않고 그림 자체는 정상인지 확인.

- [ ] **Step 10: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/Editor.tsx
git rm app/\(portfolio\)/playground/_sections/Works/5_PixelArtMaker/TracingControlWindow.tsx
git commit -m "feat: 레퍼런스 창과 트레이싱 모드를 하나로 통합해 기능 완성"
```

---

### Task 5: 전체 빌드 확인

**Files:** 없음(검증 전용 태스크).

- [ ] **Step 1: 프로덕션 빌드**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 2: 다른 Work·페이지 회귀 확인(수동)**

`/playground`에서 다른 Work를 열어 정상 동작하는지 확인한다 — 이번 플랜은 `assetLibrary.ts`(저장 포맷)를 건드리지 않으므로 영향이 없어야 한다.

- [ ] **Step 3: 커밋(변경 사항이 있는 경우에만)**

이 태스크에서 코드 변경이 없다면 커밋할 것이 없다.
