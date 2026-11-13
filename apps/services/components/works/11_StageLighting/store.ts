// 공연 상태를 담는 작은 외부 store, 바뀐 것만 골라내는 diff, 실행 취소 히스토리.
// node:test가 그대로 실행하도록 타입만 import한다.
import type { FixtureLevel, Show } from "./show";

export type Delta = { added: string[]; changed: string[]; removed: string[] };
export type ShowDiff = {
  stage: boolean;
  venue: boolean;
  ambient: boolean;
  props: Delta;
  actors: Delta;
  fixtures: Delta;
  levels: string[];
  haze: boolean;
  shadowsDirty: boolean;
};

function diffList<T extends { id: string }>(prev: T[], next: T[]): Delta {
  const d: Delta = { added: [], changed: [], removed: [] };
  if (prev === next) return d;
  const before = new Map(prev.map((t) => [t.id, t]));
  const ids = new Set<string>();
  for (const t of next) {
    ids.add(t.id);
    const old = before.get(t.id);
    if (!old) d.added.push(t.id);
    else if (old !== t) d.changed.push(t.id);
  }
  for (const t of prev) if (!ids.has(t.id)) d.removed.push(t.id);
  return d;
}

const empty = (d: Delta) => d.added.length + d.changed.length + d.removed.length === 0;

/** 큐 값 중 조준·아이리스(그림자에 영향)가 바뀌었는지. */
function aimDiffers(a: FixtureLevel | undefined, b: FixtureLevel | undefined): boolean {
  if (a?.zoom !== b?.zoom) return true;
  const ta = a?.target;
  const tb = b?.target;
  if (!ta || !tb) return ta !== tb;
  return ta.x !== tb.x || ta.y !== tb.y || ta.z !== tb.z;
}

export function diffShow(prev: Show, next: Show): ShowDiff {
  const props = diffList(prev.props, next.props);
  const actors = diffList(prev.actors, next.actors);
  const fixtures = diffList(prev.fixtures, next.fixtures);
  const stage = prev.stage !== next.stage;
  const levels: string[] = [];
  let aim = false;
  if (prev.live.levels !== next.live.levels) {
    for (const [id, l] of Object.entries(next.live.levels)) {
      const old = prev.live.levels[id];
      if (old !== l) {
        levels.push(id);
        if (aimDiffers(old, l)) aim = true;
      }
    }
  }
  return {
    stage,
    venue: prev.venue !== next.venue,
    ambient: prev.ambient !== next.ambient,
    props,
    actors,
    fixtures,
    levels,
    haze: prev.live.haze !== next.live.haze,
    shadowsDirty: stage || !empty(props) || !empty(actors) || !empty(fixtures) || aim,
  };
}

export type Store = {
  get(): Show;
  set(next: Show): void;
  subscribe(fn: () => void): () => void;
  checkpoint(): void;
  commit(next: Show): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
};

export function createStore(initial: Show, maxHistory = 100): Store {
  let state = initial;
  let past: Show[] = [];
  let future: Show[] = [];
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const fn of listeners) fn();
  };
  const replace = (next: Show) => {
    if (next === state) return;
    state = next;
    emit();
  };
  const store: Store = {
    get: () => state,
    set: replace,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    checkpoint() {
      if (past.at(-1) === state) return;
      past.push(state);
      if (past.length > maxHistory) past = past.slice(past.length - maxHistory);
      future = [];
    },
    commit(next) {
      store.checkpoint();
      replace(next);
    },
    undo() {
      // checkpoint 뒤 아무것도 바뀌지 않았으면 그 기록은 건너뛴다.
      while (past.at(-1) === state) past.pop();
      const prev = past.pop();
      if (!prev) return false;
      future.push(state);
      replace(prev);
      return true;
    },
    redo() {
      const next = future.pop();
      if (!next) return false;
      past.push(state);
      replace(next);
      return true;
    },
    canUndo: () => past.some((s) => s !== state),
    canRedo: () => future.length > 0,
  };
  return store;
}
