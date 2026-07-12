"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mergeColors, pixelateImage, quantizeColors, resamplePixelGrid } from "./pixelate";
import { CANVAS_PRESETS } from "./types";

type Preview = { width: number; height: number; palette: string[]; pixels: number[] };

export default function ImportPanel({
  onConfirm,
  autoOpen,
}: {
  onConfirm: (doc: Preview) => void;
  autoOpen?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pixelSize, setPixelSize] = useState(32);
  const [antiAlias, setAntiAlias] = useState(false);
  const [maxColors, setMaxColors] = useState(8);
  // null = 픽셀 해상도(pixelSize)를 그대로 최종 캔버스 크기로 쓴다. 값이 있으면
  // 그 규격으로 확대/축소해 배치한다 — "변환할 대상 비트 규격"(pixelSize)과
  // "실제 캔버스 크기"를 독립적으로 고를 수 있게 하는 게 이 상태의 목적이다.
  const [canvasPreset, setCanvasPreset] = useState<{ width: number; height: number } | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const autoOpenedRef = useRef(false);

  // "편집기" 런처에서 "이미지로 불러오기"로 시작한 경우, 편집창이 뜨자마자 파일
  // 선택 창을 자동으로 띄운다 — 한 번만 열리도록 ref로 가드한다.
  useEffect(() => {
    if (autoOpen && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      fileInputRef.current?.click();
    }
  }, [autoOpen]);

  const runPixelate = useCallback(
    (img: HTMLImageElement, size: number, aa: boolean, colors: number) => {
      const raw = pixelateImage(img, size, size, aa);
      const quantized = quantizeColors(raw.palette, raw.pixels, colors);
      setPreview({ width: raw.width, height: raw.height, palette: quantized.palette, pixels: quantized.pixels });
    },
    [],
  );

  const handleFile = useCallback(
    (file: File) => {
      const img = new Image();
      img.onload = () => {
        setImageEl(img);
        runPixelate(img, pixelSize, antiAlias, maxColors);
      };
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      img.src = url;
    },
    [pixelSize, antiAlias, maxColors, runPixelate],
  );

  // 클립보드에 복사된 이미지(스크린샷, 다른 앱에서 복사한 그림 등)를 바로 가져온다.
  // Clipboard API 미지원/권한 거부 환경에서는 조용히 무시한다(이 프로젝트의 기존
  // localStorage 저장 실패 처리와 같은 관례 — 토스트 UI가 없는 이 앱에서 새 알림
  // 체계를 따로 만들지 않는다).
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        handleFile(new File([blob], "clipboard-image", { type: imageType }));
        return;
      }
    } catch {
      // 클립보드 접근 실패 — 무시(사용자가 파일 선택으로 대신 진행할 수 있음)
    }
  }, [handleFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile],
  );

  const handleOptionChange = useCallback(
    (size: number, aa: boolean, colors: number) => {
      setPixelSize(size);
      setAntiAlias(aa);
      setMaxColors(colors);
      if (imageEl) runPixelate(imageEl, size, aa, colors);
    },
    [imageEl, runPixelate],
  );

  const handleMergeClick = useCallback(
    (indexA: number, indexB: number) => {
      if (!preview) return;
      const merged = mergeColors(preview.palette, preview.pixels, indexA, indexB);
      setPreview({ ...preview, palette: merged.palette, pixels: merged.pixels });
    },
    [preview],
  );

  const handleConfirm = useCallback(() => {
    if (!preview) return;
    if (!canvasPreset || (canvasPreset.width === preview.width && canvasPreset.height === preview.height)) {
      onConfirm(preview);
      return;
    }
    const pixels = resamplePixelGrid(preview.pixels, preview.width, preview.height, canvasPreset.width, canvasPreset.height);
    onConfirm({ width: canvasPreset.width, height: canvasPreset.height, palette: preview.palette, pixels });
  }, [preview, canvasPreset, onConfirm]);

  return (
    <div className="flex flex-col gap-3 bg-white p-3 shadow-md">
      <p className="text-xs font-semibold text-gray-500">이미지를 픽셀아트로 변환</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col gap-2 p-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] transition-colors ${
          isDragOver ? "bg-violet-50" : "bg-gray-50"
        }`}
      >
        <p className="text-center text-[10px] text-gray-400">이미지를 여기로 드래그하거나 파일을 선택하세요</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-xs text-gray-600"
        />
        <button
          onClick={handlePasteFromClipboard}
          className="bg-gray-100 py-1.5 text-[10px] text-gray-600 hover:bg-gray-200"
        >
          클립보드에서 붙여넣기
        </button>
      </div>

      {preview && (
        <>
          <label className="flex items-center justify-between text-xs text-gray-600">
            픽셀 해상도(비트 규격)
            <input
              type="range"
              min={8}
              max={128}
              value={pixelSize}
              onChange={(e) => handleOptionChange(Number(e.target.value), antiAlias, maxColors)}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-gray-600">
            안티에일리어싱
            <input
              type="checkbox"
              checked={antiAlias}
              onChange={(e) => handleOptionChange(pixelSize, e.target.checked, maxColors)}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-gray-600">
            대표 색상 개수
            <input
              type="range"
              min={2}
              max={16}
              value={maxColors}
              onChange={(e) => handleOptionChange(pixelSize, antiAlias, Number(e.target.value))}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-gray-600">
            캔버스 크기
            <select
              value={canvasPreset ? `${canvasPreset.width}x${canvasPreset.height}` : "same"}
              onChange={(e) => {
                if (e.target.value === "same") {
                  setCanvasPreset(null);
                  return;
                }
                const preset = CANVAS_PRESETS.find((p) => `${p.width}x${p.height}` === e.target.value);
                if (preset) setCanvasPreset({ width: preset.width, height: preset.height });
              }}
              className="bg-gray-100 px-1.5 py-1 text-[10px] text-gray-600"
            >
              <option value="same">픽셀 해상도와 동일</option>
              {CANVAS_PRESETS.map((p) => (
                <option key={p.label} value={`${p.width}x${p.height}`}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-1">
            {preview.palette.map((color, i) => (
              <button
                key={i}
                title="더블클릭하면 다음 색상과 병합됩니다"
                onDoubleClick={() => preview.palette.length > 1 && handleMergeClick(i, (i + 1) % preview.palette.length)}
                className="h-5 w-5 ring-1 ring-black/10"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <button onClick={handleConfirm} className="bg-violet-500 py-2 text-xs font-semibold text-white hover:bg-violet-600">
            가져오기
          </button>
        </>
      )}
    </div>
  );
}
