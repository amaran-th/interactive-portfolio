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
// curPalette.length > 1 가드: maxColors가 0 이하로 들어와도 무한루프에 빠지지 않는다(더 합칠 색이 없으면 멈춘다).
export function quantizeColors(
  palette: string[],
  pixels: number[],
  maxColors: number,
): { palette: string[]; pixels: number[] } {
  let curPalette = palette.slice();
  let curPixels = pixels.slice();

  while (curPalette.length > maxColors && curPalette.length > 1) {
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
// indexA가 indexB보다 뒤에 있으면(indexA > indexB) indexB 제거로 인해 indexA 자신의 위치도 하나 당겨지므로,
// "합쳐진 색이 가리켜야 할 최종 인덱스"(targetIndex)를 별도로 계산해 그 값으로 통일한다.
export function mergeColors(
  palette: string[],
  pixels: number[],
  indexA: number,
  indexB: number,
): { palette: string[]; pixels: number[] } {
  const targetIndex = indexA > indexB ? indexA - 1 : indexA;
  const nextPixels = pixels.map((p) => {
    if (p === indexB) return targetIndex;
    return p > indexB ? p - 1 : p;
  });
  const nextPalette = palette.filter((_, i) => i !== indexB);
  return { palette: nextPalette, pixels: nextPixels };
}

// srcWidth x srcHeight 픽셀 그리드를 dstWidth x dstHeight로 최근접 이웃 방식으로
// 재배치한다. 이미지를 픽셀아트로 변환할 때 "픽셀 해상도"(비트 규격, 몇 칸으로
// 샘플링할지)와 "실제 캔버스 크기"(최종 결과물의 격자 크기)를 독립적으로 정할 수
// 있게 해준다 — dst가 src보다 크면 한 칸이 여러 칸으로 확대(블록화)되고, 작으면
// 축소된다. 어느 조합이든 동작하는 범용 구현이라 정수 배수가 아니어도 괜찮다.
export function resamplePixelGrid(
  pixels: number[],
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): number[] {
  const next = new Array<number>(dstWidth * dstHeight);
  for (let y = 0; y < dstHeight; y++) {
    const sy = Math.min(srcHeight - 1, Math.floor((y * srcHeight) / dstHeight));
    for (let x = 0; x < dstWidth; x++) {
      const sx = Math.min(srcWidth - 1, Math.floor((x * srcWidth) / dstWidth));
      next[y * dstWidth + x] = pixels[sy * srcWidth + sx];
    }
  }
  return next;
}
