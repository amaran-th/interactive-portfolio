import { test } from "node:test";
import assert from "node:assert/strict";
import { basisValue, overflowStart, countText, limitFromQuestion, parseSaved } from "./count.ts";

test("빈 글은 모두 0", () => {
  assert.deepEqual(countText(""), {
    withSpaces: 0, noSpaces: 0, words: 0, lines: 0, paragraphs: 0, bytesUtf8: 0, bytesKr: 0,
  });
});

test("공백 포함·제외, 단어, 바이트", () => {
  const c = countText("안녕 hi");
  assert.equal(c.withSpaces, 5);
  assert.equal(c.noSpaces, 4);
  assert.equal(c.words, 2);
  assert.equal(c.bytesUtf8, 3 * 2 + 1 + 2);
  assert.equal(c.bytesKr, 2 * 2 + 1 + 2);
});

test("이모지·결합 문자는 한 글자", () => {
  assert.equal(countText("👨‍👩‍👧").withSpaces, 1);
  assert.equal(countText("👍🏽").withSpaces, 1);
  // 풀어쓴 한글 자모(ᄀ+ᅡ)도 한 글자
  assert.equal(countText("가").withSpaces, 1);
});

test("줄·문단, CRLF는 줄바꿈 하나", () => {
  const c = countText("첫 줄\r\n둘째 줄\n\n\n셋째 문단\n");
  assert.equal(c.lines, 6);
  assert.equal(c.paragraphs, 2);
  assert.equal(countText("a\r\nb").withSpaces, 3);
});

test("기준별 값", () => {
  const c = countText("가 a");
  assert.equal(basisValue(c, "with-spaces"), 3);
  assert.equal(basisValue(c, "no-spaces"), 2);
  assert.equal(basisValue(c, "bytes-kr"), 4);
});

test("저장값 읽기", () => {
  const ok = { question: "지원 동기", memo: "메모", memoOpen: true, memoSide: "left", text: "글", limit: 500, basis: "no-spaces", spellcheck: true };
  assert.deepEqual(parseSaved(JSON.stringify(ok)), ok);
  // 문항이 생기기 전에 저장한 값은 빈 문항으로 읽는다
  const old = { text: "글", limit: 500, basis: "no-spaces", crlf: false };
  assert.deepEqual(parseSaved(JSON.stringify(old)), { ...ok, question: "", memo: "", memoOpen: false, memoSide: "right", spellcheck: false });
  assert.equal(parseSaved(JSON.stringify(old))?.spellcheck, false);
  assert.deepEqual(parseSaved(JSON.stringify({ ...ok, limit: null }))?.limit, null);
  assert.equal(parseSaved(null), null);
  assert.equal(parseSaved("{"), null);
  assert.equal(parseSaved(JSON.stringify({ ...ok, basis: "x" })), null);
  assert.equal(parseSaved(JSON.stringify({ ...ok, limit: -1 })), null);
  assert.equal(parseSaved(JSON.stringify({ ...ok, limit: 1.5 })), null);
});

test("제한을 처음 넘기는 위치", () => {
  assert.equal(overflowStart("가나다", 3, "with-spaces"), null);
  assert.equal(overflowStart("가나다라", 3, "with-spaces"), 3);
  // 공백 제외는 공백을 건너뛰고, 넘기는 첫 글자에서 시작한다
  assert.equal(overflowStart("가 나 다 라", 3, "no-spaces"), 6);
  // 한글 2바이트: 가(2) a(3) 나(5)에서 4를 넘는다
  assert.equal(overflowStart("가a나", 4, "bytes-kr"), 2);
  assert.equal(overflowStart("가\r\n나", 2, "with-spaces"), 3);
  // 합쳐진 이모지는 한 글자로 센다
  assert.equal(overflowStart("👨‍👩‍👧a", 1, "with-spaces"), "👨‍👩‍👧".length);
  // countText와 같은 값에서 경계가 맞는다
  const text = "안녕 hello\n세계 🌏!";
  for (const basis of ["with-spaces", "no-spaces", "bytes-kr"] as const) {
    const total = basisValue(countText(text), basis);
    assert.equal(overflowStart(text, total, basis), null);
    assert.notEqual(overflowStart(text, total - 1, basis), null);
  }
});

test("문항에서 분량 찾기", () => {
  assert.deepEqual(limitFromQuestion("지원 동기를 500자 이내로 작성해 주세요."), { limit: 500, basis: "with-spaces" });
  assert.deepEqual(limitFromQuestion("성장 과정 (1,000자)"), { limit: 1000, basis: "with-spaces" });
  assert.deepEqual(limitFromQuestion("공백 제외 700 자 이내"), { limit: 700, basis: "no-spaces" });
  assert.deepEqual(limitFromQuestion("1500 Byte 이내"), { limit: 1500, basis: "bytes-kr" });
  assert.deepEqual(limitFromQuestion("최대 2000바이트"), { limit: 2000, basis: "bytes-kr" });
  assert.equal(limitFromQuestion("본인의 강점을 서술하세요."), null);
  assert.equal(limitFromQuestion(""), null);
});
