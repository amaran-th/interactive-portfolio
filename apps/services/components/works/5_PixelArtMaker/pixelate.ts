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

// 사람 눈의 채널별 밝기 민감도(Rec. 601 luma) — median cut에서 어느 축으로
// 자를지 고를 때 RGB 범위를 이 계수로 가중해, 초록 차이를 빨강·파랑 차이보다
// 크게 본다.
const LUMA_R = 0.299;
const LUMA_G = 0.587;
const LUMA_B = 0.114;

type ColorStat = {
  hex: string;
  r: number;
  g: number;
  b: number;
  count: number;
};

// 박스(색 묶음)의 채널별 min/max에 luma 가중을 곱해 가장 "길게 퍼진" 축과
// 그 가중 길이를 구한다.
function widestAxis(box: ColorStat[]): {
  axis: "r" | "g" | "b";
  weightedLength: number;
} {
  let rmin = 255,
    rmax = 0,
    gmin = 255,
    gmax = 0,
    bmin = 255,
    bmax = 0;
  for (const s of box) {
    if (s.r < rmin) rmin = s.r;
    if (s.r > rmax) rmax = s.r;
    if (s.g < gmin) gmin = s.g;
    if (s.g > gmax) gmax = s.g;
    if (s.b < bmin) bmin = s.b;
    if (s.b > bmax) bmax = s.b;
  }
  const rl = (rmax - rmin) * LUMA_R;
  const gl = (gmax - gmin) * LUMA_G;
  const bl = (bmax - bmin) * LUMA_B;
  if (rl >= gl && rl >= bl) return { axis: "r", weightedLength: rl };
  if (gl >= bl) return { axis: "g", weightedLength: gl };
  return { axis: "b", weightedLength: bl };
}

function boxPopulation(box: ColorStat[]): number {
  let n = 0;
  for (const s of box) n += s.count;
  return n;
}

// 색 히스토그램 기반 median cut 양자화. 픽셀 등장 빈도를 반영해 큰 영역에
// 팔레트 슬롯을 더 배정하고(1픽셀짜리 희귀색은 사실상 무시), 자를 축은
// luma 가중으로 고른다. 각 묶음의 대표색은 빈도 가중 무게중심에 가장 가까운
// "실제로 이미지에 있던" 색이다 — 평균색을 새로 만들지 않는다.
// 반복당 O(색상수), 총 O(maxColors·색상수) 수준이라 큰 팔레트도 견딘다.
export function quantizeMedianCut(
  palette: string[],
  pixels: number[],
  maxColors: number,
): { palette: string[]; pixels: number[] } {
  // 1. 팔레트 색별 픽셀 등장 횟수. 한 번도 안 쓰인 색은 버린다.
  const counts = new Array<number>(palette.length).fill(0);
  for (const p of pixels) if (p >= 0) counts[p]++;

  const stats: ColorStat[] = [];
  for (let i = 0; i < palette.length; i++) {
    if (counts[i] === 0) continue;
    const [r, g, b] = hexToRgb(palette[i]);
    stats.push({ hex: palette[i], r, g, b, count: counts[i] });
  }

  const target = Math.max(1, Math.min(maxColors, stats.length));

  // 2. median cut — 목표 개수만큼 박스가 생길 때까지 가장 넓은 박스를 쪼갠다.
  let boxes: ColorStat[][];
  if (stats.length <= target) {
    boxes = stats.map((s) => [s]);
  } else {
    boxes = [stats];
    while (boxes.length < target) {
      let splitIdx = -1;
      let bestLen = -1;
      let bestPop = -1;
      for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].length < 2) continue;
        const { weightedLength } = widestAxis(boxes[i]);
        const pop = boxPopulation(boxes[i]);
        if (
          weightedLength > bestLen ||
          (weightedLength === bestLen && pop > bestPop)
        ) {
          bestLen = weightedLength;
          bestPop = pop;
          splitIdx = i;
        }
      }
      if (splitIdx === -1) break; // 더 쪼갤 박스가 없다

      const box = boxes[splitIdx];
      const { axis } = widestAxis(box);
      box.sort((a, b) => a[axis] - b[axis]);

      // 픽셀 수 중앙값에서 자른다 — 양쪽이 대략 같은 "면적"을 갖도록.
      const total = boxPopulation(box);
      let acc = 0;
      let at = 1;
      for (let k = 0; k < box.length - 1; k++) {
        acc += box[k].count;
        at = k + 1;
        if (acc * 2 >= total) break;
      }
      boxes.splice(splitIdx, 1, box.slice(0, at), box.slice(at));
    }
  }

  // 3. 각 박스의 대표색 = 빈도 가중 무게중심에 가장 가까운 실제 색.
  const nextPalette: string[] = [];
  const repOf = new Map<string, number>();
  for (const box of boxes) {
    let sr = 0,
      sg = 0,
      sb = 0,
      sc = 0;
    for (const s of box) {
      sr += s.r * s.count;
      sg += s.g * s.count;
      sb += s.b * s.count;
      sc += s.count;
    }
    const cr = sr / sc;
    const cg = sg / sc;
    const cb = sb / sc;
    let best = box[0];
    let bestD = Infinity;
    for (const s of box) {
      const d = (s.r - cr) ** 2 + (s.g - cg) ** 2 + (s.b - cb) ** 2;
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    const newIdx = nextPalette.length;
    nextPalette.push(best.hex);
    for (const s of box) repOf.set(s.hex, newIdx);
  }

  // 4. 원래 팔레트 인덱스 → 새 대표 인덱스로 픽셀을 다시 매핑한다.
  const mapping = new Array<number>(palette.length).fill(0);
  for (let i = 0; i < palette.length; i++) {
    mapping[i] = repOf.get(palette[i]) ?? 0;
  }
  const nextPixels = pixels.map((p) => (p < 0 ? -1 : mapping[p]));
  return { palette: nextPalette, pixels: nextPixels };
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
