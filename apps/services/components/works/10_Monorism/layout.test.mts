import { test } from "node:test";
import assert from "node:assert/strict";
import { PATH_STEP, ROW_GAP, boardSize, cellAt, cellCenter, interpolate } from "./layout.ts";

test("칸 중심 → 칸 왕복이 판 전체에서 맞는다", () => {
  for (const [w, h] of [[24, 24], [5, 4]]) {
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        assert.deepEqual(cellAt(cellCenter(col, row, w, h), w, h), { col, row });
      }
    }
  }
});

test("홀수 줄은 반 칸 밀리고 줄 간격은 √3/2", () => {
  const a = cellCenter(0, 0, 10, 10);
  const b = cellCenter(0, 1, 10, 10);
  assert.ok(Math.abs(b.x - a.x - 0.5) < 1e-9);
  assert.ok(Math.abs(b.y - a.y - ROW_GAP) < 1e-9);
  assert.ok(Math.abs(cellCenter(1, 0, 10, 10).x - a.x - 1) < 1e-9);
});

test("판은 원점을 중심으로 놓인다", () => {
  const { width, height } = boardSize(4, 3);
  assert.equal(width, 4.5);
  assert.ok(Math.abs(height - (2 * ROW_GAP + 1)) < 1e-9);
  const first = cellCenter(0, 0, 4, 3);
  assert.ok(Math.abs(first.x - (0.5 - width / 2)) < 1e-9);
  assert.ok(Math.abs(first.y - (0.5 - height / 2)) < 1e-9);
});

test("두 칩 사이 경계 근처 점은 가까운 칩으로 간다", () => {
  const a = cellCenter(3, 2, 10, 10);
  assert.deepEqual(cellAt({ x: a.x + 0.49, y: a.y }, 10, 10), { col: 3, row: 2 });
  assert.deepEqual(cellAt({ x: a.x + 0.51, y: a.y }, 10, 10), { col: 4, row: 2 });
});

test("판 밖의 점은 null, 가장자리 바로 바깥은 가장자리 칩", () => {
  assert.equal(cellAt({ x: -100, y: 0 }, 10, 10), null);
  assert.equal(cellAt({ x: 0, y: 100 }, 10, 10), null);
  const edge = cellCenter(0, 0, 10, 10);
  assert.deepEqual(cellAt({ x: edge.x - 0.45, y: edge.y }, 10, 10), { col: 0, row: 0 });
  assert.equal(cellAt({ x: edge.x - 0.7, y: edge.y }, 10, 10), null);
});

test("interpolate는 a를 빼고 b를 포함하며 간격이 PATH_STEP 이하", () => {
  const pts = interpolate({ x: 0, y: 0 }, { x: 2, y: 0 });
  assert.deepEqual(pts.at(-1), { x: 2, y: 0 });
  assert.ok(pts[0].x > 0);
  let prev = { x: 0, y: 0 };
  for (const p of pts) {
    assert.ok(Math.hypot(p.x - prev.x, p.y - prev.y) <= PATH_STEP + 1e-9);
    prev = p;
  }
  assert.deepEqual(interpolate({ x: 1, y: 1 }, { x: 1, y: 1 }), [{ x: 1, y: 1 }]);
});
