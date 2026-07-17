import { PixelArt } from "./assetLibrary";

// scale=1은 캔버스 픽셀 하나가 그림 픽셀 하나와 정확히 대응하는 원본 해상도
// 렌더링이다. 화면에 확대해서 보여줄 때는 소비하는 쪽에서
// <img style={{ imageRendering: "pixelated" }}>로 키워야 도트가 뭉개지지 않는다.
export function renderToCanvas(doc: PixelArt, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = doc.width * scale;
  canvas.height = doc.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      const color = doc.pixels[y * doc.width + x];
      if (color === null) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

export function pixelArtToDataUrl(doc: PixelArt, scale = 1): string {
  return renderToCanvas(doc, scale).toDataURL();
}
