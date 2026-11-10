import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BACK,
  EMPTY,
  FRONT,
  MAX_HISTORY,
  applyTool,
  beginStroke,
  bulk,
  commit,
  createBoard,
  createHistory,
  deserialize,
  redo,
  serialize,
  strokeApply,
  undo,
} from "./board.ts";

test("새 판은 모든 칸이 앞면", () => {
  const b = createBoard(3, 2);
  assert.equal(b.cells.length, 6);
  assert.ok(b.cells.every((c) => c === FRONT));
});

test("도구별 상태 전이", () => {
  assert.equal(applyTool(FRONT, "flip"), BACK);
  assert.equal(applyTool(BACK, "flip"), FRONT);
  assert.equal(applyTool(EMPTY, "flip"), EMPTY);
  assert.equal(applyTool(FRONT, "remove"), EMPTY);
  assert.equal(applyTool(BACK, "remove"), EMPTY);
  assert.equal(applyTool(EMPTY, "remove"), EMPTY);
  assert.equal(applyTool(EMPTY, "place"), FRONT);
  assert.equal(applyTool(BACK, "place"), BACK);
});

test("한 번 긋는 동안 같은 칸은 한 번만 바뀐다", () => {
  const b = createBoard(3, 1);
  const s = beginStroke("flip");
  assert.deepEqual(strokeApply(b, s, 0), { index: 0, before: FRONT, after: BACK });
  assert.equal(strokeApply(b, s, 0), null);
  assert.equal(b.cells[0], BACK);
  assert.equal(s.changes.length, 1);
});

test("바뀌지 않는 칸은 변화로 남기지 않는다", () => {
  const b = createBoard(2, 1);
  b.cells[1] = EMPTY;
  const s = beginStroke("flip");
  assert.equal(strokeApply(b, s, 1), null);
  assert.equal(s.changes.length, 0);
});

test("실행 취소·다시 실행", () => {
  const b = createBoard(3, 1);
  const h = createHistory();
  const s = beginStroke("flip");
  strokeApply(b, s, 0);
  strokeApply(b, s, 1);
  commit(h, s.changes);
  const undone = undo(b, h)!;
  assert.deepEqual([...b.cells], [FRONT, FRONT, FRONT]);
  assert.deepEqual(undone.map((c) => [c.index, c.before, c.after]), [
    [1, BACK, FRONT],
    [0, BACK, FRONT],
  ]);
  redo(b, h);
  assert.deepEqual([...b.cells], [BACK, BACK, FRONT]);
  assert.equal(undo(createBoard(1, 1), createHistory()), null);
});

test("새로 기록하면 다시 실행 목록이 비워진다", () => {
  const b = createBoard(2, 1);
  const h = createHistory();
  const s1 = beginStroke("flip");
  strokeApply(b, s1, 0);
  commit(h, s1.changes);
  undo(b, h);
  const s2 = beginStroke("remove");
  strokeApply(b, s2, 1);
  commit(h, s2.changes);
  assert.equal(h.redo.length, 0);
  assert.equal(redo(b, h), null);
});

test("빈 변화는 기록하지 않고, 기록은 최대 MAX_HISTORY단계", () => {
  const h = createHistory();
  commit(h, []);
  assert.equal(h.undo.length, 0);
  for (let i = 0; i < MAX_HISTORY + 5; i++) commit(h, [{ index: 0, before: FRONT, after: BACK }]);
  assert.equal(h.undo.length, MAX_HISTORY);
});

test("전체 뒤집기·모두 채우기·모두 빼기", () => {
  const b = createBoard(3, 1);
  b.cells[1] = BACK;
  b.cells[2] = EMPTY;
  assert.equal(bulk(b, "flipAll").length, 2);
  assert.deepEqual([...b.cells], [BACK, FRONT, EMPTY]);
  assert.deepEqual(bulk(b, "fillAll"), [{ index: 2, before: EMPTY, after: FRONT }]);
  assert.equal(bulk(b, "clearAll").length, 3);
  assert.deepEqual(bulk(b, "clearAll"), []);
});

test("저장 형식 왕복", () => {
  const b = createBoard(24, 24);
  for (let i = 0; i < b.cells.length; i++) b.cells[i] = i % 3;
  const json = serialize({ ...b, front: "#c9ced6", back: "#d8b24a", muted: true });
  const s = deserialize(json)!;
  assert.equal(s.w, 24);
  assert.equal(s.h, 24);
  assert.deepEqual([...s.cells], [...b.cells]);
  assert.equal(s.front, "#c9ced6");
  assert.equal(s.back, "#d8b24a");
  assert.equal(s.muted, true);
});

test("잘못된 저장값은 null", () => {
  const ok = JSON.parse(
    serialize({ ...createBoard(24, 24), front: "#000000", back: "#ffffff", muted: false }),
  );
  const bad = (patch: object) => deserialize(JSON.stringify({ ...ok, ...patch }));
  assert.equal(deserialize(null), null);
  assert.equal(deserialize("not json"), null);
  assert.equal(bad({ v: 2 }), null);
  assert.equal(bad({ w: 30, h: 30 }), null);
  assert.equal(bad({ h: 40 }), null);
  assert.equal(bad({ front: "red" }), null);
  assert.equal(bad({ muted: "no" }), null);
  assert.equal(bad({ cells: ok.cells.slice(0, 8) }), null);
  assert.equal(bad({ cells: "%%%" }), null);
  // 2비트 값 3(존재하지 않는 상태)
  assert.equal(bad({ cells: btoa(String.fromCharCode(0xff).repeat(144)) }), null);
});
