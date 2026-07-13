"use client";

import { useEffect, useRef, useState } from "react";
import { applePalette, applePixels, APPLE_SIZE } from "./applePreview";
import { resamplePixelGrid } from "./pixelate";
import { CANVAS_PRESETS, MAX_CANVAS_SIZE } from "./types";

// 미리보기 캔버스가 화면에 표시되는 최대 크기(정사각형 안에 맞춤).
const PREVIEW_DISPLAY_MAX = 88;

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
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const clamp = (v: number) => Math.max(1, Math.min(MAX_CANVAS_SIZE, v || 1));

  // 선택한 캔버스 크기가 실제로 어느 정도 해상도인지 감이 오도록, 간단한 사과
  // 기준 그림을 그 크기로 리샘플링해 보여준다.
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const resampled = resamplePixelGrid(applePixels, APPLE_SIZE, APPLE_SIZE, width, height);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const colorIndex = resampled[y * width + x];
        if (colorIndex < 0) continue;
        ctx.fillStyle = applePalette[colorIndex] ?? "#ff00ff";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [width, height]);

  const previewScale = Math.min(PREVIEW_DISPLAY_MAX / width, PREVIEW_DISPLAY_MAX / height);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="max-h-[90%] w-104 overflow-y-auto bg-white p-4 shadow-xl">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">새 픽셀아트</h2>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">파일명</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="파일명"
          className="mb-3 w-full bg-white px-3 py-2 text-sm text-gray-900 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] outline-none focus:shadow-[0_0_0_1.5px_#8b5cf6]"
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              캔버스 크기를 선택하세요
            </label>
            <div className="grid grid-cols-2 gap-2">
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
          </div>

          <div className="flex w-24 shrink-0 flex-col items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">미리보기</label>
            <div
              className="flex items-center justify-center bg-gray-50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
              style={{ width: PREVIEW_DISPLAY_MAX + 8, height: PREVIEW_DISPLAY_MAX + 8 }}
            >
              <canvas
                ref={previewCanvasRef}
                style={{ imageRendering: "pixelated", width: width * previewScale, height: height * previewScale }}
              />
            </div>
            <p className="text-center text-[9px] text-gray-400">
              {width} × {height}
            </p>
          </div>
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
