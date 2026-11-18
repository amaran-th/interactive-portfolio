import { test } from "node:test";
import assert from "node:assert/strict";
import { fitWithin, imageSrcFromClipboardText, isTextEntryTarget } from "./imageInput.ts";

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

test("클립보드 HTML·글자에서 이미지 주소를 찾는다", () => {
  assert.equal(imageSrcFromClipboardText('<meta charset="utf-8"><img src="https://a.com/x.png?w=1&amp;h=2" alt="">', ""), "https://a.com/x.png?w=1&h=2");
  assert.equal(imageSrcFromClipboardText("<IMG class='c' SRC='data:image/png;base64,AAA'>", ""), "data:image/png;base64,AAA");
  assert.equal(imageSrcFromClipboardText("", " https://a.com/photo.JPG "), "https://a.com/photo.JPG");
  assert.equal(imageSrcFromClipboardText("", "data:image/webp;base64,BBB"), "data:image/webp;base64,BBB");
  assert.equal(imageSrcFromClipboardText("", "https://a.com/page.html"), null);
  assert.equal(imageSrcFromClipboardText('<img src="blob:https://a.com/1">', "그냥 글"), null);
  assert.equal(imageSrcFromClipboardText("", ""), null);
});
