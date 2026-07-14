"use client";

import { Pencil, Pipette } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { hexToRgba, hsvToRgb, rgbaToHex, rgbToHsv } from "./hsv";
import { MAX_PALETTE_COLORS, Tool } from "./types";

const SQUARE_SIZE = 120;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// 세로 트랙(색상/알파 슬라이더) 위 pointer 좌표를 0~1 값으로 환산한다. 트랙
// 위아래 밖으로 나가면 null을 돌려줘 호출부가 갱신을 건너뛰게 한다 — SV
// 사각형과 같은 이유로, 드래그가 트랙 밖으로 나간 지점의 값을 그대로
// 커밋하지 않고 마지막으로 안쪽이었던 값을 유지하기 위해서다.
function trackValue(clientY: number, rect: DOMRect): number | null {
  if (clientY < rect.top || clientY > rect.bottom) return null;
  if (rect.height === 0) return 0;
  return clamp01((clientY - rect.top) / rect.height);
}

export default function ColorWheel({
  palette,
  activeColorIndex,
  onSelect,
  onCommitColor,
  onEditSwatchColor,
  onAddColor,
  onRemoveColor,
  usedColorIndices,
  tool,
  onToolChange,
  secondaryColorIndex,
  onSelectSecondary,
  gradientSteps,
  onGradientStepsChange,
  gradientAngleDeg,
  onGradientAngleChange,
}: {
  palette: string[];
  activeColorIndex: number;
  onSelect: (index: number) => void;
  // 색상환을 조작하고 손을 놓으면(드래그 종료) 호출된다 — 이미 있는 색이면 그
  // 스와치를 재사용하고, 없으면 새 스와치로 추가한다. 기존 스와치를 실시간으로
  // 덮어쓰지 않으므로 이미 칠해진 픽셀은 건드리지 않는다.
  onCommitColor: (hex: string) => void;
  // 스와치의 연필 아이콘으로 명시적으로 "편집 모드"에 들어갔을 때만 쓰인다 —
  // 이때는 의도적으로 그 스와치 자체(와 이미 칠한 픽셀)를 실시간으로 바꾼다.
  onEditSwatchColor: (hex: string) => void;
  onAddColor: (hex: string) => void;
  onRemoveColor: (index: number) => void;
  // 팔레트에는 있지만 캔버스 어디에도 아직 칠해진 적 없는 색을 구분해
  // 보여주기 위한 팔레트 인덱스 집합.
  usedColorIndices: Set<number>;
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  // 그라데이션 끝 색상 — MS페인트의 보조 색상과 같은 개념. -1이면 투명.
  secondaryColorIndex: number;
  onSelectSecondary: (index: number) => void;
  // 그라데이션 도구·도형/텍스트 그라데이션 채우기가 공유하는 단계 수·방향.
  gradientSteps: number;
  onGradientStepsChange: (steps: number) => void;
  gradientAngleDeg: number;
  onGradientAngleChange: (deg: number) => void;
}) {
  // null이면 색상환은 "지금 그릴 색"만 미리보기로 바꾼다(드래그가 끝나야 팔레트에
  // 반영). 특정 인덱스면 그 스와치를 색상환으로 직접 편집하는 중 — 연필
  // 아이콘으로만 들어가고, 다른 스와치를 클릭하면 빠져나온다.
  const [editingSwatch, setEditingSwatch] = useState<number | null>(null);
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
  // 동기화한다. activeHex 전체가 아니라 activeColorIndex와 palette.length에만
  // 의존해야 한다 — 슬라이더를 드래그해 같은 스와치의 색을 계속 바꾸는 동안에는
  // hex→rgb→hsv 왕복 변환에서 생기는 반올림 오차가 매 커밋마다 누적돼(특히
  // hue는 채도가 낮을수록 아주 작은 rgb 반올림에도 크게 흔들린다) 드래그 중
  // 색상이 제멋대로 튀는 버그가 있었다.
  //
  // palette.length는 따로 넣어야 한다 — 선택 중이던 스와치를 삭제하면 그
  // 뒤쪽 스와치들이 한 칸씩 당겨오면서 activeColorIndex "숫자"는 그대로인데
  // 그 자리의 실제 색은 바뀐다. activeColorIndex만 보면 이 변화를 놓쳐 색상환이
  // 방금 지운 색의 값을 계속 들고 있다가, 이후 색상환을 조작하면 그 삭제된
  // 색이 새 스와치로 되살아나 버렸다(팔레트 변경은 항상 길이도 바뀌므로 추가·
  // 삭제 모두 이 의존성으로 잡힌다).
  useEffect(() => {
    const [r, g, b, a] = hexToRgba(activeHexRef.current);
    setHsva([...rgbToHsv(r, g, b), a]);
  }, [activeColorIndex, palette.length]);

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

  // 드래그 중에는 항상 hsva(마커·슬라이더 위치)만 갱신한다. 편집 모드일 때만
  // 실시간으로 그 스와치 자체(onEditSwatchColor)를 바꾼다 — 편집 모드가 아니면
  // 드래그가 끝날 때(handleDragEnd) 딱 한 번만 팔레트에 반영해, 매 이동마다
  // 스와치가 늘어나거나 활성 색상이 계속 튀던 예전 문제를 피한다.
  const commit = useCallback(
    (next: [number, number, number, number]) => {
      setHsva(next);
      if (editingSwatch === activeColorIndex) {
        const [r, g, b] = hsvToRgb(next[0], next[1], next[2]);
        onEditSwatchColor(rgbaToHex(r, g, b, next[3]));
      }
    },
    [editingSwatch, activeColorIndex, onEditSwatchColor],
  );

  const applySquarePoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = squareRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      // 정사각형이 120px로 작아 드래그가 살짝만 밖으로 나가도 바로 s/v가
      // 0이나 1로 클램프되곤 했다 — 특히 아래로 조금만 넘쳐도 명도(V)가 0(검정)
      // 으로 튀어 의도치 않은 색이 그대로 커밋되는 문제가 있었다. 포토샵·
      // Aseprite처럼 포인터가 사각형 밖으로 나가면 그 지점부터는 더 갱신하지
      // 않고 마지막으로 안쪽이었던 위치의 값을 그대로 유지한다.
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return;
      }
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
      if (t === null) return;
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
      if (t === null) return;
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
    if (editingSwatch !== activeColorIndex) {
      const [r, g, b] = hsvToRgb(hue, sat, val);
      onCommitColor(rgbaToHex(r, g, b, alpha));
    }
  }, [editingSwatch, activeColorIndex, hue, sat, val, alpha, onCommitColor]);

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

      <div className="flex w-full items-center gap-1.5 text-[10px] text-gray-500">
        <div
          className="h-4 w-4 shrink-0 shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
          style={{ backgroundColor: rgbaToHex(...opaqueRgb, alpha) }}
        />
        {editingSwatch === activeColorIndex ? (
          <span className="text-amber-600">
            스와치 직접 수정 중 — 이미 칠한 픽셀도 함께 바뀝니다
          </span>
        ) : (
          <span>
            놓으면 팔레트에 반영됩니다
            {isFull ? " (가득 차 가장 비슷한 색으로 대체)" : ""}
          </span>
        )}
      </div>

      <p className="text-xs font-semibold text-gray-500">
        팔레트 ({palette.length}/{MAX_PALETTE_COLORS})
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {palette.map((color, index) => (
          <div key={index} className="group relative h-6 w-6">
            <button
              onClick={() => {
                onSelect(index);
                setEditingSwatch(null);
              }}
              onDoubleClick={() => onRemoveColor(index)}
              onContextMenu={(e) => {
                e.preventDefault();
                onSelectSecondary(index);
              }}
              title={`${color} — 클릭: 선택 · 더블클릭: 제거 · 우클릭: 그라데이션 끝 색상으로 지정`}
              className={`h-6 w-6 ${
                editingSwatch === index
                  ? "ring-2 ring-amber-500"
                  : index === activeColorIndex
                    ? "ring-2 ring-violet-500"
                    : "ring-1 ring-black/10"
              }`}
              style={{ backgroundColor: color }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(index);
                setEditingSwatch((cur) => (cur === index ? null : index));
              }}
              title="이 스와치를 색상환으로 직접 수정(이미 칠한 픽셀도 함께 바뀜)"
              className="absolute -top-1 -left-1 hidden h-3.5 w-3.5 items-center justify-center bg-gray-700 text-white group-hover:flex"
            >
              <Pencil className="h-2 w-2" />
            </button>
            {index === secondaryColorIndex && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-white shadow-[0_0_0_1px_#8b5cf6]" />
            )}
            {!usedColorIndices.has(index) && (
              <span
                title="아직 캔버스에 칠한 적 없는 색"
                className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
              />
            )}
          </div>
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
        <button
          onClick={() => onSelectSecondary(-1)}
          className="ml-auto text-violet-500 hover:underline"
        >
          투명으로
        </button>
      </div>

      <label className="flex w-full items-center justify-between text-[10px] text-gray-500">
        <span>그라데이션 단계</span>
        <span className="flex items-center gap-1.5">
          <input
            type="range"
            min={2}
            max={32}
            value={gradientSteps}
            onChange={(e) => onGradientStepsChange(Number(e.target.value))}
          />
          <span className="w-5 text-right tabular-nums text-gray-400">
            {gradientSteps}
          </span>
        </span>
      </label>
      <label
        className="flex w-full items-center justify-between text-[10px] text-gray-500"
        title="그라데이션 도구는 드래그 방향을 그대로 쓰고, 도형·텍스트 그라데이션 채우기만 이 각도를 따른다"
      >
        <span>그라데이션 방향</span>
        <span className="flex items-center gap-1.5">
          <input
            type="range"
            min={0}
            max={359}
            value={gradientAngleDeg}
            onChange={(e) => onGradientAngleChange(Number(e.target.value))}
          />
          <span className="w-7 text-right tabular-nums text-gray-400">
            {gradientAngleDeg}°
          </span>
        </span>
      </label>
    </div>
  );
}
