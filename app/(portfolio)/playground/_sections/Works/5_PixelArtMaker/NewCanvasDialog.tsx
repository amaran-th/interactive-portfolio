"use client";

import { useState } from "react";
import { CANVAS_PRESETS, MAX_CANVAS_SIZE } from "./types";

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
  // 프리셋 버튼은 이 크기를 채워주는 바로가기일 뿐, 실제 값은 항상 width/height
  // 입력칸이 갖고 있다 — 그래서 프리셋을 고른 뒤에도 자유롭게 숫자를 고쳐
  // 임의 크기를 만들 수 있다.
  const [width, setWidth] = useState<number>(CANVAS_PRESETS[0].width);
  const [height, setHeight] = useState<number>(CANVAS_PRESETS[0].height);

  const clamp = (v: number) => Math.max(1, Math.min(MAX_CANVAS_SIZE, v || 1));

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
              onClick={() => {
                setWidth(preset.width);
                setHeight(preset.height);
              }}
              className={`px-3 py-2 text-left text-sm ${
                width === preset.width && height === preset.height
                  ? "bg-violet-50 text-violet-700 shadow-[0_0_0_1.5px_#8b5cf6]"
                  : "bg-gray-50 text-gray-700 hover:bg-violet-50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="mt-3 mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          직접 입력 (1~{MAX_CANVAS_SIZE})
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={MAX_CANVAS_SIZE}
            value={width}
            onChange={(e) => setWidth(clamp(Number(e.target.value)))}
            className="w-full bg-white px-3 py-2 text-center text-sm text-gray-900 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] outline-none focus:shadow-[0_0_0_1.5px_#8b5cf6]"
          />
          <span className="text-xs text-gray-400">×</span>
          <input
            type="number"
            min={1}
            max={MAX_CANVAS_SIZE}
            value={height}
            onChange={(e) => setHeight(clamp(Number(e.target.value)))}
            className="w-full bg-white px-3 py-2 text-center text-sm text-gray-900 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] outline-none focus:shadow-[0_0_0_1.5px_#8b5cf6]"
          />
        </div>

        <button
          onClick={() => onSelect(width, height, name || "제목 없음")}
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
