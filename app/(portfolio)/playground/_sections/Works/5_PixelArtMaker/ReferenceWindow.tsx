"use client";

import { Minus, Plus, X } from "lucide-react";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  CURSOR_CROSSHAIR,
  CURSOR_GRAB,
  CURSOR_MOVE,
  CURSOR_NWSE_RESIZE,
  CURSOR_POINTING,
} from "./cursors";
import Magnifier, { MAGNIFIER_RADIUS, MagnifierGrid } from "./Magnifier";

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

// 편집기 세션 안에서 일회성으로 여는 참고 이미지 창 — 붙여넣거나 불러온
// 이미지를 localStorage 등 어디에도 저장하지 않는다(닫으면 그냥 사라진다).
// 오직 두 가지만 한다: 참고 이미지를 확대·이동해가며 보는 것, 그리고 편집기의
// 스포이트 도구가 활성화된 상태에서 그 위를 클릭해 뽑은 색을 넘기는 것.
export default function ReferenceWindow({
  onClose,
  onPickColor,
  boundsRef,
  eyedropperActive,
  zIndex,
  spawnIndex,
  onFocus,
}: {
  onClose: () => void;
  onPickColor: (hex: string) => void;
  // 이 창이 자유롭게 움직이고 커질 수는 있어도, 편집기 창(rootRef) 밖으로는
  // 나갈 수 없게 한다 — rootRef는 이미 편집기 창과 정확히 같은 크기·위치라
  // 별도의 가운데 정렬 계산 없이 그 경계를 그대로 쓰면 된다.
  boundsRef: RefObject<HTMLDivElement | null>;
  // 편집기에서 스포이트 도구를 선택한 상태일 때만 클릭이 색 추출로 이어진다.
  eyedropperActive: boolean;
  // 여러 창을 동시에 띄울 수 있어, 마지막으로 만진 창이 항상 맨 앞에 오도록
  // Editor가 관리하는 z-index를 그대로 받아 쓴다.
  zIndex: number;
  // 창이 열릴 때 한 번만 정해지는 순번 — 기본 위치를 계단식으로 어긋나게
  // 배치하는 데만 쓰고, 포커스가 바뀌어도 값 자체는 변하지 않는다.
  spawnIndex: number;
  // 창의 아무 곳이나 누르면 Editor에 알려 이 창을 맨 앞으로 올리게 한다.
  onFocus: () => void;
}) {
  const cascade = (spawnIndex % SPAWN_CASCADE_WRAP) * SPAWN_CASCADE_STEP;
  const [pos, setPos] = useState({ x: 160 + cascade, y: 110 + cascade });
  const [size, setSize] = useState({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });
  const [minimized, setMinimized] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  // 캔버스 자체 배율(zoom)과는 별개로, "100%"가 실제 픽셀 1:1이 아니라
  // "지금 창 안에 이미지 전체가 보이는 크기"를 뜻하게 한다 — 메인 캔버스의
  // 배율 1 = 화면 맞춤 관례와 통일한다. 실제 표시 크기 = 원본 크기 ×
  // fitScale × zoom.
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
  const objectUrlRef = useRef<string | null>(null);

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

  const loadFile = useCallback((file: File) => {
    const img = new Image();
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    img.onload = () => {
      setImage(img);
      setZoom(1);
    };
    img.src = url;
  }, []);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0);
  }, [image]);

  // 이미지를 새로 불러올 때마다 창 안에 전체가 들어오는 배율을 다시 잰다 —
  // 메인 캔버스의 "배율 1 = 화면 맞춤" 관례와 통일해, zoom=1(100%)이 실제
  // 픽셀 1:1이 아니라 "지금 창 안에 전체가 보이는 크기"를 뜻하게 한다.
  useEffect(() => {
    const container = viewportRef.current;
    if (!container || !image) return;
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
  }, [image]);

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

  // Ctrl/Cmd+휠로 확대·축소 — 메인 캔버스와 같은 관례.
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
        width: size.width,
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
          ) : (
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
          )}
          {/* 크기 조절 손잡이 — 우하단 모서리를 드래그하면 늘고 준다. */}
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
