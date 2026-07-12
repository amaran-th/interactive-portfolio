"use client";

import { useEffect, useRef } from "react";
import { PixelArt } from "../_shared/assetLibrary";

// DesktopIcon.tsx와 동일한 방식으로 실제 배경화면 픽셀 데이터를 그대로
// 축소해 그린다 — 고정된 그림(액자·풍경 아이콘)을 쓰면 실제 배경화면과
// 달라 보이고, 그 고정 그림 자체의 윤곽선이 이 프로젝트의 "테두리 없음"
// 원칙에 어긋나는 시각적 테두리처럼 보였다.
export default function WallpaperIcon({ art }: { art: PixelArt }) {
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
        ctx.fillStyle = art.palette[colorIndex] ?? "#ffffff";
        ctx.fillRect(px * scale, py * scale, scale, scale);
      }
    }
  }, [art]);

  return <canvas ref={canvasRef} className="shadow-sm" style={{ imageRendering: "pixelated" }} />;
}
