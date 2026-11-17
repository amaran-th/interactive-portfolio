import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIXTURE_TYPES,
  GELS,
  candela,
  isFixtureType,
  isHexColor,
  normalizeBeam,
  normalizeLevel,
  normalizeSoftness,
} from "./fixtures.ts";

test("빔 각도는 종류별 범위로 맞추고 숫자가 아니면 기본값", () => {
  assert.equal(normalizeBeam("profile", 90), 50);
  assert.equal(normalizeBeam("profile", 5), 19);
  assert.equal(normalizeBeam("profile", Number.NaN), 26);
  assert.equal(normalizeBeam("followspot", 30), 20);
  assert.equal(normalizeBeam("cyc", 50), 70);
  assert.equal(normalizeBeam("par", 33.6), 34);
});

test("가장자리 부드러움은 종류별 범위, 소수 둘째 자리", () => {
  assert.equal(normalizeSoftness("fresnel", 0.1), 0.5);
  assert.equal(normalizeSoftness("cyc", 2), 1);
  assert.equal(normalizeSoftness("profile", 0.123), 0.12);
  assert.equal(normalizeSoftness("par", Number.NaN), 0.45);
});

test("밝기는 0~100 정수", () => {
  assert.equal(normalizeLevel(120), 100);
  assert.equal(normalizeLevel(-5), 0);
  assert.equal(normalizeLevel(49.6), 50);
  assert.equal(normalizeLevel(Number.NaN), 0);
});

test("광도는 최대 광도 × 밝기", () => {
  assert.equal(candela("par", 50), 2000);
  assert.equal(candela("profile", 0), 0);
});

test("종류·색 판별", () => {
  assert.equal(isFixtureType("par"), true);
  assert.equal(isFixtureType("toString"), false);
  assert.equal(isFixtureType(3), false);
  assert.equal(isHexColor("#a1B2c3"), true);
  assert.equal(isHexColor("red"), false);
  assert.equal(FIXTURE_TYPES.length, 5);
  assert.equal(GELS.length, 12);
  assert.ok(GELS.every((g) => isHexColor(g.color)));
});
