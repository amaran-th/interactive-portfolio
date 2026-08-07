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
