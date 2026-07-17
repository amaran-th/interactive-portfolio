"use client";

import { useEffect, useState } from "react";
import { PixelArt } from "../_shared/assetLibrary";

// 픽셀 그리드를 도트 그대로(안티에일리어싱 없이) 오프스크린 캔버스에 그려
// data URL로 변환한다 — <img>로 렌더링해야 object-fit(cover)로 창 크기에 맞춰
// 비율을 유지하며 확대할 수 있다(캔버스 자체는 object-fit을 지원하지 않는다).
function renderDataUrl(art: PixelArt): string {
  const canvas = document.createElement("canvas");
  canvas.width = art.width;
  canvas.height = art.height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < art.height; y++) {
    for (let x = 0; x < art.width; x++) {
      const color = art.pixels[y * art.width + x];
      if (color === null) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas.toDataURL();
}

export default function WallpaperBackground({ art }: { art: PixelArt }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(renderDataUrl(art));
  }, [art]);

  if (!url) return null;

  return (
    // 도트를 그대로 유지해야 해서(image-rendering: pixelated) next/image의 자동 리샘플링을 쓸 수 없다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
