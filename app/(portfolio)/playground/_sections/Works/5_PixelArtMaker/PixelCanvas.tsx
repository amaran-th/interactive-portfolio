"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  circleOutlinePoints,
  floodFill,
  getPixel,
  linePoints,
  mirrorPoints,
  rectOutlinePoints,
  setPixel,
} from "./pixelGrid";
import { MirrorMode, Tool } from "./types";

const CELL_SIZE = 16;

export default function PixelCanvas({
  width,
  height,
  palette,
  pixels,
  tool,
  mirror,
  activeColorIndex,
  onStrokeEnd,
  onPickColor,
}: {
  width: number;
  height: number;
  palette: string[];
  pixels: number[];
  tool: Tool;
  mirror: MirrorMode;
  activeColorIndex: number;
  onStrokeEnd: (next: number[]) => void;
  onPickColor: (colorIndex: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const workingRef = useRef<number[]>(pixels);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    workingRef.current = pixels;
  }, [pixels]);

  const render = useCallback(
    (data: number[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = CELL_SIZE * zoom;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const colorIndex = getPixel(data, width, x, y);
          if (colorIndex < 0) continue;
          ctx.fillStyle = palette[colorIndex] ?? "#ff00ff";
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * scale, 0);
        ctx.lineTo(x * scale, height * scale);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale);
        ctx.lineTo(width * scale, y * scale);
        ctx.stroke();
      }
    },
    [width, height, palette, zoom],
  );

  useEffect(() => {
    render(pixels);
  }, [pixels, render]);

  const toGridPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * height);
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      return { x, y };
    },
    [width, height],
  );

  const plotPoint = useCallback(
    (data: number[], x: number, y: number, colorIndex: number) => {
      let next = data;
      for (const p of mirrorPoints(width, height, mirror, x, y)) {
        next = setPixel(next, width, p.x, p.y, colorIndex);
      }
      return next;
    },
    [width, height, mirror],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const point = toGridPoint(e);
      if (!point) return;
      canvasRef.current?.setPointerCapture(e.pointerId);

      if (tool === "eyedropper") {
        const colorIndex = getPixel(workingRef.current, width, point.x, point.y);
        if (colorIndex >= 0) onPickColor(colorIndex);
        return;
      }

      if (tool === "bucket") {
        const next = floodFill(workingRef.current, width, height, point.x, point.y, activeColorIndex);
        if (next !== workingRef.current) {
          workingRef.current = next;
          render(next);
          onStrokeEnd(next);
        }
        return;
      }

      if (tool === "line" || tool === "rect" || tool === "circle") {
        drawingRef.current = true;
        shapeStartRef.current = point;
        return;
      }

      if (tool === "pencil" || tool === "eraser") {
        drawingRef.current = true;
        lastPointRef.current = point;
        const colorIndex = tool === "eraser" ? -1 : activeColorIndex;
        const next = plotPoint(workingRef.current, point.x, point.y, colorIndex);
        workingRef.current = next;
        render(next);
      }
    },
    [tool, width, height, activeColorIndex, toGridPoint, plotPoint, render, onStrokeEnd, onPickColor],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;

      if (tool === "line" || tool === "rect" || tool === "circle") {
        const point = toGridPoint(e);
        if (!point || !shapeStartRef.current) return;
        const start = shapeStartRef.current;
        let shapePoints: { x: number; y: number }[];
        if (tool === "line") {
          shapePoints = linePoints(start.x, start.y, point.x, point.y);
        } else if (tool === "rect") {
          shapePoints = rectOutlinePoints(start.x, start.y, point.x, point.y);
        } else {
          const radius = Math.round(Math.hypot(point.x - start.x, point.y - start.y));
          shapePoints = circleOutlinePoints(start.x, start.y, radius);
        }
        let next = pixels;
        for (const p of shapePoints) {
          if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) continue;
          next = plotPoint(next, p.x, p.y, activeColorIndex);
        }
        workingRef.current = next;
        render(next);
        return;
      }

      if (tool !== "pencil" && tool !== "eraser") return;
      const point = toGridPoint(e);
      if (!point || !lastPointRef.current) return;
      const colorIndex = tool === "eraser" ? -1 : activeColorIndex;
      let next = workingRef.current;
      for (const p of linePoints(lastPointRef.current.x, lastPointRef.current.y, point.x, point.y)) {
        next = plotPoint(next, p.x, p.y, colorIndex);
      }
      lastPointRef.current = point;
      workingRef.current = next;
      render(next);
    },
    [tool, width, height, activeColorIndex, pixels, toGridPoint, plotPoint, render],
  );

  const handlePointerUp = useCallback(() => {
    if (tool === "line" || tool === "rect" || tool === "circle") {
      if (!shapeStartRef.current) return;
      shapeStartRef.current = null;
      drawingRef.current = false;
      onStrokeEnd(workingRef.current);
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    onStrokeEnd(workingRef.current);
  }, [tool, onStrokeEnd]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((z) => Math.min(8, Math.max(1, z + (e.deltaY < 0 ? 1 : -1))));
  }, []);

  // 스타일러스 호버 취소, 시스템 제스처 등으로 pointerup 없이 스트로크가 끊길 때 안전하게 커밋한다.
  const handlePointerCancel = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    shapeStartRef.current = null;
    onStrokeEnd(workingRef.current);
  }, [onStrokeEnd]);

  return (
    <canvas
      ref={canvasRef}
      className="cursor-crosshair touch-none rounded-lg border border-white/10"
      style={{ imageRendering: "pixelated" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
      onWheel={handleWheel}
    />
  );
}
