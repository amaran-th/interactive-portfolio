"use client";

import { useEffect, useRef } from "react";

const SIZE = 40;
const GRID = 8;

// 8x8 픽셀 그리드. 0=투명, 1=외곽선, 2=몸통 채우기, 3=뚜껑 손잡이
const CLOSED_GRID = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 3, 3, 3, 3, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
];

// 뚜껑이 위로 열려 튀어나온 모양
const OPEN_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
];

const COLORS: Record<number, string> = {
  1: "#27272a",
  2: "#e4e4e7",
  3: "#8b5cf6",
};

export default function TrashIcon({ active }: { active: boolean }) {
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
    const grid = active ? OPEN_GRID : CLOSED_GRID;
    const cell = SIZE / GRID;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const v = grid[y][x];
        if (v === 0) continue;
        ctx.fillStyle = COLORS[v];
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }, [active]);

  return <canvas ref={canvasRef} className="shadow-sm" style={{ imageRendering: "pixelated" }} />;
}
