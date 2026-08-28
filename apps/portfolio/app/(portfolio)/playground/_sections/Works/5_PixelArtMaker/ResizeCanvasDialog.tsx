"use client";

import { useRef, useState } from "react";
import { MAX_CANVAS_SIZE } from "./types";

export default function ResizeCanvasDialog({
  width,
  height,
  lockAspectRatio,
  onConfirm,
  onCancel,
}: {
  width: number;
  height: number;
  // true면(배경화면) 너비·높이를 따로 자유롭게 바꿀 수 없고, 지금 비율을
  // 유지한 채로만(둘 다 같은 배율로) 커지거나 작아진다.
  lockAspectRatio?: boolean;
  onConfirm: (width: number, height: number) => void;
  onCancel: () => void;
}) {
  const [w, setW] = useState(width);
  const [h, setH] = useState(height);
  const aspectRatioRef = useRef(width / height);

  const clamp = (v: number) =>
    Math.max(1, Math.min(MAX_CANVAS_SIZE, v || 1));

  const handleWidthInput = (v: number) => {
    const next = clamp(v);
    setW(next);
    if (lockAspectRatio) {
      setH(clamp(Math.round(next / aspectRatioRef.current)));
    }
  };

  const handleHeightInput = (v: number) => {
    const next = clamp(v);
    setH(next);
    if (lockAspectRatio) {
      setW(clamp(Math.round(next * aspectRatioRef.current)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-72 bg-white p-4 shadow-xl">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">
          캔버스 크기 수정
        </h2>
        <p className="mb-3 text-[10px] text-gray-400">
          그림을 다시 늘리거나 줄이지 않고, 왼쪽 위를 기준으로 잘리거나 투명하게
          늘어납니다.
          {lockAspectRatio &&
            " 배경화면은 화면을 가득 채우는 용도라 가로세로 비율을 유지한 채로만 크기를 바꿀 수 있습니다."}
        </p>
        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-1.5 text-xs text-gray-600">
            너비
            <input
              type="number"
              min={1}
              max={MAX_CANVAS_SIZE}
              value={w}
              onChange={(e) => handleWidthInput(Number(e.target.value))}
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
              onChange={(e) => handleHeightInput(Number(e.target.value))}
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
        <button
          onClick={onCancel}
          className="mt-1.5 w-full py-2 text-xs text-gray-400 hover:text-gray-900"
        >
          취소
        </button>
      </div>
    </div>
  );
}
