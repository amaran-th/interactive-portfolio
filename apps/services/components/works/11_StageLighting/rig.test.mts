import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STAGE,
  clampToStage,
  defaultPlacement,
  fixtureBounds,
  heightPresets,
  normalizeFocus,
  normalizeObjectPosition,
  normalizePosition,
  normalizeStage,
  planHalfHeight,
  snap,
  stageCenter,
} from "./rig.ts";

const S = DEFAULT_STAGE; // 폭 12, 깊이 8, 바닥 0.9

test("격자 맞춤은 -0을 만들지 않는다", () => {
  assert.equal(snap(1.13), 1.25);
  assert.ok(Object.is(snap(-0.1), 0));
});

test("높이 버튼 값은 무대 바닥 높이를 따른다", () => {
  assert.deepEqual(heightPresets(S), { floor: 1.1, boom: 3.4, batten: 6.5, foh: 7 });
  assert.deepEqual(heightPresets({ ...S, deckHeight: 0 }).floor, 0.2);
});

test("조명기 위치는 범위 안으로, 격자는 끌 수 있다", () => {
  assert.deepEqual(normalizePosition({ x: 100, y: -5, z: -100 }, S), { x: 16, y: 0.2, z: -10 });
  assert.deepEqual(normalizePosition({ x: 1.13, y: 6.4, z: 0.12 }, S), { x: 1.25, y: 6.5, z: 0 });
  assert.deepEqual(normalizePosition({ x: 1.13, y: 6.4, z: 0.12 }, S, false), { x: 1.13, y: 6.4, z: 0.12 });
  const arena = fixtureBounds({ ...S, shape: "arena", width: 14 });
  assert.equal(arena.minZ, -16);
});

test("겨누는 높이는 0~2m", () => {
  assert.equal(normalizeFocus({ x: 0, z: -4, height: 5 }, S).height, 2);
  assert.equal(normalizeFocus({ x: 0, z: -4, height: Number.NaN }, S).height, 1);
});

test("무대 모양별로 배우·소품을 무대 안으로 맞춘다", () => {
  assert.deepEqual(clampToStage(10, 3, S), { x: 6, z: 0 });
  const thrust = { ...S, shape: "thrust" as const };
  assert.deepEqual(clampToStage(5, 2, thrust), { x: 3, z: 2 });
  assert.deepEqual(clampToStage(0, 10, thrust), { x: 0, z: 4 });
  const arena = { ...S, shape: "arena" as const };
  const c = stageCenter(arena);
  assert.deepEqual(c, { x: 0, z: -6 });
  const p = clampToStage(20, -6, arena);
  assert.ok(Math.abs(Math.hypot(p.x - c.x, p.z - c.z) - 6) < 1e-9);
  assert.deepEqual(normalizeObjectPosition(-0.1, -3.13, S), { x: 0, z: -3.25 });
});

test("새 조명기 기본 자리와 겹침 피하기", () => {
  const a = defaultPlacement("profile", S, []);
  assert.deepEqual(a.position, { x: 0, y: 6.5, z: -2.4 });
  assert.deepEqual(a.focus, { x: 0, z: -4, height: 1 });
  const b = defaultPlacement("profile", S, [a.position]);
  assert.equal(b.position.x, 1);
  const f = defaultPlacement("followspot", S, []);
  assert.deepEqual(f.position, { x: 0, y: 7, z: 6 });
  const cyc = defaultPlacement("cyc", S, []);
  assert.deepEqual(cyc.position, { x: 0, y: 6.5, z: -6.8 });
  assert.deepEqual(cyc.focus, { x: 0, z: -8, height: 2 });
});

test("무대 설정 정규화", () => {
  const s = normalizeStage({ width: 30, depth: 1, deckHeight: 9, floorColor: "red" }, S);
  assert.equal(s.width, 20);
  assert.equal(s.depth, 4);
  assert.equal(s.deckHeight, 1.5);
  assert.equal(s.floorColor, S.floorColor);
});

test("평면도 화면 반높이는 무대가 다 들어오게 잡는다", () => {
  assert.ok(Math.abs(planHalfHeight(S, 2) - 8.8) < 1e-9);
  assert.ok(Math.abs(planHalfHeight(S, 0.5) - 19.8) < 1e-9);
});
