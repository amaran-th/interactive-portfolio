import { useCallback, useRef, useState } from "react";
import { PixelValue } from "./pixelGrid";

const HISTORY_LIMIT = 50;

export type CanvasSize = { width: number; height: number };

type Snapshot = { pixels: PixelValue[]; size: CanvasSize };

// 회전·캔버스 크기 수정처럼 가로세로 자체가 바뀌는 조작도 되돌릴 수 있어야
// 한다 — 그러려면 픽셀 배열마다 "그 시점의 캔버스 크기"를 함께 기억해야,
// 되돌리기가 예전 크기의 배열을 지금 크기 기준으로 잘못 해석해 그림이
// 깨지는 일이 없다. size를 생략하면 지금 크기를 그대로 유지한 채 픽셀만
// 바뀌는 대부분의 조작(그리기 등)에 해당한다.
export function useCanvasHistory(initialPixels: PixelValue[], initialSize: CanvasSize) {
  const [presentSnap, setPresentSnap] = useState<Snapshot>({
    pixels: initialPixels,
    size: initialSize,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);

  const push = useCallback(
    (nextPixels: PixelValue[], nextSize?: CanvasSize) => {
      undoStack.current.push(presentSnap);
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
      redoStack.current = [];
      setPresentSnap({
        pixels: nextPixels,
        size: nextSize ?? presentSnap.size,
      });
      setCanUndo(true);
      setCanRedo(false);
    },
    [presentSnap],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(presentSnap);
    setPresentSnap(prev);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, [presentSnap]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(presentSnap);
    setPresentSnap(next);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  }, [presentSnap]);

  const reset = useCallback((nextPixels: PixelValue[], nextSize: CanvasSize) => {
    undoStack.current = [];
    redoStack.current = [];
    setPresentSnap({ pixels: nextPixels, size: nextSize });
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return {
    present: presentSnap.pixels,
    presentSize: presentSnap.size,
    push,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
}
