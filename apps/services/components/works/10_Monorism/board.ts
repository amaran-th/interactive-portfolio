// 모노리즘 판 상태와 편집 기록. 칸 번호는 row * w + col.
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

export const EMPTY = 0;
export const FRONT = 1;
export const BACK = 2;
export const SIZES = [24, 40, 64] as const;
export const MAX_HISTORY = 100;

export type Tool = "flip" | "remove" | "place";
export type BulkOp = "flipAll" | "fillAll" | "clearAll";
export type Board = { w: number; h: number; cells: Uint8Array };
export type Change = { index: number; before: number; after: number };
export type History = { undo: Change[][]; redo: Change[][] };
export type Stroke = { tool: Tool; touched: Set<number>; changes: Change[] };
export type SavedState = {
  w: number;
  h: number;
  cells: Uint8Array;
  front: string;
  back: string;
  muted: boolean;
};

export function createBoard(w: number, h: number): Board {
  return { w, h, cells: new Uint8Array(w * h).fill(FRONT) };
}

export function applyTool(state: number, tool: Tool): number {
  if (tool === "flip") return state === FRONT ? BACK : state === BACK ? FRONT : EMPTY;
  if (tool === "remove") return EMPTY;
  return state === EMPTY ? FRONT : state;
}

export function beginStroke(tool: Tool): Stroke {
  return { tool, touched: new Set(), changes: [] };
}

// 긋는 동안 칸 하나에 도구를 적용한다. 이미 지나간 칸이거나 바뀌지 않으면 null.
export function strokeApply(board: Board, stroke: Stroke, index: number): Change | null {
  if (stroke.touched.has(index)) return null;
  stroke.touched.add(index);
  const before = board.cells[index];
  const after = applyTool(before, stroke.tool);
  if (before === after) return null;
  board.cells[index] = after;
  const change = { index, before, after };
  stroke.changes.push(change);
  return change;
}

export function bulk(board: Board, op: BulkOp): Change[] {
  const changes: Change[] = [];
  for (let index = 0; index < board.cells.length; index++) {
    const before = board.cells[index];
    const after =
      op === "flipAll"
        ? applyTool(before, "flip")
        : op === "fillAll"
          ? applyTool(before, "place")
          : EMPTY;
    if (before === after) continue;
    board.cells[index] = after;
    changes.push({ index, before, after });
  }
  return changes;
}

export function createHistory(): History {
  return { undo: [], redo: [] };
}

export function commit(history: History, changes: Change[]): void {
  if (changes.length === 0) return;
  history.undo.push(changes);
  if (history.undo.length > MAX_HISTORY) history.undo.shift();
  history.redo = [];
}

export function undo(board: Board, history: History): Change[] | null {
  const step = history.undo.pop();
  if (!step) return null;
  const applied: Change[] = [];
  for (let i = step.length - 1; i >= 0; i--) {
    const c = step[i];
    board.cells[c.index] = c.before;
    applied.push({ index: c.index, before: c.after, after: c.before });
  }
  history.redo.push(step);
  return applied;
}

export function redo(board: Board, history: History): Change[] | null {
  const step = history.redo.pop();
  if (!step) return null;
  for (const c of step) board.cells[c.index] = c.after;
  history.undo.push(step);
  return step.map((c) => ({ ...c }));
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// 칸 상태를 2비트씩 묶어 base64로 담는다.
export function serialize(s: SavedState): string {
  const n = s.w * s.h;
  const packed = new Uint8Array(Math.ceil(n / 4));
  for (let i = 0; i < n; i++) packed[i >> 2] |= (s.cells[i] & 3) << ((i & 3) * 2);
  let bin = "";
  for (const byte of packed) bin += String.fromCharCode(byte);
  return JSON.stringify({
    v: 1,
    w: s.w,
    h: s.h,
    front: s.front,
    back: s.back,
    cells: btoa(bin),
    muted: s.muted,
  });
}

// 형식이 하나라도 맞지 않으면 null — 호출하는 쪽은 새 판으로 시작한다.
export function deserialize(json: string | null): SavedState | null {
  if (!json) return null;
  try {
    const d = JSON.parse(json);
    if (d?.v !== 1) return null;
    if (!(SIZES as readonly number[]).includes(d.w) || d.h !== d.w) return null;
    if (typeof d.front !== "string" || !HEX_COLOR.test(d.front)) return null;
    if (typeof d.back !== "string" || !HEX_COLOR.test(d.back)) return null;
    if (typeof d.muted !== "boolean" || typeof d.cells !== "string") return null;
    const bin = atob(d.cells);
    const n = d.w * d.h;
    if (bin.length !== Math.ceil(n / 4)) return null;
    const cells = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const v = (bin.charCodeAt(i >> 2) >> ((i & 3) * 2)) & 3;
      if (v > BACK) return null;
      cells[i] = v;
    }
    return { w: d.w, h: d.h, cells, front: d.front, back: d.back, muted: d.muted };
  } catch {
    return null;
  }
}
