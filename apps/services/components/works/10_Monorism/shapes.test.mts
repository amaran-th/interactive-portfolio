import { test } from "node:test";
import assert from "node:assert/strict";
import { CHIP_SHAPES } from "./board.ts";
import { chipOutline } from "./shapes.ts";

// 볼록 다각형 둘이 겹치는지(분리축 정리)
function overlaps(a: { x: number; y: number }[], b: { x: number; y: number }[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const nx = q.y - p.y;
      const ny = p.x - q.x;
      const proj = (pts: typeof a) => pts.map((v) => v.x * nx + v.y * ny);
      const pa = proj(a);
      const pb = proj(b);
      if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
    }
  }
  return true;
}

test("어떤 모양도 벌집 배치의 이웃 칩과 겹치지 않는다", () => {
  const neighbors = [0, 1, 2, 3, 4, 5].map((i) => ({
    x: Math.cos((i * Math.PI) / 3),
    y: Math.sin((i * Math.PI) / 3),
  }));
  for (const shape of CHIP_SHAPES) {
    const o = chipOutline(shape);
    for (const n of neighbors) {
      const moved = o.map((p) => ({ x: p.x + n.x, y: p.y + n.y }));
      assert.equal(overlaps(o, moved), false, `${shape} ↔ (${n.x.toFixed(2)}, ${n.y.toFixed(2)})`);
    }
  }
});

test("윤곽은 위아래 대칭이라 뒤집어도 같은 모양이다", () => {
  for (const shape of CHIP_SHAPES) {
    const o = chipOutline(shape);
    for (const p of o) {
      assert.ok(
        o.some((q) => Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.y + p.y) < 1e-9),
        shape,
      );
    }
  }
});
