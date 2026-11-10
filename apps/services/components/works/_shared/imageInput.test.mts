import { test } from "node:test";
import assert from "node:assert/strict";
import { fitWithin, isTextEntryTarget } from "./imageInput.ts";

test("글자 입력칸만 붙여넣기 대상으로 본다", () => {
  assert.equal(isTextEntryTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTextEntryTarget({ tagName: "INPUT", type: "text" }), true);
  assert.equal(isTextEntryTarget({ tagName: "INPUT", type: "search" }), true);
  assert.equal(isTextEntryTarget({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isTextEntryTarget({ tagName: "INPUT", type: "range" }), false);
  assert.equal(isTextEntryTarget({ tagName: "INPUT", type: "file" }), false);
  assert.equal(isTextEntryTarget({ tagName: "BUTTON" }), false);
  assert.equal(isTextEntryTarget(null), false);
});

test("fitWithin은 긴 변·넓이 상한 안으로 비율을 지켜 줄인다", () => {
  assert.deepEqual(fitWithin(200, 100), { width: 200, height: 100 });
  assert.deepEqual(fitWithin(8064, 6048), { width: 4096, height: 3072 });
  const tall = fitWithin(3000, 9000);
  assert.equal(tall.height, 4096);
  assert.equal(tall.width, 1365);
  const big = fitWithin(4096, 4096, 4096, 8_000_000);
  assert.ok(big.width * big.height <= 8_000_000);
  assert.equal(big.width, big.height);
});
