import { test } from "node:test";
import assert from "node:assert/strict";
import { lerpLook, fadeProgress, aimChanged, hexToLinear, linearToHex, stepHaze } from "./cues.ts";

const f = (id: string, kind: string) =>
  ({ id, kind, channel: 1, name: id, position: { x: 0, y: 6, z: -2 }, castShadow: false,
     focus: { target: { x: 0, y: 0, z: 0 }, zoom: 0.5, sharpness: 0.8, lamp: "mfl", gel: "#ffffff" } }) as never;
const P = f("p", "profile");
const F = f("f", "follow");
const L = f("l", "ledpar");

test("일반 조명기: 밝기만 보간, aimChanged false", () => {
  const a = { levels: { p: { intensity: 0.2 } }, haze: 0 };
  const b = { levels: { p: { intensity: 1 } }, haze: 1 };
  const m = lerpLook(a, b, 0.5, [P]);
  assert.deepEqual(m.levels.p, { intensity: 0.6 });
  assert.equal(m.haze, 0.5);
  assert.equal(aimChanged(a, b, [P]), false);
});

test("한쪽에만 있으면 밝기 0에서", () => {
  const m = lerpLook({ levels: {}, haze: 0 }, { levels: { l: { intensity: 1, color: "#ff0000" } }, haze: 0 }, 0.5, [L]);
  assert.equal(m.levels.l.intensity, 0.5);
  assert.equal(m.levels.l.color, "#ff0000");
});

test("팔로우 조준 변경은 aimChanged", () => {
  const a = { levels: { f: { intensity: 1, target: { x: 0, y: 0, z: 0 } } }, haze: 0 };
  const b = { levels: { f: { intensity: 1, target: { x: 2, y: 0, z: 0 } } }, haze: 0 };
  assert.equal(aimChanged(a, b, [F]), true);
  assert.equal(lerpLook(a, b, 0.5, [F]).levels.f.target!.x, 1);
  const c = { levels: { f: { intensity: 1, target: { x: 0, y: 0, z: 0 }, zoom: 0.2 } }, haze: 0 };
  assert.equal(aimChanged(a, c, [F]), true);
});

test("LED 색은 선형 RGB 보간", () => {
  const a = { levels: { l: { intensity: 1, color: "#000000" } }, haze: 0 };
  const b = { levels: { l: { intensity: 1, color: "#ffffff" } }, haze: 0 };
  assert.equal(lerpLook(a, b, 0.5, [L]).levels.l.color, "#bcbcbc");
  assert.equal(linearToHex(hexToLinear("#3a7bd5")), "#3a7bd5");
});

test("fadeProgress", () => {
  assert.equal(fadeProgress(0, 0), 1);
  assert.equal(fadeProgress(0, 2), 0);
  assert.equal(fadeProgress(1000, 2), 0.5);
  assert.equal(fadeProgress(5000, 2), 1);
});

test("stepHaze: 차오름 20초, 빠짐 40초", () => {
  assert.equal(stepHaze(0, 1, 10), 0.5);
  assert.equal(stepHaze(1, 0, 10), 0.75);
  assert.equal(stepHaze(0.9, 1, 10), 1);
  assert.equal(stepHaze(0.1, 0, 10), 0);
  assert.equal(stepHaze(0.5, 0.5, 1), 0.5);
});
