"use client";

import { useEffect, useState } from "react";
import { PixelArt } from "../_shared/assetLibrary";
import { pixelArtToDataUrl } from "../_shared/renderPixelArt";

export default function WallpaperBackground({ art }: { art: PixelArt }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(pixelArtToDataUrl(art));
  }, [art]);

  if (!url) return null;

  return (
    // <img>로 렌더링해야 object-fit(cover)으로 창 크기에 맞춰 비율을 유지하며
    // 확대할 수 있다(캔버스 자체는 object-fit을 지원하지 않는다).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
