"use client";

import { Circle, Copy, Eraser, Minus, MousePointer2, Move, Paintbrush, PaintBucket, Pipette, Redo2, Square, Undo2, Wand2 } from "lucide-react";
import { MirrorMode, Tool } from "./types";

const TOOLS: { tool: Tool; icon: typeof Paintbrush; label: string; key: string }[] = [
  { tool: "pencil", icon: Paintbrush, label: "펜슬", key: "B" },
  { tool: "eraser", icon: Eraser, label: "지우개", key: "E" },
  { tool: "bucket", icon: PaintBucket, label: "채우기", key: "G" },
  { tool: "eyedropper", icon: Pipette, label: "스포이트", key: "I" },
  { tool: "line", icon: Minus, label: "직선", key: "U" },
  { tool: "rect", icon: Square, label: "사각형", key: "U" },
  { tool: "circle", icon: Circle, label: "원", key: "U" },
  { tool: "select", icon: MousePointer2, label: "선택", key: "M" },
  { tool: "move", icon: Move, label: "이동", key: "V" },
  { tool: "wand", icon: Wand2, label: "자동 선택", key: "W" },
];

export default function Toolbar({
  tool,
  onToolChange,
  mirror,
  onMirrorChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  mirror: MirrorMode;
  onMirrorChange: (mode: MirrorMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 bg-white p-3 shadow-md">
      <div className="grid grid-cols-5 gap-1.5">
        {TOOLS.map(({ tool: t, icon: Icon, label, key }) => (
          <button
            key={t}
            onClick={() => onToolChange(t)}
            title={`${label} (${key})`}
            className={`flex h-8 w-8 items-center justify-center transition-colors ${
              tool === t ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onUndo} disabled={!canUndo} className="flex h-7 w-7 items-center justify-center bg-gray-100 text-gray-600 disabled:opacity-30">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className="flex h-7 w-7 items-center justify-center bg-gray-100 text-gray-600 disabled:opacity-30">
          <Redo2 className="h-4 w-4" />
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
      <p className="flex items-center gap-1 text-[10px] text-gray-400">
        <Copy className="h-3 w-3" /> Ctrl+C/V 복사·붙여넣기 · Ctrl+Z/Y 실행취소·다시실행
      </p>
    </div>
  );
}
