"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import type { JumpTarget } from "./BenchmarkPanel";
import { ITEM_GAP, OVERSCAN } from "./constants";
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

const itemStyle: React.CSSProperties = {
  ...BASE_ITEM_STYLE,
  borderColor: "rgba(74,222,128,0.22)",
  color: "rgba(255,255,255,0.74)",
};

export default function VirtualList({
  texts,
  heights,
  itemWidth,
  jumpTarget,
  onJumpComplete,
  onScrollCount,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: texts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => heights[index] ?? 0,
    gap: ITEM_GAP,
    overscan: OVERSCAN,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    virtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heights]);

  useJumpWithScrollCount(
    parentRef,
    jumpTarget ?? null,
    onJumpComplete,
    onScrollCount,
    () => virtualizer.scrollToIndex(jumpTarget!.index, { align: "start" }),
  );

  return (
    <VirtualListShell
      dotColor="bg-green-400"
      label="Pretext"
      rendered={virtualItems.length}
      total={texts.length}
      parentRef={parentRef}
      totalSize={virtualizer.getTotalSize()}
    >
      {virtualItems.map((virtualRow) => (
        <div
          key={virtualRow.key}
          style={{
            ...itemStyle,
            width: itemWidth,
            height: virtualRow.size,
            background: itemBackgroundColor(virtualRow.index),
            transform: `translateY(${virtualRow.start}px)`,
          }}
        >
          {texts[virtualRow.index]}
        </div>
      ))}
    </VirtualListShell>
  );
}
