"use client";

import { useEffect, useRef } from "react";

const SIZE = 48;
const GRID = 8;

// 8x8 픽셀 그리드로 그린 "새 문서 + 만들기" 아이콘("편집기" 런처).
// 0=투명, 1=외곽선, 2=종이, 3=플러스(포인트 컬러)
const GRID_DATA = [
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 1, 2, 3, 3, 2, 1, 0],
  [0, 1, 2, 3, 3, 2, 1, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
];

const COLORS: Record<number, string> = {
  1: "#27272a",
  2: "#e4e4e7",
  3: "#8b5cf6",
};

export default function LauncherIcon() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const cell = SIZE / GRID;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const v = GRID_DATA[y][x];
        if (v === 0) continue;
        ctx.fillStyle = COLORS[v];
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="shadow-sm"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
