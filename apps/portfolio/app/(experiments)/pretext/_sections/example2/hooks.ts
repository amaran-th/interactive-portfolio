"use client";

import { layout, prepare } from "@chenglou/pretext";
import { RefObject, useEffect, useMemo, useRef } from "react";
import type { JumpTarget } from "./BenchmarkPanel";
import {
  BORDER_WIDTH,
  FONT,
  HORIZONTAL_PADDING,
  ITEM_GAP,
  LINE_HEIGHT,
  VERTICAL_PADDING,
} from "./constants";

// ─── Pretext height measurement ───────────────────────────────────────────────

export function usePretextMeasurer(texts: string[], itemWidth: number) {
  const contentWidth = Math.max(
    1,
    itemWidth - (HORIZONTAL_PADDING + BORDER_WIDTH) * 2,
  );

  const preparedTexts = useMemo(
    () => texts.map((text) => prepare(text, FONT, { whiteSpace: "pre-wrap" })),
    [texts],
  );

  const heights = useMemo(
    () =>
      preparedTexts.map((preparedText) =>
        Math.ceil(
          layout(preparedText, contentWidth, LINE_HEIGHT).height +
            VERTICAL_PADDING * 2 +
            BORDER_WIDTH * 2,
        ),
      ),
    [contentWidth, preparedTexts],
  );

  return { heights };
}

// ─── Jump + scroll count ───────────────────────────────────────────────────────

/**
 * On each jumpTarget change: attaches a scroll listener, calls doScroll,
 * fires onJumpComplete after the first animation frame, then fires
 * onScrollCount with the total scroll event count after 600 ms.
 */
export function useJumpWithScrollCount(
  parentRef: RefObject<HTMLDivElement | null>,
  jumpTarget: JumpTarget,
  onJumpComplete: ((scrollTop: number) => void) | undefined,
  onScrollCount: ((count: number) => void) | undefined,
  doScroll: (el: HTMLDivElement) => void,
) {
  // Refs so the effect closure always calls the latest callbacks/action
  // without needing them in the dependency array.
  const doScrollRef = useRef(doScroll);
  doScrollRef.current = doScroll;
  const onJumpCompleteRef = useRef(onJumpComplete);
  onJumpCompleteRef.current = onJumpComplete;
  const onScrollCountRef = useRef(onScrollCount);
  onScrollCountRef.current = onScrollCount;

  useEffect(() => {
    if (!jumpTarget) return;
    const el = parentRef.current;
    if (!el) return;

    let count = 0;
    const handleScroll = () => {
      count++;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });

    doScrollRef.current(el);

    requestAnimationFrame(() => {
      onJumpCompleteRef.current?.(el.scrollTop);
    });

    const timer = setTimeout(() => {
      el.removeEventListener("scroll", handleScroll);
      onScrollCountRef.current?.(count);
    }, 600);

    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", handleScroll);
    };
  }, [jumpTarget, parentRef]);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Reverse-computes which item index is visible at a given scrollTop,
 * using the provided per-item heights as ground truth.
 */
export function findIndexFromScrollTop(
  scrollTop: number,
  heights: number[],
  gap = ITEM_GAP,
): number {
  let pos = 0;
  for (let i = 0; i < heights.length; i++) {
    if (pos + heights[i] > scrollTop) return i;
    pos += heights[i] + gap;
  }
  return heights.length - 1;
}
