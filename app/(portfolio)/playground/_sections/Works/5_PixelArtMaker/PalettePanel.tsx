"use client";

import { useState } from "react";
import { MAX_PALETTE_COLORS } from "./types";

export default function PalettePanel({
  palette,
  activeColorIndex,
  onSelect,
  onAddColor,
  onRemoveColor,
}: {
  palette: string[];
  activeColorIndex: number;
  onSelect: (index: number) => void;
  onAddColor: (hex: string) => void;
  onRemoveColor: (index: number) => void;
}) {
  const [hex, setHex] = useState("#ffffff");
  const isFull = palette.length >= MAX_PALETTE_COLORS;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-semibold text-gray-400">
        팔레트 ({palette.length}/{MAX_PALETTE_COLORS})
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {palette.map((color, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            onDoubleClick={() => onRemoveColor(index)}
            title={`${color} — 더블클릭으로 제거`}
            className={`h-6 w-6 rounded border-2 ${
              index === activeColorIndex ? "border-white" : "border-white/20"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          className="h-7 w-9 rounded border border-white/10 bg-transparent"
        />
        <button
          disabled={isFull}
          onClick={() => onAddColor(hex)}
          className="flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white disabled:opacity-40"
        >
          {isFull ? "팔레트가 가득 찼습니다" : "색상 추가"}
        </button>
      </div>
    </div>
  );
}
