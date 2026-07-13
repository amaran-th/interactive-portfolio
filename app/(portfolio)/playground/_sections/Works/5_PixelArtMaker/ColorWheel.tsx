"use client";

import { Pipette } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { hexToRgba, hsvToRgb, rgbaToHex, rgbToHsv } from "./hsv";
import { MAX_PALETTE_COLORS, Tool } from "./types";

const SQUARE_SIZE = 120;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// 세로 트랙(색상/알파 슬라이더) 위 pointer 좌표를 0~1 값으로 환산한다.
function trackValue(clientY: number, rect: DOMRect): number {
  if (rect.height === 0) return 0;
  return clamp01((clientY - rect.top) / rect.height);
}

export default function ColorWheel({
  palette,
  activeColorIndex,
  onSelect,
  onChangeActiveColor,
  onAddColor,
  onRemoveColor,
  tool,
  onToolChange,
  secondaryColorIndex,
  onSelectSecondary,
}: {
  palette: string[];
  activeColorIndex: number;
  onSelect: (index: number) => void;
  onChangeActiveColor: (hex: string) => void;
  onAddColor: (hex: string) => void;
  onRemoveColor: (index: number) => void;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  // 그라데이션 끝 색상 — MS페인트의 보조 색상과 같은 개념. -1이면 투명.
  secondaryColorIndex: number;
  onSelectSecondary: (index: number) => void;
}) {
  const squareRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<"square" | "hue" | "alpha" | null>(null);
  const hueTrackRef = useRef<HTMLDivElement>(null);
  const alphaTrackRef = useRef<HTMLDivElement>(null);
  const activeHex = palette[activeColorIndex] ?? "#000000";
  const activeHexRef = useRef(activeHex);
  const [hsva, setHsva] = useState<[number, number, number, number]>(() => {
    const [r, g, b, a] = hexToRgba(activeHex);
    return [...rgbToHsv(r, g, b), a];
  });

  // 매 렌더 후 최신 activeHex를 ref에 반영한다(렌더 도중 ref를 직접 쓰면 안 되므로
  // effect에서 갱신). 아래 activeColorIndex 동기화 effect가 항상 최신 값을 읽도록
  // 이 effect가 먼저 선언돼 있어야 한다(effect는 선언 순서대로 실행된다).
  useEffect(() => {
    activeHexRef.current = activeHex;
  });

  // 스와치를 바꿔 선택했을 때(클릭, 스포이트 등)만 컨트롤을 그 색의 H/S/V/A로
  // 동기화한다. activeHex가 아니라 activeColorIndex에만 의존해야 한다 — 슬라이더를
  // 드래그해 같은 스와치의 색을 계속 바꾸는 동안에는 hex→rgb→hsv 왕복 변환에서
  // 생기는 반올림 오차가 매 커밋마다 누적돼(특히 hue는 채도가 낮을수록 아주
  // 작은 rgb 반올림에도 크게 흔들린다) 드래그 중 색상이 제멋대로 튀는 버그가 있었다.
  useEffect(() => {
    const [r, g, b, a] = hexToRgba(activeHexRef.current);
    setHsva([...rgbToHsv(r, g, b), a]);
  }, [activeColorIndex]);

  const [hue, sat, val, alpha] = hsva;
  const opaqueRgb = hsvToRgb(hue, sat, val);

  // SV 정사각형 — 가로축 채도(왼쪽 0 → 오른쪽 1), 세로축 명도(위 1 → 아래 0).
  // 색상(hue)은 아래 슬라이더가 정하고, 정사각형은 그 hue의 채도·명도 평면만 그린다.
  const drawSquare = useCallback((h: number) => {
    const canvas = squareRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = SQUARE_SIZE;
    const imageData = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const v = 1 - y / (size - 1);
      for (let x = 0; x < size; x++) {
        const s = x / (size - 1);
        const [r, g, b] = hsvToRgb(h, s, v);
        const i = (y * size + x) * 4;
        imageData.data[i] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  useEffect(() => {
    drawSquare(hue);
  }, [hue, drawSquare]);

  const commit = useCallback(
    (next: [number, number, number, number]) => {
      setHsva(next);
      const [r, g, b] = hsvToRgb(next[0], next[1], next[2]);
      onChangeActiveColor(rgbaToHex(r, g, b, next[3]));
    },
    [onChangeActiveColor],
  );

  const applySquarePoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = squareRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const s = clamp01((clientX - rect.left) / rect.width);
      const v = clamp01(1 - (clientY - rect.top) / rect.height);
      commit([hue, s, v, alpha]);
    },
    [hue, alpha, commit],
  );

  const handleSquareDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      draggingRef.current = "square";
      squareRef.current?.setPointerCapture(e.pointerId);
      applySquarePoint(e.clientX, e.clientY);
    },
    [applySquarePoint],
  );

  const handleSquareMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (draggingRef.current !== "square") return;
      applySquarePoint(e.clientX, e.clientY);
    },
    [applySquarePoint],
  );

  const applyHuePoint = useCallback(
    (clientY: number) => {
      const track = hueTrackRef.current;
      if (!track) return;
      const t = trackValue(clientY, track.getBoundingClientRect());
      commit([t * 360, sat, val, alpha]);
    },
    [sat, val, alpha, commit],
  );

  const handleHueDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = "hue";
      hueTrackRef.current?.setPointerCapture(e.pointerId);
      applyHuePoint(e.clientY);
    },
    [applyHuePoint],
  );

  const handleHueMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (draggingRef.current !== "hue") return;
      applyHuePoint(e.clientY);
    },
    [applyHuePoint],
  );

  const applyAlphaPoint = useCallback(
    (clientY: number) => {
      const track = alphaTrackRef.current;
      if (!track) return;
      const t = trackValue(clientY, track.getBoundingClientRect());
      commit([hue, sat, val, t]);
    },
    [hue, sat, val, commit],
  );

  const handleAlphaDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = "alpha";
      alphaTrackRef.current?.setPointerCapture(e.pointerId);
      applyAlphaPoint(e.clientY);
    },
    [applyAlphaPoint],
  );

  const handleAlphaMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (draggingRef.current !== "alpha") return;
      applyAlphaPoint(e.clientY);
    },
    [applyAlphaPoint],
  );

  const handleDragEnd = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const isFull = palette.length >= MAX_PALETTE_COLORS;
  const markerX = sat * SQUARE_SIZE;
  const markerY = (1 - val) * SQUARE_SIZE;
  const opaqueHex = `rgb(${opaqueRgb[0]}, ${opaqueRgb[1]}, ${opaqueRgb[2]})`;

  return (
    <div className="flex flex-col items-center gap-3 bg-white p-3 shadow-md">
      <div className="flex gap-2">
        {/* SV 정사각형 */}
        <div
          className="relative"
          style={{ width: SQUARE_SIZE, height: SQUARE_SIZE }}
        >
          <canvas
            ref={squareRef}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            className="cursor-crosshair touch-none shadow-sm"
            onPointerDown={handleSquareDown}
            onPointerMove={handleSquareMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          />
          <div
            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_#ffffff,0_1px_3px_rgba(0,0,0,0.35)]"
            style={{ left: markerX, top: markerY, backgroundColor: opaqueHex }}
          />
        </div>

        {/* 스포이트(위) + 색상·알파 세로 슬라이더(아래, 나란히) */}
        <div className="flex flex-col gap-1.5" style={{ height: SQUARE_SIZE }}>
          <button
            onClick={() => onToolChange("eyedropper")}
            title="스포이트 (I)"
            className={`flex h-7 w-7 shrink-0 items-center justify-center transition-colors ${
              tool === "eyedropper"
                ? "bg-violet-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Pipette className="h-4 w-4" />
          </button>
          <div className="flex flex-1 gap-1.5">
            {/* 색상(hue) 세로 슬라이더 */}
            <div
              ref={hueTrackRef}
              onPointerDown={handleHueDown}
              onPointerMove={handleHueMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              className="relative h-full w-3.5 cursor-pointer touch-none shadow-sm"
              style={{
                background:
                  "linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
              }}
            >
              <div
                className="pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_#ffffff,0_1px_3px_rgba(0,0,0,0.35)]"
                style={{
                  top: `${(hue / 360) * 100}%`,
                  backgroundColor: opaqueHex,
                }}
              />
            </div>
            {/* 알파(투명도) 세로 슬라이더 */}
            <div
              ref={alphaTrackRef}
              onPointerDown={handleAlphaDown}
              onPointerMove={handleAlphaMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              className="relative h-full w-3.5 cursor-pointer touch-none shadow-sm"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, #d4d4d8 25%, transparent 25%), linear-gradient(-45deg, #d4d4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d8 75%), linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)",
                backgroundSize: "8px 8px",
                backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, transparent, ${opaqueHex})`,
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_#ffffff,0_1px_3px_rgba(0,0,0,0.35)]"
                style={{ top: `${alpha * 100}%`, backgroundColor: opaqueHex }}
              />
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs font-semibold text-gray-500">
        팔레트 ({palette.length}/{MAX_PALETTE_COLORS})
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {palette.map((color, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            onDoubleClick={() => onRemoveColor(index)}
            onContextMenu={(e) => {
              e.preventDefault();
              onSelectSecondary(index);
            }}
            title={`${color} — 클릭: 선택 · 더블클릭: 제거 · 우클릭: 그라데이션 끝 색상으로 지정`}
            className={`relative h-6 w-6 ${index === activeColorIndex ? "ring-2 ring-violet-500" : "ring-1 ring-black/10"}`}
            style={{ backgroundColor: color }}
          >
            {index === secondaryColorIndex && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-white shadow-[0_0_0_1px_#8b5cf6]" />
            )}
          </button>
        ))}
        <button
          disabled={isFull}
          onClick={() => onAddColor(rgbaToHex(...opaqueRgb, alpha))}
          title={
            isFull ? "팔레트가 가득 찼습니다" : "현재 값을 새 스와치로 추가"
          }
          className="flex h-6 w-6 items-center justify-center bg-gray-100 text-xs text-gray-500 shadow-sm disabled:opacity-30"
        >
          +
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
        <span>그라데이션 끝</span>
        <div
          className="h-4 w-4 shrink-0 shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
          style={
            secondaryColorIndex >= 0
              ? { backgroundColor: palette[secondaryColorIndex] }
              : {
                  backgroundImage:
                    "linear-gradient(45deg, #d4d4d8 25%, transparent 25%), linear-gradient(-45deg, #d4d4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d8 75%), linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)",
                  backgroundSize: "6px 6px",
                  backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
                }
          }
        />
        <span className="text-gray-400">(스와치 우클릭으로 지정)</span>
        <button onClick={() => onSelectSecondary(-1)} className="ml-auto text-violet-500 hover:underline">
          투명으로
        </button>
      </div>
    </div>
  );
}
