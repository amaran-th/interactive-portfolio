// 무대 설정과 조명기·무대 요소 위치 계산. node:test 대상 순수 모듈.
// 좌표: 무대 앞 가장자리 가운데가 원점, x 오른쪽, y 위, z 객석 쪽(+). 단위 m.
import { type FixtureType, clamp, isHexColor } from "./fixtures.ts";

export type StageShape = "proscenium" | "thrust" | "arena";
export type StageSettings = {
  shape: StageShape;
  width: number;
  depth: number;
  deckHeight: number;
  floorColor: string;
  cycOn: boolean;
  cycColor: string;
};
export type Vec3 = { x: number; y: number; z: number };
export type Focus = { x: number; z: number; height: number };

export const GRID = 0.25;
export const STAGE_LIMITS = {
  width: { min: 6, max: 20 },
  depth: { min: 4, max: 16 },
  deckHeight: { min: 0, max: 1.5 },
};
export const DEFAULT_STAGE: StageSettings = {
  shape: "proscenium",
  width: 12,
  depth: 8,
  deckHeight: 0.9,
  floorColor: "#3a3a3a",
  cycOn: true,
  cycColor: "#e8e8e8",
};
export const FOCUS_HEIGHT = { min: 0, max: 2, def: 1 };

const round2 = (v: number) => Math.round(v * 100) / 100;

// +0으로 -0을 0으로 바꾼다
export function snap(v: number, grid = GRID): number {
  return Math.round(v / grid) * grid + 0;
}

export function heightPresets(stage: StageSettings) {
  return {
    floor: round2(stage.deckHeight + 0.2),
    boom: round2(stage.deckHeight + 2.5),
    batten: 6.5,
    foh: 7,
  };
}

// 원형 무대는 원판(지름 = 폭)이 z = 0에서 −폭까지 놓인다
const backZ = (stage: StageSettings) => (stage.shape === "arena" ? stage.width : stage.depth);

export function fixtureBounds(stage: StageSettings) {
  return {
    minX: -(stage.width / 2 + 10),
    maxX: stage.width / 2 + 10,
    minY: 0.2,
    maxY: 10,
    minZ: -backZ(stage) - 2,
    maxZ: 12,
  };
}

export function normalizePosition(p: Vec3, stage: StageSettings, useGrid = true): Vec3 {
  const b = fixtureBounds(stage);
  const s = (v: number) => (useGrid ? snap(v) : v);
  return {
    x: clamp(s(p.x), b.minX, b.maxX),
    y: clamp(s(p.y), b.minY, b.maxY),
    z: clamp(s(p.z), b.minZ, b.maxZ),
  };
}

export function normalizeFocus(f: Focus, stage: StageSettings, useGrid = true): Focus {
  const b = fixtureBounds(stage);
  const s = (v: number) => (useGrid ? snap(v) : v);
  const h = Number.isFinite(f.height) ? f.height : FOCUS_HEIGHT.def;
  return {
    x: clamp(s(f.x), b.minX, b.maxX),
    z: clamp(s(f.z), b.minZ, b.maxZ),
    height: round2(clamp(h, FOCUS_HEIGHT.min, FOCUS_HEIGHT.max)),
  };
}

export function focusPoint(f: Focus, stage: StageSettings): Vec3 {
  return { x: f.x, y: stage.deckHeight + f.height, z: f.z };
}

export function stageCenter(stage: StageSettings): { x: number; z: number } {
  return { x: 0, z: -backZ(stage) / 2 };
}

// 배우·소품이 설 수 있는 바닥 안으로 맞춘다
export function clampToStage(x: number, z: number, stage: StageSettings): { x: number; z: number } {
  if (stage.shape === "arena") {
    const r = stage.width / 2;
    const dz = z + r;
    const d = Math.hypot(x, dz);
    if (d <= r) return { x, z };
    return { x: (x / d) * r, z: -r + (dz / d) * r };
  }
  const hw = stage.width / 2;
  // 돌출형은 앞쪽으로 폭의 절반 × 깊이의 절반이 더 나온다
  if (stage.shape === "thrust" && z > 0)
    return { x: clamp(x, -hw / 2, hw / 2), z: Math.min(z, stage.depth / 2) };
  return { x: clamp(x, -hw, hw), z: clamp(z, -stage.depth, 0) };
}

export function normalizeObjectPosition(
  x: number,
  z: number,
  stage: StageSettings,
  useGrid = true,
): { x: number; z: number } {
  const c = clampToStage(useGrid ? snap(x) : x, useGrid ? snap(z) : z, stage);
  return { x: c.x + 0, z: c.z + 0 };
}

const samePoint = (a: Vec3, b: Vec3) =>
  Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01 && Math.abs(a.z - b.z) < 0.01;

// 새 조명기를 놓을 종류별 기본 자리. 이미 조명기가 있으면 x를 1m씩 비킨다.
export function defaultPlacement(
  type: FixtureType,
  stage: StageSettings,
  existing: Vec3[],
): { position: Vec3; focus: Focus } {
  const h = heightPresets(stage);
  const c = stageCenter(stage);
  const arena = stage.shape === "arena";
  let position: Vec3;
  let focus: Focus = { x: c.x, z: c.z, height: FOCUS_HEIGHT.def };
  if (type === "followspot") {
    position = { x: 0, y: h.foh, z: 6 };
  } else if (type === "cyc") {
    position = { x: 0, y: h.batten, z: arena ? c.z : -stage.depth * 0.85 };
    if (!arena) focus = { x: 0, z: -stage.depth, height: 2 };
  } else {
    position = { x: 0, y: h.batten, z: arena ? c.z : -stage.depth * 0.3 };
  }
  while (existing.some((e) => samePoint(e, position))) position = { ...position, x: position.x + 1 };
  return {
    position: normalizePosition(position, stage, false),
    focus: normalizeFocus(focus, stage, false),
  };
}

const inRange = (v: unknown, r: { min: number; max: number }, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? round2(clamp(v, r.min, r.max)) : fallback;

export function normalizeStage(patch: Partial<StageSettings>, base: StageSettings): StageSettings {
  const shape =
    patch.shape === "proscenium" || patch.shape === "thrust" || patch.shape === "arena"
      ? patch.shape
      : base.shape;
  return {
    shape,
    width: inRange(patch.width, STAGE_LIMITS.width, base.width),
    depth: inRange(patch.depth, STAGE_LIMITS.depth, base.depth),
    deckHeight: inRange(patch.deckHeight, STAGE_LIMITS.deckHeight, base.deckHeight),
    floorColor: isHexColor(patch.floorColor) ? patch.floorColor : base.floorColor,
    cycOn: typeof patch.cycOn === "boolean" ? patch.cycOn : base.cycOn,
    cycColor: isHexColor(patch.cycColor) ? patch.cycColor : base.cycColor,
  };
}

// 평면도(위에서 내려다보는 직교 카메라)의 화면 반높이(m). 무대와 객석 앞부분이 다 들어오게 한다.
export function planHalfHeight(stage: StageSettings, aspect: number): number {
  const extentZ = (stage.shape === "arena" ? stage.width : stage.depth * 1.5) + 4;
  const extentX = stage.width + 6;
  return Math.max(extentZ / 2, extentX / 2 / aspect) * 1.1;
}
