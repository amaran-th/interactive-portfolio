// 무대조명 시뮬레이터 — 조명기 종류·조절 범위·젤 색. node:test 대상 순수 모듈.

export type FixtureType = "profile" | "fresnel" | "par" | "followspot" | "cyc";
export type Range = { min: number; max: number; def: number };
export type FixtureSpec = { label: string; beam: Range; softness: Range; maxCandela: number };

// 광도(cd)는 화면 노출에 맞춰 조정할 수 있다. 바꾸면 설계 문서 표도 고친다.
export const FIXTURE_SPECS: Record<FixtureType, FixtureSpec> = {
  profile: {
    label: "프로파일",
    beam: { min: 19, max: 50, def: 26 },
    softness: { min: 0, max: 0.4, def: 0.1 },
    maxCandela: 3000,
  },
  fresnel: {
    label: "프레넬",
    beam: { min: 15, max: 60, def: 40 },
    softness: { min: 0.5, max: 0.9, def: 0.7 },
    maxCandela: 2500,
  },
  par: {
    label: "PAR",
    beam: { min: 10, max: 60, def: 30 },
    softness: { min: 0.3, max: 0.6, def: 0.45 },
    maxCandela: 4000,
  },
  followspot: {
    label: "팔로우 스포트",
    beam: { min: 4, max: 20, def: 10 },
    softness: { min: 0, max: 0.3, def: 0.15 },
    maxCandela: 6000,
  },
  cyc: {
    label: "호리존트",
    beam: { min: 70, max: 120, def: 100 },
    softness: { min: 0.8, max: 1, def: 0.9 },
    maxCandela: 2500,
  },
};

export const FIXTURE_TYPES = Object.keys(FIXTURE_SPECS) as FixtureType[];
export const MAX_FIXTURES = 16;

export const GELS: { name: string; color: string }[] = [
  { name: "오픈 화이트", color: "#ffffff" },
  { name: "옅은 호박", color: "#ffe4b5" },
  { name: "따뜻한 호박", color: "#ffc879" },
  { name: "주황", color: "#ff8a2a" },
  { name: "진한 빨강", color: "#e0242c" },
  { name: "장미 분홍", color: "#ff9ec4" },
  { name: "노랑", color: "#ffe14a" },
  { name: "초록", color: "#3fcf5f" },
  { name: "하늘", color: "#8fd3ff" },
  { name: "스틸 블루", color: "#b9d2ff" },
  { name: "진한 파랑", color: "#2246d8" },
  { name: "보라", color: "#8a4bd9" },
];

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const isHexColor = (v: unknown): v is string =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

export const isFixtureType = (v: unknown): v is FixtureType =>
  typeof v === "string" && Object.hasOwn(FIXTURE_SPECS, v);

const finiteOr = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);

export function normalizeBeam(type: FixtureType, deg: number): number {
  const r = FIXTURE_SPECS[type].beam;
  return Math.round(clamp(finiteOr(deg, r.def), r.min, r.max));
}

export function normalizeSoftness(type: FixtureType, v: number): number {
  const r = FIXTURE_SPECS[type].softness;
  return Math.round(clamp(finiteOr(v, r.def), r.min, r.max) * 100) / 100;
}

export function normalizeLevel(v: number): number {
  return Math.round(clamp(finiteOr(v, 0), 0, 100));
}

export function candela(type: FixtureType, level: number): number {
  return (FIXTURE_SPECS[type].maxCandela * normalizeLevel(level)) / 100;
}
