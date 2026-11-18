import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultShow, hangPoint, hangRange, setLineOffset } from "./show.ts";
import { deckOutline, dragLineOnMap, fixtureMapPoint, hangFromMap, lineMapSegment, mapBounds } from "./show.ts";

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test("바닥 모양: 프로시니엄·돌출은 사각형, 원형은 원", () => {
  const s = defaultShow().stage;
  assert.deepEqual(deckOutline(s), { kind: "rects", rects: [{ x: -5, z: -8, w: 10, h: 8 }] });
  assert.deepEqual(deckOutline({ ...s, shape: "thrust" }).kind, "rects");
  assert.equal((deckOutline({ ...s, shape: "thrust" }) as { rects: unknown[] }).rects.length, 2);
  assert.deepEqual(deckOutline({ ...s, shape: "round" }), { kind: "circle", cx: 0, cz: -4, r: 4 });
});

test("가로 라인은 위에서 본 그대로, 붐은 높이를 앞뒤 막대로 펼친다", () => {
  const s = defaultShow().stage;
  const [a, b] = lineMapSegment(s, "e1");
  const [lo, hi] = hangRange(s, "e1");
  assert.deepEqual(a, { x: lo, z: hangPoint(s, "e1", lo).z });
  assert.deepEqual(b, { x: hi, z: hangPoint(s, "e1", hi).z });
  const [ba, bb] = lineMapSegment(s, "boomL");
  near(ba.x, hangPoint(s, "boomL", 0).x);
  near(ba.x, bb.x);
  assert.ok(ba.z > bb.z, "붐 꼭대기가 무대 안쪽(위)으로");
  const p = fixtureMapPoint(s, "boomL", hangRange(s, "boomL")[1]);
  near(p.z, bb.z);
});

test("평면도 위치 → 라인과 라인 위 자리(왕복), 지금 라인은 조금 더 붙잡는다", () => {
  const s = defaultShow().stage;
  for (const [hang, along] of [["e2", 1.5], ["foh", -3], ["boomR", 2]] as const) {
    const got = hangFromMap(s, fixtureMapPoint(s, hang, along), null);
    assert.equal(got.hang, hang);
    near(got.along, along);
  }
  // e1과 e2 사이 정확히 가운데: 지금 라인을 유지
  const z = (hangPoint(s, "e1", 0).z + hangPoint(s, "e2", 0).z) / 2;
  assert.equal(hangFromMap(s, { x: 0, z }, "e2").hang, "e2");
  assert.equal(hangFromMap(s, { x: 0, z }, "e1").hang, "e1");
});

test("라인 끌기: 가로 라인은 앞뒤만, 붐은 바깥으로 끌면 무대에서 멀어진다", () => {
  const s = defaultShow().stage;
  assert.deepEqual(dragLineOnMap("e1", { dz: 0.5, dy: 1 }, 3, -1), { dz: -0.5, dy: 1 });
  assert.deepEqual(dragLineOnMap("boomL", { dz: 0, dy: 0 }, -1, 2), { dz: 2, dy: 1 });
  assert.deepEqual(dragLineOnMap("boomR", { dz: 0, dy: 0 }, -1, 0), { dz: 0, dy: -1 });
  const moved = setLineOffset(defaultShow(), "e1", dragLineOnMap("e1", s.rig.e1, 0, 1.5)).stage;
  near(lineMapSegment(moved, "e1")[0].z, lineMapSegment(s, "e1")[0].z + 1.5);
});

test("평면도 범위는 무대·라인·인물·조준점을 모두 담는다", () => {
  const show = defaultShow();
  const b = mapBounds(show);
  const pts = [
    ...(["foh", "e3", "boomL", "boomR", "floor"] as const).flatMap((h) => lineMapSegment(show.stage, h)),
    ...show.actors.map((a) => a.position),
    { x: -5, z: -8 },
    { x: 5, z: 0 },
  ];
  for (const p of pts) assert.ok(p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ, JSON.stringify(p));
  const far = { ...show, actors: [{ ...show.actors[0], position: { x: 9, y: 0, z: 6 } }] };
  assert.ok(mapBounds(far).maxX > 9 && mapBounds(far).maxZ > 6);
});
