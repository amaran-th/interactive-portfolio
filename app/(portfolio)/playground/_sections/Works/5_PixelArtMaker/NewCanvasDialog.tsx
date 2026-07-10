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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-72 rounded-xl border border-white/10 bg-gray-950 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">새 픽셀아트</h2>
        <div className="flex flex-col gap-2">
          {CANVAS_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onSelect(preset.width, preset.height)}
              className="rounded-lg bg-white/5 px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/10"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="mt-3 w-full rounded-lg py-2 text-xs text-gray-500 hover:text-white">
          취소
        </button>
      </div>
    </div>
  );
}
