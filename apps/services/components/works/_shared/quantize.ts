// median cut 색 양자화. 네모네모빔 사진 가져오기와 팔레트 추출기가 같이 쓴다.
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

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

export type PaletteEntry = { hex: string; ratio: number };

// RGBA 픽셀 배열(ImageData.data 등)에서 대표색을 뽑아 많이 쓰인 순으로
// 돌려준다. 알파 128 미만은 투명으로 보고 뺀다. ratio는 남은 픽셀 대비 비율.
export function extractPalette(
  data: ArrayLike<number>,
  maxColors: number,
): PaletteEntry[] {
  const palette: string[] = [];
  const index = new Map<string, number>();
  const pixels: number[] = [];
  const h2 = (n: number) => n.toString(16).padStart(2, "0");
  for (let o = 0; o + 3 < data.length; o += 4) {
    if (data[o + 3] < 128) continue;
    const hex = `#${h2(data[o])}${h2(data[o + 1])}${h2(data[o + 2])}`;
    let i = index.get(hex);
    if (i === undefined) {
      i = palette.length;
      palette.push(hex);
      index.set(hex, i);
    }
    pixels.push(i);
  }
  if (pixels.length === 0) return [];
  const q = quantizeMedianCut(palette, pixels, maxColors);
  const counts = new Array<number>(q.palette.length).fill(0);
  for (const p of q.pixels) counts[p]++;
  return q.palette
    .map((hex, i) => ({ hex, ratio: counts[i] / pixels.length }))
    .sort((a, b) => b.ratio - a.ratio);
}
