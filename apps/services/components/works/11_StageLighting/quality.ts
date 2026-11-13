// 렌더링 품질 단계. node:test가 그대로 실행하도록 타입만 import한다.
import type { Fixture } from "./show";

export type Quality = "auto" | "high" | "low";
export type Tier = 0 | 1 | 2;

export const TIERS: { shadows: number; segments: number }[] = [
  { shadows: 8, segments: 32 },
  { shadows: 4, segments: 16 },
  { shadows: 0, segments: 16 },
];

const WINDOW = 30;
const SLOW_MS = 22;

/** 조작 중 최근 30프레임 평균이 22ms를 넘으면 한 단계 내린다. 올리지는 않는다. */
export function nextTier(tier: Tier, recentMs: number[]): Tier {
  if (tier >= 2 || recentMs.length < WINDOW) return tier;
  const last = recentMs.slice(-WINDOW);
  const avg = last.reduce((s, v) => s + v, 0) / WINDOW;
  return avg > SLOW_MS ? ((tier + 1) as Tier) : tier;
}

export function effectiveTier(q: Quality, autoTier: Tier): Tier {
  return q === "high" ? 0 : q === "low" ? 2 : autoTier;
}

export function shadowFixtureIds(fixtures: Fixture[], limit: number): string[] {
  return fixtures.filter((f) => f.castShadow).slice(0, limit).map((f) => f.id);
}
