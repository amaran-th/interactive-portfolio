"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JumpTarget } from "./BenchmarkPanel";
import {
  ESTIMATED_ITEM_HEIGHT,
  ITEM_GAP,
  OVERSCAN,
  VIEWPORT_HEIGHT,
} from "./constants";
import { useJumpWithScrollCount } from "./hooks";
import { BASE_ITEM_STYLE, itemBackgroundColor } from "./styles";
import { VirtualListShell } from "./VirtualListShell";

interface Props {
  texts: string[];
  itemWidth: number;
  jumpTarget?: JumpTarget;
  onJumpComplete?: (scrollTop: number) => void;
  onScrollCount?: (count: number) => void;
}

type MeasuredState = { texts: string[]; heights: Record<number, number> };

export default function VirtualListDOMNaive({
  texts,
  itemWidth,
  jumpTarget,
  onJumpComplete,
  onScrollCount,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredState, setMeasuredState] = useState<MeasuredState>(
    () => ({ texts, heights: {} }),
  );

  // texts prop이 바뀐 경우 빈 heights 사용 (state가 따라잡기 전까지)
  const measuredHeights = useMemo(
    () => (measuredState.texts === texts ? measuredState.heights : {}),
    [measuredState, texts],
  );

  const { offsets, totalSize } = useMemo(() => {
    const offsets = new Array<number>(texts.length);
    let acc = 0;
    for (let i = 0; i < texts.length; i++) {
      offsets[i] = acc;
      acc += (measuredHeights[i] ?? ESTIMATED_ITEM_HEIGHT) + ITEM_GAP;
    }
    return { offsets, totalSize: Math.max(0, acc - ITEM_GAP) };
  }, [measuredHeights, texts.length]);

  const startIndex = useMemo(() => {
    if (!offsets.length) return 0;
    let lo = 0,
      hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid] + (measuredHeights[mid] ?? ESTIMATED_ITEM_HEIGHT) <= scrollTop)
        lo = mid + 1;
      else hi = mid;
    }
    return Math.max(0, lo - OVERSCAN);
  }, [offsets, measuredHeights, scrollTop]);

  const endIndex = useMemo(() => {
    if (!offsets.length) return 0;
    let lo = 0,
      hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= scrollTop + VIEWPORT_HEIGHT) lo = mid;
      else hi = mid - 1;
    }
    return Math.min(offsets.length - 1, lo + OVERSCAN);
  }, [offsets, scrollTop]);

  // ResizeObserver로 가시 아이템 높이를 관찰 — setState는 외부 시스템 콜백에서 호출
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      setMeasuredState((prev) => {
        const heights = { ...prev.heights };
        let changed = false;
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const idx = Number(el.dataset.index);
          const h =
            entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
          if (!isNaN(idx) && h > 0 && heights[idx] !== h) {
            heights[idx] = h;
            changed = true;
          }
        }
        return changed ? { texts, heights } : prev;
      });
    });

    for (const el of Object.values(itemRefs.current)) {
      if (el) ro.observe(el);
    }
    return () => ro.disconnect();
  }, [startIndex, endIndex, texts]);

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
      el.scrollTop =
        offsets[jumpTarget!.index] ??
        jumpTarget!.index * (ESTIMATED_ITEM_HEIGHT + ITEM_GAP);
    },
  );

  const items: { index: number; top: number }[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    items.push({ index: i, top: offsets[i] });
  }

  return (
    <VirtualListShell
      dotColor="bg-orange-400"
      label="Native"
      rendered={items.length}
      total={texts.length}
      parentRef={parentRef}
      totalSize={totalSize}
    >
      {items.map(({ index, top }) => (
        <div
          key={index}
          data-index={index}
          ref={(el) => {
            if (el) itemRefs.current[index] = el;
            else delete itemRefs.current[index];
          }}
          style={{
            ...BASE_ITEM_STYLE,
            width: itemWidth,
            background: itemBackgroundColor(index),
            borderColor: "rgba(251,146,60,0.25)",
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
