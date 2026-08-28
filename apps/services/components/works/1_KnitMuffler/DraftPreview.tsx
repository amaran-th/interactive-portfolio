"use client";

import { ArrowRight } from "lucide-react";
import { useColorPalette } from "./ColorModeContext";
import { Draft } from "./data";
import { StitchType } from "./type";

export default function DraftPreview({
  draft,
  className = "",
  cellSize = 12,
  showNumbers = true,
  currentRowIndex,
  currentStitchCount,
}: {
  draft: Draft;
  className?: string;
  cellSize?: number;
  showNumbers?: boolean;
  currentRowIndex?: number;
  currentStitchCount?: number;
}) {
  const palette = useColorPalette();
  const colorList = Object.values(palette);

  return (
    <div
      className={`flex flex-col gap-px border border-gray-400 bg-gray-400 ${className}`}
    >
      {draft.data.map((row, ri) => {
        // 현재 뜰 셀의 열 인덱스 계산 (홀수 줄은 우→좌)
        const nextCellCol =
          ri === currentRowIndex && typeof currentStitchCount === "number"
            ? ri % 2 === 1
              ? row.length - 1 - currentStitchCount
              : currentStitchCount
            : -1;

        return (
          <div
            key={ri}
            className={`flex gap-px bg-gray-400 relative ${typeof currentRowIndex === "number" && ri !== currentRowIndex ? "opacity-30" : ""}`}
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
              const colorDef = colorList.find((c) => c.id === stitch.color);
              const isNext = si === nextCellCol;
              return (
                <div
                  key={si}
                  className={`flex justify-center items-center text-[9px] ${stitch.type === StitchType.Flower ? " rounded-full" : ""}${isNext ? " z-10" : ""}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: colorDef?.fill ?? "white",
                    color: colorDef?.text ?? "inherit",
                    ...(isNext
                      ? {
                          outline: "2px solid rgb(239 68 68)",
                          outlineOffset: "-2px",
                        }
                      : {}),
                  }}
                >
                  {showNumbers ? (stitch.color ?? "") : ""}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
