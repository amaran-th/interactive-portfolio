"use client";

import {
  Blend,
  Circle,
  Eraser,
  Minus,
  Paintbrush,
  PaintBucket,
  Square,
  Type,
} from "lucide-react";
import { Tool } from "./types";

// key는 useKeyboardShortcuts.ts의 TOOL_KEYS와 정확히 일치해야 한다.
const DRAW_TOOLS: {
  tool: Tool;
  icon: typeof Paintbrush;
  label: string;
  key: string;
}[] = [
  { tool: "pencil", icon: Paintbrush, label: "펜슬", key: "B" },
  { tool: "eraser", icon: Eraser, label: "지우개", key: "E" },
  { tool: "bucket", icon: PaintBucket, label: "채우기", key: "G" },
  { tool: "line", icon: Minus, label: "직선", key: "U" },
  { tool: "rect", icon: Square, label: "사각형", key: "R" },
  { tool: "circle", icon: Circle, label: "원", key: "O" },
  { tool: "text", icon: Type, label: "텍스트", key: "T" },
  { tool: "gradient", icon: Blend, label: "그라데이션", key: "D" },
];

const BRUSH_SIZES = [1, 2, 3, 4];

// 브러시 크기는 실제로 점을 찍는 도구(plotPoint를 쓰는)에만 의미가 있다 —
// 채우기는 floodFill로 영역 전체를 칠하고, 스포이트·선택·이동·자동 선택은
// 애초에 픽셀을 그리지 않으므로 브러시 크기와 무관하다.
const BRUSH_SIZE_TOOLS: Tool[] = ["pencil", "eraser", "line", "rect", "circle"];

// 채우기 옵션은 사각형·원 도형에만 의미가 있다.
const SHAPE_TOOLS: Tool[] = ["rect", "circle"];

// 그라데이션 채우기는 길이·면적이 있는 도형 도구(직선·사각형·원)에 모두 의미가
// 있다 — 직선은 채우기 개념이 없어도 길이 방향으로 색이 변할 수 있다.
const GRADIENT_SHAPE_TOOLS: Tool[] = ["line", "rect", "circle"];

// 그리기 도구·옵션 전용 상단 수평 바 — 왼쪽 사이드바(선택·조작 도구, 실행취소/
// 격자/지우기/미러)와 분리해, 자주 쓰는 그리기 조작을 캔버스 바로 위에 둔다.
export default function DrawToolbar({
  tool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  filledShapes,
  onToggleFilledShapes,
  shapeGradientFill,
  onToggleShapeGradientFill,
}: {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  filledShapes: boolean;
  onToggleFilledShapes: () => void;
  shapeGradientFill: boolean;
  onToggleShapeGradientFill: () => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-white px-3 py-2 shadow-sm">
      <div className="flex gap-1">
        {DRAW_TOOLS.map(({ tool: t, icon: Icon, label, key }) => (
          <button
            key={t}
            onClick={() => onToolChange(t)}
            title={`${label} (${key})`}
            className={`flex h-9 w-8 flex-col items-center justify-center gap-0.5 transition-colors ${
              tool === t
                ? "bg-violet-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-[8px] leading-none">{key}</span>
          </button>
        ))}
      </div>

      <div className="h-8 w-px shrink-0 bg-gray-100" />

      <div className="flex items-center gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          브러시
        </span>
        {BRUSH_SIZES.map((size) => (
          <button
            key={size}
            disabled={!BRUSH_SIZE_TOOLS.includes(tool)}
            onClick={() => onBrushSizeChange(size)}
            title={`${size}px 브러시`}
            className={`h-7 w-7 text-[10px] disabled:opacity-30 ${
              brushSize === size
                ? "bg-violet-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {size}
          </button>
        ))}
      </div>

      <button
        disabled={!SHAPE_TOOLS.includes(tool)}
        onClick={onToggleFilledShapes}
        title="사각형·원을 채워서 그리기"
        className={`px-2 py-1.5 text-[10px] disabled:opacity-30 ${
          filledShapes
            ? "bg-violet-500 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        도형 채우기
      </button>

      <button
        disabled={!GRADIENT_SHAPE_TOOLS.includes(tool)}
        onClick={onToggleShapeGradientFill}
        title="직선·사각형·원을 활성/보조 색상 그라데이션으로 채우기"
        className={`px-2 py-1.5 text-[10px] disabled:opacity-30 ${
          shapeGradientFill
            ? "bg-violet-500 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        그라데이션 채우기
      </button>
    </div>
  );
}
