"use client";

import { useCallback, useRef, useState } from "react";
import { mergeColors, pixelateImage, quantizeColors } from "./pixelate";

type Preview = { width: number; height: number; palette: string[]; pixels: number[] };

export default function ImportPanel({
  onConfirm,
}: {
  onConfirm: (doc: Preview) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pixelSize, setPixelSize] = useState(32);
  const [antiAlias, setAntiAlias] = useState(false);
  const [maxColors, setMaxColors] = useState(8);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

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

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-semibold text-gray-400">이미지를 픽셀아트로 변환</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="text-xs text-gray-300"
      />

      {preview && (
        <>
          <label className="flex items-center justify-between text-xs text-gray-300">
            픽셀 크기
            <input
              type="range"
              min={8}
              max={128}
              value={pixelSize}
              onChange={(e) => handleOptionChange(Number(e.target.value), antiAlias, maxColors)}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-gray-300">
            안티에일리어싱
            <input
              type="checkbox"
              checked={antiAlias}
              onChange={(e) => handleOptionChange(pixelSize, e.target.checked, maxColors)}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-gray-300">
            대표 색상 개수
            <input
              type="range"
              min={2}
              max={16}
              value={maxColors}
              onChange={(e) => handleOptionChange(pixelSize, antiAlias, Number(e.target.value))}
            />
          </label>

          <div className="flex flex-wrap gap-1">
            {preview.palette.map((color, i) => (
              <button
                key={i}
                title="더블클릭하면 다음 색상과 병합됩니다"
                onDoubleClick={() => preview.palette.length > 1 && handleMergeClick(i, (i + 1) % preview.palette.length)}
                className="h-5 w-5 rounded border border-white/20"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <button
            onClick={() => onConfirm(preview)}
            className="rounded-lg bg-white py-2 text-xs font-semibold text-gray-950"
          >
            가져오기
          </button>
        </>
      )}
    </div>
  );
}
