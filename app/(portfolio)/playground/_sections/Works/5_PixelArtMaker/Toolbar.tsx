"use client";

import { Circle, Copy, Eraser, Grid3x3, Minus, MousePointer2, Move, Paintbrush, PaintBucket, Redo2, Square, Trash2, Undo2, Wand2 } from "lucide-react";
import { isMacPlatform } from "./platform";
import { MirrorMode, Tool } from "./types";

// 스포이트는 색상 패널(ColorWheel) 쪽으로 옮겨서 여기서는 다루지 않는다.
// key는 useKeyboardShortcuts.ts의 TOOL_KEYS와 정확히 일치해야 한다 — 예전에는
// line/rect/circle이 전부 "U"로 표시됐지만 실제로는 line만 U에 묶여 있었다
// (rect/circle은 아예 단축키가 없었다). 아이콘 밑에 단축키를 항상 보여주게 되면서
// 이 불일치가 더 눈에 띄어, rect=R, circle=O로 실제 단축키를 새로 배정했다.
const TOOL_GROUPS: { label: string; tools: { tool: Tool; icon: typeof Paintbrush; label: string; key: string }[] }[] = [
  {
    label: "그리기",
    tools: [
      { tool: "pencil", icon: Paintbrush, label: "펜슬", key: "B" },
      { tool: "eraser", icon: Eraser, label: "지우개", key: "E" },
      { tool: "bucket", icon: PaintBucket, label: "채우기", key: "G" },
      { tool: "line", icon: Minus, label: "직선", key: "U" },
      { tool: "rect", icon: Square, label: "사각형", key: "R" },
      { tool: "circle", icon: Circle, label: "원", key: "O" },
    ],
  },
  {
    label: "선택 · 조작",
    tools: [
      { tool: "select", icon: MousePointer2, label: "선택", key: "M" },
      { tool: "move", icon: Move, label: "이동", key: "V" },
      { tool: "wand", icon: Wand2, label: "자동 선택", key: "W" },
    ],
  },
];

const BRUSH_SIZES = [1, 2, 3, 4];

// 브러시 크기는 실제로 점을 찍는 도구(plotPoint를 쓰는)에만 의미가 있다 —
// 채우기는 floodFill로 영역 전체를 칠하고, 스포이트·선택·이동·자동 선택은
// 애초에 픽셀을 그리지 않으므로 브러시 크기와 무관하다.
const BRUSH_SIZE_TOOLS: Tool[] = ["pencil", "eraser", "line", "rect", "circle"];

export default function Toolbar({
  tool,
  onToolChange,
  mirror,
  onMirrorChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showGrid,
  onToggleGrid,
  brushSize,
  onBrushSizeChange,
  onClearCanvas,
}: {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  mirror: MirrorMode;
  onMirrorChange: (mode: MirrorMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onClearCanvas: () => void;
}) {
  const mod = isMacPlatform() ? "⌘" : "Ctrl+";

  return (
    <div className="flex flex-col gap-3 bg-white p-3 shadow-md">
      {TOOL_GROUPS.map((group) => (
        <div key={group.label} className="contents">
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
            <div className="grid grid-cols-5 gap-1">
              {group.tools.map(({ tool: t, icon: Icon, label, key }) => (
                <button
                  key={t}
                  onClick={() => onToolChange(t)}
                  title={`${label} (${key})`}
                  className={`flex h-9 w-8 flex-col items-center justify-center gap-0.5 transition-colors ${
                    tool === t ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[8px] leading-none">{key}</span>
                </button>
              ))}
            </div>
          </div>

          {group.label === "그리기" && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">브러시 크기</p>
              <div className="flex gap-1">
                {BRUSH_SIZES.map((size) => (
                  <button
                    key={size}
                    disabled={!BRUSH_SIZE_TOOLS.includes(tool)}
                    onClick={() => onBrushSizeChange(size)}
                    title={`${size}px 브러시`}
                    className={`flex-1 py-1 text-[10px] disabled:opacity-30 ${
                      brushSize === size ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-1.5">
        <button onClick={onUndo} disabled={!canUndo} className="flex h-7 w-7 items-center justify-center bg-gray-100 text-gray-600 disabled:opacity-30">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className="flex h-7 w-7 items-center justify-center bg-gray-100 text-gray-600 disabled:opacity-30">
          <Redo2 className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleGrid}
          title="격자 표시 (기본 켜짐)"
          className={`flex h-7 w-7 items-center justify-center ${showGrid ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600"}`}
        >
          <Grid3x3 className="h-4 w-4" />
        </button>
        <button
          onClick={onClearCanvas}
          title="전체 지우기"
          className="flex h-7 w-7 items-center justify-center bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <div className="ml-auto flex gap-1 text-[10px] text-gray-500">
          {(["none", "horizontal", "vertical", "both"] as MirrorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onMirrorChange(m)}
              className={`px-1.5 py-1 ${mirror === m ? "bg-violet-500 text-white" : "bg-gray-100"}`}
            >
              {m === "none" ? "미러 없음" : m === "horizontal" ? "좌우" : m === "vertical" ? "상하" : "좌우상하"}
            </button>
          ))}
        </div>
      </div>
      <p className="flex items-start gap-1 text-[10px] text-gray-400">
        <Copy className="h-3 w-3 shrink-0 translate-y-0.5" />
        <span className="min-w-0">
          {mod}C/{mod}V 복사·붙여넣기 · {mod}Z/{mod}Y 실행취소·다시실행 · {mod}S 저장
        </span>
      </p>
    </div>
  );
}
