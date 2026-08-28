"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import type { JumpTarget } from "./BenchmarkPanel";
import { ESTIMATED_ITEM_HEIGHT, ITEM_GAP, OVERSCAN } from "./constants";
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

const itemStyle: React.CSSProperties = {
  ...BASE_ITEM_STYLE,
  borderColor: "rgba(96,165,250,0.2)",
  color: "rgba(255,255,255,0.74)",
};

export default function VirtualListDOM({
  texts,
  itemWidth,
  jumpTarget,
  onJumpComplete,
  onScrollCount,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: texts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    measureElement: (element) => element.getBoundingClientRect().height,
    gap: ITEM_GAP,
    overscan: OVERSCAN,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    virtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemWidth, texts]);

  useJumpWithScrollCount(
    parentRef,
    jumpTarget ?? null,
    onJumpComplete,
    onScrollCount,
    () => virtualizer.scrollToIndex(jumpTarget!.index, { align: "start" }),
  );

  return (
    <VirtualListShell
      dotColor="bg-blue-400"
      label="DOM(@tanstack/react-virtual)"
      rendered={virtualItems.length}
      total={texts.length}
      parentRef={parentRef}
      totalSize={virtualizer.getTotalSize()}
    >
      {virtualItems.map((virtualRow) => (
        <div
          key={virtualRow.key}
          data-index={virtualRow.index}
          ref={virtualizer.measureElement}
          style={{
            ...itemStyle,
            width: itemWidth,
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
