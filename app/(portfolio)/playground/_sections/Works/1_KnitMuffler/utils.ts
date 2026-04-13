export function formatElapsed(elapsed: number): string {
  const minutes = Math.floor(elapsed / 6000);
  const seconds = Math.floor((elapsed / 100) % 60);
  const centiseconds = elapsed % 100;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(centiseconds).padStart(2, "0")}`;
}

export type Medal = "gold" | "silver" | "bronze" | null;

/** 메달 색상 (Tailwind) */
export const MEDAL_COLOR: Record<
  NonNullable<Medal>,
  { fill: string; stroke: string }
> = {
  gold: { fill: "#FFD700", stroke: "orange" },
  silver: { fill: "#C0C0C0", stroke: "gray" },
  bronze: { fill: "#B87333", stroke: "#7b3306" },
};

/**
 * 클리어 메달 판정
 * - easy: 실수 없음 → 정확도만 기준
 *   gold ≥ 100%, silver ≥ 90%, bronze ≥ 70%
 * - normal: 정확도 + 실수 개수 복합 기준
 *   gold: 100% & 0회, silver: ≥90% & ≤2회, bronze: ≥70% & ≤5회
 */
const MEDAL_RANK: Record<NonNullable<Medal>, number> = { gold: 3, silver: 2, bronze: 1 };

export function isBetterMedal(current: Medal, existing: Medal | null): boolean {
  if (!existing) return true;
  const cur = current ? MEDAL_RANK[current] : 0;
  const ex = MEDAL_RANK[existing];
  return cur > ex;
}

export function calcMedal(
  level: "easy" | "normal",
  colorAccuracy: number,
  slipCount: number,
): Medal {
  if (level === "easy") {
    if (colorAccuracy >= 100) return "gold";
    if (colorAccuracy >= 90) return "silver";
    return "bronze";
  }
  if (colorAccuracy >= 100 && slipCount === 0) return "gold";
  if (colorAccuracy >= 90 && slipCount <= 2) return "silver";
  return "bronze";
}
