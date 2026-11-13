import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultShow, addProp, updateProp, removeEntity, updateLevel, updateActor, updateFocus, updateTemplate } from "./show.ts";
import { diffShow, createStore } from "./store.ts";

test("변화 없으면 빈 diff", () => {
  const s = defaultShow();
  const d = diffShow(s, s);
  assert.equal(d.stage, false);
  assert.equal(d.venue, false);
  assert.deepEqual(d.fixtures, { added: [], changed: [], removed: [] });
  assert.deepEqual(d.levels, []);
  assert.equal(d.shadowsDirty, false);
});
test("소품 추가·변경·삭제 id", () => {
  const a = addProp(defaultShow(), "chair");
  const id = a.props[0].id;
  assert.equal(diffShow(defaultShow(), a).props.added.length, 1);
  assert.deepEqual(diffShow(a, updateProp(a, id, { color: "#ff0000" })).props.changed, [id]);
  assert.deepEqual(diffShow(a, removeEntity(a, id)).props.removed, [id]);
});
test("밝기만 → shadowsDirty false, 포커스 → true", () => {
  const s = defaultShow(); const id = s.fixtures[0].id;
  const b = diffShow(s, updateLevel(s, id, { intensity: 0.3 }));
  assert.deepEqual(b.levels, [id]); assert.equal(b.shadowsDirty, false);
  assert.equal(diffShow(s, updateFocus(s, id, { target: { x: 3, y: 0, z: -2 } })).shadowsDirty, true);
});
test("팔로우 큐 조준 → shadowsDirty", () => {
  const s = defaultShow(); const fol = s.fixtures.find((f) => f.kind === "follow")!;
  assert.equal(diffShow(s, updateLevel(s, fol.id, { target: { x: 2, y: 0, z: -2 } })).shadowsDirty, true);
});
test("객석 템플릿 → venue, 그림자 아님", () => {
  const s = defaultShow();
  const d = diffShow(s, updateTemplate(s, { rows: 6 }));
  assert.equal(d.venue, true); assert.equal(d.shadowsDirty, false);
});
test("인물 이동은 shadowsDirty", () => {
  const s = defaultShow();
  assert.equal(diffShow(s, updateActor(s, s.actors[0].id, { position: { x: 1, y: 0, z: -2 } })).shadowsDirty, true);
});
test("store: commit/undo/redo", () => {
  const st = createStore(defaultShow()); const s0 = st.get();
  st.commit(addProp(s0, "box"));
  assert.equal(st.undo(), true); assert.equal(st.get(), s0);
  assert.equal(st.redo(), true); assert.equal(st.get().props.length, 1);
});
test("store: checkpoint 뒤 여러 set은 한 단계", () => {
  const st = createStore(defaultShow()); const s0 = st.get(); const id = s0.fixtures[0].id;
  st.checkpoint();
  for (const v of [0.1, 0.2, 0.3]) st.set(updateLevel(st.get(), id, { intensity: v }));
  st.undo(); assert.equal(st.get(), s0);
});
test("store: 히스토리 상한", () => {
  const st = createStore(defaultShow(), 3);
  for (let i = 0; i < 5; i++) st.commit(addProp(st.get(), "box"));
  let n = 0; while (st.undo()) n++;
  assert.equal(n, 3);
});
test("store: 같은 참조 set은 알리지 않음, 빈 checkpoint는 쌓이지 않음", () => {
  const st = createStore(defaultShow()); let calls = 0;
  st.subscribe(() => calls++); st.set(st.get());
  assert.equal(calls, 0);
  st.checkpoint(); st.checkpoint();
  assert.equal(st.canUndo(), false);
});

test("잔광 → ambient만, 무대·그림자 아님", async () => {
  const { setAmbient } = await import("./show.ts");
  const s = defaultShow();
  const d = diffShow(s, setAmbient(s, 0.8));
  assert.equal(d.ambient, true);
  assert.equal(d.stage, false);
  assert.equal(d.shadowsDirty, false);
});
