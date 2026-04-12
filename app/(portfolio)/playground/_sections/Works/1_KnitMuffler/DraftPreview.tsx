"use client";

import { ArrowRight } from "lucide-react";
import { useColorPalette } from "./ColorModeContext";

export default function DraftPreview({
  draft,
  className = "",
  cellSize = 12,
  showNumbers = true,
  currentRowIndex,
}: {
  draft: number[][];
  className?: string;
  cellSize?: number;
  showNumbers?: boolean;
  currentRowIndex?: number;
}) {
  const palette = useColorPalette();
  const colorList = Object.values(palette);

  return (
    <div
      className={`flex flex-col border border-gray-400 divide-y divide-gray-400 bg-white ${className}`}
    >
      {draft.map((row, ri) => (
        <div
          key={ri}
          className={`flex relative ${typeof currentRowIndex === "number" && ri !== currentRowIndex ? "opacity-30" : ""}`}
        >
          {currentRowIndex === ri &&
            (ri % 2 === 1 ? (
              <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-4 h-4">
                <ArrowRight className="w-4 h-4 text-red-500 rotate-180" />
              </div>
            ) : (
              <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-4 h-4">
                <ArrowRight className="w-4 h-4 text-red-500" />
              </div>
            ))}
          {row.map((stitch, si) => {
            const colorDef = colorList.find((c) => c.id === stitch);
            return (
              <div
                key={si}
                className={`flex justify-center items-center text-[8px] ${si < row.length - 1 ? "border-r border-gray-400" : ""}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: colorDef?.fill ?? "transparent",
                  color: colorDef?.text ?? "inherit",
                }}
              >
                {showNumbers ? stitch || "" : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
