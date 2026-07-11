function hex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function pixelateImage(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  antiAlias: boolean,
): { width: number; height: number; palette: string[]; pixels: number[] } {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = antiAlias;
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  const { data } = ctx.getImageData(0, 0, targetWidth, targetHeight);

  const palette: string[] = [];
  const paletteIndex = new Map<string, number>();
  const pixels: number[] = new Array(targetWidth * targetHeight);

  for (let i = 0; i < targetWidth * targetHeight; i++) {
    const o = i * 4;
    const a = data[o + 3];
    if (a < 128) {
      pixels[i] = -1;
      continue;
    }
    const colorHex = hex(data[o], data[o + 1], data[o + 2]);
    let idx = paletteIndex.get(colorHex);
    if (idx === undefined) {
      idx = palette.length;
      palette.push(colorHex);
      paletteIndex.set(colorHex, idx);
    }
    pixels[i] = idx;
  }

  return { width: targetWidth, height: targetHeight, palette, pixels };
}

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// 팔레트가 maxColors를 넘으면, 가장 가까운 색 쌍부터 순서대로 병합해 개수를 줄인다.
export function quantizeColors(
  palette: string[],
  pixels: number[],
  maxColors: number,
): { palette: string[]; pixels: number[] } {
  let curPalette = palette.slice();
  let curPixels = pixels.slice();

  while (curPalette.length > maxColors) {
    let bestPair: [number, number] = [0, 1];
    let bestDist = Infinity;
    for (let i = 0; i < curPalette.length; i++) {
      for (let j = i + 1; j < curPalette.length; j++) {
        const d = colorDistance(curPalette[i], curPalette[j]);
        if (d < bestDist) {
          bestDist = d;
          bestPair = [i, j];
        }
      }
    }
    const merged = mergeColors(curPalette, curPixels, bestPair[0], bestPair[1]);
    curPalette = merged.palette;
    curPixels = merged.pixels;
  }

  return { palette: curPalette, pixels: curPixels };
}

// indexB를 indexA로 합치고, 팔레트에서 indexB를 제거하며 뒤 인덱스를 당긴다.
export function mergeColors(
  palette: string[],
  pixels: number[],
  indexA: number,
  indexB: number,
): { palette: string[]; pixels: number[] } {
  const nextPixels = pixels.map((p) => {
    if (p === indexB) return indexA;
    if (p > indexB) return p - 1;
    return p;
  });
  const nextPalette = palette.filter((_, i) => i !== indexB);
  return { palette: nextPalette, pixels: nextPixels };
}
