import { useCallback, useRef, useState } from "react";

const HISTORY_LIMIT = 50;

export function useCanvasHistory(initial: number[]) {
  const [present, setPresent] = useState(initial);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStack = useRef<number[][]>([]);
  const redoStack = useRef<number[][]>([]);

  const push = useCallback(
    (next: number[]) => {
      undoStack.current.push(present);
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
      redoStack.current = [];
      setPresent(next);
      setCanUndo(true);
      setCanRedo(false);
    },
    [present],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(present);
    setPresent(prev);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, [present]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(present);
    setPresent(next);
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  }, [present]);

  const reset = useCallback((next: number[]) => {
    undoStack.current = [];
    redoStack.current = [];
    setPresent(next);
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { present, push, undo, redo, reset, canUndo, canRedo };
}
