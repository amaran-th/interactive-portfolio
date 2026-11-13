import { test } from "node:test";
import assert from "node:assert/strict";
import { lerpLook, fadeProgress, aimChanged, hexToLinear, linearToHex } from "./cues.ts";

const fx = [{ id: "a", kind: "par", name: "A", position: { x: 0, y: 6, z: 0 }, castShadow: false }] as const;
const lv = (o = {}) => ({ intensity: 0, color: "#ffffff", target: { x: 0, y: 0, z: 0 }, beamAngle: 40, softness: 0.4, ...o });

test("양 끝은 원래 상태", () => {
  const a = { levels: { a: lv({ intensity: 0.2 }) }, haze: 0 };
  const b = { levels: { a: lv({ intensity: 1 }) }, haze: 1 };
  assert.equal(lerpLook(a, b, 0, [...fx]).levels.a.intensity, 0.2);
  assert.equal(lerpLook(a, b, 1, [...fx]).levels.a.intensity, 1);
  assert.equal(lerpLook(a, b, 0.5, [...fx]).haze, 0.5);
});

test("한쪽에만 있는 조명기는 밝기 0에서 올라온다", () => {
  const a = { levels: {}, haze: 0 };
  const b = { levels: { a: lv({ intensity: 1, color: "#ff0000" }) }, haze: 0 };
  const m = lerpLook(a, b, 0.5, [...fx]).levels.a;
  assert.equal(m.intensity, 0.5);
  assert.equal(m.color, "#ff0000");
});

test("색은 선형 RGB에서 보간", () => {
  const a = { levels: { a: lv({ color: "#000000" }) }, haze: 0 };
  const b = { levels: { a: lv({ color: "#ffffff" }) }, haze: 0 };
  // 선형 0.5 → sRGB 약 0.735 → 0xbc
  assert.equal(lerpLook(a, b, 0.5, [...fx]).levels.a.color, "#bcbcbc");
});

test("색 변환 왕복", () => {
  assert.equal(linearToHex(hexToLinear("#3a7bd5")), "#3a7bd5");
});

test("fadeProgress", () => {
  assert.equal(fadeProgress(0, 0), 1);
  assert.equal(fadeProgress(500, 0), 1);
  assert.equal(fadeProgress(0, 2), 0);
  assert.equal(fadeProgress(1000, 2), 0.5);
  assert.equal(fadeProgress(5000, 2), 1);
});

test("aimChanged", () => {
  const a = { levels: { a: lv() }, haze: 0 };
  assert.equal(aimChanged(a, { levels: { a: lv({ intensity: 1, color: "#ff0000" }) }, haze: 1 }, [...fx]), false);
  assert.equal(aimChanged(a, { levels: { a: lv({ target: { x: 1, y: 0, z: 0 } }) }, haze: 0 }, [...fx]), true);
  assert.equal(aimChanged(a, { levels: { a: lv({ beamAngle: 20 }) }, haze: 0 }, [...fx]), true);
});
