"use client";

import { useEffect, useRef } from "react";

const SIZE = 48;
const GRID = 8;

// 8x8 픽셀 그리드로 그린 플로피디스크(포맷) 아이콘.
// 0=투명, 1=외곽선, 2=라벨 영역, 3=셔터(포인트 컬러)
const GRID_DATA = [
  [0, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 2, 2, 2, 2, 1, 1],
  [1, 1, 2, 2, 2, 2, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 3, 3, 3, 3, 3, 1],
  [1, 3, 3, 3, 3, 3, 3, 1],
  [1, 3, 3, 3, 3, 3, 3, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
];

const COLORS: Record<number, string> = {
  1: "#27272a",
  2: "#e4e4e7",
  3: "#8b5cf6",
};

export default function FormatIcon() {
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

  return <canvas ref={canvasRef} className="shadow-sm" style={{ imageRendering: "pixelated" }} />;
}
