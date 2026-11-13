import { test } from "node:test";
import assert from "node:assert/strict";
import { nextTier, effectiveTier, shadowFixtureIds } from "./quality.ts";

test("nextTier", () => {
  assert.equal(nextTier(0, Array(29).fill(40)), 0);
  assert.equal(nextTier(0, Array(30).fill(23)), 1);
  assert.equal(nextTier(1, Array(30).fill(16)), 1);
  assert.equal(nextTier(2, Array(30).fill(40)), 2);
  assert.equal(nextTier(0, [...Array(10).fill(100), ...Array(30).fill(10)]), 0);
});
test("effectiveTier", () => {
  assert.equal(effectiveTier("high", 2), 0);
  assert.equal(effectiveTier("low", 0), 2);
  assert.equal(effectiveTier("auto", 1), 1);
});
test("shadowFixtureIds는 앞에서부터 한도까지", () => {
  const f = (id: string, c: boolean) => ({ id, kind: "par", name: id, position: { x: 0, y: 0, z: 0 }, castShadow: c });
  const list = [f("a", true), f("b", false), f("c", true), f("d", true)];
  assert.deepEqual(shadowFixtureIds(list as never, 2), ["a", "c"]);
  assert.deepEqual(shadowFixtureIds(list as never, 0), []);
});
