import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { PixelArt, PixelLayer } from "../_shared/assetLibrary";
import { renderToCanvas } from "../_shared/renderPixelArt";
import { DEFAULT_FRAME_DURATION_MS } from "./types";
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

// 프레임 모드 전용 — 보이는 프레임만, doc.layers에 저장된 순서(아래→위 =
// 왼쪽→오른쪽) 그대로 돌려준다.
function visibleFrames(doc: PixelArt): PixelLayer[] {
  return (doc.layers ?? []).filter((l) => l.visible);
}

// 보이는 프레임을 왼쪽부터 가로로 이어붙인 PNG 한 장 — 그리드(여러 행)는
// 지원하지 않는다. 각 프레임은 다른 레이어와 합성하지 않고 그 프레임 자신의
// 픽셀만 그린다.
export function exportAsSpriteSheet(doc: PixelArt, scale = 8): void {
  const frames = visibleFrames(doc);
  if (frames.length === 0) return;
  const canvas = document.createElement("canvas");
  canvas.width = doc.width * scale * frames.length;
  canvas.height = doc.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  frames.forEach((frame, i) => {
    const frameCanvas = renderToCanvas({ ...doc, pixels: frame.pixels }, scale);
    ctx.drawImage(frameCanvas, i * doc.width * scale, 0);
  });
  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, `${doc.name}_sprite.png`);
  }, "image/png");
}

// 보이는 프레임을 순서대로 재생하는 애니메이션 GIF로 내보낸다. 프레임마다
// 따로 양자화하면 프레임 사이에 색이 미세하게 달라져 깜빡이므로, 모든
// 프레임의 RGBA를 한 번에 합쳐 전역 팔레트 하나만 만들고 프레임마다
// 재사용한다.
export async function exportAsGIF(doc: PixelArt, scale = 8): Promise<void> {
  const frames = visibleFrames(doc);
  if (frames.length === 0) return;
  const width = doc.width * scale;
  const height = doc.height * scale;

  const frameRGBA = frames.map((frame) => {
    const canvas = renderToCanvas({ ...doc, pixels: frame.pixels }, scale);
    const ctx = canvas.getContext("2d")!;
    return ctx.getImageData(0, 0, width, height).data;
  });

  const combined = new Uint8Array(
    frameRGBA.reduce((sum, d) => sum + d.length, 0),
  );
  let offset = 0;
  for (const data of frameRGBA) {
    combined.set(data, offset);
    offset += data.length;
  }
  // rgba4444 포맷이라야 완전 투명 픽셀이 팔레트에 알파 0인 항목으로 남는다.
  const globalPalette = quantize(combined, 256, { format: "rgba4444" });
  const transparentIndex = globalPalette.findIndex((c) => (c[3] ?? 255) === 0);

  const gif = GIFEncoder();
  frameRGBA.forEach((data, i) => {
    const index = applyPalette(data, globalPalette, "rgba4444");
    gif.writeFrame(index, width, height, {
      palette: i === 0 ? globalPalette : undefined,
      delay: frames[i].frameDurationMs ?? DEFAULT_FRAME_DURATION_MS,
      repeat: 0,
      transparent: transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
    });
  });
  gif.finish();
  triggerDownload(
    new Blob([gif.bytes().slice()], { type: "image/gif" }),
    `${doc.name}.gif`,
  );
}

// 스프라이트 시트를 파일 대신 클립보드에 이미지로 복사한다 — exportAsSpriteSheet와
// 같은 방식으로 보이는 프레임을 가로로 이어붙인 캔버스를 조립하지만, 다운로드
// 대신 navigator.clipboard.write로 넘긴다(copyPngToClipboard와 같은 시도/실패
// 패턴).
export async function copySpriteSheetToClipboard(
  doc: PixelArt,
  scale = 8,
): Promise<boolean> {
  const frames = visibleFrames(doc);
  if (frames.length === 0) return false;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = doc.width * scale * frames.length;
    canvas.height = doc.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    frames.forEach((frame, i) => {
      const frameCanvas = renderToCanvas({ ...doc, pixels: frame.pixels }, scale);
      ctx.drawImage(frameCanvas, i * doc.width * scale, 0);
    });
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
