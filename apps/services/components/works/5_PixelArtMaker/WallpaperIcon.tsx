"use client";

import { useEffect, useRef } from "react";
import { PixelArt } from "../_shared/assetLibrary";

// DesktopIcon.tsx와 동일한 방식으로 실제 배경화면 픽셀 데이터를 그대로
// 축소해 그린다 — 고정된 그림(액자·풍경 아이콘)을 쓰면 실제 배경화면과
// 달라 보이고, 그 고정 그림 자체의 윤곽선이 이 프로젝트의 "테두리 없음"
// 원칙에 어긋나는 시각적 테두리처럼 보였다.
export default function WallpaperIcon({
  art,
  scale: iconScale = 1,
}: {
  art: PixelArt;
  scale?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // 다른 특수 아이콘·파일 썸네일(DesktopIcon)과 같은 배율을 받아 그린다 —
    // 고정 48px만 쓰면 모바일 격자 배율에 따라 파일 썸네일과 크기가 어긋난다.
    const size = Math.max(1, Math.round(48 * iconScale));
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const block = size / Math.max(art.width, art.height);
    // 배경화면은 정사각형이 아닌 경우가 많아(예: 16:9) 긴 축만 꽉 채우면 짧은
    // 축 쪽에 빈 공간이 남는다 — 그 여백을 가운데로 정렬한다.
    const offsetX = (size - art.width * block) / 2;
    const offsetY = (size - art.height * block) / 2;
    for (let py = 0; py < art.height; py++) {
      for (let px = 0; px < art.width; px++) {
        const color = art.pixels[py * art.width + px];
        if (color === null) continue;
        ctx.fillStyle = color;
        ctx.fillRect(px * block + offsetX, py * block + offsetY, block, block);
      }
    }
  }, [art, iconScale]);

  return (
    <canvas
      ref={canvasRef}
      className="shadow-sm"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
