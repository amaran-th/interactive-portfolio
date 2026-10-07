# 네모네모빔 모바일 핀치 줌 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 네모네모빔 모바일 캔버스에 두 손가락 핀치 줌 제스처를 추가하고, 좌하단에 상시 노출되던 배율 숫자를 모바일에서만 캔버스 위 상단 중앙의 일시적 배지로 대체한다.

**Architecture:** 핀치 감지는 `PixelCanvas.tsx` 안에 기존 도구별 포인터 핸들러와 완전히 분리된 `window` 레벨 포인터 리스너로 구현한다(한쪽 손가락이 캔버스 바깥 여백에 닿아도 놓치지 않기 위해). 두 번째 손가락이 닿으면 이미 있는 `handlePointerCancel`(=`handlePointerUp`, 인자 없이 호출 가능한 멱등 함수)을 그대로 불러 진행 중이던 스트로크를 커밋하고 핀치로 전환한다. 줌 값은 `ZOOM_STEPS`에 맞추지 않고 자유 연속값으로 계산하며, 핀치 중심점이 화면에서 고정되도록 `viewportRef`의 스크롤 위치를 `CANVAS_PAN_PADDING` 기준 공식(이미 `Editor.tsx`의 `artViewRect` 계산에 쓰이는 것과 같은 공식)으로 보정한다. 배율 배지는 `Editor.tsx`가 핀치 활성 여부(PixelCanvas의 새 콜백)와 +/- 버튼 탭 여부(900ms 타이머)를 합쳐 계산해 `MobileEditorShell.tsx`에 내려준다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4. 자동 테스트 없음 — `npx tsc --noEmit -p apps/services/tsconfig.json` + `npm run lint --workspace services`(레포 루트에서 실행, baseline: 0 errors, 9 warnings — 전부 이 작업과 무관한 기존 경고).

**Spec:** `docs/superpowers/specs/2026-10-06-nemo-nemo-beam-mobile-pinch-zoom-design.md`

## Global Constraints

- 팬(두 손가락 드래그로 캔버스 이동)은 이번 범위 밖 — 줌만 구현한다.
- `ZOOM_STEPS` 배열·`nextZoomStep` 함수는 변경하지 않는다. 핀치 중엔 배열에 맞지 않는 연속값을 쓰고, `[ZOOM_STEPS[0], ZOOM_STEPS[마지막]] = [0.1, 8]` 범위로 클램프한다.
- `PixelCanvas.tsx`의 도구별(펜슬·지우개·도형·선택 등) 그리기 로직은 건드리지 않는다. 스트로크 중단은 이미 있는 `handlePointerCancel` 재사용만으로 해결한다(새 취소 로직 없음).
- 좌하단 `{canvasZoom}x` 텍스트는 **모바일(`narrow`)에서만** 제거한다. 데스크탑은 변경 없음. +/- 버튼은 양쪽 다 그대로 둔다.
- 각 Task가 끝난 시점에 `npx tsc --noEmit -p apps/services/tsconfig.json`과 `npm run lint --workspace services`가 baseline(0 errors, 9 warnings)과 동일해야 한다. 레포 루트(`/Users/seyeon/Documents/github_projects/interactive-portfolio`)에서 실행.

---

## Task 1: `PixelCanvas.tsx`에 핀치 줌 감지 엔진 추가

이 Task는 `PixelCanvas.tsx` 한 파일만 건드린다. 새 prop `onPinchActiveChange`는 선택적(optional)이라, 이 Task가 끝난 시점에 `Editor.tsx`를 전혀 수정하지 않아도 타입 에러 없이 빌드되고 핀치 줌 자체는 이미 동작한다(배지 UI는 Task 2에서 추가).

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/PixelCanvas.tsx`

**Interfaces:**
- Produces: `PixelCanvas`의 새 prop `onPinchActiveChange?: (active: boolean) => void` — Task 2의 `Editor.tsx`가 이 prop에 콜백을 넘겨 배지 표시 여부를 계산한다.

- [ ] **Step 1: import에 `ZOOM_STEPS`·`CANVAS_PAN_PADDING` 추가**

```tsx
import {
  MIN_TRACING_SIZE,
  nextZoomStep,
  Point,
  SelectMode,
  Tool,
  TracingImage,
} from "./types";
```

를

```tsx
import {
  CANVAS_PAN_PADDING,
  MIN_TRACING_SIZE,
  nextZoomStep,
  Point,
  SelectMode,
  Tool,
  TracingImage,
  ZOOM_STEPS,
} from "./types";
```

로 교체한다(파일 51-58번째 줄 부근).

- [ ] **Step 2: `onZoomChange` 다음에 새 prop 추가 (구조분해 + 타입)**

```tsx
  zoom,
  onZoomChange,
  viewportRef,
```

를

```tsx
  zoom,
  onZoomChange,
  onPinchActiveChange,
  viewportRef,
```

로 교체한다(193-194번째 줄 부근, 구조분해 목록).

그리고

```tsx
  zoom: number;
  onZoomChange: (zoom: number) => void;
  // 확대 상태에서 스페이스+드래그로 스크롤할 대상 — 이 캔버스를 감싼 overflow-auto
  // 뷰포트 컨테이너의 ref를 Editor가 그대로 내려준다.
  viewportRef: RefObject<HTMLDivElement | null>;
```

를

```tsx
  zoom: number;
  onZoomChange: (zoom: number) => void;
  // 핀치 줌이 시작/끝날 때 알려준다 — 모바일 셸이 상단 중앙 배율 배지를
  // 띄우고 내리는 데만 쓴다. 데스크탑처럼 안 받아도(undefined) 핀치 감지
  // 자체는 그대로 동작한다.
  onPinchActiveChange?: (active: boolean) => void;
  // 확대 상태에서 스페이스+드래그로 스크롤할 대상 — 이 캔버스를 감싼 overflow-auto
  // 뷰포트 컨테이너의 ref를 Editor가 그대로 내려준다.
  viewportRef: RefObject<HTMLDivElement | null>;
```

로 교체한다(285-289번째 줄 부근, 타입 블록).

- [ ] **Step 3: `onLiveEditRef` 거울 ref 바로 다음에 `zoomRef`·`onPinchActiveChangeRef` 추가**

```tsx
  const onLiveEditRef = useRef(onLiveEdit);
  useEffect(() => {
    onLiveEditRef.current = onLiveEdit;
  }, [onLiveEdit]);
```

를

```tsx
  const onLiveEditRef = useRef(onLiveEdit);
  useEffect(() => {
    onLiveEditRef.current = onLiveEdit;
  }, [onLiveEdit]);
  // 핀치 줌 window 리스너(아래)가 재구독 없이 항상 최신 zoom·콜백을 읽도록
  // 거울처럼 반영해 둔다 — 위 onLiveEditRef와 같은 패턴. 이 리스너의 effect
  // 자체는 [viewportRef, onZoomChange]에만 의존해 마운트 시 한 번만 구독한다.
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const onPinchActiveChangeRef = useRef(onPinchActiveChange);
  useEffect(() => {
    onPinchActiveChangeRef.current = onPinchActiveChange;
  }, [onPinchActiveChange]);
```

로 교체한다(358-361번째 줄 부근).

- [ ] **Step 4: `panStartRef` 선언 다음에 핀치 추적용 ref들 추가**

```tsx
  const panStartRef = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  // 그라데이션 도구는 드래그 중 실제 픽셀은 건드리지 않는다(실제 채우기는 커밋
```

를

```tsx
  const panStartRef = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  // 핀치 줌 — 지금 떠 있는 포인터(pointerId → 화면 좌표)를 추적한다. 두 개가
  // 되는 순간 핀치 모드로 들어간다(뒤쪽 window 리스너 effect 참고).
  const pinchPointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const pinchStateRef = useRef<{
    startDistance: number;
    startZoom: number;
    rect: DOMRect;
  } | null>(null);
  // 핀치가 진행 중인 동안은 뒤쪽(캔버스 중앙 재정렬) effect가 핀치의 스크롤
  // 보정을 덮어쓰지 않도록 건너뛰게 한다.
  const isPinchingRef = useRef(false);
  // handlePointerCancel은 파일 뒤쪽에서 정의되므로(handlePointerUp 다음),
  // 핀치 window 리스너가 그 정의보다 앞에서도 최신 함수를 참조할 수 있도록
  // 거울 ref로 둔다 — 실제 값은 handlePointerCancel 선언 직후에 채워진다.
  const handlePointerCancelRef = useRef<() => void>(() => {});
  // 그라데이션 도구는 드래그 중 실제 픽셀은 건드리지 않는다(실제 채우기는 커밋
```

로 교체한다(422-436번째 줄 부근).

- [ ] **Step 5: `fitScale` ResizeObserver effect 다음에 `fitScaleRef` 거울 추가, 자동 재중앙 정렬 effect에 핀치 가드 추가**

```tsx
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [viewportRef, width, height]);
  // 텍스트 도구의 인라인 입력을 캔버스 좌표계에 절대 위치시키는 데도 쓰인다.
  const scale = fitScale * zoom;

  // 캔버스 사방에 뷰포트만큼의 여백(Editor의 p-[38vmin] 래퍼)이 있어 스크롤로
  // 캔버스를 자유롭게 밀 수 있는데, 그만큼 기본 상태에서는 스크롤이 0(좌상단)에
  // 놓여 캔버스가 화면 밖으로 밀려 보인다 — 캔버스 크기·뷰포트 크기·배율이
  // 바뀔 때마다 스크롤을 가운데로 되돌려 캔버스가 뷰포트 중앙에 오게 한다.
  // (그 사이 사용자가 직접 밀어 둔 위치는, 다음에 이 값들이 바뀔 때 초기화된다.)
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;
    const id = requestAnimationFrame(() => {
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
      container.scrollTop = (container.scrollHeight - container.clientHeight) / 2;
    });
    return () => cancelAnimationFrame(id);
  }, [viewportRef, width, height, fitScale, zoom]);
```

를

```tsx
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, [viewportRef, width, height]);
  // 텍스트 도구의 인라인 입력을 캔버스 좌표계에 절대 위치시키는 데도 쓰인다.
  const scale = fitScale * zoom;
  // 핀치 줌 window 리스너가 재구독 없이 최신 fitScale을 읽도록 거울 ref.
  const fitScaleRef = useRef(fitScale);
  useEffect(() => {
    fitScaleRef.current = fitScale;
  }, [fitScale]);

  // 캔버스 사방에 뷰포트만큼의 여백(Editor의 p-[38vmin] 래퍼)이 있어 스크롤로
  // 캔버스를 자유롭게 밀 수 있는데, 그만큼 기본 상태에서는 스크롤이 0(좌상단)에
  // 놓여 캔버스가 화면 밖으로 밀려 보인다 — 캔버스 크기·뷰포트 크기·배율이
  // 바뀔 때마다 스크롤을 가운데로 되돌려 캔버스가 뷰포트 중앙에 오게 한다.
  // (그 사이 사용자가 직접 밀어 둔 위치는, 다음에 이 값들이 바뀔 때 초기화된다.)
  // 핀치 진행 중에는 건너뛴다 — 안 그러면 핀치 중 매 프레임 zoom이 바뀔 때마다
  // 이 effect가 다시 돌아 핀치가 맞춘 스크롤 위치를 중앙으로 되돌려 버린다.
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;
    if (isPinchingRef.current) return;
    const id = requestAnimationFrame(() => {
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
      container.scrollTop = (container.scrollHeight - container.clientHeight) / 2;
    });
    return () => cancelAnimationFrame(id);
  }, [viewportRef, width, height, fitScale, zoom]);
```

로 교체한다(484-507번째 줄 부근).

- [ ] **Step 6: `handlePointerCancel` 정의 직후에 거울 ref 반영 + 핀치 감지 effect 추가**

```tsx
  // 스타일러스 호버 취소, 시스템 제스처 등으로 pointerup 없이 스트로크가 끊길 때 안전하게 커밋한다.
  // handlePointerUp과 도구별 분기가 완전히 같아야 하고, 위쪽의 drawingRef 가드 덕분에 pointerup
  // 이후 뒤늦게 발생하는 lostpointercapture에 대해서도 안전하게(중복 커밋 없이) 재사용할 수 있다.
  const handlePointerCancel = handlePointerUp;

  // pendingImage 오버레이는 캔버스의 도구별 pointer 처리와 완전히 분리된 독립
```

를

```tsx
  // 스타일러스 호버 취소, 시스템 제스처 등으로 pointerup 없이 스트로크가 끊길 때 안전하게 커밋한다.
  // handlePointerUp과 도구별 분기가 완전히 같아야 하고, 위쪽의 drawingRef 가드 덕분에 pointerup
  // 이후 뒤늦게 발생하는 lostpointercapture에 대해서도 안전하게(중복 커밋 없이) 재사용할 수 있다.
  const handlePointerCancel = handlePointerUp;

  useEffect(() => {
    handlePointerCancelRef.current = handlePointerCancel;
  }, [handlePointerCancel]);

  // 핀치 줌 — 두 손가락 핀치 제스처. 도구별 포인터 핸들러(handlePointerDown 등)는
  // <canvas> 자신에게만 붙어 있어 한쪽 손가락이 캔버스 바깥 여백에 닿으면
  // 놓친다. 그래서 핀치 감지는 그 로직과 완전히 분리된 window 레벨 리스너로
  // 구현한다 — 지금 몇 개의 포인터가 떠 있는지만 추적하고, 뷰포트 안에서
  // 시작한 포인터가 2개가 되는 순간 핀치로 전환한다. [viewportRef,
  // onZoomChange]에만 의존해 마운트 시 한 번만 구독하고(둘 다 안정적인
  // 참조), zoom·fitScale·콜백은 위에서 만든 거울 ref로 최신값을 읽는다.
  useEffect(() => {
    const handleDown = (e: PointerEvent) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inside) return;
      pinchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchPointersRef.current.size === 2) {
        // 그리던 중이던 스트로크가 있다면 지금까지 그린 그대로 커밋하고
        // 핀치로 전환한다 — handlePointerCancel은 인자를 쓰지 않는 멱등
        // 함수라(handlePointerUp과 동일) 그냥 호출만 하면 된다.
        handlePointerCancelRef.current();
        const points = [...pinchPointersRef.current.values()];
        const dx = points[0].x - points[1].x;
        const dy = points[0].y - points[1].y;
        pinchStateRef.current = {
          startDistance: Math.hypot(dx, dy),
          startZoom: zoomRef.current,
          rect,
        };
        isPinchingRef.current = true;
        onPinchActiveChangeRef.current?.(true);
      }
    };

    const handleMove = (e: PointerEvent) => {
      if (!pinchPointersRef.current.has(e.pointerId)) return;
      pinchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pinch = pinchStateRef.current;
      const viewport = viewportRef.current;
      if (!pinch || !viewport || pinchPointersRef.current.size !== 2) return;
      e.preventDefault();
      const points = [...pinchPointersRef.current.values()];
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.hypot(dx, dy);
      const scaleRatio = distance / pinch.startDistance;
      const nextZoom = Math.min(
        ZOOM_STEPS[ZOOM_STEPS.length - 1],
        Math.max(ZOOM_STEPS[0], pinch.startZoom * scaleRatio),
      );
      const midClientX = (points[0].x + points[1].x) / 2;
      const midClientY = (points[0].y + points[1].y) / 2;
      const localMidX = midClientX - pinch.rect.left;
      const localMidY = midClientY - pinch.rect.top;
      // 핀치 중심점 아래 있던 캔버스 좌표를 구해 두고, 배율을 바꾼 뒤 같은
      // 좌표가 같은 화면 위치에 다시 오도록 스크롤을 보정한다 — 캔버스
      // 좌상단은 스크롤 콘텐츠 안에서 항상 (CANVAS_PAN_PADDING,
      // CANVAS_PAN_PADDING)에 있다(Editor.tsx의 artViewRect 계산, 820-822
      // 번째 줄과 같은 공식).
      const scale0 = fitScaleRef.current * zoomRef.current;
      const docX = (viewport.scrollLeft + localMidX - CANVAS_PAN_PADDING) / scale0;
      const docY = (viewport.scrollTop + localMidY - CANVAS_PAN_PADDING) / scale0;
      onZoomChange(nextZoom);
      const scale1 = fitScaleRef.current * nextZoom;
      viewport.scrollLeft = docX * scale1 + CANVAS_PAN_PADDING - localMidX;
      viewport.scrollTop = docY * scale1 + CANVAS_PAN_PADDING - localMidY;
    };

    const handleUp = (e: PointerEvent) => {
      if (!pinchPointersRef.current.has(e.pointerId)) return;
      pinchPointersRef.current.delete(e.pointerId);
      if (pinchStateRef.current && pinchPointersRef.current.size < 2) {
        pinchStateRef.current = null;
        isPinchingRef.current = false;
        onPinchActiveChangeRef.current?.(false);
      }
    };

    window.addEventListener("pointerdown", handleDown);
    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointerdown", handleDown);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [viewportRef, onZoomChange]);

  // pendingImage 오버레이는 캔버스의 도구별 pointer 처리와 완전히 분리된 독립
```

로 교체한다(1515-1521번째 줄 부근).

- [ ] **Step 7: 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

Expected: tsc 에러 0개, lint baseline(0 errors, 9 warnings)과 동일.

- [ ] **Step 8: 브라우저 수동 검증 (가능하면)**

`npm run dev:services`로 띄우고 `/nemo-nemo-beam`을 모바일 폭(또는 디바이스 툴바)에서 연다. 캔버스 위에서 두 손가락으로 오므리고 벌려 줌이 되는지, 핀치 중심점이 화면에서 고정돼 보이는지 확인한다. 이 세션에서 브라우저 자동화로 모바일 폭을 강제하기 어려웠던 전례가 있다 — 안 되면 코드 리뷰와 tsc/lint로 대신하고 실기기 확인이 필요하다고 보고한다.

- [ ] **Step 9: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/PixelCanvas.tsx
git commit -m "feat : 모바일 캔버스에 핀치 줌 제스처 추가"
```

---

## Task 2: `Editor.tsx`·`MobileEditorShell.tsx` — 배율 배지 UI 연결

**Files:**
- Modify: `apps/services/components/works/5_PixelArtMaker/Editor.tsx`
- Modify: `apps/services/components/works/5_PixelArtMaker/MobileEditorShell.tsx`

**Interfaces:**
- Consumes (Task 1): `PixelCanvas`의 `onPinchActiveChange?: (active: boolean) => void` prop.
- Produces: `MobileEditorShellProps`에 `zoomBadgeVisible: boolean`, `canvasZoom: number` 추가.

### Step 1: `Editor.tsx` — 핀치/탭 상태와 배지 표시 여부 계산

- [ ] **1a. `canvasZoom` state 바로 다음에 핀치·배지 상태 추가**

```tsx
  const [canvasZoom, setCanvasZoom] = useState(1);
```

를

```tsx
  const [canvasZoom, setCanvasZoom] = useState(1);
  // 모바일 전용 — 좌하단 상시 노출 숫자 대신 캔버스 위 상단 중앙에 배율을
  // 잠깐 보여주는 배지의 표시 여부. 핀치 중이거나(isPinching) +/- 버튼을
  // 막 눌렀을 때(zoomFlashing, 900ms 타이머) 보인다.
  const [isPinching, setIsPinching] = useState(false);
  const [zoomFlashing, setZoomFlashing] = useState(false);
  const zoomFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashZoomBadge = useCallback(() => {
    setZoomFlashing(true);
    if (zoomFlashTimerRef.current) clearTimeout(zoomFlashTimerRef.current);
    zoomFlashTimerRef.current = setTimeout(() => setZoomFlashing(false), 900);
  }, []);
  useEffect(() => {
    return () => {
      if (zoomFlashTimerRef.current) clearTimeout(zoomFlashTimerRef.current);
    };
  }, []);
  const handlePinchActiveChange = useCallback((active: boolean) => {
    setIsPinching(active);
  }, []);
  const zoomBadgeVisible = isPinching || zoomFlashing;
```

로 교체한다(730번째 줄 부근).

- [ ] **1b. `<PixelCanvas>`에 `onPinchActiveChange` 연결**

```tsx
                    viewportRef={canvasViewportRef}
                    wandGlobal={wandGlobal}
```

를

```tsx
                    viewportRef={canvasViewportRef}
                    onPinchActiveChange={handlePinchActiveChange}
                    wandGlobal={wandGlobal}
```

로 교체한다(3038번째 줄 부근).

- [ ] **1c. 좌하단 +/- 버튼이 탭 시 배지를 잠깐 띄우게 하고, 숫자 표시는 모바일에서 숨김**

```tsx
                <div className="absolute bottom-2 left-2 flex items-center gap-0.5">
                  <button
                    onClick={() => setCanvasZoom((z) => nextZoomStep(z, -1))}
                    disabled={canvasZoom <= ZOOM_STEPS[0]}
                    title="축소"
                    className="flex h-5 w-5 items-center justify-center bg-black/70 text-white hover:bg-black/90 disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  {/* 너비 고정 — 1x / 1.5x 처럼 자릿수가 달라도 +/- 버튼이
                      흔들리지 않게 한다. */}
                  <div className="w-10 bg-black/70 py-1 text-center text-[10px] font-semibold text-white tabular-nums">
                    {canvasZoom}x
                  </div>
                  <button
                    onClick={() => setCanvasZoom((z) => nextZoomStep(z, 1))}
                    disabled={canvasZoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                    title="확대"
                    className="flex h-5 w-5 items-center justify-center bg-black/70 text-white hover:bg-black/90 disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" />
```

를

```tsx
                <div className="absolute bottom-2 left-2 flex items-center gap-0.5">
                  <button
                    onClick={() => {
                      setCanvasZoom((z) => nextZoomStep(z, -1));
                      flashZoomBadge();
                    }}
                    disabled={canvasZoom <= ZOOM_STEPS[0]}
                    title="축소"
                    className="flex h-5 w-5 items-center justify-center bg-black/70 text-white hover:bg-black/90 disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  {/* 너비 고정 — 1x / 1.5x 처럼 자릿수가 달라도 +/- 버튼이
                      흔들리지 않게 한다. 모바일은 이 숫자를 상단 중앙 배지로
                      대체했으므로(좁은 하단과 자리 다툼하던 문제) 여기서는
                      데스크탑에서만 보여준다. */}
                  {!narrow && (
                    <div className="w-10 bg-black/70 py-1 text-center text-[10px] font-semibold text-white tabular-nums">
                      {canvasZoom}x
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setCanvasZoom((z) => nextZoomStep(z, 1));
                      flashZoomBadge();
                    }}
                    disabled={canvasZoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                    title="확대"
                    className="flex h-5 w-5 items-center justify-center bg-black/70 text-white hover:bg-black/90 disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" />
```

로 교체한다(3064-3084번째 줄 부근).

- [ ] **1d. `<MobileEditorShell>`에 새 props 전달**

```tsx
          canvasBgColor={canvasBgColor}
          tool={tool}
```

를

```tsx
          canvasBgColor={canvasBgColor}
          zoomBadgeVisible={zoomBadgeVisible}
          canvasZoom={canvasZoom}
          tool={tool}
```

로 교체한다(3458번째 줄 부근, `<MobileEditorShell>` 호출부).

### Step 2: `MobileEditorShell.tsx` — 상단 중앙 배율 배지 렌더링

- [ ] **2a. props 타입에 추가**

```tsx
  canvasBgColor: string;
```

를

```tsx
  canvasBgColor: string;
  // 캔버스 위 상단 중앙에 잠깐 떠 있는 배율 배지 — 핀치 줌 중이거나 좌하단
  // +/- 버튼을 막 눌렀을 때만 true(Editor.tsx가 계산해 내려준다). 좌하단에
  // 항상 떠 있던 배율 숫자를 모바일에서는 이 배지로 대체했다.
  zoomBadgeVisible: boolean;
  canvasZoom: number;
```

로 교체한다.

- [ ] **2b. 구조분해에 추가**

```tsx
  canvasBgColor,
  tool,
```

를

```tsx
  canvasBgColor,
  zoomBadgeVisible,
  canvasZoom,
  tool,
```

로 교체한다.

- [ ] **2c. 모드 도구 줄 오버레이 다음, 옵션 strip 앞에 배지 추가**

```tsx
          <div className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1">
            {modeTools.map(({ tool: t, icon: Icon, label, key }) => (
              <button
                key={t}
                onClick={() => onToolChange(t)}
                title={`${label} (${key})`}
                className={`pointer-events-auto flex h-9 w-9 items-center justify-center ring-1 ring-gray-300 shadow-xl shadow-gray-900/15 ${
                  tool === t ? "bg-violet-500 text-white" : "bg-white text-gray-600"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          {/* 상시 노출 옵션 strip — 도구를 다시 탭해야 열리던 기존(세로 열)
```

를

```tsx
          <div className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1">
            {modeTools.map(({ tool: t, icon: Icon, label, key }) => (
              <button
                key={t}
                onClick={() => onToolChange(t)}
                title={`${label} (${key})`}
                className={`pointer-events-auto flex h-9 w-9 items-center justify-center ring-1 ring-gray-300 shadow-xl shadow-gray-900/15 ${
                  tool === t ? "bg-violet-500 text-white" : "bg-white text-gray-600"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          {/* 배율 배지 — 핀치 줌 중이거나 좌하단 +/- 버튼을 막 눌렀을 때만
              잠깐 보인다(zoomBadgeVisible, Editor.tsx 계산). 좌하단에 항상
              떠 있던 배율 숫자를 모바일에서는 이걸로 대체했다. */}
          {zoomBadgeVisible && (
            <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white tabular-nums">
              {Math.round(canvasZoom * 10) / 10}x
            </div>
          )}
          {/* 상시 노출 옵션 strip — 도구를 다시 탭해야 열리던 기존(세로 열)
```

로 교체한다.

- [ ] **Step 3: 검증**

```bash
npx tsc --noEmit -p apps/services/tsconfig.json
npm run lint --workspace services
```

Expected: tsc 에러 0개, lint baseline(0 errors, 9 warnings)과 동일.

- [ ] **Step 4: 브라우저 수동 검증**

모바일 폭에서: 핀치 중 상단 중앙에 배율 배지가 뜨고 손을 떼면 사라지는지, 좌하단 +/- 버튼을 탭해도 배지가 잠깐 떴다 사라지는지, 좌하단엔 더 이상 숫자가 안 보이는지(+/- 버튼만 남음) 확인한다. 데스크탑 폭에서는 좌하단 숫자가 그대로 보이고 배지 관련 변경이 전혀 없는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add apps/services/components/works/5_PixelArtMaker/Editor.tsx apps/services/components/works/5_PixelArtMaker/MobileEditorShell.tsx
git commit -m "feat : 모바일 캔버스 핀치 줌 배율 배지 UI 연결"
```

---

## 범위 밖 (이 플랜에서 다루지 않음)

- 두 손가락 팬(드래그로 캔버스 이동) — 스펙의 "범위 밖" 항목 그대로.
- 핀치 종료 시 `ZOOM_STEPS` 값으로 스냅하는 동작 — 연속값 유지로 확정(스펙 참고).
- 실기기 확인(브라우저 자동화로 모바일 폭을 강제하기 어려웠던 이 세션의 전례상, 각 Task의 Step 8/4는 "가능하면" 수행하고 안 되면 코드 리뷰로 대신한다) — 구현 후 사용자가 직접 실기기에서 한 번 확인하는 걸 권장한다.
