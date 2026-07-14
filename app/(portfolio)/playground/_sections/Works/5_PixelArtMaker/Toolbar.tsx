"use client";

import {
  Copy,
  Grid3x3,
  MousePointer2,
  Move,
  Redo2,
  SquareX,
  Undo2,
  Wand2,
} from "lucide-react";
import { isMacPlatform } from "./platform";
import { MirrorMode, Tool } from "./types";

// 그리기 도구(펜슬·지우개·채우기·직선/사각형/원·텍스트·그라데이션)와 그 옵션
// (브러시 크기·도형 채우기·그라데이션 채우기)은 캔버스 바로 위 상단 수평
// 바(DrawToolbar)로 옮겼다 — 이 사이드바에는 선택·조작 도구와 실행취소/격자/
// 지우기/미러처럼 그리기 도구와 무관한 조작만 남는다.
// key는 useKeyboardShortcuts.ts의 TOOL_KEYS와 정확히 일치해야 한다.
const SELECT_TOOLS: {
  tool: Tool;
  icon: typeof MousePointer2;
  label: string;
  key: string;
}[] = [
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
  showGrid,
  onToggleGrid,
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
  onClearCanvas: () => void;
}) {
  const mod = isMacPlatform() ? "⌘" : "Ctrl+";

  return (
    <div className="flex flex-col gap-3 bg-white p-3 shadow-md">
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          선택 · 조작
        </p>
        <div className="grid grid-cols-5 gap-1">
          {SELECT_TOOLS.map(({ tool: t, icon: Icon, label, key }) => (
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
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex h-7 w-7 items-center justify-center bg-gray-100 text-gray-600 disabled:opacity-30"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex h-7 w-7 items-center justify-center bg-gray-100 text-gray-600 disabled:opacity-30"
        >
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
          <SquareX className="h-4 w-4" />
        </button>
        <div className="ml-auto flex gap-1 text-[10px] text-gray-500">
          {(["none", "horizontal", "vertical", "both"] as MirrorMode[]).map(
            (m) => (
              <button
                key={m}
                onClick={() => onMirrorChange(m)}
                className={`px-1.5 py-1 ${mirror === m ? "bg-violet-500 text-white" : "bg-gray-100"}`}
              >
                {m === "none"
                  ? "미러 없음"
                  : m === "horizontal"
                    ? "좌우"
                    : m === "vertical"
                      ? "상하"
                      : "좌우상하"}
              </button>
            ),
          )}
        </div>
      </div>
      <p className="flex items-start gap-1 text-[10px] text-gray-400">
        <Copy className="h-3 w-3 shrink-0 translate-y-0.5" />
        <span className="min-w-0">
          {mod}C/{mod}V 복사·붙여넣기 · {mod}Z/{mod}Y 실행취소·다시실행 · {mod}S
          저장
        </span>
      </p>
    </div>
  );
}
