"use client";

import { CANVAS_PRESETS } from "./types";

export default function NewCanvasDialog({
  onSelect,
  onCancel,
}: {
  onSelect: (width: number, height: number) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-72 bg-white p-4 shadow-xl">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">새 픽셀아트</h2>
        <div className="flex flex-col gap-2">
          {CANVAS_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onSelect(preset.width, preset.height)}
              className="bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 hover:bg-violet-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="mt-3 w-full py-2 text-xs text-gray-400 hover:text-gray-900">
          취소
        </button>
      </div>
    </div>
  );
}
