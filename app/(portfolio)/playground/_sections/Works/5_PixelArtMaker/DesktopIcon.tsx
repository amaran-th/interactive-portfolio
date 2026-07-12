"use client";

import { useEffect, useRef } from "react";
import { PixelArt } from "../_shared/assetLibrary";

export default function DesktopIcon({
  art,
  x,
  y,
  selected,
  onPointerDownIcon,
  onDoubleClick,
  onContextMenu,
}: {
  art: PixelArt;
  x: number;
  y: number;
  selected: boolean;
  onPointerDownIcon: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 48;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const scale = size / Math.max(art.width, art.height);
    // 정사각형이 아닌 캔버스(예: 160x90)는 긴 축만 꽉 채우면 짧은 축 쪽에
    // 빈 공간이 남는다 — 그 여백을 가운데로 정렬한다.
    const offsetX = (size - art.width * scale) / 2;
    const offsetY = (size - art.height * scale) / 2;
    for (let py = 0; py < art.height; py++) {
      for (let px = 0; px < art.width; px++) {
        const colorIndex = art.pixels[py * art.width + px];
        if (colorIndex < 0) continue;
        ctx.fillStyle = art.palette[colorIndex] ?? "#ff00ff";
        ctx.fillRect(px * scale + offsetX, py * scale + offsetY, scale, scale);
      }
    }
  }, [art]);

  return (
    <div
      style={{ left: x, top: y, position: "absolute" }}
      className={`flex w-20 flex-col items-center gap-1 p-2 ${selected ? "bg-violet-100" : "hover:bg-gray-100"}`}
      onPointerDown={onPointerDownIcon}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <canvas ref={canvasRef} className="shadow-sm" style={{ imageRendering: "pixelated" }} />
      <span className="w-full truncate text-center text-[10px] text-gray-600">{art.name}</span>
    </div>
  );
}
