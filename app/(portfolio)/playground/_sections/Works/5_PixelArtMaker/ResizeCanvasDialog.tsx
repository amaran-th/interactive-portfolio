"use client";

import { useState } from "react";
import { MAX_CANVAS_SIZE } from "./types";

export default function ResizeCanvasDialog({
  width,
  height,
  onConfirm,
  onCancel,
}: {
  width: number;
  height: number;
  onConfirm: (width: number, height: number) => void;
  onCancel: () => void;
}) {
  const [w, setW] = useState(width);
  const [h, setH] = useState(height);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-72 bg-white p-4 shadow-xl">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">캔버스 크기 수정</h2>
        <p className="mb-3 text-[10px] text-gray-400">
          그림을 다시 늘리거나 줄이지 않고, 왼쪽 위를 기준으로 잘리거나 투명하게 늘어납니다.
        </p>
        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-1.5 text-xs text-gray-600">
            너비
            <input
              type="number"
              min={1}
              max={MAX_CANVAS_SIZE}
              value={w}
              onChange={(e) => setW(Math.max(1, Math.min(MAX_CANVAS_SIZE, Number(e.target.value) || 1)))}
              className="w-full bg-gray-50 px-2 py-1.5 text-sm text-gray-700"
            />
          </label>
          <label className="flex flex-1 items-center gap-1.5 text-xs text-gray-600">
            높이
            <input
              type="number"
              min={1}
              max={MAX_CANVAS_SIZE}
              value={h}
              onChange={(e) => setH(Math.max(1, Math.min(MAX_CANVAS_SIZE, Number(e.target.value) || 1)))}
              className="w-full bg-gray-50 px-2 py-1.5 text-sm text-gray-700"
            />
          </label>
        </div>
        <button
          onClick={() => onConfirm(w, h)}
          className="mt-3 w-full bg-violet-500 py-2 text-xs font-semibold text-white hover:bg-violet-600"
        >
          적용
        </button>
        <button onClick={onCancel} className="mt-1.5 w-full py-2 text-xs text-gray-400 hover:text-gray-900">
          취소
        </button>
      </div>
    </div>
  );
}
