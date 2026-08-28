"use client";

import { CSSProperties } from "react";

export type TooltipLine =
  | string
  | { text: string; className?: string; color?: string };

type ChartTooltipProps = {
  /** Position within the nearest `position: relative` ancestor, 0-100. */
  xPercent: number;
  yPercent: number;
  /**
   * First line is the title; the rest render as detail rows below a
   * divider. A detail line may be a plain string (default gray) or
   * `{ text, className }` to override its color/weight.
   */
  lines: TooltipLine[];
  /**
   * "point" (default) offsets sideways from (x, y), flipping to the left
   * edge when close to the right side — meant for a cursor/point on a
   * continuous chart. "above" centers horizontally on x and sits above y
   * — meant for a discrete element (a bar, a node) where a sideways
   * offset could overlap a neighboring element.
   */
  anchor?: "point" | "above";
  /** Small color dot next to the title, tying the tooltip to a series/segment color. */
  accentColor?: string;
};

export default function ChartTooltip({
  xPercent,
  yPercent,
  lines,
  anchor = "point",
  accentColor,
}: ChartTooltipProps) {
  const style: CSSProperties =
    anchor === "above"
      ? {
          left: `${xPercent}%`,
          top: `${yPercent}%`,
          transform: "translate(-50%, calc(-100% - 12px))",
        }
      : {
          left: `${xPercent}%`,
          top: `${yPercent}%`,
          transform:
            xPercent > 65
              ? "translate(calc(-100% - 14px), -50%)"
              : "translate(14px, -50%)",
        };

  const [title, ...details] = lines;
  const titleText = typeof title === "string" ? title : title.text;

  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[128px] whitespace-nowrap rounded-xl border border-gray-100 bg-white/95 px-3 py-2 text-[11px] shadow-xl ring-1 ring-black/5 backdrop-blur-sm"
      style={style}
    >
      <div className="flex items-center gap-1.5">
        {accentColor && (
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-2 ring-white"
            style={{ backgroundColor: accentColor }}
          />
        )}
        <p className="font-semibold text-gray-900">{titleText}</p>
      </div>
      {details.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1 border-t border-gray-100 pt-1.5">
          {details.map((line, i) => {
            const text = typeof line === "string" ? line : line.text;
            const color = typeof line === "string" ? undefined : line.color;
            const className =
              typeof line === "string"
                ? "text-gray-500"
                : (line.className ?? (color ? undefined : "text-gray-500"));
            return (
              <p
                key={i}
                className={`flex items-center gap-1.5 ${className ?? ""}`}
              >
                {color && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span style={color ? { color } : undefined}>{text}</span>
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
