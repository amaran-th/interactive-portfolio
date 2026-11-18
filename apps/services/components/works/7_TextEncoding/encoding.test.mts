import { test } from "node:test";
import assert from "node:assert/strict";
import {
  asciiBytes,
  buildEucKrTable,
  byteRangeToChars,
  charByteLengths,
  charsToByteRange,
  parseBytesSpans,
  parseCodePointSpans,
  pickRange,
  textSpans,
  codePoints,
  decodeBytes,
  displayChar,
  eucKrBytes,
  formatBytes,
  formatCodePoint,
  formatUnits16,
  looksLikeCodePoints,
  parseBytes,
  parseCodePoints,
  utf16Bytes,
  utf16Units,
  utf8Bytes,
} from "./encoding.ts";

const euc = new TextDecoder("euc-kr", { fatal: true });
const table = buildEucKrTable(euc);
const cp = (s: string) => s.codePointAt(0)!;

test("'가'의 코드", () => {
  assert.equal(formatCodePoint(cp("가")), "U+AC00");
  assert.deepEqual(utf8Bytes(cp("가")), [0xea, 0xb0, 0x80]);
  assert.deepEqual(utf16Units(cp("가")), [0xac00]);
  assert.deepEqual(utf16Bytes(cp("가")), [0xac, 0x00]);
  assert.deepEqual(eucKrBytes(cp("가"), table), [0xb0, 0xa1]);
  assert.equal(asciiBytes(cp("가")), null);
});

test("'A'는 모든 인코딩에서 41", () => {
  for (const bytes of [utf8Bytes(0x41), asciiBytes(0x41), eucKrBytes(0x41, table)]) {
    assert.deepEqual(bytes, [0x41]);
  }
  assert.deepEqual(utf16Bytes(0x41), [0x00, 0x41]);
});

test("이모지는 UTF-8 4바이트, UTF-16 서로게이트 쌍", () => {
  assert.deepEqual(utf8Bytes(cp("😀")), [0xf0, 0x9f, 0x98, 0x80]);
  assert.deepEqual(utf16Units(cp("😀")), [0xd83d, 0xde00]);
  assert.deepEqual(utf16Bytes(cp("😀")), [0xd8, 0x3d, 0xde, 0x00]);
  assert.equal(eucKrBytes(cp("😀"), table), null);
});

test("KS X 1001에 없는 한글은 EUC-KR 없음", () => {
  assert.equal(eucKrBytes(cp("똠"), table), null);
});

test("codePoints는 서로게이트 쌍을 한 글자로, 국기는 두 코드포인트로 센다", () => {
  assert.deepEqual(codePoints("가😀"), [0xac00, 0x1f600]);
  assert.equal(codePoints("🇰🇷").length, 2);
  assert.deepEqual(codePoints(""), []);
});

test("displayChar는 공백·줄바꿈·제어 문자를 보이게 바꾼다", () => {
  assert.equal(displayChar(0x20), "␣");
  assert.equal(displayChar(0x0a), "↵");
  assert.equal(displayChar(0x09), "U+0009");
  assert.equal(displayChar(0xac00), "가");
});

test("formatBytes·formatUnits16 진법", () => {
  assert.equal(formatBytes([0xea, 0x0a], 16), "EA 0A");
  assert.equal(formatBytes([0xea, 0x0a], 10), "234 10");
  assert.equal(formatBytes([0xea, 0x0a], 2), "11101010 00001010");
  assert.equal(formatUnits16([0xd83d, 0xde00], 16), "D83D DE00");
  assert.equal(formatUnits16([0x41], 2), "0000000001000001");
});

test("parseBytes는 여러 16진수 표기를 같은 바이트로 읽는다", () => {
  for (const input of ["EA B0 80", "EAB080", "0xEA,0xB0,0x80", "\\xEA\\xB0\\x80", "ea,B0 0x80"]) {
    assert.deepEqual(parseBytes(input), { values: [0xea, 0xb0, 0x80], error: null }, input);
  }
  assert.deepEqual(parseBytes("   "), { values: [], error: null });
});

test("parseBytes 10진수·2진수", () => {
  assert.deepEqual(parseBytes("234 176 128", 10).values, [0xea, 0xb0, 0x80]);
  assert.deepEqual(parseBytes("1110101010110000", 2).values, [0xea, 0xb0]);
});

test("parseBytes 오류는 몇 번째 값인지 알려 주고 앞부분은 남긴다", () => {
  const bad = parseBytes("EA GZ");
  assert.deepEqual(bad.values, [0xea]);
  assert.match(bad.error!, /2번째/);
  assert.match(parseBytes("EAB").error!, /배수/);
  assert.match(parseBytes("300", 10).error!, /0~255/);
});

test("코드포인트 표기 4종과 서로게이트 결합", () => {
  for (const input of ["U+AC00", "\\uAC00", "&#xAC00;", "&#44032;", "\\u{AC00}"]) {
    assert.deepEqual(parseCodePoints(input), { values: [0xac00], error: null }, input);
  }
  assert.deepEqual(parseCodePoints("U+AC00 U+0041").values, [0xac00, 0x41]);
  assert.deepEqual(parseCodePoints("\\uD83D\\uDE00").values, [0x1f600]);
});

test("코드포인트 오류: 짝 없는 서로게이트, 범위 초과, 읽을 수 없는 부분", () => {
  assert.match(parseCodePoints("\\uD83D").error!, /서로게이트/);
  assert.match(parseCodePoints("U+110000").error!, /범위/);
  const tail = parseCodePoints("U+AC00 zz");
  assert.deepEqual(tail.values, [0xac00]);
  assert.match(tail.error!, /zz/);
});

test("looksLikeCodePoints", () => {
  assert.equal(looksLikeCodePoints("U+AC00"), true);
  assert.equal(looksLikeCodePoints("&#44032;"), true);
  assert.equal(looksLikeCodePoints("EA B0 80"), false);
});

test("decodeBytes UTF-8", () => {
  assert.deepEqual(decodeBytes([0xea, 0xb0, 0x80, 0x41], "utf-8"), { text: "가A", error: null });
  assert.match(decodeBytes([0xea, 0xb0], "utf-8").error!, /더 필요/);
  const mid = decodeBytes([0x41, 0xea, 0x41, 0x80], "utf-8");
  assert.equal(mid.text, "A");
  assert.match(mid.error!, /3번째/);
  assert.ok(decodeBytes([0xc0, 0x80], "utf-8").error);
});

test("decodeBytes UTF-16·EUC-KR·ASCII", () => {
  assert.deepEqual(decodeBytes([0xac, 0x00, 0xd8, 0x3d, 0xde, 0x00], "utf-16be"), {
    text: "가😀",
    error: null,
  });
  assert.match(decodeBytes([0xac], "utf-16be").error!, /홀수/);
  assert.match(decodeBytes([0xd8, 0x3d], "utf-16be").error!, /서로게이트/);
  assert.deepEqual(decodeBytes([0xb0, 0xa1, 0x41], "euc-kr", euc), { text: "가A", error: null });
  assert.ok(decodeBytes([0xb0, 0xa1], "euc-kr", null).error);
  const ascii = decodeBytes([0x41, 0x80], "ascii");
  assert.equal(ascii.text, "A");
  assert.match(ascii.error!, /2번째/);
});

test("parseBytesSpans: 바이트마다 입력에서의 위치", () => {
  assert.deepEqual(parseBytesSpans("EA B0 80").spans, [[0, 2], [3, 5], [6, 8]]);
  assert.deepEqual(parseBytesSpans("EAB080").spans, [[0, 2], [2, 4], [4, 6]]);
  const ox = parseBytesSpans("0xEA,0xB0");
  assert.deepEqual(ox.values, [0xea, 0xb0]);
  assert.deepEqual(ox.spans, [[2, 4], [7, 9]]);
  assert.deepEqual(parseBytesSpans("\\xEA\\xB0").spans, [[2, 4], [6, 8]]);
  assert.deepEqual(parseBytesSpans("234 176", 10).spans, [[0, 3], [4, 7]]);
});

test("parseCodePointSpans: 코드마다 위치, 서로게이트 쌍은 한 범위로", () => {
  assert.deepEqual(parseCodePointSpans("U+AC00 U+0041").spans, [[0, 6], [7, 13]]);
  const pair = parseCodePointSpans("\\uD83D\\uDE00");
  assert.deepEqual(pair.values, [0x1f600]);
  assert.deepEqual(pair.spans, [[0, 12]]);
});

test("charByteLengths: 인코딩별 문자당 바이트 수", () => {
  assert.deepEqual(charByteLengths("가A😀", "utf-8"), [3, 1, 4]);
  assert.deepEqual(charByteLengths("가A😀", "utf-16be"), [2, 2, 4]);
  assert.deepEqual(charByteLengths("가A", "euc-kr"), [2, 1]);
  assert.deepEqual(charByteLengths("AB", "ascii"), [1, 1]);
});

test("textSpans: 코드포인트마다 원문(UTF-16) 위치", () => {
  assert.deepEqual(textSpans("가😀A"), [[0, 1], [1, 3], [3, 4]]);
});

test("pickRange: 선택 범위와 겹치는 항목, 커서만 있으면 그 자리 항목", () => {
  const spans: [number, number][] = [[0, 2], [3, 5], [6, 8]];
  assert.deepEqual(pickRange(spans, 4, 4), [1, 2]);
  assert.deepEqual(pickRange(spans, 0, 8), [0, 3]);
  assert.deepEqual(pickRange(spans, 1, 4), [0, 2]);
  assert.equal(pickRange(spans, 2, 3), null);
  assert.deepEqual(pickRange(spans, 2, 2), [0, 1]);
  assert.equal(pickRange([], 0, 0), null);
});

test("byteRangeToChars·charsToByteRange: 바이트와 문자 대응", () => {
  const lens = [3, 1, 4]; // 가 A 😀 (UTF-8)
  assert.deepEqual(byteRangeToChars(lens, 0, 1), [0, 1]);
  assert.deepEqual(byteRangeToChars(lens, 3, 5), [1, 3]);
  assert.equal(byteRangeToChars(lens, 8, 9), null);
  assert.deepEqual(charsToByteRange(lens, 1, 3), [3, 8]);
});
