import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBeamGeometry } from "./scene/beam.ts";

test("빔 원뿔은 꼭짓점이 조명기(원점)에 있고 아래(-y 1)로 갈수록 넓어진다", () => {
  const pos = buildBeamGeometry(16).getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const r = Math.hypot(pos.getX(i), pos.getZ(i));
    assert.ok(y <= 1e-6 && y >= -1 - 1e-6, `y=${y}`);
    // 반지름은 원점에서 멀어진 만큼(-y)과 같다.
    assert.ok(Math.abs(r - -y) < 1e-6, `y=${y} r=${r}`);
  }
});
