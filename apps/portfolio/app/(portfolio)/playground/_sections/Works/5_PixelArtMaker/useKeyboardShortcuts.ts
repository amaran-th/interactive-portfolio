import { useEffect } from "react";
import { Tool } from "./types";

// e.key가 아니라 e.code(물리 키 위치, 자판 배열·입력기와 무관)로 매칭한다 —
// 한글 입력기(IME)가 켜져 있으면 같은 물리 키를 눌러도 e.key가 "g" 대신
// 조합 중인 한글 자모("ㅎ" 등)로 들어와 매칭에 실패했다. e.code는 항상
// "KeyG"처럼 물리 위치 그대로 오므로 입력기 상태와 무관하게 동작한다.
const TOOL_KEYS: Record<string, Tool> = {
  KeyB: "pencil",
  KeyE: "eraser",
  KeyG: "bucket",
  KeyI: "eyedropper",
  KeyU: "line",
  KeyR: "rect",
  KeyO: "circle",
  KeyM: "select",
  KeyL: "lasso",
  KeyV: "move",
  KeyW: "wand",
  KeyT: "text",
  KeyD: "gradient",
};

// 브러시 크기 버튼(1/2/3/4)과 정확히 같은 값 — 숫자패드로도 똑같이 동작한다.
const BRUSH_SIZE_KEYS: Record<string, number> = {
  Digit1: 1,
  Numpad1: 1,
  Digit2: 2,
  Numpad2: 2,
  Digit3: 3,
  Numpad3: 3,
  Digit4: 4,
  Numpad4: 4,
};

export function useKeyboardShortcuts({
  onToolChange,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onSave,
  onSaveAs,
  onClearSelection,
  onSetBrushSize,
  onRotate,
  onFlipHorizontal,
  onFlipVertical,
  onToggleGrid,
  onToggleCrosshair,
  onZoomIn,
  onZoomOut,
  onFillSelection,
  hasPendingImage,
  onCommitPendingImage,
  onCancelPendingImage,
  hasPendingShape,
  onCommitPendingShape,
  onCancelPendingShape,
  hasActiveTracing,
  onCancelActiveTracing,
}: {
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onClearSelection?: () => void;
  onSetBrushSize?: (size: number) => void;
  // 90도 회전 — -1은 반시계, 1은 시계 방향(Toolbar의 버튼과 동일한 규약).
  onRotate?: (direction: 1 | -1) => void;
  onFlipHorizontal?: () => void;
  onFlipVertical?: () => void;
  onToggleGrid?: () => void;
  onToggleCrosshair?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFillSelection?: () => void;
  // 이미지 불러오기·붙여넣기로 뜬 pendingImage가 있으면, Enter/Esc가 선택
  // 해제보다 그 확정/취소를 우선한다(텍스트 도구의 인라인 입력이 이미 같은
  // 방식으로 Enter=확정/Esc=취소를 쓰는 것과 같은 관례).
  hasPendingImage?: boolean;
  onCommitPendingImage?: () => void;
  onCancelPendingImage?: () => void;
  // 직선·사각형·원도 같은 관례 — 확정 전 도형이 떠 있으면 Enter/Esc가
  // 선택 해제보다 그 확정/취소를 우선한다.
  hasPendingShape?: boolean;
  onCommitPendingShape?: () => void;
  onCancelPendingShape?: () => void;
  // 트레이싱 이미지 조정 손잡이가 떠 있으면, Enter/Esc 우선순위 중
  // pendingImage/pendingShape 다음·선택 해제보다는 앞선 순서로 Escape가
  // 조정 상태부터 해제한다.
  hasActiveTracing?: boolean;
  onCancelActiveTracing?: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyY") {
        e.preventDefault();
        onRedo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyC") {
        onCopy();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyV") {
        onPaste();
        return;
      }
      // Shift가 눌린 Ctrl+Shift+S(다른 이름으로 저장)를 Ctrl+S(저장)보다
      // 먼저 검사한다 — 순서가 바뀌면 Shift를 누르고 있어도 항상 그냥 저장
      // 쪽으로 먼저 걸린다.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyS") {
        e.preventDefault();
        onSaveAs?.();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
        e.preventDefault();
        onSave?.();
        return;
      }
      // 포토샵의 Alt+Backspace(전경색으로 채우기)와 같은 관례 — "선택 영역
      // 채우기" 버튼과 동일하게 동작한다.
      if (e.altKey && e.code === "Backspace") {
        e.preventDefault();
        onFillSelection?.();
        return;
      }
      if (e.shiftKey && e.code === "KeyH") {
        onFlipHorizontal?.();
        return;
      }
      if (e.shiftKey && e.code === "KeyV") {
        onFlipVertical?.();
        return;
      }
      if (e.shiftKey && e.code === "KeyG") {
        onToggleGrid?.();
        return;
      }
      if (e.shiftKey && e.code === "KeyC") {
        onToggleCrosshair?.();
        return;
      }
      if (e.code === "BracketLeft") {
        onRotate?.(-1);
        return;
      }
      if (e.code === "BracketRight") {
        onRotate?.(1);
        return;
      }
      // Ctrl/Cmd+= 는 브라우저 자체 화면 확대와 겹쳐 신뢰할 수 없어 피하고,
      // 조합 없는 +/-만 쓴다(캔버스 자체 배율이라 페이지 확대와 무관하다).
      if (e.code === "Equal" || e.code === "NumpadAdd") {
        e.preventDefault();
        onZoomIn?.();
        return;
      }
      if (e.code === "Minus" || e.code === "NumpadSubtract") {
        e.preventDefault();
        onZoomOut?.();
        return;
      }
      const brushSize = BRUSH_SIZE_KEYS[e.code];
      if (brushSize) {
        onSetBrushSize?.(brushSize);
        return;
      }
      if (e.key === "Enter" && (hasPendingImage || hasPendingShape)) {
        if (hasPendingImage) onCommitPendingImage?.();
        else onCommitPendingShape?.();
        return;
      }
      if (e.key === "Escape") {
        if (hasPendingImage) onCancelPendingImage?.();
        else if (hasPendingShape) onCancelPendingShape?.();
        else if (hasActiveTracing) onCancelActiveTracing?.();
        else onClearSelection?.();
        return;
      }
      const tool = TOOL_KEYS[e.code];
      if (tool) onToolChange(tool);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    onToolChange,
    onUndo,
    onRedo,
    onCopy,
    onPaste,
    onSave,
    onSaveAs,
    onClearSelection,
    onSetBrushSize,
    onRotate,
    onFlipHorizontal,
    onFlipVertical,
    onToggleGrid,
    onToggleCrosshair,
    onZoomIn,
    onZoomOut,
    onFillSelection,
    hasPendingImage,
    onCommitPendingImage,
    onCancelPendingImage,
    hasPendingShape,
    onCommitPendingShape,
    onCancelPendingShape,
    hasActiveTracing,
    onCancelActiveTracing,
  ]);
}
