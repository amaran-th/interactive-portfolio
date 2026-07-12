"use client";

import { useState } from "react";
import { CANVAS_PRESETS } from "./types";

export default function NewCanvasDialog({
  onSelect,
  onImportImage,
  onCancel,
}: {
  onSelect: (width: number, height: number, name: string) => void;
  onImportImage: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("제목 없음");
  const [selectedPreset, setSelectedPreset] = useState<(typeof CANVAS_PRESETS)[number]>(CANVAS_PRESETS[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-72 bg-white p-4 shadow-xl">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">새 픽셀아트</h2>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">파일명</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="파일명"
          className="mb-3 w-full bg-white px-3 py-2 text-sm text-gray-900 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] outline-none focus:shadow-[0_0_0_1.5px_#8b5cf6]"
        />
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          캔버스 크기를 선택하세요
        </label>
        <div className="flex flex-col gap-2">
          {CANVAS_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setSelectedPreset(preset)}
              className={`px-3 py-2 text-left text-sm ${
                selectedPreset.label === preset.label
                  ? "bg-violet-50 text-violet-700 shadow-[0_0_0_1.5px_#8b5cf6]"
                  : "bg-gray-50 text-gray-700 hover:bg-violet-50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => onSelect(selectedPreset.width, selectedPreset.height, name || "제목 없음")}
          className="mt-3 w-full bg-violet-500 py-2 text-sm font-semibold text-white hover:bg-violet-600"
        >
          생성
        </button>
        <button onClick={onCancel} className="mt-2 w-full py-2 text-xs text-gray-400 hover:text-gray-900">
          취소
        </button>

        <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-300">
          <div className="h-px flex-1 bg-gray-100" />
          또는
          <div className="h-px flex-1 bg-gray-100" />
        </div>
        <button
          onClick={onImportImage}
          className="mt-2 w-full bg-white px-3 py-2 text-left text-sm text-gray-700 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] hover:bg-gray-50"
        >
          이미지로 불러오기 (파일·클립보드)
        </button>
      </div>
    </div>
  );
}
