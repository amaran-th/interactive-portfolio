import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultShow, addFixture, addProp, removeEntity, saveCue, updateStage,
  updateActor, updateCue, levelOf, serialize, deserialize, LIMITS } from "./show.ts";

test("기본 공연 형태", () => {
  const s = defaultShow();
  assert.equal(s.stage.shape, "proscenium");
  assert.deepEqual([s.stage.width, s.stage.depth, s.stage.height], [10, 8, 6]);
  assert.equal(s.actors.length, 2);
  assert.equal(s.fixtures.length, 6);
  assert.equal(s.cues.length, 1);
  assert.equal(s.fixtures.filter((f) => f.castShadow).length, 5);
  assert.equal(s.live.haze, 0.4);
  assert.deepEqual(s.cues[0].look, s.live);
});

test("조명기 상한 24에서 추가하지 않는다", () => {
  let s = defaultShow();
  for (let i = 0; i < 30; i++) s = addFixture(s, "par");
  assert.equal(s.fixtures.length, LIMITS.fixtures);
  const same = addFixture(s, "par");
  assert.equal(same, s);
});

test("소품 상한 40", () => {
  let s = defaultShow();
  for (let i = 0; i < 45; i++) s = addProp(s, "chair");
  assert.equal(s.props.length, 40);
});

test("조명기 삭제 시 live와 모든 큐에서 레벨 제거", () => {
  let s = saveCue(defaultShow());
  const id = s.fixtures[0].id;
  s = removeEntity(s, id);
  assert.equal(s.fixtures.some((f) => f.id === id), false);
  assert.equal(id in s.live.levels, false);
  for (const c of s.cues) assert.equal(id in c.look.levels, false);
});

test("새 조명기는 기존 큐에 레벨이 없고 levelOf가 밝기 0을 준다", () => {
  let s = addFixture(defaultShow(), "fresnel");
  const f = s.fixtures.at(-1)!;
  assert.equal(f.id in s.cues[0].look.levels, false);
  assert.equal(levelOf(s.cues[0].look, f).intensity, 0);
});

test("saveCue: 새 큐 번호는 최대+1, 덮어쓰기는 개수 유지", () => {
  let s = saveCue(defaultShow());
  assert.deepEqual(s.cues.map((c) => c.number), [1, 2]);
  const n = s.cues.length;
  s = saveCue(s, s.cues[0].id);
  assert.equal(s.cues.length, n);
});

test("saveCue는 live를 깊은 복사한다", () => {
  const s = saveCue(defaultShow());
  const c = s.cues.at(-1)!;
  assert.notEqual(c.look, s.live);
  assert.notEqual(c.look.levels, s.live.levels);
});

test("clamp: 무대·키·페이드", () => {
  let s = updateStage(defaultShow(), { width: 100, depth: 1, height: 7 });
  assert.deepEqual([s.stage.width, s.stage.depth, s.stage.height], [20, 3, 7]);
  s = updateActor(s, s.actors[0].id, { height: 3 });
  assert.equal(s.actors[0].height, 2.1);
  s = updateCue(s, s.cues[0].id, { fadeSec: -2 });
  assert.equal(s.cues[0].fadeSec, 0);
});

test("직렬화 왕복", () => {
  const s = saveCue(addProp(defaultShow(), "table"));
  assert.deepEqual(deserialize(serialize(s)), s);
});

test("깨진 입력·버전 불일치는 null", () => {
  assert.equal(deserialize("{"), null);
  assert.equal(deserialize("null"), null);
  assert.equal(deserialize(JSON.stringify({ ...defaultShow(), version: 2 })), null);
  assert.equal(deserialize(JSON.stringify({ ...defaultShow(), fixtures: "x" })), null);
});

test("역직렬화는 범위 밖 값을 clamp한다", () => {
  const s = defaultShow();
  const raw = JSON.parse(serialize(s));
  raw.stage.width = 999;
  raw.live.haze = 5;
  const back = deserialize(JSON.stringify(raw))!;
  assert.equal(back.stage.width, 20);
  assert.equal(back.live.haze, 1);
});
