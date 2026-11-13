// 큐 사이 보간과 페이드 진행률. node:test가 그대로 실행하도록 타입만 import한다.
import type { Fixture, FixtureLevel, LookState } from "./show";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

// show.ts의 levelOf와 같은 규칙(런타임 import를 하지 않아 여기 다시 적는다).
function fallback(f: Fixture): FixtureLevel {
  return { intensity: 0, color: "#ffffff", target: { x: f.position.x, y: 0, z: f.position.z }, beamAngle: 40, softness: 0.5 };
}

/** 양쪽 레벨을 맞춘다. 한쪽에만 있으면 다른 쪽은 같은 값에 밝기만 0으로 본다. */
function pair(a: LookState, b: LookState, f: Fixture): [FixtureLevel, FixtureLevel] {
  const la = a.levels[f.id];
  const lb = b.levels[f.id];
  if (la && lb) return [la, lb];
  if (la) return [la, { ...la, intensity: 0 }];
  if (lb) return [{ ...lb, intensity: 0 }, lb];
  const d = fallback(f);
  return [d, d];
}

export function lerpLook(a: LookState, b: LookState, t: number, fixtures: Fixture[]): LookState {
  const levels: Record<string, FixtureLevel> = {};
  for (const f of fixtures) {
    const [x, y] = pair(a, b, f);
    let color = t <= 0 ? x.color : t >= 1 ? y.color : x.color;
    if (t > 0 && t < 1 && x.color !== y.color) {
      const ca = hexToLinear(x.color);
      const cb = hexToLinear(y.color);
      color = linearToHex([lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t)]);
    }
    levels[f.id] = {
      intensity: lerp(x.intensity, y.intensity, t),
      color,
      target: {
        x: lerp(x.target.x, y.target.x, t),
        y: lerp(x.target.y, y.target.y, t),
        z: lerp(x.target.z, y.target.z, t),
      },
      beamAngle: lerp(x.beamAngle, y.beamAngle, t),
      softness: lerp(x.softness, y.softness, t),
    };
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

/** 두 상태 사이에 조준점·빔 각도가 다른 조명기가 있는지. 없으면 그림자 맵을 다시 그릴 필요가 없다. */
export function aimChanged(a: LookState, b: LookState, fixtures: Fixture[]): boolean {
  for (const f of fixtures) {
    const [x, y] = pair(a, b, f);
    if (x.beamAngle !== y.beamAngle) return true;
    if (x.target.x !== y.target.x || x.target.y !== y.target.y || x.target.z !== y.target.z) return true;
  }
  return false;
}
