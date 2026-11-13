// 올라서기와 겹침 보정(순수). node:test가 그대로 실행하도록 타입만 import한다.
// - surfaceAt: 한 점 아래 소품 윗면 중 가장 높은 곳. 끄는 동안 인물·소품의 y가 된다.
// - resolveOverlap: 놓을 때 같은 높이층에서 겹친 원끼리 밀어낸다.
import type { Pose, Prop, PropKind, Show } from "./show";

/** 바닥 원(x, z, r)과 높이 구간(y..y+h). */
export type Body = { id: string; x: number; z: number; y: number; h: number; r: number; kind: PropKind | "actor"; sitting: boolean };
export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

export const ACTOR_RADIUS = 0.3;
const TOUCH = 0.05; // 높이 구간이 이만큼 이하로 겹치면 위에 올라선 것으로 본다
const RING_MAX = 2; // 밀어내기가 안 풀리면 이 거리(m)까지 둘레를 찾는다
const ITERATIONS = 8;
const EPS = 1e-6;
const CHAIR_SEAT = 0.535; // 단위 의자 앉는 면 높이(scene/props.ts)
const SITTING: Pose[] = ["sit", "sitTalk"];

export const isSitting = (pose: Pose) => SITTING.includes(pose);

/** 소품 로컬 좌표(-0.5..0.5로 정규화)에서의 윗면 높이. 올라설 수 없으면 null. */
function topAt(kind: PropKind, w: number): number | null {
  switch (kind) {
    case "platform":
    case "box":
    case "table":
      return 1;
    case "chair":
      return CHAIR_SEAT;
    case "stairs": {
      // 세 칸, 앞(+z)이 가장 낮다
      const i = Math.min(2, Math.max(0, Math.floor((0.5 - w) * 3)));
      return (i + 1) / 3;
    }
    default:
      return null; // 기둥·문틀
  }
}

/** (x, z) 아래 소품 윗면 중 가장 높은 값(없으면 0). 소품 회전·크기·놓인 높이를 반영한다. */
export function surfaceAt(props: Prop[], x: number, z: number, ignoreId?: string, opts: { sitting?: boolean } = {}): number {
  let best = 0;
  for (const p of props) {
    if (p.id === ignoreId) continue;
    if (opts.sitting && p.kind === "chair") continue; // 앉는 자세는 의자에 앉는다
    const dx = x - p.position.x;
    const dz = z - p.position.z;
    const c = Math.cos(p.rotationY);
    const s = Math.sin(p.rotationY);
    const u = (dx * c - dz * s) / p.scale.x;
    const w = (dx * s + dz * c) / p.scale.z;
    if (Math.abs(u) > 0.5 || Math.abs(w) > 0.5) continue;
    const top = topAt(p.kind, w);
    if (top === null) continue;
    best = Math.max(best, p.position.y + top * p.scale.y);
  }
  return best;
}

export function bodiesOf(show: Pick<Show, "props" | "actors">): Body[] {
  return [
    ...show.props.map((p) => ({
      id: p.id,
      x: p.position.x,
      z: p.position.z,
      y: p.position.y,
      h: p.scale.y,
      r: Math.hypot(p.scale.x, p.scale.z) / 2,
      kind: p.kind,
      sitting: false,
    })),
    ...show.actors.map((a) => ({
      id: a.id,
      x: a.position.x,
      z: a.position.z,
      y: a.position.y,
      h: a.height,
      r: ACTOR_RADIUS,
      kind: "actor" as const,
      sitting: isSitting(a.pose),
    })),
  ];
}

const ignores = (a: Body, b: Body) => (a.sitting && b.kind === "chair") || (b.sitting && a.kind === "chair");

/**
 * id를 pos에 놓을 때, 높이 구간이 겹치는 원(단 위에 선 인물과 바닥의 단은 겹치지 않음)을 피해 빈자리로 민다.
 * 먼저 겹친 만큼 바깥으로 최대 8번 밀고, 그래도 겹치면 둘레를 넓혀 가며(0.1m씩, 2m까지) 가장 가까운 빈자리를 찾는다.
 * 빈자리가 없으면 원래 자리를 돌려준다. 결과는 bounds 안으로 자른다.
 * bodies의 id 항목은 놓을 높이(y)를 담고 있어야 한다.
 */
export function resolveOverlap(bodies: Body[], id: string, pos: { x: number; z: number }, bounds: Bounds): { x: number; z: number } {
  const self = bodies.find((b) => b.id === id) ?? { id, x: pos.x, z: pos.z, y: 0, h: 1.7, r: ACTOR_RADIUS, kind: "actor" as const, sitting: false };
  const others = bodies.filter(
    (b) => b.id !== id && self.y < b.y + b.h - TOUCH && b.y < self.y + self.h - TOUCH && !ignores(self, b),
  );
  const inside = (p: { x: number; z: number }) =>
    p.x >= bounds.minX && p.x <= bounds.maxX && p.z >= bounds.minZ && p.z <= bounds.maxZ;
  const clampB = (p: { x: number; z: number }) => ({
    x: Math.min(bounds.maxX, Math.max(bounds.minX, p.x)),
    z: Math.min(bounds.maxZ, Math.max(bounds.minZ, p.z)),
  });
  const free = (p: { x: number; z: number }) => others.every((o) => Math.hypot(p.x - o.x, p.z - o.z) >= self.r + o.r - EPS);
  if (free(pos)) return pos;
  let p = { ...pos };
  for (let i = 0; i < ITERATIONS; i++) {
    let px = 0;
    let pz = 0;
    for (const o of others) {
      const dx = p.x - o.x;
      const dz = p.z - o.z;
      const d = Math.hypot(dx, dz);
      const need = self.r + o.r;
      if (d >= need - EPS) continue;
      const [nx, nz] = d > EPS ? [dx / d, dz / d] : [1, 0];
      px += nx * (need - d + EPS * 10);
      pz += nz * (need - d + EPS * 10);
    }
    p = clampB({ x: p.x + px, z: p.z + pz });
    if (free(p)) return p;
  }
  for (let r = 0.1; r <= RING_MAX + 1e-9; r += 0.1) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / 0.1));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 2 * Math.PI;
      const q = { x: pos.x + r * Math.cos(a), z: pos.z + r * Math.sin(a) };
      if (inside(q) && free(q)) return q;
    }
  }
  return pos;
}

type Kind = "prop" | "actor";

function sittingOf(show: Pick<Show, "actors">, type: Kind, id: string): boolean {
  if (type !== "actor") return false;
  const a = show.actors.find((x) => x.id === id);
  return !!a && isSitting(a.pose);
}

/** 끄는 동안의 높이: 그 점 아래 소품 윗면(자기 자신 제외). */
export function dragHeight(show: Pick<Show, "props" | "actors">, type: Kind, id: string, x: number, z: number): number {
  return surfaceAt(show.props, x, z, id, { sitting: sittingOf(show, type, id) });
}

/** 놓을 자리: 놓을 높이층에서 겹침을 보정하고, 옮겨진 자리의 높이를 다시 잰다. */
export function dropAt(
  show: Pick<Show, "props" | "actors">,
  type: Kind,
  id: string,
  pos: { x: number; z: number },
  bounds: Bounds,
): { x: number; y: number; z: number } {
  const y = dragHeight(show, type, id, pos.x, pos.z);
  const bodies = bodiesOf(show).map((b) => (b.id === id ? { ...b, x: pos.x, z: pos.z, y } : b));
  const p = resolveOverlap(bodies, id, pos, bounds);
  return { x: p.x, y: p === pos ? y : dragHeight(show, type, id, p.x, p.z), z: p.z };
}
