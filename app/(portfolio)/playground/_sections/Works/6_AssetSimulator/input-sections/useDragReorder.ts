"use client";

import { useRef, useState } from "react";

type DragState = {
  draggingIndex: number;
  overIndex: number;
  pointerStartY: number;
  pointerY: number;
  /** Each item's top offset (px) relative to the first item, measured at drag start. */
  itemTops: number[];
  /** The dragged item's own height, including the list's row gap. */
  itemHeight: number;
};

/**
 * Pointer-based (not HTML5 native DnD) reorder for a vertical list: the
 * dragged row follows the cursor and other rows slide out of the way live,
 * instead of the browser's ghost-image drag with no in-between feedback.
 * Pointer events (not mouse events) also make this work on touch out of
 * the box.
 */
export function useDragReorder(
  itemCount: number,
  onReorder: (from: number, to: number) => void,
) {
  const [drag, setDrag] = useState<DragState | null>(null);
  // Mirrors `drag` for synchronous reads from plain DOM listeners. Calling
  // onReorder (which triggers a *different* component's setState) from
  // inside a setDrag updater function is a side effect in what must stay a
  // pure updater — React can invoke that updater more than once, which
  // fired onReorder multiple times with inconsistent indices. Reading the
  // ref here keeps onReorder as a single, plain top-level call.
  const dragRef = useRef<DragState | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const registerItemRef = (index: number) => (el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  };

  const startDrag =
    (index: number) => (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const rects = itemRefs.current.map((el) => el?.getBoundingClientRect());
      const first = rects[0];
      const draggedRect = rects[index];
      if (!first || !draggedRect) return;
      const itemTops = rects.map((r) => (r ? r.top - first.top : 0));
      const nextTop = itemTops[index + 1];
      const itemHeight =
        nextTop !== undefined
          ? nextTop - itemTops[index]
          : draggedRect.height;

      const initial: DragState = {
        draggingIndex: index,
        overIndex: index,
        pointerStartY: e.clientY,
        pointerY: e.clientY,
        itemTops,
        itemHeight,
      };
      dragRef.current = initial;
      setDrag(initial);

      const handleMove = (ev: PointerEvent) => {
        const prev = dragRef.current;
        if (!prev) return;
        const deltaY = ev.clientY - prev.pointerStartY;
        const draggedCenter =
          prev.itemTops[prev.draggingIndex] + deltaY + prev.itemHeight / 2;
        let nextOver = prev.draggingIndex;
        for (let i = 0; i < itemCount; i++) {
          const slotTop = prev.itemTops[i];
          const slotBottom = slotTop + prev.itemHeight;
          if (draggedCenter >= slotTop && draggedCenter < slotBottom) {
            nextOver = i;
            break;
          }
          if (i === itemCount - 1 && draggedCenter >= slotBottom) {
            nextOver = i;
          }
        }
        const next = { ...prev, pointerY: ev.clientY, overIndex: nextOver };
        dragRef.current = next;
        setDrag(next);
      };
      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        const finalState = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (finalState && finalState.draggingIndex !== finalState.overIndex) {
          onReorder(finalState.draggingIndex, finalState.overIndex);
        }
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    };

  const getItemStyle = (index: number): React.CSSProperties => {
    if (!drag) return {};
    const { draggingIndex, overIndex, pointerY, pointerStartY, itemHeight } =
      drag;
    if (index === draggingIndex) {
      return {
        transform: `translateY(${pointerY - pointerStartY}px)`,
        zIndex: 50,
        position: "relative",
        boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
        transition: "none",
        cursor: "grabbing",
      };
    }
    let offset = 0;
    if (
      draggingIndex < overIndex &&
      index > draggingIndex &&
      index <= overIndex
    ) {
      offset = -itemHeight;
    } else if (
      draggingIndex > overIndex &&
      index < draggingIndex &&
      index >= overIndex
    ) {
      offset = itemHeight;
    }
    return {
      transform: offset ? `translateY(${offset}px)` : undefined,
      transition: "transform 180ms ease",
      position: "relative",
    };
  };

  return {
    registerItemRef,
    startDrag,
    getItemStyle,
    isDragging: drag !== null,
    draggingIndex: drag?.draggingIndex ?? null,
  };
}
