import { PixelArt } from "../_shared/assetLibrary";
import { renderToCanvas } from "../_shared/renderPixelArt";
import { hexToRgba, rgbToHex } from "./hsv";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
  canvas.toBlob(
    (blob) => {
      if (blob) triggerDownload(blob, `${doc.name}.jpg`);
    },
    "image/jpeg",
    0.92,
  );
}

// 파일 다운로드와 "코드 복사"(클립보드에 텍스트로 복사) 양쪽에서 같은 SVG
// 문자열을 재사용한다.
export function buildSvgString(doc: PixelArt): string {
  const rects: string[] = [];
  for (let y = 0; y < doc.height; y++) {
    for (let x = 0; x < doc.width; x++) {
      const color = doc.pixels[y * doc.width + x];
      if (color === null) continue;
      // SVG의 fill 속성은 8자리(#rrggbbaa) hex를 신뢰성 있게 지원하지 않는 뷰어가
      // 있어, 알파가 있으면 fill-opacity로 분리해 내보낸다.
      const [r, g, b, a] = hexToRgba(color);
      const opacity = a < 1 ? ` fill-opacity="${a.toFixed(3)}"` : "";
      rects.push(
        `<rect x="${x}" y="${y}" width="1" height="1" fill="${rgbToHex(r, g, b)}"${opacity}/>`,
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${doc.width} ${doc.height}" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}

export function exportAsSVG(doc: PixelArt): void {
  triggerDownload(
    new Blob([buildSvgString(doc)], { type: "image/svg+xml" }),
    `${doc.name}.svg`,
  );
}

export function exportAsJSON(doc: PixelArt): void {
  triggerDownload(
    new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
    `${doc.name}.json`,
  );
}

// PNG만 클립보드 이미지로 신뢰성 있게 지원된다(대부분 브라우저의 ClipboardItem은
// image/png만 받는다) — JPG는 파일 저장만 제공한다.
export async function copyPngToClipboard(
  doc: PixelArt,
  scale = 8,
): Promise<boolean> {
  try {
    const canvas = renderToCanvas(doc, scale);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
