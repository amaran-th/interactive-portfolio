// 올라서기와 겹침 보정(순수). node:test가 그대로 실행하도록 타입만 import한다.
// - surfaceAt: 한 점 아래 소품 윗면 중 가장 높은 곳. 끄는 동안 인물·소품의 y가 된다.
// - resolveOverlap: 놓을 때 같은 높이층에서 겹친 원끼리 밀어낸다.
import type { Pose, Prop, PropKind, Show } from "./show";

export type Body = { id: string; x: number; z: number; y: number; r: number; kind: PropKind | "actor"; sitting: boolean };
export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

export const ACTOR_RADIUS = 0.3;
const LAYER = 0.3; // 이만큼 높이가 다르면 다른 층(단 위와 바닥)
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
      r: Math.hypot(p.scale.x, p.scale.z) / 2,
      kind: p.kind,
      sitting: false,
    })),
    ...show.actors.map((a) => ({
      id: a.id,
      x: a.position.x,
      z: a.position.z,
      y: a.position.y,
      r: ACTOR_RADIUS,
      kind: "actor" as const,
      sitting: isSitting(a.pose),
    })),
  ];
}

const ignores = (a: Body, b: Body) => (a.sitting && b.kind === "chair") || (b.sitting && a.kind === "chair");

/**
 * id를 pos에 놓을 때 같은 층에서 겹치는 원을 피해 가장 가까운 빈자리로 민다.
 * 8번 밀어도 겹치면 원래 자리를 돌려준다. 결과는 bounds 안으로 자른다.
 * bodies의 id 항목은 놓을 높이(y)를 담고 있어야 한다(층 판정에 쓴다).
 */
export function resolveOverlap(bodies: Body[], id: string, pos: { x: number; z: number }, bounds: Bounds): { x: number; z: number } {
  const self = bodies.find((b) => b.id === id) ?? { id, x: pos.x, z: pos.z, y: 0, r: ACTOR_RADIUS, kind: "actor" as const, sitting: false };
  const others = bodies.filter((b) => b.id !== id && Math.abs(b.y - self.y) < LAYER && !ignores(self, b));
  const clampB = (p: { x: number; z: number }) => ({
    x: Math.min(bounds.maxX, Math.max(bounds.minX, p.x)),
    z: Math.min(bounds.maxZ, Math.max(bounds.minZ, p.z)),
  });
  let p = { ...pos };
  for (let i = 0; i <= ITERATIONS; i++) {
    let px = 0;
    let pz = 0;
    let hit = false;
    for (const o of others) {
      const dx = p.x - o.x;
      const dz = p.z - o.z;
      const d = Math.hypot(dx, dz);
      const need = self.r + o.r;
      if (d >= need - EPS) continue;
      hit = true;
      const [nx, nz] = d > EPS ? [dx / d, dz / d] : [1, 0];
      px += nx * (need - d + EPS * 10);
      pz += nz * (need - d + EPS * 10);
    }
    if (!hit) return p;
    if (i === ITERATIONS) break;
    p = clampB({ x: p.x + px, z: p.z + pz });
  }
  return pos;
}
