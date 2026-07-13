"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  circleFillPoints,
  circleOutlinePoints,
  floodFill,
  getPixel,
  linePoints,
  mirrorPoints,
  rectFillPoints,
  rectOutlinePoints,
  setPixel,
  wandMask,
} from "./pixelGrid";
import { MirrorMode, Tool } from "./types";
import { moveSelection } from "./useSelection";

const CELL_SIZE = 16;

export default function PixelCanvas({
  width,
  height,
  palette,
  pixels,
  tool,
  mirror,
  activeColorIndex,
  selectionMask,
  showGrid,
  brushSize,
  filledShapes,
  onSelectionChange,
  onStrokeEnd,
  onPickColor,
  zoom,
  onZoomChange,
}: {
  width: number;
  height: number;
  palette: string[];
  pixels: number[];
  tool: Tool;
  mirror: MirrorMode;
  activeColorIndex: number;
  selectionMask: Set<number> | null;
  showGrid: boolean;
  brushSize: number;
  filledShapes: boolean;
  onSelectionChange: (mask: Set<number> | null) => void;
  onStrokeEnd: (next: number[]) => void;
  onPickColor: (colorIndex: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workingRef = useRef<number[]>(pixels);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawingRef = useRef(false);
  // selectionMask 프롭은 React state를 거쳐 비동기로 갱신되므로, 빠른 연속 pointermove
  // 동안 오래된(stale) 값을 참조해 move 드래그가 잘못된 위치를 지우는 문제(자취 남음)가
  // 있었다. workingRef와 같은 패턴으로 항상 최신 값을 담는 ref를 별도로 둔다.
  const selectionMaskRef = useRef<Set<number> | null>(selectionMask);

  useEffect(() => {
    workingRef.current = pixels;
  }, [pixels]);

  useEffect(() => {
    selectionMaskRef.current = selectionMask;
  }, [selectionMask]);

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
      if (showGrid) {
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
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
      }
      // 선택 영역을 시각적으로 표시한다 — select/wand 도구로 선택해도 화면에
      // 아무 표시가 없어 무엇이 선택됐는지 알 수 없었다(최종 whole-branch 리뷰에서 발견).
      // ref에서 읽어 move 드래그 중 빠른 pointermove 연속 호출에서도 항상 최신 마스크를 그린다.
      const mask = selectionMaskRef.current;
      if (mask && mask.size > 0) {
        ctx.fillStyle = "rgba(139, 92, 246, 0.3)";
        ctx.strokeStyle = "rgba(139, 92, 246, 0.9)";
        ctx.lineWidth = 1;
        mask.forEach((i) => {
          const x = i % width;
          const y = Math.floor(i / width);
          ctx.fillRect(x * scale, y * scale, scale, scale);
          ctx.strokeRect(x * scale + 0.5, y * scale + 0.5, scale - 1, scale - 1);
        });
      }
    },
    [width, height, palette, zoom, showGrid],
  );

  useEffect(() => {
    render(pixels);
  }, [pixels, selectionMask, render]);

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
      // 브러시 크기만큼 (x,y) 중심의 정사각 블록으로 확장한 뒤 각 칸을 미러링한다.
      // brushSize=1이면 기존과 동일하게 점 하나만 찍는다.
      const half = Math.floor(brushSize / 2);
      for (let dy = 0; dy < brushSize; dy++) {
        for (let dx = 0; dx < brushSize; dx++) {
          const bx = x - half + dx;
          const by = y - half + dy;
          if (bx < 0 || by < 0 || bx >= width || by >= height) continue;
          for (const p of mirrorPoints(width, height, mirror, bx, by)) {
            next = setPixel(next, width, p.x, p.y, colorIndex);
          }
        }
      }
      return next;
    },
    [width, height, mirror, brushSize],
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

      if (tool === "wand") {
        const clicked = wandMask(workingRef.current, width, height, point.x, point.y);
        const current = selectionMaskRef.current;
        // Shift = 기존 선택 영역에 추가, Alt/Option = 기존 선택 영역에서 제외.
        // 두 키 다 없으면 기존과 동일하게 새로 선택한 영역으로 완전히 대체한다.
        if (e.shiftKey && current) {
          onSelectionChange(new Set([...current, ...clicked]));
        } else if (e.altKey && current) {
          const next = new Set(current);
          for (const i of clicked) next.delete(i);
          onSelectionChange(next);
        } else {
          onSelectionChange(clicked);
        }
        return;
      }

      if (tool === "select") {
        shapeStartRef.current = point;
        drawingRef.current = true;
        return;
      }

      if (tool === "move" && selectionMaskRef.current) {
        lastPointRef.current = point;
        drawingRef.current = true;
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
    [tool, width, height, activeColorIndex, toGridPoint, plotPoint, render, onStrokeEnd, onPickColor, onSelectionChange],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;

      if (tool === "select" && shapeStartRef.current) {
        const point = toGridPoint(e);
        if (!point) return;
        const start = shapeStartRef.current;
        const minX = Math.min(start.x, point.x);
        const maxX = Math.max(start.x, point.x);
        const minY = Math.min(start.y, point.y);
        const maxY = Math.max(start.y, point.y);
        const next = new Set<number>();
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) next.add(y * width + x);
        }
        onSelectionChange(next);
        return;
      }

      if (tool === "move" && selectionMaskRef.current && lastPointRef.current) {
        const point = toGridPoint(e);
        if (!point) return;
        const dx = point.x - lastPointRef.current.x;
        const dy = point.y - lastPointRef.current.y;
        if (dx === 0 && dy === 0) return;
        const result = moveSelection(workingRef.current, width, height, selectionMaskRef.current, dx, dy);
        workingRef.current = result.pixels;
        // ref를 먼저 동기 갱신해 바로 다음 pointermove(React state가 아직 반영되기 전)도
        // 항상 최신 마스크를 기준으로 계산하도록 한다.
        selectionMaskRef.current = result.mask;
        onSelectionChange(result.mask);
        lastPointRef.current = point;
        render(result.pixels);
        return;
      }

      if (tool === "line" || tool === "rect" || tool === "circle") {
        const point = toGridPoint(e);
        if (!point || !shapeStartRef.current) return;
        const start = shapeStartRef.current;
        let shapePoints: { x: number; y: number }[];
        if (tool === "line") {
          shapePoints = linePoints(start.x, start.y, point.x, point.y);
        } else if (tool === "rect") {
          shapePoints = filledShapes
            ? rectFillPoints(start.x, start.y, point.x, point.y)
            : rectOutlinePoints(start.x, start.y, point.x, point.y);
        } else {
          const radius = Math.round(Math.hypot(point.x - start.x, point.y - start.y));
          shapePoints = filledShapes
            ? circleFillPoints(start.x, start.y, radius)
            : circleOutlinePoints(start.x, start.y, radius);
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
    [tool, width, height, activeColorIndex, pixels, filledShapes, toGridPoint, plotPoint, render, onSelectionChange],
  );

  // 맨 앞에서 drawingRef를 한 번만 검사·소비하도록 통일한다 — pointerup 처리 후 브라우저가
  // 뒤이어 보내는 lostpointercapture(그리고 handlePointerCancel의 재사용)가 같은 제스처를
  // 두 번 커밋하지 않도록 이 함수 자체를 멱등하게 만든다.
  const handlePointerUp = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    if (tool === "select") {
      shapeStartRef.current = null;
      return;
    }
    if (tool === "line" || tool === "rect" || tool === "circle") {
      shapeStartRef.current = null;
      onStrokeEnd(workingRef.current);
      return;
    }
    lastPointRef.current = null;
    onStrokeEnd(workingRef.current);
  }, [tool, onStrokeEnd]);

  // React의 onWheel은 리스너를 passive로 등록해 e.preventDefault()가 조용히
  // 무시된다 — Ctrl+스크롤로 캔버스만 확대하려 해도 브라우저의 페이지 확대가
  // 함께 발동했다. addEventListener를 { passive: false }로 직접 붙여야 막힌다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      onZoomChange(Math.min(8, Math.max(1, zoom + (e.deltaY < 0 ? 1 : -1))));
    };
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, [zoom, onZoomChange]);

  // 스타일러스 호버 취소, 시스템 제스처 등으로 pointerup 없이 스트로크가 끊길 때 안전하게 커밋한다.
  // handlePointerUp과 도구별 분기가 완전히 같아야 하고, 위쪽의 drawingRef 가드 덕분에 pointerup
  // 이후 뒤늦게 발생하는 lostpointercapture에 대해서도 안전하게(중복 커밋 없이) 재사용할 수 있다.
  const handlePointerCancel = handlePointerUp;

  return (
    <canvas
      ref={canvasRef}
      className="cursor-crosshair touch-none shadow-md"
      style={{ imageRendering: "pixelated" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
    />
  );
}
