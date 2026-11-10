import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPalette, quantizeMedianCut } from "./quantize.ts";

type Px = [number, number, number, number];
// 색마다 n픽셀씩 이어 붙인 RGBA 배열
function image(parts: [Px, number][]): number[] {
  const out: number[] = [];
  for (const [px, n] of parts) for (let i = 0; i < n; i++) out.push(...px);
  return out;
}

const RED: Px = [255, 0, 0, 255];
const GREEN: Px = [0, 255, 0, 255];
const BLUE: Px = [0, 0, 255, 255];
const BLACK: Px = [0, 0, 0, 255];

test("같은 면적 4색 이미지에서 4색을 25%씩 뽑는다", () => {
  const result = extractPalette(image([[RED, 25], [GREEN, 25], [BLUE, 25], [BLACK, 25]]), 4);
  assert.deepEqual(
    new Set(result.map((p) => p.hex)),
    new Set(["#ff0000", "#00ff00", "#0000ff", "#000000"]),
  );
  for (const p of result) assert.equal(p.ratio, 0.25);
});

test("이미지 색이 요청보다 적으면 있는 만큼만", () => {
  const result = extractPalette(image([[RED, 10], [BLUE, 10]]), 6);
  assert.equal(result.length, 2);
});

test("많이 쓰인 색부터 정렬한다", () => {
  const result = extractPalette(image([[BLUE, 10], [RED, 30]]), 2);
  assert.deepEqual(result.map((p) => p.hex), ["#ff0000", "#0000ff"]);
  assert.equal(result[0].ratio, 0.75);
});

test("알파 128 미만 픽셀은 빼고, 다 투명하면 빈 배열", () => {
  const semi: Px = [0, 0, 255, 100];
  assert.deepEqual(extractPalette(image([[RED, 10], [semi, 10]]), 4), [
    { hex: "#ff0000", ratio: 1 },
  ]);
  assert.deepEqual(extractPalette(image([[[0, 0, 0, 0], 20]]), 4), []);
});

test("quantizeMedianCut은 네모네모빔에서 쓰던 그대로 동작한다", () => {
  const q = quantizeMedianCut(["#000000", "#ffffff"], [0, 1, 1, -1], 1);
  assert.equal(q.palette.length, 1);
  assert.deepEqual(q.pixels, [0, 0, 0, -1]);
});
