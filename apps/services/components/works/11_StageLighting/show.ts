// 조명 연습실의 공연 데이터(v3): 타입, 프리셋, 불변 조작, 직렬화, v1·v2 변환.
// node:test가 그대로 실행하도록 런타임 import를 하지 않는다.
// 좌표: 미터, y 위. 무대 앞 끝 중앙이 원점, 업스테이지가 -z, 객석이 +z.
//
// 실제 극장처럼 조명기 값은 두 갈래다.
// - 포커스(Fixture.focus): 공연 전에 손으로 맞추는 값. 젤·줌·포커스·조준. 큐와 무관.
// - 큐 값(FixtureLevel): 큐마다 바뀌는 값. 일반 조명기는 밝기만, LED는 색, 팔로우는 조준·아이리스도.
// 실제 빛은 resolve()가 두 값을 합쳐 한 곳에서 계산한다.

export type Vec3 = { x: number; y: number; z: number };

export type StageShape = "proscenium" | "thrust" | "round";
export type Stage = {
  shape: StageShape;
  width: number;
  depth: number;
  height: number;
  floorColor: string;
  backdropColor: string;
};

export type PropKind = "chair" | "table" | "stairs" | "platform" | "pillar" | "box" | "doorframe";
export type Prop = { id: string; kind: PropKind; position: Vec3; rotationY: number; scale: Vec3; color: string };

export type Gender = "female" | "male";
export type Build = "slim" | "average" | "stocky";
export type Pose =
  | "stand"
  | "talk"
  | "walk"
  | "formalWalk"
  | "run"
  | "sit"
  | "sitTalk"
  | "crouch"
  | "kneel"
  | "dance"
  | "push"
  | "reach"
  | "lie"
  | "armsOpen";
export type HairStyle = "parted" | "buzzed" | "buns" | "long" | "none";
export type Actor = {
  id: string;
  name: string;
  gender: Gender;
  position: Vec3; // y는 발바닥 높이(단·계단 위에 올라서면 0보다 크다)
  rotationY: number;
  height: number; // m
  build: Build;
  pose: Pose;
  hair: HairStyle;
  skinColor: string;
  hairColor: string;
  topColor: string;
  bottomColor: string;
  shoeColor: string;
};

export type HangId = "foh" | "e1" | "e2" | "e3" | "boomL" | "boomR" | "floor";
export type FixtureKind = "profile" | "fresnel" | "par" | "follow" | "ledpar" | "cyc";
export type ParLamp = "vnsp" | "nsp" | "mfl" | "wfl";

export type Focus = {
  target: Vec3; // 조준점
  zoom: number; // 0..1, 종류별 의미는 KNOBS
  sharpness: number; // 0..1, 1이 선명
  lamp: ParLamp; // PAR만 의미
  gel: string; // #rrggbb, LED는 무시
};

export type Fixture = {
  id: string;
  channel: number;
  kind: FixtureKind;
  name: string;
  hang: HangId; // 걸린 라인
  along: number; // 라인 위 좌표(m). 붐은 높이.
  castShadow: boolean;
  focus: Focus;
};

export type FixtureLevel = { intensity: number; color?: string; target?: Vec3; zoom?: number };
export type CueParam = "intensity" | "color" | "target" | "zoom";

export type LookState = { levels: Record<string, FixtureLevel>; haze: number };
export type Cue = { id: string; number: number; name: string; fadeSec: number; look: LookState };
/**
 * 좌석 블록. (x, z)는 첫 줄 가운데, 블록은 회전 0일 때 -z(무대 쪽)를 본다.
 * 줄은 뒤(+z)로 쌓이고, curve(첫 줄이 이루는 호의 각도, 도)가 0보다 크면 줄이 앞쪽 한 점을 중심으로 휜다.
 */
export type SeatBlock = {
  id: string;
  name: string;
  x: number;
  z: number;
  rotationY: number;
  rows: number;
  seatsPerRow: number;
  rake: number; // 줄마다 올라가는 높이(m)
  curve: number; // 0..120
  widen: number; // 줄마다 늘어나는 좌석 수(0..1). n번째 줄 좌석 = seatsPerRow + floor((n-1)·widen)
  elevation: number; // 블록 바닥을 객석 바닥보다 올리는 높이(m). 발코니는 0보다 크다.
};
/** 실제 극장형 객석. 좌석 블록은 venue.ts의 templateBlocks가 이 값에서 계산한다(저장하지 않음). */
export type VenueKind = "studio" | "hall" | "grand" | "thrust" | "arena";
export type VenueTemplate = {
  kind: VenueKind;
  rows: number; // 1층 줄 수
  width: number; // 가운데 블록 첫 줄 좌석 수
  aisle: number; // 통로 폭(m)
  rake: number; // 줄마다 올라가는 높이(m)
  gap: number; // 무대 앞 끝에서 첫 줄까지(m)
  widen: number; // 줄마다 늘어나는 좌석 수(0..1, 0.5면 두 줄마다 1석)
  balconyRows: number; // 대극장 발코니 줄 수
};
export type Venue = { template: VenueTemplate };

export type Show = {
  version: 5;
  stage: Stage;
  venue: Venue;
  ambient: number; // 잔광 0..1. 유도등·통로등과 반사광 세기. 큐에는 들어가지 않는다.
  props: Prop[];
  actors: Actor[];
  fixtures: Fixture[];
  cues: Cue[];
  live: LookState;
};

export type Resolved = {
  intensity: number;
  color: string;
  target: Vec3;
  beamAngle: number;
  softness: number;
  position: Vec3;
};

export const LIMITS = { fixtures: 24, props: 40, actors: 40, cues: 99 } as const;

export const STAGE_SHAPES: StageShape[] = ["proscenium", "thrust", "round"];
export const STAGE_LABELS: Record<StageShape, string> = { proscenium: "프로시니엄", thrust: "돌출", round: "원형" };
export const PROP_KINDS: PropKind[] = ["chair", "table", "stairs", "platform", "pillar", "box", "doorframe"];
export const FIXTURE_KINDS: FixtureKind[] = ["profile", "fresnel", "par", "follow", "ledpar", "cyc"];
export const GENDERS: Gender[] = ["female", "male"];
export const GENDER_LABELS: Record<Gender, string> = { female: "여자", male: "남자" };
/** 성별별 키 범위와 기본값(m). 한국 성인 평균에 맞췄다. */
export const HEIGHT_RANGE: Record<Gender, { min: number; max: number; base: number }> = {
  female: { min: 1.5, max: 1.8, base: 1.6 },
  male: { min: 1.6, max: 1.95, base: 1.73 },
};
export const BUILDS: Build[] = ["slim", "average", "stocky"];
export const BUILD_LABELS: Record<Build, string> = { slim: "마름", average: "보통", stocky: "통통" };
export const POSES: Pose[] = [
  "stand",
  "talk",
  "walk",
  "formalWalk",
  "run",
  "sit",
  "sitTalk",
  "crouch",
  "kneel",
  "dance",
  "push",
  "reach",
  "lie",
  "armsOpen",
];
export const POSE_LABELS: Record<Pose, string> = {
  stand: "서기",
  talk: "말하기",
  walk: "걷기",
  formalWalk: "점잖게 걷기",
  run: "뛰기",
  sit: "의자에 앉기",
  sitTalk: "앉아서 말하기",
  crouch: "쪼그려 앉기",
  kneel: "한쪽 무릎 꿇기",
  dance: "춤추기",
  push: "밀기",
  reach: "손 뻗기",
  lie: "쓰러져 눕기",
  armsOpen: "팔 벌리기",
};
export const HAIRS: HairStyle[] = ["parted", "buzzed", "buns", "long", "none"];
export const HAIR_LABELS: Record<HairStyle, string> = {
  parted: "가르마",
  buzzed: "짧은 머리",
  buns: "올림머리",
  long: "긴 머리",
  none: "민머리",
};
export const VENUE_KINDS: VenueKind[] = ["studio", "hall", "grand", "thrust", "arena"];
export const VENUE_LABELS: Record<VenueKind, string> = {
  studio: "소극장",
  hall: "중극장",
  grand: "대극장(발코니)",
  thrust: "돌출 무대 객석",
  arena: "원형 객석",
};
/** 무대 형태마다 쓸 수 있는 객석 종류. 첫 번째가 기본. */
export const VENUE_KINDS_FOR: Record<StageShape, VenueKind[]> = {
  proscenium: ["hall", "studio", "grand"],
  thrust: ["thrust"],
  round: ["arena"],
};

export const HANGS: HangId[] = ["foh", "e1", "e2", "e3", "boomL", "boomR", "floor"];
export const HANG_LABELS: Record<HangId, string> = {
  foh: "FOH(객석 위)",
  e1: "1번 일렉트릭",
  e2: "2번 일렉트릭",
  e3: "3번 일렉트릭",
  boomL: "왼쪽 붐",
  boomR: "오른쪽 붐",
  floor: "바닥",
};

export const PROP_SPECS: Record<PropKind, { label: string; scale: Vec3; color: string }> = {
  chair: { label: "의자", scale: { x: 0.5, y: 0.9, z: 0.5 }, color: "#8a5a3c" },
  table: { label: "탁자", scale: { x: 1.4, y: 0.75, z: 0.8 }, color: "#6e4a32" },
  stairs: { label: "계단", scale: { x: 1.5, y: 0.6, z: 1.2 }, color: "#3c3c44" },
  platform: { label: "단", scale: { x: 2, y: 0.4, z: 1.5 }, color: "#2e2e36" },
  pillar: { label: "기둥", scale: { x: 0.5, y: 3, z: 0.5 }, color: "#d8d2c4" },
  box: { label: "상자", scale: { x: 0.6, y: 0.6, z: 0.6 }, color: "#a08060" },
  doorframe: { label: "문틀", scale: { x: 1.2, y: 2.2, z: 0.2 }, color: "#c8c0b0" },
};

export const FIXTURE_LABELS: Record<FixtureKind, string> = {
  profile: "프로필",
  fresnel: "프레넬",
  par: "PAR",
  follow: "팔로우 스팟",
  ledpar: "LED PAR",
  cyc: "호리존트 LED",
};

export const GELS: { name: string; color: string }[] = [
  { name: "오픈(젤 없음)", color: "#fff1dc" },
  { name: "페일 앰버", color: "#ffe2b0" },
  { name: "웜 앰버", color: "#ffbf6e" },
  { name: "오렌지", color: "#ff8a2a" },
  { name: "레드", color: "#e0242a" },
  { name: "핑크", color: "#ff8fb4" },
  { name: "매젠타", color: "#d62a9a" },
  { name: "라벤더", color: "#b9a2e8" },
  { name: "퍼플", color: "#6a2fc0" },
  { name: "딥 블루", color: "#1c2fb8" },
  { name: "CT 블루", color: "#cfe0ff" },
  { name: "스카이 블루", color: "#6fb4ff" },
  { name: "시안", color: "#2ad0e0" },
  { name: "그린", color: "#3cc24a" },
];
const OPEN = GELS[0].color;

export const PAR_LAMPS: Record<ParLamp, { label: string; angle: number }> = {
  vnsp: { label: "VNSP", angle: 11 },
  nsp: { label: "NSP", angle: 14 },
  mfl: { label: "MFL", angle: 26 },
  wfl: { label: "WFL", angle: 55 },
};
export const PAR_LAMP_KEYS: ParLamp[] = ["vnsp", "nsp", "mfl", "wfl"];

/** 종류별 손잡이. zoom: [이름, 최소각, 최대각], sharp: [이름, 흐림 softness, 선명 softness]. */
export const KNOBS: Record<
  FixtureKind,
  { zoom?: [string, number, number]; sharp?: [string, number, number]; softness?: number; angle?: number }
> = {
  profile: { zoom: ["줌", 15, 50], sharp: ["초점", 0.6, 0.05] },
  fresnel: { zoom: ["스팟 ↔ 플러드", 15, 70], softness: 0.75 },
  par: { softness: 0.5 },
  follow: { zoom: ["아이리스", 4, 20], sharp: ["초점", 0.5, 0.05] },
  ledpar: { zoom: ["렌즈", 15, 40], softness: 0.5 },
  cyc: { angle: 90, softness: 0.9 },
};

export const CUE_PARAMS: Record<FixtureKind, CueParam[]> = {
  profile: ["intensity"],
  fresnel: ["intensity"],
  par: ["intensity"],
  follow: ["intensity", "target", "zoom"],
  ledpar: ["intensity", "color"],
  cyc: ["intensity", "color"],
};

export const usesCueColor = (k: FixtureKind) => CUE_PARAMS[k].includes("color");

const COORD = 30;
const MAX_Y = 15;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const HEX = /^#[0-9a-f]{6}$/i;

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

function clampVec(v: Vec3): Vec3 {
  return { x: clamp(v.x, -COORD, COORD), y: clamp(v.y, 0, MAX_Y), z: clamp(v.z, -COORD, COORD) };
}

// ── 걸 위치 ──

export function hangRange(stage: Stage, hang: HangId): [number, number] {
  if (hang === "boomL" || hang === "boomR") return [0.5, 4];
  if (hang === "floor") return [-stage.width / 2, stage.width / 2];
  return [-(stage.width / 2 + 1), stage.width / 2 + 1];
}

export function hangPoint(stage: Stage, hang: HangId, along: number): Vec3 {
  const [lo, hi] = hangRange(stage, hang);
  const a = clamp(along, lo, hi);
  const { width: w, depth: d, height: h } = stage;
  switch (hang) {
    case "foh":
      return { x: a, y: h + 1, z: 4 };
    case "e1":
      return { x: a, y: h, z: -d * 0.2 };
    case "e2":
      return { x: a, y: h, z: -d * 0.5 };
    case "e3":
      return { x: a, y: h, z: -d * 0.8 };
    case "boomL":
      return { x: -(w / 2 + 0.8), y: a, z: -d / 2 };
    case "boomR":
      return { x: w / 2 + 0.8, y: a, z: -d / 2 };
    case "floor":
      return { x: a, y: 0.3, z: -d + 0.6 };
  }
}

// ── 실제 빛 계산 ──

function beamAngle(kind: FixtureKind, zoom: number, lamp: ParLamp): number {
  if (kind === "par") return PAR_LAMPS[lamp].angle;
  const k = KNOBS[kind];
  if (k.zoom) return k.zoom[1] + (k.zoom[2] - k.zoom[1]) * clamp(zoom, 0, 1);
  return k.angle ?? 40;
}

function softnessOf(kind: FixtureKind, sharpness: number): number {
  const k = KNOBS[kind];
  if (k.sharp) return k.sharp[2] + (1 - clamp(sharpness, 0, 1)) * (k.sharp[1] - k.sharp[2]);
  return k.softness ?? 0.5;
}

export function resolve(stage: Stage, f: Fixture, level: FixtureLevel | undefined): Resolved {
  const allowed = CUE_PARAMS[f.kind];
  const led = allowed.includes("color");
  const color = led ? (level?.color ?? "#ffffff") : f.focus.gel;
  const target = allowed.includes("target") && level?.target ? level.target : f.focus.target;
  const zoom = allowed.includes("zoom") && level?.zoom !== undefined ? level.zoom : f.focus.zoom;
  return {
    intensity: level?.intensity ?? 0,
    color,
    target,
    beamAngle: beamAngle(f.kind, zoom, f.focus.lamp),
    softness: softnessOf(f.kind, f.focus.sharpness),
    position: hangPoint(stage, f.hang, f.along),
  };
}

/** 종류가 허용하는 필드만 남기고 범위를 맞춘다. */
export function cleanLevel(kind: FixtureKind, l: FixtureLevel): FixtureLevel {
  const allowed = CUE_PARAMS[kind];
  const out: FixtureLevel = { intensity: clamp(l.intensity, 0, 1) };
  if (allowed.includes("color") && l.color !== undefined && HEX.test(l.color)) out.color = l.color.toLowerCase();
  if (allowed.includes("target") && l.target) out.target = clampVec(l.target);
  if (allowed.includes("zoom") && l.zoom !== undefined) out.zoom = clamp(l.zoom, 0, 1);
  return out;
}

export function levelOf(look: LookState, f: Fixture): FixtureLevel {
  return look.levels[f.id] ?? { intensity: 0 };
}

function copyLevel(l: FixtureLevel): FixtureLevel {
  return l.target ? { ...l, target: { ...l.target } } : { ...l };
}

function copyLook(look: LookState): LookState {
  const levels: Record<string, FixtureLevel> = {};
  for (const [id, l] of Object.entries(look.levels)) levels[id] = copyLevel(l);
  return { levels, haze: look.haze };
}

// ── clamp ──

export function clampStage(s: Stage): Stage {
  return { ...s, width: clamp(s.width, 4, 20), depth: clamp(s.depth, 3, 15), height: clamp(s.height, 3, 12) };
}

function clampProp(p: Prop): Prop {
  return {
    ...p,
    position: clampVec(p.position),
    scale: { x: clamp(p.scale.x, 0.1, 10), y: clamp(p.scale.y, 0.1, 10), z: clamp(p.scale.z, 0.1, 10) },
  };
}

function clampHeight(gender: Gender, h: number): number {
  const r = HEIGHT_RANGE[gender];
  return Math.round(clamp(h, r.min, r.max) * 100) / 100;
}

function clampActor(a: Actor): Actor {
  return {
    ...a,
    name: a.name.slice(0, 20),
    position: clampVec(a.position),
    height: clampHeight(a.gender, a.height),
  };
}

export function defaultTemplate(shape: StageShape): VenueTemplate {
  const kind = VENUE_KINDS_FOR[shape][0];
  const base = { aisle: 1.2, rake: 0.25, gap: 1.5, widen: 0.5, balconyRows: 5 };
  if (kind === "arena") return { kind, rows: 6, width: 12, ...base, widen: 0 };
  if (kind === "thrust") return { kind, rows: 8, width: 12, ...base };
  return { kind, rows: 12, width: 14, ...base };
}

function clampTemplate(t: VenueTemplate, shape: StageShape): VenueTemplate {
  const kinds = VENUE_KINDS_FOR[shape];
  return {
    kind: kinds.includes(t.kind) ? t.kind : kinds[0],
    rows: Math.round(clamp(t.rows, 4, 25)),
    width: Math.round(clamp(t.width, 6, 30)),
    aisle: clamp(t.aisle, 1, 2),
    rake: clamp(t.rake, 0.1, 0.5),
    gap: clamp(t.gap, 1, 4),
    widen: clamp(t.widen, 0, 1),
    balconyRows: Math.round(clamp(t.balconyRows, 3, 10)),
  };
}

function clampFocus(f: Focus): Focus {
  return {
    ...f,
    target: clampVec(f.target),
    zoom: clamp(f.zoom, 0, 1),
    sharpness: clamp(f.sharpness, 0, 1),
    gel: HEX.test(f.gel) ? f.gel.toLowerCase() : OPEN,
  };
}

function clampFixture(stage: Stage, f: Fixture): Fixture {
  const [lo, hi] = hangRange(stage, f.hang);
  return { ...f, name: f.name.slice(0, 20), along: clamp(f.along, lo, hi), focus: clampFocus(f.focus) };
}

export type Ray = { origin: Vec3; dir: Vec3 };
// 두 라인 사이에서 들썩이지 않도록, 지금 라인은 이만큼(m) 더 가깝다고 본다
const HANG_STICKY = 0.6;

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

/** 광선(t ≥ 0)과 선분 a–b 사이 가장 가까운 거리와 선분 위 비율 s(0..1). */
function raySegment(ray: Ray, a: Vec3, b: Vec3): { dist: number; s: number } {
  const u = sub(b, a);
  const v = ray.dir;
  const w = sub(a, ray.origin);
  const uu = dot(u, u);
  const uv = dot(u, v);
  const vv = dot(v, v);
  const uw = dot(u, w);
  const vw = dot(v, w);
  const den = uu * vv - uv * uv;
  let s = den > 1e-9 ? (uv * vw - vv * uw) / den : 0;
  s = clamp(s, 0, 1);
  const t = Math.max(0, (uv * s + vw) / vv);
  const p = { x: a.x + u.x * s, y: a.y + u.y * s, z: a.z + u.z * s };
  const q = { x: ray.origin.x + v.x * t, y: ray.origin.y + v.y * t, z: ray.origin.z + v.z * t };
  return { dist: Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z), s };
}

/** 화면 포인터 광선에 가장 가까운 라인과 그 위 좌표. 조명기 몸체를 끌 때 라인을 따라가거나 다른 라인으로 옮긴다. */
export function hangFromRay(stage: Stage, ray: Ray, current: HangId | null): { hang: HangId; along: number } {
  let best = { hang: current ?? ("e1" as HangId), along: 0 };
  let bestD = Infinity;
  for (const hang of HANGS) {
    const [lo, hi] = hangRange(stage, hang);
    const { dist, s } = raySegment(ray, hangPoint(stage, hang, lo), hangPoint(stage, hang, hi));
    const d = hang === current ? dist - HANG_STICKY : dist;
    if (d < bestD) {
      bestD = d;
      best = { hang, along: Math.round((lo + (hi - lo) * s) * 10) / 10 };
    }
  }
  return best;
}

// ── 만들기 ──

function makeActor(name: string, gender: Gender, x: number, z: number, topColor: string): Actor {
  return {
    id: newId("ac"),
    name,
    gender,
    position: { x, y: 0, z },
    rotationY: 0,
    height: HEIGHT_RANGE[gender].base,
    build: "average",
    pose: "stand",
    hair: gender === "female" ? "long" : "parted",
    skinColor: "#d9a88a",
    hairColor: "#1a1512",
    topColor,
    bottomColor: "#2a2a35",
    shoeColor: "#1a1a1a",
  };
}

function defaultHang(kind: FixtureKind): HangId {
  if (kind === "profile" || kind === "follow") return "foh";
  if (kind === "cyc") return "floor";
  return "e1";
}

function makeFixture(
  channel: number,
  kind: FixtureKind,
  name: string,
  hang: HangId,
  along: number,
  focus: Partial<Focus> & { target: Vec3 },
  castShadow: boolean,
): Fixture {
  return {
    id: newId("fx"),
    channel,
    kind,
    name,
    hang,
    along,
    castShadow,
    focus: { zoom: 0.5, sharpness: 0.8, lamp: "mfl", gel: OPEN, ...focus },
  };
}

const AMBIENT_DEFAULT = 0.3;
const STAGE_DEFAULT: Stage = { shape: "proscenium", width: 10, depth: 8, height: 6, floorColor: "#3a3a40", backdropColor: "#202028" };

export function defaultShow(): Show {
  const gel = (name: string) => GELS.find((g) => g.name === name)!.color;
  const fx = [
    makeFixture(1, "profile", "앞 왼쪽", "foh", -2, { target: { x: -1, y: 0, z: -3 }, zoom: 0.3, sharpness: 0.9 }, true),
    makeFixture(2, "profile", "앞 오른쪽", "foh", 2, { target: { x: 1, y: 0, z: -3 }, zoom: 0.3, sharpness: 0.9 }, true),
    makeFixture(3, "fresnel", "위 왼쪽", "e1", -2, { target: { x: -1.5, y: 0, z: -3 }, gel: gel("웜 앰버") }, true),
    makeFixture(4, "fresnel", "위 오른쪽", "e1", 2, { target: { x: 1.5, y: 0, z: -3 }, gel: gel("웜 앰버") }, true),
    makeFixture(5, "par", "역광 왼쪽", "e3", -2.5, { target: { x: -1, y: 0, z: -2.5 }, gel: gel("딥 블루") }, true),
    makeFixture(6, "par", "역광 오른쪽", "e3", 2.5, { target: { x: 1, y: 0, z: -2.5 }, gel: gel("딥 블루") }, true),
    makeFixture(7, "cyc", "호리존트", "floor", 0, { target: { x: 0, y: 4, z: -8 } }, false),
    makeFixture(8, "follow", "팔로우", "foh", 0, { target: { x: 0, y: 0, z: -3 }, zoom: 0.3, sharpness: 0.7 }, false),
  ];
  const [f1, f2, f3, f4, f5, f6, f7, f8] = fx;
  const first: LookState = {
    haze: 0.4,
    levels: {
      [f1.id]: { intensity: 0.8 },
      [f2.id]: { intensity: 0.8 },
      [f3.id]: { intensity: 0.6 },
      [f4.id]: { intensity: 0.6 },
      [f5.id]: { intensity: 0 },
      [f6.id]: { intensity: 0 },
      [f7.id]: { intensity: 0.5, color: "#4060ff" },
      [f8.id]: { intensity: 0 },
    },
  };
  const scene1: LookState = {
    haze: 0.6,
    levels: {
      [f1.id]: { intensity: 0.15 },
      [f2.id]: { intensity: 0.15 },
      [f3.id]: { intensity: 0 },
      [f4.id]: { intensity: 0 },
      [f5.id]: { intensity: 1 },
      [f6.id]: { intensity: 1 },
      [f7.id]: { intensity: 0.8, color: "#20206a" },
      [f8.id]: { intensity: 0.9, target: { x: -1, y: 0, z: -3 }, zoom: 0.25 },
    },
  };
  return {
    version: 5,
    stage: STAGE_DEFAULT,
    venue: { template: defaultTemplate(STAGE_DEFAULT.shape) },
    ambient: AMBIENT_DEFAULT,
    props: [],
    actors: [makeActor("인물 1", "female", -1, -3, "#7a2e3a"), makeActor("인물 2", "male", 1, -3, "#2e4a7a")],
    fixtures: fx,
    cues: [
      { id: newId("cue"), number: 1, name: "처음", fadeSec: 3, look: copyLook(first) },
      { id: newId("cue"), number: 2, name: "장면 1", fadeSec: 5, look: copyLook(scene1) },
    ],
    live: copyLook(first),
  };
}

// ── 조작 ──

function updateIn<T extends { id: string }>(list: T[], id: string, fn: (t: T) => T): T[] | null {
  const i = list.findIndex((t) => t.id === id);
  if (i < 0) return null;
  const next = list.slice();
  next[i] = fn(list[i]);
  return next;
}

export function nextChannel(show: Show): number {
  const used = new Set(show.fixtures.map((f) => f.channel));
  let c = 1;
  while (used.has(c)) c += 1;
  return c;
}

export function setChannel(show: Show, id: string, channel: number): Show {
  if (!Number.isInteger(channel) || channel < 1 || channel > 99) return show;
  if (show.fixtures.some((f) => f.channel === channel)) return show;
  const fixtures = updateIn(show.fixtures, id, (f) => ({ ...f, channel }));
  return fixtures ? { ...show, fixtures } : show;
}

export function addProp(show: Show, kind: PropKind): Show {
  if (show.props.length >= LIMITS.props) return show;
  const spec = PROP_SPECS[kind];
  const prop: Prop = {
    id: newId("pr"),
    kind,
    position: { x: 0, y: 0, z: -show.stage.depth / 2 },
    rotationY: 0,
    scale: { ...spec.scale },
    color: spec.color,
  };
  return { ...show, props: [...show.props, prop] };
}

/** 성별을 정하지 않으면 여자·남자를 번갈아 넣는다. */
export function addActor(show: Show, gender?: Gender): Show {
  if (show.actors.length >= LIMITS.actors) return show;
  const n = show.actors.length + 1;
  gender ??= n % 2 === 1 ? "female" : "male";
  return { ...show, actors: [...show.actors, makeActor(`인물 ${n}`, gender, 0, -show.stage.depth / 2, "#5a5a5a")] };
}

export function addFixture(show: Show, kind: FixtureKind): Show {
  if (show.fixtures.length >= LIMITS.fixtures) return show;
  const d = show.stage.depth;
  const target = kind === "cyc" ? { x: 0, y: 4, z: -d } : { x: 0, y: 0, z: -d / 2 };
  const n = show.fixtures.filter((f) => f.kind === kind).length + 1;
  // 종류별 기본 라인 가운데에 놓고, 이미 조명기가 있으면 라인을 따라 1m씩 비킨다
  const hang = defaultHang(kind);
  let along = 0;
  while (show.fixtures.some((f) => f.hang === hang && Math.abs(f.along - along) < 0.01)) along += 1;
  const f = clampFixture(show.stage, makeFixture(nextChannel(show), kind, `${FIXTURE_LABELS[kind]} ${n}`, hang, along, { target }, false));
  return {
    ...show,
    fixtures: [...show.fixtures, f],
    live: { ...show.live, levels: { ...show.live.levels, [f.id]: { intensity: 0 } } },
  };
}

export function updateProp(show: Show, id: string, patch: Partial<Prop>): Show {
  const props = updateIn(show.props, id, (p) => clampProp({ ...p, ...patch, id: p.id, kind: p.kind }));
  return props ? { ...show, props } : show;
}

export function updateActor(show: Show, id: string, patch: Partial<Omit<Actor, "id" | "gender">>): Show {
  const actors = updateIn(show.actors, id, (a) => clampActor({ ...a, ...patch, id: a.id, gender: a.gender }));
  return actors ? { ...show, actors } : show;
}

/** 성별을 바꾸면 키를 새 범위에 맞춘다. */
export function setActorGender(show: Show, id: string, gender: Gender): Show {
  const actors = updateIn(show.actors, id, (a) => clampActor({ ...a, gender }));
  return actors ? { ...show, actors } : show;
}

/** 소품·인물·조명기를 0.5m 옆에 하나 더 만든다. 조명기는 빈 채널을 받고 live·큐 값도 그대로 복사한다. */
export function duplicateEntity(show: Show, id: string): Show {
  const shift = (v: Vec3): Vec3 => ({ ...v, x: v.x + 0.5 });
  const prop = show.props.find((p) => p.id === id);
  if (prop) {
    if (show.props.length >= LIMITS.props) return show;
    return { ...show, props: [...show.props, clampProp({ ...prop, id: newId("pr"), position: shift(prop.position) })] };
  }
  const actor = show.actors.find((a) => a.id === id);
  if (actor) {
    if (show.actors.length >= LIMITS.actors) return show;
    const copy = clampActor({ ...actor, id: newId("ac"), name: `${actor.name} 복사`, position: shift(actor.position) });
    return { ...show, actors: [...show.actors, copy] };
  }
  const f = show.fixtures.find((x) => x.id === id);
  if (!f) return show;
  if (show.fixtures.length >= LIMITS.fixtures) return show;
  const nf = clampFixture(show.stage, { ...f, id: newId("fx"), channel: nextChannel(show), along: f.along + 0.5, focus: { ...f.focus, target: { ...f.focus.target } } });
  const copyIn = (look: LookState): LookState =>
    look.levels[id] ? { ...look, levels: { ...look.levels, [nf.id]: copyLevel(look.levels[id]) } } : look;
  return { ...show, fixtures: [...show.fixtures, nf], live: copyIn(show.live), cues: show.cues.map((c) => ({ ...c, look: copyIn(c.look) })) };
}

export function updateFixture(
  show: Show,
  id: string,
  patch: Partial<Pick<Fixture, "name" | "kind" | "hang" | "along" | "castShadow">>,
): Show {
  const old = show.fixtures.find((f) => f.id === id);
  if (!old) return show;
  const fixtures = updateIn(show.fixtures, id, (f) => clampFixture(show.stage, { ...f, ...patch }))!;
  const kind = patch.kind;
  if (!kind || kind === old.kind) return { ...show, fixtures };
  // 종류가 바뀌면 큐 값도 새 종류가 허용하는 것만 남긴다.
  const fix = (look: LookState): LookState =>
    look.levels[id] ? { ...look, levels: { ...look.levels, [id]: cleanLevel(kind, look.levels[id]) } } : look;
  return { ...show, fixtures, live: fix(show.live), cues: show.cues.map((c) => ({ ...c, look: fix(c.look) })) };
}

export function updateFocus(show: Show, id: string, patch: Partial<Focus>): Show {
  const fixtures = updateIn(show.fixtures, id, (f) => ({ ...f, focus: clampFocus({ ...f.focus, ...patch }) }));
  return fixtures ? { ...show, fixtures } : show;
}

export function updateStage(show: Show, patch: Partial<Stage>): Show {
  const stage = clampStage({ ...show.stage, ...patch });
  // 무대 형태가 바뀌어 지금 객석 종류를 쓸 수 없으면 그 형태의 기본 객석으로 바꾼다(되돌리기로 복구할 수 있다).
  const venue = VENUE_KINDS_FOR[stage.shape].includes(show.venue.template.kind)
    ? show.venue
    : { template: defaultTemplate(stage.shape) };
  return { ...show, stage, venue };
}

export function updateTemplate(show: Show, patch: Partial<VenueTemplate>): Show {
  return { ...show, venue: { template: clampTemplate({ ...show.venue.template, ...patch }, show.stage.shape) } };
}

export function updateLevel(show: Show, fixtureId: string, patch: Partial<FixtureLevel>): Show {
  const f = show.fixtures.find((x) => x.id === fixtureId);
  if (!f) return show;
  const level = cleanLevel(f.kind, { ...levelOf(show.live, f), ...patch });
  return { ...show, live: { ...show.live, levels: { ...show.live.levels, [fixtureId]: level } } };
}

export function setAmbient(show: Show, ambient: number): Show {
  return { ...show, ambient: clamp(ambient, 0, 1) };
}

export function setHaze(show: Show, haze: number): Show {
  return { ...show, live: { ...show.live, haze: clamp(haze, 0, 1) } };
}

function withoutLevel(look: LookState, id: string): LookState {
  if (!(id in look.levels)) return look;
  const levels = { ...look.levels };
  delete levels[id];
  return { ...look, levels };
}

export function removeEntity(show: Show, id: string): Show {
  if (show.props.some((p) => p.id === id)) return { ...show, props: show.props.filter((p) => p.id !== id) };
  if (show.actors.some((a) => a.id === id)) return { ...show, actors: show.actors.filter((a) => a.id !== id) };
  if (show.fixtures.some((f) => f.id === id)) {
    return {
      ...show,
      fixtures: show.fixtures.filter((f) => f.id !== id),
      live: withoutLevel(show.live, id),
      cues: show.cues.map((c) => (id in c.look.levels ? { ...c, look: withoutLevel(c.look, id) } : c)),
    };
  }
  return show;
}

export function saveCue(show: Show, cueId?: string): Show {
  if (cueId) {
    const cues = updateIn(show.cues, cueId, (c) => ({ ...c, look: copyLook(show.live) }));
    return cues ? { ...show, cues } : show;
  }
  if (show.cues.length >= LIMITS.cues) return show;
  const number = show.cues.reduce((m, c) => Math.max(m, c.number), 0) + 1;
  const cue: Cue = { id: newId("cue"), number, name: `큐 ${number}`, fadeSec: 3, look: copyLook(show.live) };
  return { ...show, cues: [...show.cues, cue] };
}

export function updateCue(show: Show, id: string, patch: Partial<Pick<Cue, "name" | "fadeSec">>): Show {
  const cues = updateIn(show.cues, id, (c) => ({
    ...c,
    ...(patch.name !== undefined ? { name: patch.name.slice(0, 30) } : {}),
    ...(patch.fadeSec !== undefined ? { fadeSec: clamp(patch.fadeSec, 0, 60) } : {}),
  }));
  return cues ? { ...show, cues } : show;
}

export function removeCue(show: Show, id: string): Show {
  return { ...show, cues: show.cues.filter((c) => c.id !== id) };
}

export function sortedCues(show: Pick<Show, "cues">): Cue[] {
  return show.cues.slice().sort((a, b) => a.number - b.number);
}

/** live를 주어진 상태(깊은 복사)로 바꾼다. 페이드가 끝나거나 멈출 때 쓴다. */
export function setLive(show: Show, look: LookState): Show {
  return { ...show, live: copyLook(look) };
}

/** 큐를 live로 불러온다(즉시 전환). */
export function recallCue(show: Show, cueId: string): Show {
  const cue = show.cues.find((c) => c.id === cueId);
  return cue ? { ...show, live: copyLook(cue.look) } : show;
}

export function serialize(show: Show): string {
  return JSON.stringify(show);
}

// ── 역직렬화: 형식이 하나라도 틀리면 null, 범위는 clamp ──

class Invalid extends Error {}
const fail = (): never => {
  throw new Invalid();
};
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : fail());
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : fail());
const str = (v: unknown): string => (typeof v === "string" ? v : fail());
const bool = (v: unknown): boolean => (typeof v === "boolean" ? v : fail());
const color = (v: unknown): string => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fail());
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : fail());
function oneOf<T extends string>(v: unknown, list: readonly T[]): T {
  return list.includes(v as T) ? (v as T) : fail();
}
function vec(v: unknown): Vec3 {
  const o = obj(v);
  return { x: num(o.x), y: num(o.y), z: num(o.z) };
}

function readStage(v: unknown): Stage {
  const so = obj(v);
  return clampStage({
    shape: oneOf(so.shape, STAGE_SHAPES),
    width: num(so.width),
    depth: num(so.depth),
    height: num(so.height),
    floorColor: color(so.floorColor),
    backdropColor: color(so.backdropColor),
  });
}

function readProps(v: unknown): Prop[] {
  return arr(v)
    .slice(0, LIMITS.props)
    .map((x) => {
      const p = obj(x);
      return clampProp({
        id: str(p.id),
        kind: oneOf(p.kind, PROP_KINDS),
        position: vec(p.position),
        rotationY: num(p.rotationY),
        scale: vec(p.scale),
        color: color(p.color),
      });
    });
}

/** v3은 새 필드를 읽고, v1·v2는 남자·기본 하의/신발/머리로 채운다(옷 색은 상의로). */
function readActors(v: unknown, version: number): Actor[] {
  return arr(v)
    .slice(0, LIMITS.actors)
    .map((x) => {
      const a = obj(x);
      const base = {
        id: str(a.id),
        name: str(a.name),
        position: vec(a.position),
        rotationY: num(a.rotationY),
        height: num(a.height),
        build: oneOf(a.build, BUILDS),
        pose: oneOf(a.pose, POSES),
        skinColor: color(a.skinColor),
      };
      if (version < 3) {
        return clampActor({
          ...base,
          gender: "male",
          hair: "parted",
          hairColor: "#1a1512",
          topColor: color(a.clothColor),
          bottomColor: "#2a2a35",
          shoeColor: "#1a1a1a",
        });
      }
      return clampActor({
        ...base,
        gender: oneOf(a.gender, GENDERS),
        hair: oneOf(a.hair, HAIRS),
        hairColor: color(a.hairColor),
        topColor: color(a.topColor),
        bottomColor: color(a.bottomColor),
        shoeColor: color(a.shoeColor),
      });
    });
}

function readTemplate(v: unknown, stage: Stage): VenueTemplate {
  const t = obj(obj(v).template);
  return clampTemplate(
    {
      kind: oneOf(t.kind, VENUE_KINDS),
      rows: num(t.rows),
      width: num(t.width),
      aisle: num(t.aisle),
      rake: num(t.rake),
      gap: num(t.gap),
      widen: num(t.widen),
      balconyRows: num(t.balconyRows),
    },
    stage.shape,
  );
}

function readLevel(v: unknown): FixtureLevel {
  const o = obj(v);
  const l: FixtureLevel = { intensity: num(o.intensity) };
  if (o.color !== undefined) l.color = color(o.color);
  if (o.target !== undefined) l.target = vec(o.target);
  if (o.zoom !== undefined) l.zoom = num(o.zoom);
  return l;
}

function readLook(v: unknown, byId: Map<string, Fixture>): LookState {
  const o = obj(v);
  const levels: Record<string, FixtureLevel> = {};
  for (const [id, raw] of Object.entries(obj(o.levels))) {
    const f = byId.get(id);
    if (f) levels[id] = cleanLevel(f.kind, readLevel(raw));
  }
  return { levels, haze: clamp(num(o.haze), 0, 1) };
}

function readCues(v: unknown, readLookFn: (v: unknown) => LookState): Cue[] {
  return arr(v)
    .slice(0, LIMITS.cues)
    .map((x) => {
      const c = obj(x);
      return {
        id: str(c.id),
        number: num(c.number),
        name: str(c.name).slice(0, 30),
        fadeSec: clamp(num(c.fadeSec), 0, 60),
        look: readLookFn(c.look),
      };
    });
}

/** v2~v5 공통. v2는 좌석 블록 대신 무대 형태의 기본 템플릿을 쓰고, v4(자유 위치)는 가장 가까운 라인으로 옮긴다. */
function readShow(o: Obj, version: 2 | 3 | 4 | 5): Show {
  const stage = readStage(o.stage);
  const seen = new Set<number>();
  const fixtures = arr(o.fixtures)
    .slice(0, LIMITS.fixtures)
    .map((x): Fixture => {
      const f = obj(x);
      const fo = obj(f.focus);
      const channel = num(f.channel);
      if (!Number.isInteger(channel) || channel < 1 || channel > 99 || seen.has(channel)) fail();
      seen.add(channel);
      const line = version === 4 ? nearestHang(stage, vec(f.position)) : { hang: oneOf(f.hang, HANGS), along: num(f.along) };
      return clampFixture(stage, {
        id: str(f.id),
        channel,
        kind: oneOf(f.kind, FIXTURE_KINDS),
        name: str(f.name),
        ...line,
        castShadow: bool(f.castShadow),
        focus: {
          target: vec(fo.target),
          zoom: num(fo.zoom),
          sharpness: num(fo.sharpness),
          lamp: oneOf(fo.lamp, PAR_LAMP_KEYS),
          gel: color(fo.gel),
        },
      });
    });
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  const look = (v: unknown) => readLook(v, byId);
  return {
    version: 5,
    stage,
    venue: { template: version >= 3 ? readTemplate(o.venue, stage) : defaultTemplate(stage.shape) },
    ambient: o.ambient === undefined ? AMBIENT_DEFAULT : clamp(num(o.ambient), 0, 1),
    props: readProps(o.props),
    actors: readActors(o.actors, version),
    fixtures,
    cues: readCues(o.cues, look),
    live: look(o.live),
  };
}

// ── v1 → v5 ──

type V1Level = { intensity: number; color: string; target: Vec3; beamAngle: number; softness: number };

function readV1Level(v: unknown): V1Level {
  const o = obj(v);
  return {
    intensity: num(o.intensity),
    color: color(o.color),
    target: vec(o.target),
    beamAngle: num(o.beamAngle),
    softness: num(o.softness),
  };
}

function zoomFor(kind: FixtureKind, angle: number): { zoom: number; lamp: ParLamp } {
  if (kind === "par") {
    const lamp = PAR_LAMP_KEYS.reduce((a, b) =>
      Math.abs(PAR_LAMPS[b].angle - angle) < Math.abs(PAR_LAMPS[a].angle - angle) ? b : a,
    );
    return { zoom: 0.5, lamp };
  }
  const z = KNOBS[kind].zoom;
  return { zoom: z ? clamp((angle - z[1]) / (z[2] - z[1]), 0, 1) : 0.5, lamp: "mfl" };
}

function sharpnessFor(kind: FixtureKind, softness: number): number {
  const s = KNOBS[kind].sharp;
  return s ? clamp(1 - (softness - s[2]) / (s[1] - s[2]), 0, 1) : 0.8;
}

function nearestHang(stage: Stage, p: Vec3): { hang: HangId; along: number } {
  let best = { hang: "e1" as HangId, along: 0 };
  let bestD = Infinity;
  for (const hang of HANGS) {
    const boom = hang === "boomL" || hang === "boomR";
    const [lo, hi] = hangRange(stage, hang);
    const along = clamp(boom ? p.y : p.x, lo, hi);
    const q = hangPoint(stage, hang, along);
    const d = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
    if (d < bestD) {
      bestD = d;
      best = { hang, along };
    }
  }
  return best;
}

function migrateV1(o: Obj): Show {
  const stage = readStage(o.stage);
  const liveRaw = obj(obj(o.live).levels);
  const fixtures = arr(o.fixtures)
    .slice(0, LIMITS.fixtures)
    .map((x, i): Fixture => {
      const f = obj(x);
      const id = str(f.id);
      const kind = oneOf(f.kind, ["profile", "par", "fresnel", "follow", "cyc"] as const);
      const l = liveRaw[id] !== undefined ? readV1Level(liveRaw[id]) : null;
      const { zoom, lamp } = l ? zoomFor(kind, l.beamAngle) : { zoom: 0.5, lamp: "mfl" as ParLamp };
      return clampFixture(stage, {
        id,
        channel: i + 1,
        kind,
        name: str(f.name),
        ...nearestHang(stage, vec(f.position)),
        castShadow: bool(f.castShadow),
        focus: {
          target: l ? l.target : { x: 0, y: 0, z: -stage.depth / 2 },
          zoom,
          sharpness: l ? sharpnessFor(kind, l.softness) : 0.8,
          lamp,
          gel: l && !usesCueColor(kind) ? l.color : OPEN,
        },
      });
    });
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  const look = (v: unknown): LookState => {
    const lo = obj(v);
    const levels: Record<string, FixtureLevel> = {};
    for (const [id, raw] of Object.entries(obj(lo.levels))) {
      const f = byId.get(id);
      if (!f) continue;
      const l = readV1Level(raw);
      levels[id] = cleanLevel(f.kind, {
        intensity: l.intensity,
        color: l.color,
        target: l.target,
        zoom: zoomFor(f.kind, l.beamAngle).zoom,
      });
    }
    return { levels, haze: clamp(num(lo.haze), 0, 1) };
  };
  return {
    version: 5,
    stage,
    venue: { template: defaultTemplate(stage.shape) },
    ambient: AMBIENT_DEFAULT,
    props: readProps(o.props),
    actors: readActors(o.actors, 1),
    fixtures,
    cues: readCues(o.cues, look),
    live: look(o.live),
  };
}

export function deserialize(text: string): { show: Show; migrated: boolean } | null {
  try {
    const o = obj(JSON.parse(text));
    if (o.version === 5) return { show: readShow(o, 5), migrated: false };
    if (o.version === 4) return { show: readShow(o, 4), migrated: true };
    if (o.version === 3) return { show: readShow(o, 3), migrated: true };
    if (o.version === 2) return { show: readShow(o, 2), migrated: true };
    if (o.version === 1) return { show: migrateV1(o), migrated: true };
    return null;
  } catch {
    return null;
  }
}
