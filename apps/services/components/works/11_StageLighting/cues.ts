// 큐 사이 보간, 페이드 진행률, 헤이즈 변화 속도. node:test가 그대로 실행하도록 타입만 import한다.
import type { Fixture, FixtureLevel, LookState, Vec3 } from "./show";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
// a·(1−t) + b·t 꼴이 a + (b−a)·t보다 중간값 반올림 오차가 적다.
const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToLinear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
}

export function linearToHex([r, g, b]: [number, number, number]): string {
  const h = (c: number) => Math.round(clamp01(toSrgb(clamp01(c))) * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function lerpColor(a: string, b: string, t: number): string {
  if (a === b || t <= 0) return a;
  if (t >= 1) return b;
  const ca = hexToLinear(a);
  const cb = hexToLinear(b);
  return linearToHex([lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t)]);
}

const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });

/**
 * 큐에 있는 값만 보간한다. 밝기가 없으면 0, 색이 한쪽에만 있으면 그 색 그대로,
 * 조준·아이리스가 한쪽에만 있으면 다른 쪽은 조명기 포커스 값에서 출발한다.
 */
export function lerpLook(a: LookState, b: LookState, t: number, fixtures: Fixture[]): LookState {
  const levels: Record<string, FixtureLevel> = {};
  for (const f of fixtures) {
    const x = a.levels[f.id];
    const y = b.levels[f.id];
    if (!x && !y) continue;
    const out: FixtureLevel = { intensity: lerp(x?.intensity ?? 0, y?.intensity ?? 0, t) };
    const ca = x?.color ?? y?.color;
    const cb = y?.color ?? x?.color;
    if (ca && cb) out.color = lerpColor(ca, cb, t);
    if (x?.target || y?.target) out.target = lerpVec(x?.target ?? f.focus.target, y?.target ?? f.focus.target, t);
    if (x?.zoom !== undefined || y?.zoom !== undefined) out.zoom = lerp(x?.zoom ?? f.focus.zoom, y?.zoom ?? f.focus.zoom, t);
    levels[f.id] = out;
  }
  return { levels, haze: lerp(a.haze, b.haze, t) };
}

/** 사인 in-out으로 이징한 페이드 진행률(0..1). */
export function fadeProgress(elapsedMs: number, fadeSec: number): number {
  if (fadeSec <= 0) return 1;
  const x = clamp01(elapsedMs / (fadeSec * 1000));
  // cos 오차(1e-17 수준)로 경계값이 어긋나지 않게 반올림한다.
  return Math.round(((1 - Math.cos(Math.PI * x)) / 2) * 1e9) / 1e9;
}

/** 큐 사이에 조준·아이리스가 바뀌는 조명기가 있는지. 없으면 그림자 맵을 다시 그릴 필요가 없다. */
export function aimChanged(a: LookState, b: LookState, fixtures: Fixture[]): boolean {
  for (const f of fixtures) {
    const x = a.levels[f.id];
    const y = b.levels[f.id];
    // 큐에 없는 조준·아이리스는 포커스 값이다(일반 조명기는 늘 포커스 값이라 바뀌지 않는다).
    const ta = x?.target ?? f.focus.target;
    const tb = y?.target ?? f.focus.target;
    if (ta.x !== tb.x || ta.y !== tb.y || ta.z !== tb.z) return true;
    if ((x?.zoom ?? f.focus.zoom) !== (y?.zoom ?? f.focus.zoom)) return true;
  }
  return false;
}

const RISE_PER_SEC = 1 / 20;
const FALL_PER_SEC = 1 / 40;

/** 헤이즈 실제 농도가 목표를 따라간다. 차오를 때 0→1에 20초, 빠질 때 1→0에 40초. */
export function stepHaze(current: number, target: number, dtSec: number): number {
  if (current < target) return Math.min(target, current + RISE_PER_SEC * dtSec);
  if (current > target) return Math.max(target, current - FALL_PER_SEC * dtSec);
  return current;
}
