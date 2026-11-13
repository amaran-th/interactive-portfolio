import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultShow, addProp, updateProp, removeEntity, updateLevel, updateActor } from "./show.ts";
import { diffShow, createStore } from "./store.ts";

test("변화 없으면 빈 diff", () => {
  const s = defaultShow();
  const d = diffShow(s, s);
  assert.equal(d.stage, false);
  assert.deepEqual(d.fixtures, { added: [], changed: [], removed: [] });
  assert.deepEqual(d.levels, []);
  assert.equal(d.shadowsDirty, false);
});
test("소품 추가·변경·삭제 id", () => {
  const a = addProp(defaultShow(), "chair");
  const id = a.props[0].id;
  assert.deepEqual(diffShow(defaultShow(), a).props.added.length, 1);
  assert.deepEqual(diffShow(a, updateProp(a, id, { color: "#ff0000" })).props.changed, [id]);
  assert.deepEqual(diffShow(a, removeEntity(a, id)).props.removed, [id]);
});
test("밝기만 바뀌면 shadowsDirty false, 조준 바뀌면 true", () => {
  const s = defaultShow(); const id = s.fixtures[0].id;
  const b = diffShow(s, updateLevel(s, id, { intensity: 0.3 }));
  assert.deepEqual(b.levels, [id]); assert.equal(b.shadowsDirty, false);
  assert.equal(diffShow(s, updateLevel(s, id, { target: { x: 3, y: 0, z: -2 } })).shadowsDirty, true);
});
test("인물 이동은 shadowsDirty", () => {
  const s = defaultShow();
  assert.equal(diffShow(s, updateActor(s, s.actors[0].id, { position: { x: 1, y: 0, z: -2 } })).shadowsDirty, true);
});
test("store: commit/undo/redo", () => {
  const st = createStore(defaultShow());
  const s0 = st.get();
  st.commit(addProp(s0, "box"));
  assert.equal(st.get().props.length, 1);
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
test("store: 같은 참조 set은 알리지 않는다", () => {
  const st = createStore(defaultShow()); let calls = 0;
  st.subscribe(() => calls++); st.set(st.get());
  assert.equal(calls, 0);
});
test("store: 변화 없는 checkpoint는 쌓이지 않는다", () => {
  const st = createStore(defaultShow());
  st.checkpoint(); st.checkpoint();
  assert.equal(st.canUndo(), false);
});
