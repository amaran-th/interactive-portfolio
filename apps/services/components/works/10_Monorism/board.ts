// 모노리즘 판 상태와 편집 기록. 칸 번호는 row * w + col.
// node:test가 그대로 실행하도록 다른 모듈을 import하지 않는다.

export const EMPTY = 0;
export const FRONT = 1;
export const BACK = 2;
export const SIZES = [24, 40, 64] as const;
export const MAX_HISTORY = 100;
// 판 바닥 기본 색. 판 색이 없던 예전 저장값도 이 색으로 읽는다.
export const DEFAULT_BASE = "#2b2f38";

// 칩 모양. 배치(벌집)는 그대로이고 칩 윤곽만 바뀐다.
export const CHIP_SHAPES = ["circle", "square", "diamond", "hexagon"] as const;
export type ChipShape = (typeof CHIP_SHAPES)[number];
export const DEFAULT_SHAPE: ChipShape = "circle";

export type Tool = "flip" | "remove" | "place";
export type BulkOp = "flipAll" | "fillAll" | "clearAll";
export type Board = { w: number; h: number; cells: Uint8Array };
export type Change = { index: number; before: number; after: number };
export type History = { undo: Change[][]; redo: Change[][] };
// last: 직전에 도구를 적용한 칸. 다른 칸으로 옮겨 갔다가 돌아오면 다시 적용한다.
export type Stroke = { tool: Tool; last: number; changes: Change[] };
export type SavedState = {
  w: number;
  h: number;
  cells: Uint8Array;
  front: string;
  back: string;
  base: string;
  shape: ChipShape;
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
  return { tool, last: -1, changes: [] };
}

// 긋는 동안 칸 하나에 도구를 적용한다. 아직 직전 칸 안에 있거나 바뀌지 않으면 null.
// 지나간 칸이라도 다른 칸을 거쳐 다시 들어오면 또 적용한다.
export function strokeApply(board: Board, stroke: Stroke, index: number): Change | null {
  if (stroke.last === index) return null;
  stroke.last = index;
  const before = board.cells[index];
  const after = applyTool(before, stroke.tool);
  if (before === after) return null;
  board.cells[index] = after;
  const change = { index, before, after };
  stroke.changes.push(change);
  return change;
}

// 경로가 끊겼을 때(판 밖으로 나감) 부른다 — 같은 칸으로 돌아와도 새로 들어온 것으로 본다.
export function strokeBreak(stroke: Stroke): void {
  stroke.last = -1;
}

// 한 단계 안에서 같은 칸이 여러 번 바뀌었으면 처음 before → 마지막 after 하나로 줄인다.
// 결국 그대로인 칸은 뺀다. 화면 애니메이션용.
export function netChanges(changes: Change[]): Change[] {
  const net = new Map<number, Change>();
  for (const c of changes) {
    const prev = net.get(c.index);
    net.set(c.index, { index: c.index, before: prev ? prev.before : c.before, after: c.after });
  }
  return [...net.values()].filter((c) => c.before !== c.after);
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
  return netChanges(applied);
}

export function redo(board: Board, history: History): Change[] | null {
  const step = history.redo.pop();
  if (!step) return null;
  for (const c of step) board.cells[c.index] = c.after;
  history.undo.push(step);
  return netChanges(step);
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
    base: s.base,
    shape: s.shape,
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
    const base = d.base === undefined ? DEFAULT_BASE : d.base;
    if (typeof base !== "string" || !HEX_COLOR.test(base)) return null;
    // 모양이 없던 예전 저장값은 원으로 읽는다
    const shape = d.shape === undefined ? DEFAULT_SHAPE : d.shape;
    if (!(CHIP_SHAPES as readonly unknown[]).includes(shape)) return null;
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
    return { w: d.w, h: d.h, cells, front: d.front, back: d.back, base, shape, muted: d.muted };
  } catch {
    return null;
  }
}

// 우클릭 획의 도구. 처음 누른 칸에 칩이 있으면 그 획 내내 빼고, 비어 있으면 놓는다.
export function toggleTool(state: number): Tool {
  return state === EMPTY ? "place" : "remove";
}
