import { RefObject } from "react";
import { VIEWPORT_HEIGHT } from "./constants";
import { ListHeader } from "./ListHeader";

interface Props {
  dotColor: string;
  label: string;
  rendered: number;
  total: number;
  parentRef: RefObject<HTMLDivElement | null>;
  totalSize: number;
  children: React.ReactNode;
}

export function VirtualListShell({
  dotColor,
  label,
  rendered,
  total,
  parentRef,
  totalSize,
  children,
}: Props) {
  return (
    <div className="h-full min-h-0 bg-white/5 rounded-xl p-5 border border-white/10 overflow-hidden flex flex-col gap-4">
      <ListHeader
        dotColor={dotColor}
        label={label}
        rendered={rendered}
        total={total}
      />

      <div
        ref={parentRef}
        className="flex-1 rounded-xl border border-white/10 bg-white/2 overflow-auto"
        style={{ height: VIEWPORT_HEIGHT }}
      >
        <div
          className="flex justify-center w-full relative"
          style={{ height: totalSize }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
