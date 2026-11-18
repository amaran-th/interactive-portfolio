import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultShow, addFixture, addProp, removeEntity, saveCue, updateStage, updateActor, updateCue,
  updateLevel, updateFocus, updateFixture, setChannel, hangPoint, hangFromRay, resolve,
  serialize, deserialize, LIMITS, GELS, setActorGender, duplicateEntity, updateTemplate,
} from "./show.ts";

// v4 저장본처럼 조명기 위치를 라인 대신 좌표(position)로 바꾼다
function asPosition(f: object, position: { x: number; y: number; z: number }) {
  const o: Record<string, unknown> = { ...f, position };
  delete o.hang;
  delete o.along;
  return o;
}

const STAGE = { shape: "proscenium", width: 10, depth: 8, height: 6, floorColor: "#000000", backdropColor: "#000000" } as const;

test("기본 공연 v5", () => {
  const s = defaultShow();
  assert.equal(s.version, 5);
  assert.deepEqual([s.fixtures[0].hang, s.fixtures[0].along], ["foh", -2]);
  assert.deepEqual(s.fixtures.map((f) => f.channel), [1, 2, 3, 4, 5, 6, 7, 8]);
  const kinds = new Set(s.fixtures.map((f) => f.kind));
  for (const k of ["profile", "fresnel", "par", "cyc", "follow"]) assert.ok(kinds.has(k as never), k);
  assert.equal(s.venue.template.kind, "hall");
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

test("무대 폭을 줄이면 조명기가 라인 끝으로 붙는다", () => {
  let s = addFixture(defaultShow(), "fresnel");
  const id = s.fixtures.at(-1)!.id;
  s = updateFixture(s, id, { hang: "e1", along: 4.5 });
  s = updateStage(s, { width: 6 });
  const f = s.fixtures.find((x) => x.id === id)!;
  assert.equal(resolve(s.stage, f, s.live.levels[id]).position.x, 4);
});

test("새 조명기는 종류별 기본 라인 가운데에 놓이고 겹치면 라인을 따라 1m씩 비킨다", () => {
  let s = { ...defaultShow(), fixtures: [] };
  s = addFixture(s, "profile");
  s = addFixture(s, "profile");
  const [a, b] = s.fixtures.slice(-2);
  assert.deepEqual([a.hang, a.along], ["foh", 0]);
  assert.deepEqual([b.hang, b.along], ["foh", 1]);
});

const down = (x: number, z: number) => ({ origin: { x, y: 30, z }, dir: { x: 0, y: -1, z: 0 } });

test("hangFromRay: 포인터 광선에 가장 가까운 라인과 그 위 위치", () => {
  const e2 = hangPoint(STAGE, "e2", 1.5);
  assert.deepEqual(hangFromRay(STAGE, down(e2.x, e2.z), null), { hang: "e2", along: 1.5 });
  const foh = hangPoint(STAGE, "foh", -2);
  assert.deepEqual(hangFromRay(STAGE, down(foh.x, foh.z), "e1"), { hang: "foh", along: -2 });
  // 라인 범위를 넘으면 끝에 붙는다
  const far = hangFromRay(STAGE, down(40, hangPoint(STAGE, "e1", 0).z), null);
  assert.equal(far.hang, "e1");
  assert.equal(far.along, 6);
});

test("hangFromRay: 두 라인 사이에서는 지금 라인을 조금 더 붙잡는다", () => {
  const z1 = hangPoint(STAGE, "e1", 0).z;
  const z2 = hangPoint(STAGE, "e2", 0).z;
  const mid = (z1 + z2) / 2 + 0.2; // e1 쪽이 살짝 더 가깝다
  assert.equal(hangFromRay(STAGE, down(0, mid), null).hang, "e1");
  assert.equal(hangFromRay(STAGE, down(0, mid), "e2").hang, "e2");
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
  assert.equal(s.actors[0].height, 1.8); // 인물 1은 여자: 1.5–1.8m
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

test("직렬화 왕복", () => {
  const s = saveCue(addProp(defaultShow(), "table"));
  const back = deserialize(serialize(s))!;
  assert.equal(back.migrated, false);
  assert.deepEqual(back.show, s);
});


test("깨진 저장본은 null", () => {
  assert.equal(deserialize("{"), null);
  assert.equal(deserialize(JSON.stringify({ ...defaultShow(), version: 6 })), null);
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
  assert.equal(r.show.version, 5);
});

test("잔광: 기본 0.3, 범위 0–1, 저장본에 없으면 기본값", async () => {
  const { setAmbient } = await import("./show.ts");
  const s = defaultShow();
  assert.equal(s.ambient, 0.3);
  assert.equal(setAmbient(s, 2).ambient, 1);
  assert.equal(setAmbient(s, -1).ambient, 0);
  const noAmbient: Record<string, unknown> = { ...s };
  delete noAmbient.ambient;
  assert.equal(deserialize(JSON.stringify(noAmbient))!.show.ambient, 0.3);
  assert.equal(deserialize(JSON.stringify(setAmbient(s, 0.7)))!.show.ambient, 0.7);
  assert.equal(deserialize(JSON.stringify(V1))!.show.ambient, 0.3);
});

test("v3 인물 기본값", () => {
  const a = defaultShow().actors;
  assert.deepEqual(a.map((x) => x.gender), ["female", "male"]);
  for (const x of a) {
    assert.ok(x.topColor && x.bottomColor && x.shoeColor && x.hairColor && x.hair);
    assert.equal(x.position.y, 0);
  }
  assert.equal(a[0].height, 1.6);
  assert.equal(a[1].height, 1.73);
});

test("v2 저장본 → v3: 인물 손실 없음, 객석은 템플릿", () => {
  const s = defaultShow();
  const v2 = {
    ...s,
    version: 2,
    fixtures: s.fixtures.map((f) => ({ ...f, hang: "e1", along: 0 })),
    venue: { blocks: [{ id: "b", name: "가운데", x: 0, z: 2, rotationY: 0, rows: 4, seatsPerRow: 6, rake: 0.25, curve: 0 }] },
    actors: [{ id: "a1", name: "철수", position: { x: 1, y: 0, z: -2 }, rotationY: 0.5, height: 1.95, build: "slim", pose: "sit", clothColor: "#7a2e3a", skinColor: "#d9a88a" }],
  };
  delete (v2 as Record<string, unknown>).ambient;
  const r = deserialize(JSON.stringify(v2))!;
  assert.equal(r.migrated, true);
  assert.equal(r.show.version, 5);
  const a = r.show.actors[0];
  assert.deepEqual([a.id, a.name, a.gender, a.pose, a.build, a.topColor, a.skinColor, a.height], ["a1", "철수", "male", "sit", "slim", "#7a2e3a", "#d9a88a", 1.95]);
  assert.deepEqual(a.position, { x: 1, y: 0, z: -2 });
  assert.equal(r.show.venue.template.kind, "hall");
});

test("성별 바꾸면 키 범위를 맞춘다", () => {
  let s = defaultShow();
  const id = s.actors[1].id; // 남 1.73
  s = updateActor(s, id, { height: 1.9 });
  s = setActorGender(s, id, "female");
  assert.equal(s.actors[1].gender, "female");
  assert.equal(s.actors[1].height, 1.8);
  s = updateActor(s, id, { height: 1.4 });
  assert.equal(s.actors[1].height, 1.5);
  s = setActorGender(s, id, "male");
  assert.equal(s.actors[1].height, 1.6);
});

test("복제: 새 id, 0.5m 옆, 조명기는 새 채널", () => {
  let s = defaultShow();
  const a = s.actors[0];
  s = duplicateEntity(s, a.id);
  const d = s.actors.at(-1)!;
  assert.notEqual(d.id, a.id);
  assert.equal(d.position.x, a.position.x + 0.5);
  assert.equal(d.name, `${a.name} 복사`);
  const f = s.fixtures[0];
  s = duplicateEntity(s, f.id);
  const df = s.fixtures.at(-1)!;
  assert.notEqual(df.channel, f.channel);
  assert.equal(df.along, f.along + 0.5);
  assert.deepEqual(s.live.levels[df.id], s.live.levels[f.id]);
  assert.equal(duplicateEntity(s, "없음"), s);
});

test("템플릿 수치 범위와 무대 형태 전환", () => {
  let s = defaultShow();
  s = updateTemplate(s, { rows: 99, width: 1, aisle: 9, rake: -1, gap: 0, widen: 3, balconyRows: 50 });
  const t = s.venue.template;
  assert.deepEqual([t.rows, t.width, t.aisle, t.rake, t.gap, t.widen, t.balconyRows], [25, 6, 2, 0.1, 1, 1, 10]);
  s = updateStage(s, { shape: "round" });
  assert.equal(s.venue.template.kind, "arena");
  s = updateTemplate(s, { kind: "studio" });
  assert.equal(s.venue.template.kind, "arena"); // 원형 무대에는 원형 객석만
  s = updateStage(s, { shape: "proscenium" });
  assert.equal(s.venue.template.kind, "hall");
  s = updateTemplate(s, { kind: "grand" });
  s = updateStage(s, { width: 12 });
  assert.equal(s.venue.template.kind, "grand");
});

test("v3 저장본은 라인 그대로, v4(자유 위치) 저장본은 가장 가까운 라인으로", () => {
  const s = defaultShow();
  const v3 = { ...s, version: 3, fixtures: s.fixtures.map((f, i) => (i === 0 ? { ...f, hang: "e2", along: 1 } : f)) };
  const r3 = deserialize(JSON.stringify(v3))!;
  assert.equal(r3.migrated, true);
  assert.equal(r3.show.version, 5);
  assert.deepEqual([r3.show.fixtures[0].hang, r3.show.fixtures[0].along], ["e2", 1]);
  const v4 = {
    ...s,
    version: 4,
    fixtures: s.fixtures.map((f, i) => asPosition(f, i === 0 ? hangPoint(s.stage, "e3", -2) : hangPoint(s.stage, f.hang, f.along))),
  };
  const r4 = deserialize(JSON.stringify(v4))!;
  assert.equal(r4.migrated, true);
  assert.deepEqual([r4.show.fixtures[0].hang, r4.show.fixtures[0].along], ["e3", -2]);
  assert.equal(deserialize(serialize(r4.show))!.migrated, false);
});
