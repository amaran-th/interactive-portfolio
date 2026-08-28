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
  /** How far the scroll container has scrolled since drag start (px, +down). */
  scrollDelta: number;
};

const AUTO_SCROLL_EDGE = 48;
const AUTO_SCROLL_MAX_SPEED = 14;

/**
 * Pointer-based (not HTML5 native DnD) reorder for a vertical list: the
 * dragged row follows the cursor and other rows slide out of the way live,
 * instead of the browser's ghost-image drag with no in-between feedback.
 * Pointer events (not mouse events) also make this work on touch out of
 * the box.
 *
 * When `scrollContainerRef` is given (the list sits in a scrollable, capped-
 * height container), the container auto-scrolls while the pointer is near
 * its top/bottom edge, and both the slot-detection math and the dragged
 * item's own transform are corrected for how far the container has
 * scrolled since the drag started — otherwise the two drift apart, since
 * the item's normal-flow position scrolls with the container but a plain
 * pointer-delta transform doesn't.
 */
export function useDragReorder(
  itemCount: number,
  onReorder: (from: number, to: number) => void,
  scrollContainerRef?: React.RefObject<HTMLElement | null>,
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
  const autoScrollSpeedRef = useRef(0);
  const autoScrollFrameRef = useRef<number | null>(null);

  const registerItemRef = (index: number) => (el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  };

  const stopAutoScroll = () => {
    autoScrollSpeedRef.current = 0;
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
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
      const scrollContainer = scrollContainerRef?.current ?? null;
      const initialScrollTop = scrollContainer?.scrollTop ?? 0;

      const initial: DragState = {
        draggingIndex: index,
        overIndex: index,
        pointerStartY: e.clientY,
        pointerY: e.clientY,
        itemTops,
        itemHeight,
        scrollDelta: 0,
      };
      dragRef.current = initial;
      setDrag(initial);

      const recomputeOverIndex = (
        state: DragState,
        deltaY: number,
      ): number => {
        const draggedCenter =
          state.itemTops[state.draggingIndex] +
          deltaY +
          state.scrollDelta +
          state.itemHeight / 2;
        let nextOver = state.draggingIndex;
        for (let i = 0; i < itemCount; i++) {
          const slotTop = state.itemTops[i];
          const slotBottom = slotTop + state.itemHeight;
          if (draggedCenter >= slotTop && draggedCenter < slotBottom) {
            nextOver = i;
            break;
          }
          if (i === itemCount - 1 && draggedCenter >= slotBottom) {
            nextOver = i;
          }
        }
        return nextOver;
      };

      const runAutoScrollStep = () => {
        const container = scrollContainerRef?.current;
        const prev = dragRef.current;
        if (!container || !prev || autoScrollSpeedRef.current === 0) {
          autoScrollFrameRef.current = null;
          return;
        }
        container.scrollTop += autoScrollSpeedRef.current;
        const scrollDelta = container.scrollTop - initialScrollTop;
        const deltaY = prev.pointerY - prev.pointerStartY;
        const next: DragState = {
          ...prev,
          scrollDelta,
          overIndex: recomputeOverIndex(
            { ...prev, scrollDelta },
            deltaY,
          ),
        };
        dragRef.current = next;
        setDrag(next);
        autoScrollFrameRef.current = requestAnimationFrame(runAutoScrollStep);
      };

      const updateAutoScrollSpeed = (clientY: number) => {
        if (!scrollContainer) return;
        const rect = scrollContainer.getBoundingClientRect();
        let speed = 0;
        if (clientY < rect.top + AUTO_SCROLL_EDGE) {
          const intensity = 1 - Math.max(0, clientY - rect.top) / AUTO_SCROLL_EDGE;
          speed = -AUTO_SCROLL_MAX_SPEED * intensity;
        } else if (clientY > rect.bottom - AUTO_SCROLL_EDGE) {
          const intensity =
            1 - Math.max(0, rect.bottom - clientY) / AUTO_SCROLL_EDGE;
          speed = AUTO_SCROLL_MAX_SPEED * intensity;
        }
        autoScrollSpeedRef.current = speed;
        if (speed !== 0 && autoScrollFrameRef.current === null) {
          autoScrollFrameRef.current = requestAnimationFrame(runAutoScrollStep);
        }
      };

      const handleMove = (ev: PointerEvent) => {
        const prev = dragRef.current;
        if (!prev) return;
        updateAutoScrollSpeed(ev.clientY);
        const deltaY = ev.clientY - prev.pointerStartY;
        const nextOver = recomputeOverIndex(prev, deltaY);
        const next: DragState = { ...prev, pointerY: ev.clientY, overIndex: nextOver };
        dragRef.current = next;
        setDrag(next);
      };
      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        stopAutoScroll();
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
    const {
      draggingIndex,
      overIndex,
      pointerY,
      pointerStartY,
      itemHeight,
      scrollDelta,
    } = drag;
    if (index === draggingIndex) {
      return {
        transform: `translateY(${pointerY - pointerStartY + scrollDelta}px)`,
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
