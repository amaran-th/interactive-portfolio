import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatHex,
  formatHsl,
  formatRgb,
  hexToRgb,
  isDark,
  parseColor,
  rgbToHex,
} from "./color.ts";

test("#1e90ff를 HEX·RGB·HSL로 바꾼다", () => {
  const rgb = hexToRgb("#1e90ff");
  assert.deepEqual(rgb, { r: 30, g: 144, b: 255 });
  assert.equal(rgbToHex(rgb!), "#1e90ff");
  assert.equal(formatHex(rgb!), "#1e90ff");
  assert.equal(formatRgb(rgb!), "rgb(30 144 255)");
  assert.equal(formatHsl(rgb!), "hsl(210 100% 56%)");
});

test("hexToRgb는 3자리·# 생략·대문자를 받고 잘못된 값은 null", () => {
  assert.deepEqual(hexToRgb("#fff"), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hexToRgb("1E90FF"), { r: 30, g: 144, b: 255 });
  assert.equal(hexToRgb("#12345"), null);
  assert.equal(hexToRgb("zzz"), null);
});

test("흑백·원색의 HSL", () => {
  assert.equal(formatHsl({ r: 0, g: 0, b: 0 }), "hsl(0 0% 0%)");
  assert.equal(formatHsl({ r: 255, g: 255, b: 255 }), "hsl(0 0% 100%)");
  assert.equal(formatHsl({ r: 255, g: 0, b: 0 }), "hsl(0 100% 50%)");
});

test("isDark는 밝기로 글자색을 고를 때 쓴다", () => {
  assert.equal(isDark({ r: 0, g: 0, b: 0 }), true);
  assert.equal(isDark({ r: 255, g: 255, b: 255 }), false);
  assert.equal(isDark({ r: 30, g: 144, b: 255 }), true);
  assert.equal(isDark({ r: 255, g: 255, b: 0 }), false);
});

test("parseColor는 HEX와 rgb() 문자열을 읽는다", () => {
  assert.deepEqual(parseColor("#1e90ff"), { r: 30, g: 144, b: 255 });
  assert.deepEqual(parseColor("rgb(30, 144, 255)"), { r: 30, g: 144, b: 255 });
  assert.deepEqual(parseColor("rgb(30 144 255)"), { r: 30, g: 144, b: 255 });
  assert.equal(parseColor("nope"), null);
});
