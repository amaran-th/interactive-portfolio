"use client";

type ChartTooltipProps = {
  x: number;
  y: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  lines: string[];
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
}: ChartTooltipProps) {
  const boxWidth =
    Math.max(...lines.map((line) => line.length)) * CHAR_WIDTH + PADDING_X * 2;
  const boxHeight = lines.length * LINE_HEIGHT + PADDING_Y * 2;
  const flipLeft = x + 10 + boxWidth > viewBoxWidth;
  const boxX = flipLeft ? x - 10 - boxWidth : x + 10;
  const boxY = Math.min(
    Math.max(0, y - boxHeight / 2),
    viewBoxHeight - boxHeight,
  );

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
