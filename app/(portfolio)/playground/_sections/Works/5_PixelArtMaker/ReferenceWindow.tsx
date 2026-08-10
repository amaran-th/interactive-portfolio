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
  windowNumber,
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
  // (신규) 지금 열려 있는 레퍼런스 창 중 이 창의 순서(1부터) — 제목표시줄에
  // "레퍼런스1", "레퍼런스2"처럼 표시해 여러 창을 구분한다. spawnIndex와
  // 달리 창이 닫히면 나머지 창들의 번호가 다시 앞으로 당겨진다(항상 지금
  // 열려 있는 창 개수만큼 1..N으로 채워짐).
  windowNumber: number;
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

  // minimized도 의존성에 넣는다 — 최소화하면 {!minimized && (...)} 블록
  // 전체가 언마운트되어 canvas DOM 노드가 사라지고, 다시 펼치면 완전히
  // 새(빈) canvas 노드가 생긴다. image/mode는 그대로라 이 효과가 다시
  // 실행되지 않으면 새 canvas에 이미지를 그릴 기회가 없다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || mode !== "lookup") return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0);
  }, [image, mode, minimized]);

  // 이미지를 새로 불러올 때마다 창 안에 전체가 들어오는 배율을 다시 잰다 —
  // 메인 캔버스의 "배율 1 = 화면 맞춤" 관례와 통일해, zoom=1(100%)이 실제
  // 픽셀 1:1이 아니라 "지금 창 안에 전체가 보이는 크기"를 뜻하게 한다.
  // (참고 모드 전용 — 트레이싱 모드는 뷰포트 자체가 없다.) 위와 같은 이유로
  // minimized도 의존성에 필요하다 — viewportRef의 DOM 노드도 최소화·복원을
  // 거치며 새로 생긴다.
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
  }, [image, mode, minimized]);

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
      const minX = bounds.left + MIN_VISIBLE_PX - size.width;
      const maxX = bounds.right - MIN_VISIBLE_PX;
      const minY = bounds.top + MIN_VISIBLE_PX - TITLE_BAR_HEIGHT;
      const maxY = bounds.bottom - MIN_VISIBLE_PX;
      return {
        x: Math.min(Math.max(nextPos.x, minX), maxX),
        y: Math.min(Math.max(nextPos.y, minY), maxY),
      };
    },
    [getBounds, size.width],
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
        // 최소화하면 너비도 제목표시줄 내용(이름 + 버튼)만큼만 남긴다 —
        // position: fixed 요소는 width를 명시하지 않으면 내용 크기로
        // 줄어드는(shrink-to-fit) 특성을 그대로 이용한다.
        width: minimized ? undefined : size.width,
        height: minimized ? undefined : size.height,
        zIndex,
      }}
      onPointerDownCapture={onFocus}
    >
      <div
        onPointerDown={handleTitleDown}
        onPointerMove={handleTitleMove}
        onPointerUp={handleTitleUp}
        onPointerCancel={handleTitleUp}
        className="flex touch-none items-center justify-between gap-3 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
        style={{ cursor: CURSOR_MOVE }}
      >
        <span>레퍼런스{windowNumber}</span>
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
              트레이싱 모드는 캔버스 배경에 깔아 따라 그린다. 스위치 형태라
              지금 상태가 한눈에 보인다 — 좌우 라벨을 눌러 그 모드로 바로
              가거나, 스위치 자체를 눌러 토글할 수 있다. */}
          <div className="flex shrink-0 items-center justify-center gap-2 border-b border-gray-100 px-3 py-1.5 text-[10px]">
            <button
              onClick={() => onModeChange("lookup")}
              className={
                mode === "lookup"
                  ? "font-semibold text-violet-700"
                  : "text-gray-400 hover:text-gray-600"
              }
            >
              참고
            </button>
            <button
              onClick={() => onModeChange(mode === "lookup" ? "tracing" : "lookup")}
              role="switch"
              aria-checked={mode === "tracing"}
              title="참고/트레이싱 모드 전환"
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                mode === "tracing" ? "bg-violet-400" : "bg-gray-200"
              }`}
            >
              <span
                className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{
                  transform:
                    mode === "tracing" ? "translateX(16px)" : "translateX(0)",
                }}
              />
            </button>
            <button
              onClick={() => onModeChange("tracing")}
              className={
                mode === "tracing"
                  ? "font-semibold text-violet-700"
                  : "text-gray-400 hover:text-gray-600"
              }
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
            // 창 크기는 참고 모드와 공유하므로, 이 안에서 썸네일이 남는
            // 세로 공간을 전부 채운다(투명도·조정 버튼은 원래 크기 그대로
            // 아래 고정). flex-1만으로는 안 된다 — 중첩된 flex 열에서
            // min-h-0을 부모(gap 컨테이너)와 자식(이미지) 양쪽에 다 줘야
            // 콘텐츠의 원래 크기가 아니라 실제로 남은 공간 기준으로
            // 줄어든다(하나라도 빠지면 이미지가 자기 원본 해상도만큼
            // 커지려고 해서 창을 밀어낸다).
            <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
              <img
                src={image.src}
                alt=""
                className="w-full min-h-0 flex-1 bg-gray-50 object-contain"
              />
              <label className="flex shrink-0 items-center gap-2 text-[10px] text-gray-500">
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
                className={`flex shrink-0 items-center justify-center gap-1 px-2 py-1 text-[10px] ${
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
          {/* 크기 조절 손잡이 — 우하단 모서리를 드래그하면 늘고 준다. 두
              모드가 같은 size 상태를 공유하므로(모드마다 다른 고정폭을
              쓰던 예전과 달리) 모드를 전환해도 창 크기가 그대로 유지된다 —
              리사이즈도 모드와 무관하게 항상 가능하다. */}
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
        </div>
      )}
    </div>
  );
}
