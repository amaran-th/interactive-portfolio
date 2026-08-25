"use client";

type ChartTooltipProps = {
  x: number;
  y: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  lines: string[];
  /**
   * "point" (default) offsets sideways from (x, y), flipping to the left
   * edge when it would overflow — meant for a cursor/point on a continuous
   * chart. "above" centers horizontally on x and sits above y, flipping
   * below when it would overflow — meant for a discrete element (a bar,
   * a node) where a sideways offset could overlap a neighboring element.
   */
  anchor?: "point" | "above";
};

const LINE_HEIGHT = 14;
const PADDING_X = 8;
const PADDING_Y = 6;
const CHAR_WIDTH = 5.8;

export default function ChartTooltip({
  x,
  y,
  viewBoxWidth,
  viewBoxHeight,
  lines,
  anchor = "point",
}: ChartTooltipProps) {
  const boxWidth =
    Math.max(...lines.map((line) => line.length)) * CHAR_WIDTH + PADDING_X * 2;
  const boxHeight = lines.length * LINE_HEIGHT + PADDING_Y * 2;

  let boxX: number;
  let boxY: number;
  if (anchor === "above") {
    boxX = Math.min(
      Math.max(0, x - boxWidth / 2),
      viewBoxWidth - boxWidth,
    );
    const flipBelow = y - 8 - boxHeight < 0;
    boxY = flipBelow ? y + 8 : y - 8 - boxHeight;
  } else {
    const flipLeft = x + 10 + boxWidth > viewBoxWidth;
    boxX = flipLeft ? x - 10 - boxWidth : x + 10;
    boxY = Math.min(Math.max(0, y - boxHeight / 2), viewBoxHeight - boxHeight);
  }

  return (
    <g className="pointer-events-none">
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx={6}
        fill="white"
        stroke="#e5e7eb"
        strokeWidth={1}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={boxX + PADDING_X}
          y={boxY + PADDING_Y + (i + 1) * LINE_HEIGHT - 4}
          className={
            i === 0
              ? "fill-gray-800 text-[10px] font-semibold"
              : "fill-gray-500 text-[10px]"
          }
        >
          {line}
        </text>
      ))}
    </g>
  );
}
