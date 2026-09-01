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

// 한 장의 픽셀 배열을 <rect> 문자열로 만든다.
function rectsFor(
  pixels: (string | null)[],
  width: number,
  height: number,
): string {
  const rects: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = pixels[y * width + x];
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
  return rects.join("");
}

function svgWrap(width: number, height: number, inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${inner}</svg>`;
}

// 파일 다운로드와 "코드 복사"(클립보드에 텍스트로 복사) 양쪽에서 같은 SVG
// 문자열을 재사용한다.
export function buildSvgString(doc: PixelArt): string {
  return svgWrap(
    doc.width,
    doc.height,
    rectsFor(doc.pixels, doc.width, doc.height),
  );
}

// 프레임 모드 전용 — 보이는 프레임을 각 지속시간대로 순환 재생하는 SMIL
// 애니메이션 SVG. 각 프레임 <g>의 opacity를 discrete calcMode로 자기 구간에서만
// 1로, 나머지 구간은 0으로 두고 전체 길이만큼 무한 반복한다.
export function buildAnimatedSvgString(doc: PixelArt): string {
  const frames = visibleFrames(doc);
  if (frames.length <= 1) {
    return svgWrap(
      doc.width,
      doc.height,
      rectsFor(
        (frames[0] ?? { pixels: doc.pixels }).pixels,
        doc.width,
        doc.height,
      ),
    );
  }
  const durations = frames.map(
    (f) => f.frameDurationMs ?? DEFAULT_FRAME_DURATION_MS,
  );
  const total = durations.reduce((a, b) => a + b, 0);
  const totalSec = (total / 1000).toFixed(3);
  let acc = 0;
  const groups = frames.map((frame, i) => {
    const start = acc / total;
    acc += durations[i];
    const end = acc / total;
    const s = start.toFixed(4);
    const e = end.toFixed(4);
    let keyTimes: string;
    let values: string;
    if (i === 0) {
      keyTimes = `0;${e};1`;
      values = "1;0;0";
    } else if (i === frames.length - 1) {
      keyTimes = `0;${s};1`;
      values = "0;1;1";
    } else {
      keyTimes = `0;${s};${e};1`;
      values = "0;1;0;0";
    }
    return `<g opacity="${i === 0 ? 1 : 0}">${rectsFor(frame.pixels, doc.width, doc.height)}<animate attributeName="opacity" dur="${totalSec}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${keyTimes}" values="${values}"/></g>`;
  });
  return svgWrap(doc.width, doc.height, groups.join(""));
}

export function exportAsSVG(doc: PixelArt): void {
  triggerDownload(
    new Blob([buildSvgString(doc)], { type: "image/svg+xml" }),
    `${doc.name}.svg`,
  );
}

export function exportAsAnimatedSVG(doc: PixelArt): void {
  triggerDownload(
    new Blob([buildAnimatedSvgString(doc)], { type: "image/svg+xml" }),
    `${doc.name}.svg`,
  );
}

export function exportAsJSON(doc: PixelArt): void {
  triggerDownload(
    new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
    `${doc.name}.json`,
  );
}

// PNG를 클립보드에 이미지로 복사한다(모든 브라우저의 ClipboardItem이 안정적으로
// 받는 형식). JPG는 copyJpgToClipboard가 별도로 처리한다.
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

// JPG를 클립보드에 이미지로 복사한다. 최신 브라우저는 ClipboardItem에서
// image/jpeg를 받지만(Chrome·Edge·Firefox), Safari 등 안 받는 환경에서는
// 같은 화면(검은 배경·손실 압축)을 PNG로 다시 인코딩해 복사한다.
export async function copyJpgToClipboard(
  doc: PixelArt,
  scale = 8,
): Promise<boolean> {
  try {
    const canvas = renderToCanvas(doc, scale);
    const ctx = canvas.getContext("2d")!;
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const jpg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!jpg) return false;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/jpeg": jpg }),
      ]);
      return true;
    } catch {
      const png = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!png) return false;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
      ]);
      return true;
    }
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
