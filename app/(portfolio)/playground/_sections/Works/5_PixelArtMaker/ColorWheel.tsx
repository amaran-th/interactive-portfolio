"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from "./hsv";
import { MAX_PALETTE_COLORS } from "./types";

const WHEEL_SIZE = 120;

export default function ColorWheel({
  palette,
  activeColorIndex,
  onSelect,
  onChangeActiveColor,
  onAddColor,
  onRemoveColor,
}: {
  palette: string[];
  activeColorIndex: number;
  onSelect: (index: number) => void;
  onChangeActiveColor: (hex: string) => void;
  onAddColor: (hex: string) => void;
  onRemoveColor: (index: number) => void;
}) {
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const draggingWheelRef = useRef(false);
  const activeHex = palette[activeColorIndex] ?? "#000000";
  const [hsv, setHsv] = useState<[number, number, number]>(() => rgbToHsv(...hexToRgb(activeHex)));

  // 활성 색상이 바뀌면(스와치 클릭, 스포이트 등) 색상환도 그 색의 H/S/V로 동기화한다.
  useEffect(() => {
    setHsv(rgbToHsv(...hexToRgb(activeHex)));
  }, [activeHex]);

  const drawWheel = useCallback((value: number) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = WHEEL_SIZE;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2;
    const imageData = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx + 0.5;
        const dy = y - cy + 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const i = (y * size + x) * 4;
        if (dist > radius) continue; // 알파 0(투명) 유지
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const hue = (angle + 360) % 360;
        const sat = Math.min(1, dist / radius);
        const [r, g, b] = hsvToRgb(hue, sat, value);
        imageData.data[i] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  useEffect(() => {
    drawWheel(hsv[2]);
  }, [hsv, drawWheel]);

  const applyWheelPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = wheelRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const radius = rect.width / 2;
      const dist = Math.min(radius, Math.sqrt(dx * dx + dy * dy));
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const hue = (angle + 360) % 360;
      const sat = radius === 0 ? 0 : dist / radius;
      const nextHsv: [number, number, number] = [hue, sat, hsv[2]];
      setHsv(nextHsv);
      onChangeActiveColor(rgbToHex(...hsvToRgb(...nextHsv)));
    },
    [hsv, onChangeActiveColor],
  );

  const handleWheelDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      draggingWheelRef.current = true;
      wheelRef.current?.setPointerCapture(e.pointerId);
      applyWheelPoint(e.clientX, e.clientY);
    },
    [applyWheelPoint],
  );

  const handleWheelMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingWheelRef.current) return;
      applyWheelPoint(e.clientX, e.clientY);
    },
    [applyWheelPoint],
  );

  const handleWheelUp = useCallback(() => {
    draggingWheelRef.current = false;
  }, []);

  const handleValueChange = useCallback(
    (v: number) => {
      const nextHsv: [number, number, number] = [hsv[0], hsv[1], v];
      setHsv(nextHsv);
      onChangeActiveColor(rgbToHex(...hsvToRgb(...nextHsv)));
    },
    [hsv, onChangeActiveColor],
  );

  const markerRadius = (WHEEL_SIZE / 2) * hsv[1];
  const markerX = WHEEL_SIZE / 2 + Math.cos((hsv[0] * Math.PI) / 180) * markerRadius;
  const markerY = WHEEL_SIZE / 2 + Math.sin((hsv[0] * Math.PI) / 180) * markerRadius;

  const isFull = palette.length >= MAX_PALETTE_COLORS;

  return (
    <div className="flex flex-col gap-3 bg-white p-3 shadow-md">
      <div className="relative mx-auto" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
        <canvas
          ref={wheelRef}
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          className="cursor-crosshair touch-none rounded-full"
          onPointerDown={handleWheelDown}
          onPointerMove={handleWheelMove}
          onPointerUp={handleWheelUp}
          onPointerCancel={handleWheelUp}
        />
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: markerX, top: markerY, backgroundColor: activeHex }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(hsv[2] * 100)}
        onChange={(e) => handleValueChange(Number(e.target.value) / 100)}
        className="w-full"
      />
      <p className="text-xs font-semibold text-gray-500">
        팔레트 ({palette.length}/{MAX_PALETTE_COLORS})
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {palette.map((color, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            onDoubleClick={() => onRemoveColor(index)}
            title={`${color} — 더블클릭으로 제거`}
            className={`h-6 w-6 ${index === activeColorIndex ? "ring-2 ring-violet-500" : "ring-1 ring-black/10"}`}
            style={{ backgroundColor: color }}
          />
        ))}
        <button
          disabled={isFull}
          onClick={() => onAddColor(rgbToHex(...hsvToRgb(...hsv)))}
          title={isFull ? "팔레트가 가득 찼습니다" : "현재 색상환 값을 새 스와치로 추가"}
          className="flex h-6 w-6 items-center justify-center bg-gray-100 text-xs text-gray-500 shadow-sm disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
