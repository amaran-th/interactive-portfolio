import { useCallback, useRef, useState } from "react";
import type { PixelLayer } from "../_shared/assetLibrary";
import { PixelValue } from "./pixelGrid";

const HISTORY_LIMIT = 50;

export type CanvasSize = { width: number; height: number };

type Snapshot = {
  layers: PixelLayer[];
  activeLayerId: string;
  size: CanvasSize;
};

// 회전·캔버스 크기 수정처럼 가로세로 자체가 바뀌는 조작도, 레이어 구조가
// 바뀌는 조작(추가·삭제·순서변경·병합·복제·보이기·투명도·잠금·이름)도 모두
// 되돌릴 수 있어야 한다 — 그래서 스냅숏 하나가 레이어 배열 전체와 활성
// 레이어 id, 그 시점의 캔버스 크기를 함께 기억한다.
export function useCanvasHistory(
  initialLayers: PixelLayer[],
  initialActiveLayerId: string,
  initialSize: CanvasSize,
) {
  const [presentSnap, setPresentSnap] = useState<Snapshot>({
    layers: initialLayers,
    activeLayerId: initialActiveLayerId,
    size: initialSize,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);

  const commit = useCallback(
    (
      nextLayers: PixelLayer[],
      nextActiveLayerId: string,
      nextSize?: CanvasSize,
    ) => {
      undoStack.current.push(presentSnap);
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
      redoStack.current = [];
      setPresentSnap({
        layers: nextLayers,
        activeLayerId: nextActiveLayerId,
        size: nextSize ?? presentSnap.size,
      });
      setCanUndo(true);
      setCanRedo(false);
    },
    [presentSnap],
  );

  // 활성 레이어의 픽셀만 교체한다 — 나머지 레이어는 그대로 둔 채 그 레이어
  // 객체 하나만 새로 만든다. 그리기·채우기·텍스트·도형 등 대부분의 편집이
  // 여기를 탄다(기존 push(pixels, size?) 시그니처와 동일하게 유지).
  const push = useCallback(
    (nextPixels: PixelValue[], nextSize?: CanvasSize) => {
      const nextLayers = presentSnap.layers.map((l) =>
        l.id === presentSnap.activeLayerId ? { ...l, pixels: nextPixels } : l,
      );
      commit(nextLayers, presentSnap.activeLayerId, nextSize);
    },
    [presentSnap, commit],
  );

  // 레이어 구조 자체가 바뀌거나(추가·삭제·순서변경·병합·복제·보이기·투명도·
  // 잠금·이름) 캔버스 전체가 변형되는(회전·반전·크기 수정) 조작 전용 — 새
  // layers 배열 전체와 활성 레이어 id를 그대로 받는다.
  const pushLayers = useCallback(
    (
      nextLayers: PixelLayer[],
      nextActiveLayerId: string,
      nextSize?: CanvasSize,
    ) => {
      commit(nextLayers, nextActiveLayerId, nextSize);
    },
    [commit],
  );

  // 어떤 레이어가 활성인지 바꾸는 것 자체는 편집이 아니다 — 실행취소 스택에
  // 쌓지 않는다(도구를 바꾸는 것과 같은 성격).
  const setActiveLayerId = useCallback((id: string) => {
    setPresentSnap((s) =>
      s.activeLayerId === id ? s : { ...s, activeLayerId: id },
    );
  }, []);

  // 투명도 슬라이더처럼 한 번의 드래그/상호작용 동안 연속으로 값이 바뀌는
  // 편집을 위한 것 — setActiveLayerId와 같은 패턴("스택은 건드리지 않고
  // presentSnap만 바꾼다")이지만 레이어 배열/활성 id 전체를 바꾼다. 호출부가
  // "지금이 드래그의 첫 틱인지 이어지는 틱인지"를 판단해, 첫 틱은 여전히
  // pushLayers로 실행취소 경계를 만들고 이어지는 틱만 이 함수를 써야 한다 —
  // 안 그러면 드래그 전체가 실행취소 스택에서 통째로 사라진다.
  const replacePresentLayers = useCallback(
    (nextLayers: PixelLayer[], nextActiveLayerId: string) => {
      setPresentSnap((s) => ({
        ...s,
        layers: nextLayers,
        activeLayerId: nextActiveLayerId,
      }));
    },
    [],
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

  const reset = useCallback(
    (
      nextLayers: PixelLayer[],
      nextActiveLayerId: string,
      nextSize: CanvasSize,
    ) => {
      undoStack.current = [];
      redoStack.current = [];
      setPresentSnap({
        layers: nextLayers,
        activeLayerId: nextActiveLayerId,
        size: nextSize,
      });
      setCanUndo(false);
      setCanRedo(false);
    },
    [],
  );

  const activeLayer =
    presentSnap.layers.find((l) => l.id === presentSnap.activeLayerId) ??
    presentSnap.layers[presentSnap.layers.length - 1];

  return {
    present: activeLayer.pixels,
    presentLayers: presentSnap.layers,
    activeLayerId: presentSnap.activeLayerId,
    presentSize: presentSnap.size,
    push,
    pushLayers,
    setActiveLayerId,
    replacePresentLayers,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
}
