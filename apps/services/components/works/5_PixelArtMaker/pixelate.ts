export { quantizeMedianCut } from "../_shared/quantize";

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

// 여러 소스 인덱스를 한 번에 targetIndex로 접는다. mergeColors(쌍 병합)를
// 소스 값이 큰 인덱스부터 내림차순으로 반복 호출하는 방식으로 구현한다 —
// 큰 인덱스를 먼저 지우면, 아직 처리하지 않은 나머지 소스들은 전부 방금
// 지운 인덱스보다 작으므로(내림차순 순회) 이번 삭제로 인한 인덱스 밀림의
// 영향을 받지 않는다(삭제는 자신보다 큰 인덱스만 한 칸씩 당긴다). 따라서
// 매 반복 소스는 항상 원래 값 그대로 써도 안전하고, target의 현재 위치만
// mergeColors와 같은 공식(targetIndex = indexA > indexB ? indexA - 1 : indexA)으로
// 갱신해 다음 반복에 넘기면 된다.
export function mergeManyColors(
  palette: string[],
  pixels: number[],
  targetIndex: number,
  sourceIndices: number[],
): { palette: string[]; pixels: number[] } {
  let curPalette = palette;
  let curPixels = pixels;
  let curTarget = targetIndex;
  const sortedSources = [...sourceIndices].sort((a, b) => b - a);
  for (const source of sortedSources) {
    const merged = mergeColors(curPalette, curPixels, curTarget, source);
    curPalette = merged.palette;
    curPixels = merged.pixels;
    curTarget = curTarget > source ? curTarget - 1 : curTarget;
  }
  return { palette: curPalette, pixels: curPixels };
}

// 팔레트에 완전히 똑같은 hex가 여러 번 들어 있으면(스와치를 직접 다른 색과
// 같은 값으로 고쳤을 때 등) 자동으로 하나로 합친다. j를 뒤에서부터 훑어야
// mergeColors가 indexB(j) 위쪽 인덱스를 한 칸씩 당길 때도 아직 검사하지 않은
// 낮은 인덱스가 밀리지 않아 안전하다.
export function dedupePalette(
  palette: string[],
  pixels: number[],
): { palette: string[]; pixels: number[] } {
  let curPalette = palette.slice();
  let curPixels = pixels.slice();
  for (let i = 0; i < curPalette.length; i++) {
    for (let j = curPalette.length - 1; j > i; j--) {
      if (curPalette[j] === curPalette[i]) {
        const merged = mergeColors(curPalette, curPixels, i, j);
        curPalette = merged.palette;
        curPixels = merged.pixels;
      }
    }
  }
  return { palette: curPalette, pixels: curPixels };
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
