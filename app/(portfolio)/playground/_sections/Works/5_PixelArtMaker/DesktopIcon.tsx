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
    for (let py = 0; py < art.height; py++) {
      for (let px = 0; px < art.width; px++) {
        const colorIndex = art.pixels[py * art.width + px];
        if (colorIndex < 0) continue;
        ctx.fillStyle = art.palette[colorIndex] ?? "#ff00ff";
        ctx.fillRect(px * scale, py * scale, scale, scale);
      }
    }
  }, [art]);

  return (
    <div
      style={{ left: x, top: y, position: "absolute" }}
      className={`flex w-20 flex-col items-center gap-1 rounded-lg p-2 ${selected ? "bg-white/15" : "hover:bg-white/5"}`}
      onPointerDown={onPointerDownIcon}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <canvas ref={canvasRef} className="rounded border border-white/10" style={{ imageRendering: "pixelated" }} />
      <span className="w-full truncate text-center text-[10px] text-gray-300">{art.name}</span>
    </div>
  );
}
