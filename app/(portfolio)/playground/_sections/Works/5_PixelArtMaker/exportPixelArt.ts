import { PixelArt } from "../_shared/assetLibrary";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function renderToCanvas(doc: PixelArt, scale: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = doc.width * scale;
  canvas.height = doc.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      const colorIndex = doc.pixels[y * doc.width + x];
      if (colorIndex < 0) continue;
      ctx.fillStyle = doc.palette[colorIndex] ?? "#ff00ff";
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

export function exportAsPNG(doc: PixelArt, scale = 8): void {
  renderToCanvas(doc, scale).toBlob((blob) => {
    if (blob) triggerDownload(blob, `${doc.name}.png`);
  }, "image/png");
}

export function exportAsJPG(doc: PixelArt, scale = 8): void {
  const canvas = renderToCanvas(doc, scale);
  // JPG는 알파를 지원하지 않으므로 검은 배경을 먼저 채운다
  const ctx = canvas.getContext("2d")!;
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, `${doc.name}.jpg`);
  }, "image/jpeg", 0.92);
}

export function exportAsSVG(doc: PixelArt): void {
  const rects: string[] = [];
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      const colorIndex = doc.pixels[y * doc.width + x];
      if (colorIndex < 0) continue;
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${doc.palette[colorIndex]}"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${doc.width} ${doc.height}" shape-rendering="crispEdges">${rects.join("")}</svg>`;
  triggerDownload(new Blob([svg], { type: "image/svg+xml" }), `${doc.name}.svg`);
}

export function exportAsJSON(doc: PixelArt): void {
  triggerDownload(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }), `${doc.name}.json`);
}
