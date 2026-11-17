// 무대 요소(배우·소품) 종류와 값 정규화. node:test 대상 순수 모듈.
import { clamp } from "./fixtures.ts";

export type PersonPose = "stand" | "sit" | "arms" | "walk" | "lie";
export type PropType =
  | "chair"
  | "table"
  | "bed"
  | "stairs"
  | "platform"
  | "tree"
  | "doorframe"
  | "column"
  | "box"
  | "lamppost";

type Common = { id: string; x: number; z: number; rot: number; scale: number; color: string };
export type PersonObject = Common & {
  kind: "person";
  pose: PersonPose;
  height: number;
  name: string;
  showName: boolean;
};
export type PropObject = Common & { kind: "prop"; prop: PropType };
export type StageObject = PersonObject | PropObject;

export const POSES: Record<PersonPose, string> = {
  stand: "서기",
  sit: "앉기",
  arms: "팔 벌리기",
  walk: "걷기",
  lie: "눕기",
};

// size: 가로(x) × 세로(z) × 높이(y), m
export const PROPS: Record<PropType, { label: string; size: [number, number, number] }> = {
  chair: { label: "의자", size: [0.5, 0.5, 0.9] },
  table: { label: "탁자", size: [1.4, 0.8, 0.75] },
  bed: { label: "침대", size: [2.0, 1.4, 0.6] },
  stairs: { label: "계단", size: [1.2, 0.9, 0.6] },
  platform: { label: "단상", size: [2, 2, 0.4] },
  tree: { label: "나무", size: [1.5, 1.5, 3] },
  doorframe: { label: "문틀", size: [1.2, 0.2, 2.2] },
  column: { label: "기둥", size: [0.4, 0.4, 4] },
  box: { label: "상자", size: [0.6, 0.6, 0.6] },
  lamppost: { label: "가로등", size: [0.4, 0.4, 3.2] },
};

export const MAX_OBJECTS = 40;
export const PERSON_HEIGHT = { min: 1.4, max: 2.0, def: 1.75 };
export const SCALE = { min: 0.5, max: 2 };

export const isPose = (v: unknown): v is PersonPose =>
  typeof v === "string" && Object.hasOwn(POSES, v);
export const isProp = (v: unknown): v is PropType =>
  typeof v === "string" && Object.hasOwn(PROPS, v);

export function normalizeRotation(deg: number): number {
  const r = Math.round((Number.isFinite(deg) ? deg : 0) / 15) * 15;
  return ((r % 360) + 360) % 360;
}

export function normalizeScale(v: number): number {
  return Math.round(clamp(Number.isFinite(v) ? v : 1, SCALE.min, SCALE.max) * 100) / 100;
}

export function normalizeHeight(v: number): number {
  const h = Number.isFinite(v) ? v : PERSON_HEIGHT.def;
  return Math.round(clamp(h, PERSON_HEIGHT.min, PERSON_HEIGHT.max) * 100) / 100;
}
