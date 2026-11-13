import { test } from "node:test";
import assert from "node:assert/strict";
import { type Body, bodiesOf, resolveOverlap, surfaceAt } from "./placement.ts";
import { defaultShow } from "./show.ts";
import type { Prop, PropKind } from "./show.ts";

const P = (id: string, kind: PropKind, x: number, z: number, sx: number, sy: number, sz: number, rotationY = 0, y = 0): Prop => ({
  id,
  kind,
  position: { x, y, z },
  rotationY,
  scale: { x: sx, y: sy, z: sz },
  color: "#000000",
});
const near = (a: number, b: number, e = 1e-9) => Math.abs(a - b) < e;
const BOUNDS = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };

test("단·상자·탁자 윗면, 밖은 바닥", () => {
  const props = [P("p", "platform", 0, 0, 2, 0.4, 1.5), P("b", "box", 5, 0, 0.6, 0.6, 0.6), P("t", "table", -5, 0, 1.4, 0.75, 0.8)];
  assert.equal(surfaceAt(props, 0.9, 0.7), 0.4);
  assert.equal(surfaceAt(props, 5, 0), 0.6);
  assert.equal(surfaceAt(props, -5, 0), 0.75);
  assert.equal(surfaceAt(props, 1.1, 0), 0);
});

test("올려 둔 소품은 그 높이에서 더한다, 겹치면 높은 쪽", () => {
  const props = [P("p", "platform", 0, 0, 2, 0.4, 2), P("b", "box", 0, 0, 0.6, 0.6, 0.6, 0, 0.4)];
  assert.ok(near(surfaceAt(props, 0, 0), 1.0));
  assert.equal(surfaceAt(props, 0.8, 0), 0.4);
  // 자기 자신은 빼고 계산한다(상자를 끌 때 상자 아래 단 높이)
  assert.equal(surfaceAt(props, 0, 0, "b"), 0.4);
});

test("의자는 앉는 면, 기둥·문틀은 올라서지 않는다", () => {
  const props = [P("c", "chair", 0, 0, 0.5, 0.9, 0.5), P("x", "pillar", 3, 0, 0.5, 3, 0.5), P("d", "doorframe", 6, 0, 1.2, 2.2, 0.2)];
  assert.ok(near(surfaceAt(props, 0, 0), 0.535 * 0.9));
  assert.equal(surfaceAt(props, 3, 0), 0);
  assert.equal(surfaceAt(props, 6, 0), 0);
  // 앉는 자세는 의자를 무시한다(의자에 앉는다)
  assert.equal(surfaceAt(props, 0, 0, undefined, { sitting: true }), 0);
});

test("계단: 앞(+z)이 낮고 뒤가 높은 세 칸", () => {
  const props = [P("s", "stairs", 0, 0, 1.5, 0.6, 1.2)];
  assert.ok(near(surfaceAt(props, 0, 0.5), 0.2));
  assert.ok(near(surfaceAt(props, 0, 0), 0.4));
  assert.ok(near(surfaceAt(props, 0, -0.5), 0.6));
});

test("회전 90°: 계단이 +x를 향하고, 긴 단은 z로 눕는다", () => {
  // rotationY = 90°: 로컬 +z → 월드 +x
  const stairs = [P("s", "stairs", 0, 0, 1.5, 0.6, 1.2, Math.PI / 2)];
  assert.ok(near(surfaceAt(stairs, 0.5, 0), 0.2));
  assert.ok(near(surfaceAt(stairs, -0.5, 0), 0.6));
  const plat = [P("p", "platform", 0, 0, 4, 0.4, 1, Math.PI / 2)];
  assert.equal(surfaceAt(plat, 0, 1.8), 0.4);
  assert.equal(surfaceAt(plat, 1.8, 0), 0);
});

const actor = (id: string, x: number, z: number, y = 0, sitting = false): Body => ({ id, x, z, y, r: 0.3, kind: "actor", sitting });

test("겹치면 겹친 만큼 바깥으로 밀어낸다", () => {
  const bodies = [actor("a", 0, 0), actor("b", 0.2, 0)];
  const p = resolveOverlap(bodies, "b", { x: 0.2, z: 0 }, BOUNDS);
  assert.ok(p.x >= 0.6 - 1e-6 && near(p.z, 0, 1e-6), JSON.stringify(p));
  // 겹치지 않으면 그대로
  assert.deepEqual(resolveOverlap(bodies, "b", { x: 2, z: 0 }, BOUNDS), { x: 2, z: 0 });
});

test("다른 층(|Δy| ≥ 0.3)은 겹쳐도 된다, 앉은 인물과 의자도", () => {
  const bodies = [actor("a", 0, 0, 0.4), actor("b", 0.1, 0)];
  assert.deepEqual(resolveOverlap(bodies, "b", { x: 0.1, z: 0 }, BOUNDS), { x: 0.1, z: 0 });
  const chair: Body = { id: "c", x: 0, z: 0, y: 0, r: Math.hypot(0.5, 0.5) / 2, kind: "chair", sitting: false };
  const sit = actor("s", 0, 0.05, 0, true);
  assert.deepEqual(resolveOverlap([chair, sit], "s", { x: 0, z: 0.05 }, BOUNDS), { x: 0, z: 0.05 });
});

test("정확히 같은 자리면 +x로, 빈자리가 없으면 원래 자리", () => {
  const p = resolveOverlap([actor("a", 0, 0), actor("b", 0, 0)], "b", { x: 0, z: 0 }, BOUNDS);
  assert.ok(Math.hypot(p.x, p.z) >= 0.6 - 1e-6);
  // 촘촘히 둘러싸여 8번 안에 못 빠져나오면 원래 자리
  const ring: Body[] = [];
  for (let i = 0; i < 400; i++) ring.push(actor(`r${i}`, ((i % 20) - 10) * 0.3, (Math.floor(i / 20) - 10) * 0.3));
  ring.push(actor("me", 0, 0));
  assert.deepEqual(resolveOverlap(ring, "me", { x: 0.05, z: 0.05 }, BOUNDS), { x: 0.05, z: 0.05 });
});

test("밀어낸 자리는 무대 범위 안", () => {
  const bodies = [actor("a", 9.9, 0), actor("b", 9.8, 0)];
  const p = resolveOverlap(bodies, "b", { x: 9.8, z: 0 }, BOUNDS);
  assert.ok(p.x <= 10 && p.x >= -10);
  assert.ok(Math.hypot(p.x - 9.9, p.z) >= 0.6 - 1e-6 || (p.x === 9.8 && p.z === 0));
});

test("bodiesOf: 인물 반지름 0.3, 소품은 바닥 대각선/2, 앉은 자세 표시", () => {
  const s = defaultShow();
  const bodies = bodiesOf({ ...s, actors: [{ ...s.actors[0], pose: "sit" }, s.actors[1]], props: [P("t", "table", 0, 0, 1.4, 0.75, 0.8)] });
  const t = bodies.find((b) => b.id === "t")!;
  assert.ok(near(t.r, Math.hypot(1.4, 0.8) / 2));
  const a0 = bodies.find((b) => b.id === s.actors[0].id)!;
  assert.equal(a0.r, 0.3);
  assert.equal(a0.sitting, true);
  assert.equal(bodies.find((b) => b.id === s.actors[1].id)!.sitting, false);
});
