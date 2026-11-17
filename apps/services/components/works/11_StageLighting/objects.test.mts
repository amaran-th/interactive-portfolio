import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROPS,
  isPose,
  isProp,
  normalizeHeight,
  normalizeRotation,
  normalizeScale,
} from "./objects.ts";

test("방향은 15° 단위로, 0~345", () => {
  assert.equal(normalizeRotation(-15), 345);
  assert.equal(normalizeRotation(370), 15);
  assert.equal(normalizeRotation(7), 0);
  assert.equal(normalizeRotation(360), 0);
});

test("크기 배율·키 범위", () => {
  assert.equal(normalizeScale(3), 2);
  assert.equal(normalizeScale(0.1), 0.5);
  assert.equal(normalizeScale(Number.NaN), 1);
  assert.equal(normalizeHeight(2.5), 2);
  assert.equal(normalizeHeight(1.234), 1.4);
  assert.equal(normalizeHeight(1.777), 1.78);
  assert.equal(normalizeHeight(Number.NaN), 1.75);
});

test("자세·소품 판별과 소품 10종", () => {
  assert.equal(isPose("sit"), true);
  assert.equal(isPose("fly"), false);
  assert.equal(isProp("lamppost"), true);
  assert.equal(isProp("constructor"), false);
  assert.equal(Object.keys(PROPS).length, 10);
});
