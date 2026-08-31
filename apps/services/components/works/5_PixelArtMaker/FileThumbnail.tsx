"use client";

import { useEffect, useRef } from "react";
import { PixelValue } from "./pixelGrid";

// "열기" 목록에서 각 항목이 실제로 어떤 그림인지 한눈에 알아볼 수 있도록 작은
// 미리보기를 함께 보여준다 — 정사각형이 아닌 캔버스도 실제 비율 그대로
// 보여주되, 목록 행 높이가 캔버스 크기마다 들쭉날쭉해지지 않도록 정해진
// 정사각형 칸(size) 안에 맞춰(letterbox) 가운데 정렬한다.
const MAX_SIZE = 40;

export default function FileThumbnail({
  width,
  height,
  pixels,
}: {
  width: number;
  height: number;
  pixels: PixelValue[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height);
  const displayWidth = Math.max(1, Math.round(width * scale));
  const displayHeight = Math.max(1, Math.round(height * scale));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    const cellW = displayWidth / width;
    const cellH = displayHeight / height;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = pixels[y * width + x];
        if (color === null) continue;
        // 칸 배율이 정수가 아니면 x*cellW가 픽셀 경계에 안 떨어져 이웃 칸의
        // fillRect 가장자리가 어긋나며 안티에일리어싱된 실선(격자무늬)이 생긴다
        // — 각 변을 반올림해 이웃 칸끼리 정확히 맞닿게 한다(PixelCanvas와 동일).
        const left = Math.round(x * cellW);
        const top = Math.round(y * cellH);
        // PixelValue는 알파가 있으면 8자리(#rrggbbaa) hex이고, Canvas2D의
        // fillStyle이 이를 그대로 지원한다 — 그대로 그리면 이 카드의 실제
        // 배경(흰색)과 캔버스가 알아서 정확히 합성한다.
        ctx.fillStyle = color;
        ctx.fillRect(
          left,
          top,
          Math.round((x + 1) * cellW) - left,
          Math.round((y + 1) * cellH) - top,
        );
      }
    }
  }, [width, height, pixels, displayWidth, displayHeight]);

  return (
    <div
      className="flex shrink-0 items-center justify-center bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
      style={{ width: MAX_SIZE, height: MAX_SIZE }}
    >
      <canvas
        ref={canvasRef}
        style={{
          imageRendering: "pixelated",
          width: displayWidth,
          height: displayHeight,
        }}
      />
    </div>
  );
}
