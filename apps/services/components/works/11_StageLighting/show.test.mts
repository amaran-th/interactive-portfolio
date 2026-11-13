import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultShow, addFixture, addProp, removeEntity, saveCue, updateStage, updateActor, updateCue,
  updateLevel, updateFocus, updateFixture, setChannel, hangPoint, resolve,
  serialize, deserialize, LIMITS, GELS,
} from "./show.ts";

const STAGE = { shape: "proscenium", width: 10, depth: 8, height: 6, floorColor: "#000000", backdropColor: "#000000" } as const;

test("기본 공연 v2", () => {
  const s = defaultShow();
  assert.equal(s.version, 2);
  assert.deepEqual(s.fixtures.map((f) => f.channel), [1, 2, 3, 4, 5, 6, 7, 8]);
  const kinds = new Set(s.fixtures.map((f) => f.kind));
  for (const k of ["profile", "fresnel", "par", "cyc", "follow"]) assert.ok(kinds.has(k as never), k);
  assert.equal(s.venue.blocks.length, 3);
  assert.equal(s.cues.length, 2);
  assert.equal(s.live.haze, 0.4);
  assert.equal(GELS.length, 14);
});

test("채널: 비어 있는 가장 작은 번호", () => {
  let s = defaultShow();
  const ch3 = s.fixtures.find((f) => f.channel === 3)!;
  s = removeEntity(s, ch3.id);
  s = addFixture(s, "par");
  assert.equal(s.fixtures.at(-1)!.channel, 3);
});

test("setChannel: 중복·범위 밖은 그대로", () => {
  const s = defaultShow();
  const id = s.fixtures[0].id;
  assert.equal(setChannel(s, id, 2), s);
  assert.equal(setChannel(s, id, 0), s);
  assert.equal(setChannel(s, id, 100), s);
  assert.equal(setChannel(s, id, 42).fixtures[0].channel, 42);
});

test("조명기 상한 24", () => {
  let s = defaultShow();
  for (let i = 0; i < 30; i++) s = addFixture(s, "par");
  assert.equal(s.fixtures.length, LIMITS.fixtures);
  assert.equal(addFixture(s, "par"), s);
});

test("hangPoint 좌표", () => {
  assert.deepEqual(hangPoint(STAGE, "e2", 1), { x: 1, y: 6, z: -4 });
  const foh = hangPoint(STAGE, "foh", 0);
  assert.equal(foh.z, 4);
  assert.equal(foh.y, 7);
  const boom = hangPoint(STAGE, "boomL", 2);
  assert.equal(boom.x, -5.8);
  assert.equal(boom.y, 2);
  assert.equal(hangPoint(STAGE, "e1", 20).x, 6);
});

test("무대 폭을 줄이면 조명기가 걸 위치 끝으로 붙는다", () => {
  let s = addFixture(defaultShow(), "fresnel");
  const id = s.fixtures.at(-1)!.id;
  s = updateFixture(s, id, { hang: "e1", along: 4.5 });
  s = updateStage(s, { width: 6 });
  const f = s.fixtures.find((x) => x.id === id)!;
  assert.equal(resolve(s.stage, f, s.live.levels[id]).position.x, 4);
});

test("resolve: 큐 값은 종류별로 허용된 것만", () => {
  let s = defaultShow();
  const prof = s.fixtures.find((f) => f.kind === "profile")!;
  const r1 = resolve(s.stage, prof, { intensity: 1, color: "#ff0000" });
  assert.equal(r1.color, prof.focus.gel);
  assert.equal(r1.intensity, 1);

  s = addFixture(s, "ledpar");
  const led = s.fixtures.at(-1)!;
  assert.equal(resolve(s.stage, led, { intensity: 1, color: "#00ff00" }).color, "#00ff00");

  const fol = s.fixtures.find((f) => f.kind === "follow")!;
  const r3 = resolve(s.stage, fol, { intensity: 1, target: { x: 3, y: 0, z: -2 }, zoom: 1 });
  assert.deepEqual(r3.target, { x: 3, y: 0, z: -2 });
  assert.equal(r3.beamAngle, 20);
});

test("resolve: 손잡이 → 빔 각도·부드러움", () => {
  let s = defaultShow();
  const prof = s.fixtures.find((f) => f.kind === "profile")!;
  s = updateFocus(s, prof.id, { zoom: 0, sharpness: 1 });
  let f = s.fixtures.find((x) => x.id === prof.id)!;
  assert.equal(resolve(s.stage, f, undefined).beamAngle, 15);
  assert.equal(resolve(s.stage, f, undefined).softness, 0.05);
  s = updateFocus(s, prof.id, { zoom: 1 });
  f = s.fixtures.find((x) => x.id === prof.id)!;
  assert.equal(resolve(s.stage, f, undefined).beamAngle, 50);

  const par = s.fixtures.find((x) => x.kind === "par")!;
  s = updateFocus(s, par.id, { lamp: "vnsp" });
  assert.equal(resolve(s.stage, s.fixtures.find((x) => x.id === par.id)!, undefined).beamAngle, 11);
});

test("updateLevel은 허용되지 않은 필드를 남기지 않는다", () => {
  const s = defaultShow();
  const prof = s.fixtures.find((f) => f.kind === "profile")!;
  const next = updateLevel(s, prof.id, { intensity: 0.5, color: "#ff0000" });
  assert.deepEqual(next.live.levels[prof.id], { intensity: 0.5 });
});

test("소품 상한·clamp·큐", () => {
  let s = defaultShow();
  for (let i = 0; i < 45; i++) s = addProp(s, "chair");
  assert.equal(s.props.length, 40);
  s = updateStage(s, { width: 100, depth: 1 });
  assert.deepEqual([s.stage.width, s.stage.depth], [20, 3]);
  s = updateActor(s, s.actors[0].id, { height: 3 });
  assert.equal(s.actors[0].height, 2.1);
  s = updateCue(s, s.cues[0].id, { fadeSec: -2 });
  assert.equal(s.cues[0].fadeSec, 0);
  const n = s.cues.length;
  s = saveCue(s);
  assert.equal(s.cues.length, n + 1);
  assert.notEqual(s.cues.at(-1)!.look.levels, s.live.levels);
});

test("조명기 삭제 시 live와 큐에서 레벨 제거", () => {
  let s = defaultShow();
  const id = s.fixtures[0].id;
  s = removeEntity(s, id);
  assert.equal(id in s.live.levels, false);
  for (const c of s.cues) assert.equal(id in c.look.levels, false);
});

test("직렬화 왕복 v2", () => {
  const s = saveCue(addProp(defaultShow(), "table"));
  const back = deserialize(serialize(s))!;
  assert.equal(back.migrated, false);
  assert.deepEqual(back.show, s);
});

test("줄 수만 있던 v2 객석은 기본 블록으로", () => {
  const s = defaultShow();
  const back = deserialize(JSON.stringify({ ...s, venue: { rows: 8 } }))!;
  assert.equal(back.show.venue.blocks.length, 3);
});

test("깨진 v2는 null", () => {
  assert.equal(deserialize("{"), null);
  assert.equal(deserialize(JSON.stringify({ ...defaultShow(), version: 3 })), null);
  assert.equal(deserialize(JSON.stringify({ ...defaultShow(), fixtures: "x" })), null);
});

const V1 = {
  version: 1,
  stage: { shape: "proscenium", width: 10, depth: 8, height: 6, floorColor: "#3a3a40", backdropColor: "#202028" },
  props: [],
  actors: [],
  fixtures: [{ id: "f1", kind: "profile", name: "앞", position: { x: -2, y: 6, z: 3 }, castShadow: true }],
  cues: [
    { id: "c1", number: 1, name: "A", fadeSec: 3, look: { haze: 0.2, levels: { f1: { intensity: 0.8, color: "#ff8800", target: { x: -1, y: 0, z: -3 }, beamAngle: 26, softness: 0.1 } } } },
    { id: "c2", number: 2, name: "B", fadeSec: 3, look: { haze: 0.2, levels: { f1: { intensity: 0.3, color: "#ff8800", target: { x: -1, y: 0, z: -3 }, beamAngle: 26, softness: 0.1 } } } },
  ],
  live: { haze: 0.2, levels: { f1: { intensity: 0.8, color: "#ff8800", target: { x: -1, y: 0, z: -3 }, beamAngle: 26, softness: 0.1 } } },
};

test("v1 저장본 변환", () => {
  const r = deserialize(JSON.stringify(V1))!;
  assert.equal(r.migrated, true);
  const f = r.show.fixtures[0];
  assert.equal(f.hang, "foh");
  assert.equal(f.channel, 1);
  assert.equal(f.focus.gel, "#ff8800");
  assert.deepEqual(f.focus.target, { x: -1, y: 0, z: -3 });
  assert.deepEqual(r.show.cues[0].look.levels.f1, { intensity: 0.8 });
  assert.deepEqual(r.show.cues[1].look.levels.f1, { intensity: 0.3 });
  const rr = resolve(r.show.stage, f, r.show.live.levels.f1);
  assert.ok(Math.abs(rr.beamAngle - 26) < 0.01);
  assert.ok(Math.abs(rr.softness - 0.1) < 0.01);
  assert.equal(r.show.version, 2);
});
