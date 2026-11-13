// 조명 연습실의 공연 데이터: 타입, 프리셋, 불변 조작, 직렬화.
// node:test가 그대로 실행하도록 런타임 import를 하지 않는다.
// 좌표: 미터, y 위. 무대 앞 끝 중앙이 원점, 업스테이지가 -z, 객석이 +z.

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

export type Build = "slim" | "average" | "stocky";
export type Pose = "stand" | "sit" | "armsOpen" | "walk";
export type Actor = {
  id: string;
  name: string;
  position: Vec3;
  rotationY: number;
  height: number;
  build: Build;
  pose: Pose;
  clothColor: string;
  skinColor: string;
};

export type FixtureKind = "profile" | "par" | "fresnel" | "follow" | "cyc";
export type Fixture = { id: string; kind: FixtureKind; name: string; position: Vec3; castShadow: boolean };

export type FixtureLevel = {
  intensity: number; // 0..1
  color: string; // #rrggbb
  target: Vec3; // 조준점
  beamAngle: number; // 도, 종류별 범위
  softness: number; // 0..1 → penumbra
};

export type LookState = { levels: Record<string, FixtureLevel>; haze: number };
export type Cue = { id: string; number: number; name: string; fadeSec: number; look: LookState };

export type Show = {
  version: 1;
  stage: Stage;
  props: Prop[];
  actors: Actor[];
  fixtures: Fixture[];
  cues: Cue[];
  live: LookState;
};

export const LIMITS = { fixtures: 24, props: 40, actors: 40, cues: 99 } as const;

export const STAGE_SHAPES: StageShape[] = ["proscenium", "thrust", "round"];
export const STAGE_LABELS: Record<StageShape, string> = { proscenium: "프로시니엄", thrust: "돌출", round: "원형" };
export const PROP_KINDS: PropKind[] = ["chair", "table", "stairs", "platform", "pillar", "box", "doorframe"];
export const FIXTURE_KINDS: FixtureKind[] = ["profile", "par", "fresnel", "follow", "cyc"];
export const BUILDS: Build[] = ["slim", "average", "stocky"];
export const BUILD_LABELS: Record<Build, string> = { slim: "마름", average: "보통", stocky: "통통" };
export const POSES: Pose[] = ["stand", "sit", "armsOpen", "walk"];
export const POSE_LABELS: Record<Pose, string> = { stand: "서기", sit: "앉기", armsOpen: "팔 벌리기", walk: "걷기" };

export const PROP_SPECS: Record<PropKind, { label: string; scale: Vec3; color: string }> = {
  chair: { label: "의자", scale: { x: 0.5, y: 0.9, z: 0.5 }, color: "#8a5a3c" },
  table: { label: "탁자", scale: { x: 1.4, y: 0.75, z: 0.8 }, color: "#6e4a32" },
  stairs: { label: "계단", scale: { x: 1.5, y: 0.6, z: 1.2 }, color: "#3c3c44" },
  platform: { label: "단", scale: { x: 2, y: 0.4, z: 1.5 }, color: "#2e2e36" },
  pillar: { label: "기둥", scale: { x: 0.5, y: 3, z: 0.5 }, color: "#d8d2c4" },
  box: { label: "상자", scale: { x: 0.6, y: 0.6, z: 0.6 }, color: "#a08060" },
  doorframe: { label: "문틀", scale: { x: 1.2, y: 2.2, z: 0.2 }, color: "#c8c0b0" },
};

export const FIXTURE_SPECS: Record<FixtureKind, { label: string; beam: [number, number, number]; softness: number }> = {
  profile: { label: "프로필", beam: [15, 50, 26], softness: 0.1 },
  par: { label: "PAR 워시", beam: [10, 60, 40], softness: 0.4 },
  fresnel: { label: "프레넬", beam: [15, 70, 45], softness: 0.7 },
  follow: { label: "팔로우", beam: [5, 30, 12], softness: 0.2 },
  cyc: { label: "호리존트", beam: [60, 100, 90], softness: 0.9 },
};

const COORD = 30; // x·z 좌표 상한(±)
const MAX_Y = 15;

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const HEX = /^#[0-9a-f]{6}$/i;

function clampVec(v: Vec3, yLo = 0): Vec3 {
  return { x: clamp(v.x, -COORD, COORD), y: clamp(v.y, yLo, MAX_Y), z: clamp(v.z, -COORD, COORD) };
}

export function clampStage(s: Stage): Stage {
  return {
    ...s,
    width: clamp(s.width, 4, 20),
    depth: clamp(s.depth, 3, 15),
    height: clamp(s.height, 3, 12),
  };
}

export function clampLevel(kind: FixtureKind, l: FixtureLevel): FixtureLevel {
  const [lo, hi] = FIXTURE_SPECS[kind].beam;
  return {
    ...l,
    intensity: clamp(l.intensity, 0, 1),
    target: clampVec(l.target),
    beamAngle: clamp(l.beamAngle, lo, hi),
    softness: clamp(l.softness, 0, 1),
  };
}

function clampProp(p: Prop): Prop {
  return {
    ...p,
    position: clampVec(p.position),
    scale: { x: clamp(p.scale.x, 0.1, 10), y: clamp(p.scale.y, 0.1, 10), z: clamp(p.scale.z, 0.1, 10) },
  };
}

function clampActor(a: Actor): Actor {
  return { ...a, name: a.name.slice(0, 20), position: clampVec(a.position), height: clamp(a.height, 1, 2.1) };
}

function clampFixture(f: Fixture): Fixture {
  return { ...f, name: f.name.slice(0, 20), position: clampVec(f.position) };
}

function defaultLevel(fixture: Fixture, intensity = 0, color = "#ffffff"): FixtureLevel {
  const spec = FIXTURE_SPECS[fixture.kind];
  return {
    intensity,
    color,
    target: { x: fixture.position.x, y: 0, z: fixture.position.z },
    beamAngle: spec.beam[2],
    softness: spec.softness,
  };
}

export function levelOf(look: LookState, fixture: Fixture): FixtureLevel {
  return look.levels[fixture.id] ?? defaultLevel(fixture);
}

function copyLook(look: LookState): LookState {
  const levels: Record<string, FixtureLevel> = {};
  for (const [id, l] of Object.entries(look.levels)) levels[id] = { ...l, target: { ...l.target } };
  return { levels, haze: look.haze };
}

function makeFixture(kind: FixtureKind, name: string, position: Vec3, castShadow: boolean): Fixture {
  return { id: newId("fx"), kind, name, position, castShadow };
}

function makeActor(name: string, x: number, z: number, clothColor: string): Actor {
  return {
    id: newId("ac"),
    name,
    position: { x, y: 0, z },
    rotationY: 0,
    height: 1.7,
    build: "average",
    pose: "stand",
    clothColor,
    skinColor: "#d9a88a",
  };
}

export function defaultShow(): Show {
  const fixtures: [Fixture, Vec3, string][] = [
    [makeFixture("profile", "앞 왼쪽", { x: -2, y: 6, z: 3 }, true), { x: -1, y: 0, z: -3 }, "#ffffff"],
    [makeFixture("profile", "앞 오른쪽", { x: 2, y: 6, z: 3 }, true), { x: 1, y: 0, z: -3 }, "#ffffff"],
    [makeFixture("par", "위 왼쪽", { x: -2.5, y: 6, z: -4 }, true), { x: -1.5, y: 0, z: -4 }, "#ffffff"],
    [makeFixture("par", "위 오른쪽", { x: 2.5, y: 6, z: -4 }, true), { x: 1.5, y: 0, z: -4 }, "#ffffff"],
    [makeFixture("fresnel", "뒤", { x: 0, y: 6, z: -7.5 }, true), { x: 0, y: 0, z: -3 }, "#ffffff"],
    [makeFixture("cyc", "호리존트", { x: 0, y: 0.3, z: -7.5 }, false), { x: 0, y: 4, z: -8 }, "#4060ff"],
  ];
  const levels: Record<string, FixtureLevel> = {};
  for (const [f, target, color] of fixtures) levels[f.id] = { ...defaultLevel(f, 0.8, color), target };
  const live: LookState = { levels, haze: 0.4 };
  return {
    version: 1,
    stage: {
      shape: "proscenium",
      width: 10,
      depth: 8,
      height: 6,
      floorColor: "#3a3a40",
      backdropColor: "#202028",
    },
    props: [],
    actors: [makeActor("인물 1", -1, -3, "#7a2e3a"), makeActor("인물 2", 1, -3, "#2e4a7a")],
    fixtures: fixtures.map(([f]) => f),
    cues: [{ id: newId("cue"), number: 1, name: "처음", fadeSec: 3, look: copyLook(live) }],
    live,
  };
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

export function addActor(show: Show): Show {
  if (show.actors.length >= LIMITS.actors) return show;
  const n = show.actors.length + 1;
  return { ...show, actors: [...show.actors, makeActor(`인물 ${n}`, 0, -show.stage.depth / 2, "#5a5a5a")] };
}

export function addFixture(show: Show, kind: FixtureKind): Show {
  if (show.fixtures.length >= LIMITS.fixtures) return show;
  const spec = FIXTURE_SPECS[kind];
  const h = show.stage.height;
  const position: Vec3 =
    kind === "cyc" ? { x: 0, y: 0.3, z: -show.stage.depth + 0.5 } : kind === "profile" || kind === "follow"
      ? { x: 0, y: h, z: 3 }
      : { x: 0, y: h, z: -show.stage.depth / 2 };
  const n = show.fixtures.filter((f) => f.kind === kind).length + 1;
  const f = makeFixture(kind, `${spec.label} ${n}`, position, false);
  const level = { ...defaultLevel(f), target: { x: 0, y: 0, z: -show.stage.depth / 2 } };
  return {
    ...show,
    fixtures: [...show.fixtures, f],
    live: { ...show.live, levels: { ...show.live.levels, [f.id]: level } },
  };
}

function updateIn<T extends { id: string }>(list: T[], id: string, fn: (t: T) => T): T[] | null {
  const i = list.findIndex((t) => t.id === id);
  if (i < 0) return null;
  const next = list.slice();
  next[i] = fn(list[i]);
  return next;
}

export function updateProp(show: Show, id: string, patch: Partial<Prop>): Show {
  const props = updateIn(show.props, id, (p) => clampProp({ ...p, ...patch, id: p.id, kind: p.kind }));
  return props ? { ...show, props } : show;
}

export function updateActor(show: Show, id: string, patch: Partial<Actor>): Show {
  const actors = updateIn(show.actors, id, (a) => clampActor({ ...a, ...patch, id: a.id }));
  return actors ? { ...show, actors } : show;
}

export function updateFixture(show: Show, id: string, patch: Partial<Fixture>): Show {
  const old = show.fixtures.find((f) => f.id === id);
  const fixtures = updateIn(show.fixtures, id, (f) => clampFixture({ ...f, ...patch, id: f.id }));
  if (!fixtures || !old) return show;
  const next = fixtures.find((f) => f.id === id)!;
  if (next.kind === old.kind) return { ...show, fixtures };
  // 종류가 바뀌면 빔 각도를 새 범위로 맞춘다.
  const fix = (look: LookState): LookState =>
    look.levels[id] ? { ...look, levels: { ...look.levels, [id]: clampLevel(next.kind, look.levels[id]) } } : look;
  return { ...show, fixtures, live: fix(show.live), cues: show.cues.map((c) => ({ ...c, look: fix(c.look) })) };
}

export function updateStage(show: Show, patch: Partial<Stage>): Show {
  return { ...show, stage: clampStage({ ...show.stage, ...patch }) };
}

export function updateLevel(show: Show, fixtureId: string, patch: Partial<FixtureLevel>): Show {
  const f = show.fixtures.find((x) => x.id === fixtureId);
  if (!f) return show;
  const level = clampLevel(f.kind, { ...levelOf(show.live, f), ...patch });
  return { ...show, live: { ...show.live, levels: { ...show.live.levels, [fixtureId]: level } } };
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

export function sortedCues(show: Show): Cue[] {
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

function readLevel(v: unknown): FixtureLevel {
  const o = obj(v);
  return {
    intensity: num(o.intensity),
    color: color(o.color),
    target: vec(o.target),
    beamAngle: num(o.beamAngle),
    softness: num(o.softness),
  };
}

function readLook(v: unknown, fixtures: Map<string, Fixture>): LookState {
  const o = obj(v);
  const levels: Record<string, FixtureLevel> = {};
  for (const [id, raw] of Object.entries(obj(o.levels))) {
    const f = fixtures.get(id);
    if (f) levels[id] = clampLevel(f.kind, readLevel(raw));
  }
  return { levels, haze: clamp(num(o.haze), 0, 1) };
}

export function deserialize(text: string): Show | null {
  try {
    const o = obj(JSON.parse(text));
    if (o.version !== 1) return null;
    const so = obj(o.stage);
    const stage = clampStage({
      shape: oneOf(so.shape, STAGE_SHAPES),
      width: num(so.width),
      depth: num(so.depth),
      height: num(so.height),
      floorColor: color(so.floorColor),
      backdropColor: color(so.backdropColor),
    });
    const props = arr(o.props).slice(0, LIMITS.props).map((v): Prop => {
      const p = obj(v);
      return clampProp({
        id: str(p.id),
        kind: oneOf(p.kind, PROP_KINDS),
        position: vec(p.position),
        rotationY: num(p.rotationY),
        scale: vec(p.scale),
        color: color(p.color),
      });
    });
    const actors = arr(o.actors).slice(0, LIMITS.actors).map((v): Actor => {
      const a = obj(v);
      return clampActor({
        id: str(a.id),
        name: str(a.name),
        position: vec(a.position),
        rotationY: num(a.rotationY),
        height: num(a.height),
        build: oneOf(a.build, BUILDS),
        pose: oneOf(a.pose, POSES),
        clothColor: color(a.clothColor),
        skinColor: color(a.skinColor),
      });
    });
    const fixtures = arr(o.fixtures).slice(0, LIMITS.fixtures).map((v): Fixture => {
      const f = obj(v);
      return clampFixture({
        id: str(f.id),
        kind: oneOf(f.kind, FIXTURE_KINDS),
        name: str(f.name),
        position: vec(f.position),
        castShadow: bool(f.castShadow),
      });
    });
    const byId = new Map(fixtures.map((f) => [f.id, f]));
    const cues = arr(o.cues).slice(0, LIMITS.cues).map((v): Cue => {
      const c = obj(v);
      return {
        id: str(c.id),
        number: num(c.number),
        name: str(c.name).slice(0, 30),
        fadeSec: clamp(num(c.fadeSec), 0, 60),
        look: readLook(c.look, byId),
      };
    });
    return { version: 1, stage, props, actors, fixtures, cues, live: readLook(o.live, byId) };
  } catch {
    return null;
  }
}
