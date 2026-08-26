"use client";

import { CSSProperties } from "react";

type ChartTooltipProps = {
  /** Position within the nearest `position: relative` ancestor, 0-100. */
  xPercent: number;
  yPercent: number;
  lines: string[];
  /**
   * "point" (default) offsets sideways from (x, y), flipping to the left
   * edge when close to the right side — meant for a cursor/point on a
   * continuous chart. "above" centers horizontally on x and sits above y
   * — meant for a discrete element (a bar, a node) where a sideways
   * offset could overlap a neighboring element.
   */
  anchor?: "point" | "above";
};

export default function ChartTooltip({
  xPercent,
  yPercent,
  lines,
  anchor = "point",
}: ChartTooltipProps) {
  const style: CSSProperties =
    anchor === "above"
      ? {
          left: `${xPercent}%`,
          top: `${yPercent}%`,
          transform: "translate(-50%, calc(-100% - 10px))",
        }
      : {
          left: `${xPercent}%`,
          top: `${yPercent}%`,
          transform:
            xPercent > 65
              ? "translate(calc(-100% - 10px), -50%)"
              : "translate(10px, -50%)",
        };

  return (
    <div
      className="pointer-events-none absolute z-20 flex flex-col gap-0.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] leading-tight shadow-lg"
      style={style}
    >
      {lines.map((line, i) => (
        <p key={i} className={i === 0 ? "font-semibold text-gray-800" : "text-gray-500"}>
          {line}
        </p>
      ))}
    </div>
  );
}
