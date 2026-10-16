import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIES,
  TOOLS,
  activeCategories,
  getCategory,
  normalizeQuery,
  searchTools,
  toolsIn,
} from "./tools.ts";

const slugs = (tools: { slug: string }[]) => tools.map((t) => t.slug);

test("모든 도구의 카테고리가 CATEGORIES에 있고 slug가 겹치지 않는다", () => {
  const ids = new Set(CATEGORIES.map((c) => c.id));
  for (const t of TOOLS) assert.ok(ids.has(t.category), t.slug);
  assert.equal(new Set(slugs(TOOLS)).size, TOOLS.length);
});

test("activeCategories는 도구가 있는 카테고리만 순서대로 돌려준다", () => {
  assert.deepEqual(
    activeCategories().map((c) => c.id),
    ["life", "creative", "game"],
  );
});

test("toolsIn은 카테고리의 도구를 TOOLS 순서로 돌려준다", () => {
  assert.deepEqual(slugs(toolsIn("game")), ["knit-muffler", "stellar-forge"]);
  assert.deepEqual(slugs(toolsIn("life")), ["yearly-receipt", "asset-simulator"]);
  assert.deepEqual(slugs(toolsIn("creative")), ["visual-novel-studio", "nemo-nemo-beam"]);
  assert.deepEqual(toolsIn("text"), []);
});

test("getCategory는 없는 id에 undefined", () => {
  assert.equal(getCategory("game")?.label, "게임");
  assert.equal(getCategory("unknown"), undefined);
});

test("normalizeQuery는 소문자로 바꾸고 공백을 지운다", () => {
  assert.equal(normalizeQuery("  P N g "), "png");
  assert.equal(normalizeQuery("   "), "");
});

test("빈 검색어·공백만 있는 검색어는 전체를 돌려준다", () => {
  assert.deepEqual(slugs(searchTools("")), slugs(TOOLS));
  assert.deepEqual(slugs(searchTools("   ")), slugs(TOOLS));
});

test("제목·설명·태그·카테고리 이름으로 찾는다", () => {
  assert.deepEqual(slugs(searchTools("픽셀")), ["nemo-nemo-beam"]);
  assert.deepEqual(slugs(searchTools("게임")), ["knit-muffler", "stellar-forge"]);
  assert.deepEqual(slugs(searchTools("뜨개 뜨개")), ["knit-muffler"]);
  assert.deepEqual(slugs(searchTools("png")), ["nemo-nemo-beam"]);
  assert.deepEqual(slugs(searchTools("재테크")), ["asset-simulator"]);
});

test("맞는 도구가 없거나 특수문자만 있으면 빈 배열, 예외 없음", () => {
  assert.deepEqual(searchTools("없는단어xyz"), []);
  assert.deepEqual(searchTools("("), []);
  assert.deepEqual(searchTools(".*"), []);
});
