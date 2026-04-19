"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JumpTarget } from "./BenchmarkPanel";
import { ITEM_GAP, OVERSCAN, VIEWPORT_HEIGHT } from "./constants";
import { useJumpWithScrollCount } from "./hooks";
import { BASE_ITEM_STYLE, itemBackgroundColor } from "./styles";
import { VirtualListShell } from "./VirtualListShell";

interface Props {
  texts: string[];
  heights: number[];
  itemWidth: number;
  jumpTarget?: JumpTarget;
  onJumpComplete?: (scrollTop: number) => void;
  onScrollCount?: (count: number) => void;
}

export default function VirtualList({
  texts,
  heights,
  itemWidth,
  jumpTarget,
  onJumpComplete,
  onScrollCount,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const { offsets, totalSize } = useMemo(() => {
    const offsets = new Array<number>(heights.length);
    let acc = 0;
    for (let i = 0; i < heights.length; i++) {
      offsets[i] = acc;
      acc += heights[i] + ITEM_GAP;
    }
    return { offsets, totalSize: Math.max(0, acc - ITEM_GAP) };
  }, [heights]);

  const startIndex = useMemo(() => {
    if (offsets.length === 0) return 0;
    let lo = 0,
      hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid] + heights[mid] <= scrollTop) lo = mid + 1;
      else hi = mid;
    }
    return Math.max(0, lo - OVERSCAN);
  }, [offsets, heights, scrollTop]);

  const endIndex = useMemo(() => {
    if (offsets.length === 0) return 0;
    let lo = 0,
      hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= scrollTop + VIEWPORT_HEIGHT) lo = mid;
      else hi = mid - 1;
    }
    return Math.min(offsets.length - 1, lo + OVERSCAN);
  }, [offsets, scrollTop]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useJumpWithScrollCount(
    parentRef,
    jumpTarget ?? null,
    onJumpComplete,
    onScrollCount,
    (el) => {
      el.scrollTop = offsets[jumpTarget!.index] ?? 0;
    },
  );

  const items: { index: number; top: number; height: number }[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    items.push({ index: i, top: offsets[i], height: heights[i] });
  }

  return (
    <VirtualListShell
      dotColor="bg-green-400"
      label="Pretext"
      rendered={items.length}
      total={texts.length}
      parentRef={parentRef}
      totalSize={totalSize}
    >
      {items.map(({ index, top, height }) => (
        <div
          key={index}
          style={{
            ...BASE_ITEM_STYLE,
            width: itemWidth,
            height,
            background: itemBackgroundColor(index),
            borderColor: "rgba(74,222,128,0.22)",
            color: "rgba(255,255,255,0.74)",
            transform: `translateY(${top}px)`,
          }}
        >
          {texts[index]}
        </div>
      ))}
    </VirtualListShell>
  );
}
