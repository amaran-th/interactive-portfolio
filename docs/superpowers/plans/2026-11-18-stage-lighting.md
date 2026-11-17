# 무대조명 시뮬레이터 (1단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 무대·배우·소품을 배치하고 조명기를 직접 끌어 걸고, 큐를 저장해 GO로 페이드하는 3D 무대조명 연습 도구 `/stage-lighting`을 서비스 앱에 추가한다.

**Architecture:**
- 데이터와 계산은 DOM·three.js 없는 순수 모듈 여섯 개로 나누고 `node:test`로 검증한다.
  - `fixtures.ts`, `objects.ts`, `rig.ts`, `cues.ts`, `history.ts`, `show.ts`
  - 이들은 서로를 `./x.ts`로 import한다.
- 3D는 `meshes.ts`(모양 만들기)와 `useStageScene.ts`(장면·카메라·선택·연무)가 맡는다.
- 화면은 `StageLighting.tsx`(상태·입력·큐 재생·저장)와 `panels.tsx`(탭 패널·큐 막대)로 나눈다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, three 0.187(+OrbitControls), node:test, Playwright(검증만)

**Spec:** `docs/superpowers/specs/2026-11-14-stage-lighting-design.md`

## Global Constraints

- 새 npm 의존성은 없다. `three`·`@types/three`는 이미 있다.
- `apps/services/tsconfig.json`에 `"allowImportingTsExtensions": true`를 켠다(Task 1). 순수 모듈끼리는 `./x.ts`로 import하고, 화면·장면 코드에서는 확장자 없이 import한다.
- 순수 모듈 6개는 three·React·DOM을 쓰지 않는다. 테스트는 `*.test.mts`로 두고 `./x.ts`로 import한다.
- 좌표:
  - 단위는 미터. 무대 앞 가장자리 가운데가 원점이다.
  - x는 관객이 볼 때 오른쪽, y는 위, z는 객석 쪽(+)이다. 객석 바닥 y = 0이다.
- 개수 제한: 조명기 16개, 오브젝트 40개, 큐 99개, 실행 취소 100단계
- localStorage 키는 `stage-lighting-show` 하나다. 개인정보처리방침 `STORAGE_ITEMS`에 추가한다.
- 커밋 메시지는 `feat : …` / `fix : …` / `docs : …`이고, `Co-Authored-By`는 넣지 않는다.
- `TOOLS` 항목은 해요체, `guide.ts`는 합니다체로 쓴다. 번역투와 같은 단어 반복을 피한다.
- 명령은 별도 표기가 없으면 `apps/services`에서 실행한다.

## Review Focus

1. 무대를 줄이거나 모양을 바꿨을 때 무대 밖에 남는 배우·소품 → 새 무대 안으로 들어온다. → Task 4 `updateStage` 테스트.
2. 큐를 만든 뒤 추가한 조명기 → 그 큐로 GO하면 꺼진다(밝기 0). → Task 3 `interpolateLevels` 테스트, Task 4 `addFixture` 테스트.
3. 조명기 삭제 후 저장값 → 모든 큐와 라이브 값에서 사라져 다시 읽어도 유효하다. → Task 4 `removeFixture` + 직렬화 왕복 테스트.
4. 슬라이더를 끄는 동안 쌓이는 변경 → 실행 취소 한 번에 끄기 전 값으로 돌아간다. → Task 3 `history` 병합 테스트.
5. 페이드 중 GO 연타·값 편집 → 진행 중 페이드를 끝 상태로 맞추고 다음으로 가거나, 그 자리에서 멈춘다. 상태가 꼬이지 않는다. → Task 7 GO 로직 코드, Task 8 Playwright(GO 연타 후 cueIndex).

---

## File Structure

| 파일 | 역할 |
|---|---|
| `components/works/11_StageLighting/fixtures.ts` (+test) | 조명기 종류·범위·젤·정규화 |
| `components/works/11_StageLighting/objects.ts` (+test) | 배우 자세·소품 10종·정규화 |
| `components/works/11_StageLighting/rig.ts` (+test) | 무대 설정·높이 버튼·범위·격자·무대 안 맞춤·기본 자리·평면도 화면 크기 |
| `components/works/11_StageLighting/cues.ts` (+test) | 큐 편집·보간·이동 |
| `components/works/11_StageLighting/history.ts` (+test) | 실행 취소·병합 |
| `components/works/11_StageLighting/show.ts` (+test) | 공연 타입·기본 공연·편집 함수·직렬화 |
| `components/works/11_StageLighting/meshes.ts` | 배우·소품·조명기 몸체·이름표 메시 |
| `components/works/11_StageLighting/useStageScene.ts` | three.js 장면 |
| `components/works/11_StageLighting/panels.tsx` | 탭 패널 3개·큐 막대 |
| `components/works/11_StageLighting/StageLighting.tsx` | 상태·입력·큐 재생·저장 |
| `app/stage-lighting/page.tsx`, `guide.ts` | 라우트·안내 |
| `lib/tools.ts`, `lib/tools.test.mts`, `app/privacy/page.tsx` | 등록 |
| `tsconfig.json`(서비스) | `allowImportingTsExtensions` |
| `CLAUDE.md`(루트) | 구조·테스트 명령 |

설계 문서와 다른 점: 파일 표에 없던 `objects.ts`(오브젝트 종류·정규화)와 `panels.tsx`(패널 UI)를 더해 파일 하나가 맡는 일을 줄였다.

---

### Task 1: 조명기·오브젝트 정의

**Files:**
- Modify: `tsconfig.json`
- Create: `components/works/11_StageLighting/fixtures.ts`, `fixtures.test.mts`, `objects.ts`, `objects.test.mts`

**Interfaces:**
- Produces (`fixtures.ts`):
  - 타입:
    - `type FixtureType = "profile" | "fresnel" | "par" | "followspot" | "cyc"`
    - `type FixtureSpec = { label: string; beam: Range; softness: Range; maxCandela: number }`
    - `type Range = { min: number; max: number; def: number }`
  - 상수: `FIXTURE_SPECS`, `FIXTURE_TYPES: FixtureType[]`, `MAX_FIXTURES = 16`, `GELS: { name: string; color: string }[]`
  - 함수:
    - `clamp(v, lo, hi): number`
    - `isHexColor(v: unknown): v is string`
    - `isFixtureType(v: unknown): v is FixtureType`
    - `normalizeBeam(type, deg): number`
    - `normalizeSoftness(type, v): number`
    - `normalizeLevel(v): number`
    - `candela(type, level): number`
- Produces (`objects.ts`):
  - 타입:
    - `type PersonPose = "stand" | "sit" | "arms" | "walk" | "lie"`
    - `type PropType = "chair" | "table" | "bed" | "stairs" | "platform" | "tree" | "doorframe" | "column" | "box" | "lamppost"`
    - `type StageObject` (배우/소품 판별 유니온, 아래 코드)
  - 상수: `POSES`, `PROPS`, `MAX_OBJECTS = 40`, `PERSON_HEIGHT`, `SCALE`
  - 함수:
    - `isPose(v): v is PersonPose`
    - `isProp(v): v is PropType`
    - `normalizeRotation(deg): number`
    - `normalizeScale(v): number`
    - `normalizeHeight(v): number`

- [ ] **Step 1: tsconfig**

`tsconfig.json`의 `"noEmit": true,` 다음 줄에 추가:

```json
    "allowImportingTsExtensions": true,
```

Run: `npx tsc --noEmit -p .`
Expected: 출력 없음

- [ ] **Step 2: 테스트 작성**

`components/works/11_StageLighting/fixtures.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIXTURE_TYPES,
  GELS,
  candela,
  isFixtureType,
  isHexColor,
  normalizeBeam,
  normalizeLevel,
  normalizeSoftness,
} from "./fixtures.ts";

test("빔 각도는 종류별 범위로 맞추고 숫자가 아니면 기본값", () => {
  assert.equal(normalizeBeam("profile", 90), 50);
  assert.equal(normalizeBeam("profile", 5), 19);
  assert.equal(normalizeBeam("profile", Number.NaN), 26);
  assert.equal(normalizeBeam("followspot", 30), 20);
  assert.equal(normalizeBeam("cyc", 50), 70);
  assert.equal(normalizeBeam("par", 33.6), 34);
});

test("가장자리 부드러움은 종류별 범위, 소수 둘째 자리", () => {
  assert.equal(normalizeSoftness("fresnel", 0.1), 0.5);
  assert.equal(normalizeSoftness("cyc", 2), 1);
  assert.equal(normalizeSoftness("profile", 0.123), 0.12);
  assert.equal(normalizeSoftness("par", Number.NaN), 0.45);
});

test("밝기는 0~100 정수", () => {
  assert.equal(normalizeLevel(120), 100);
  assert.equal(normalizeLevel(-5), 0);
  assert.equal(normalizeLevel(49.6), 50);
  assert.equal(normalizeLevel(Number.NaN), 0);
});

test("광도는 최대 광도 × 밝기", () => {
  assert.equal(candela("par", 50), 2000);
  assert.equal(candela("profile", 0), 0);
});

test("종류·색 판별", () => {
  assert.equal(isFixtureType("par"), true);
  assert.equal(isFixtureType("toString"), false);
  assert.equal(isFixtureType(3), false);
  assert.equal(isHexColor("#a1B2c3"), true);
  assert.equal(isHexColor("red"), false);
  assert.equal(FIXTURE_TYPES.length, 5);
  assert.equal(GELS.length, 12);
  assert.ok(GELS.every((g) => isHexColor(g.color)));
});
```

`components/works/11_StageLighting/objects.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROPS,
  isPose,
  isProp,
  normalizeHeight,
  normalizeRotation,
  normalizeScale,
} from "./objects.ts";

test("방향은 15° 단위로, 0~345", () => {
  assert.equal(normalizeRotation(-15), 345);
  assert.equal(normalizeRotation(370), 15);
  assert.equal(normalizeRotation(7), 0);
  assert.equal(normalizeRotation(360), 0);
});

test("크기 배율·키 범위", () => {
  assert.equal(normalizeScale(3), 2);
  assert.equal(normalizeScale(0.1), 0.5);
  assert.equal(normalizeScale(Number.NaN), 1);
  assert.equal(normalizeHeight(2.5), 2);
  assert.equal(normalizeHeight(1.234), 1.4);
  assert.equal(normalizeHeight(1.777), 1.78);
  assert.equal(normalizeHeight(Number.NaN), 1.75);
});

test("자세·소품 판별과 소품 10종", () => {
  assert.equal(isPose("sit"), true);
  assert.equal(isPose("fly"), false);
  assert.equal(isProp("lamppost"), true);
  assert.equal(isProp("constructor"), false);
  assert.equal(Object.keys(PROPS).length, 10);
});
```

- [ ] **Step 3: 실패 확인**

Run: `node --test components/works/11_StageLighting/fixtures.test.mts components/works/11_StageLighting/objects.test.mts`
Expected: FAIL (`Cannot find module …/fixtures.ts`)

- [ ] **Step 4: 구현**

`components/works/11_StageLighting/fixtures.ts`:

```ts
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
```

`components/works/11_StageLighting/objects.ts`:

```ts
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
```

- [ ] **Step 5: 통과 확인**

Run: `node --test components/works/11_StageLighting/fixtures.test.mts components/works/11_StageLighting/objects.test.mts && npx tsc --noEmit -p .`
Expected: PASS (8 tests), tsc 출력 없음

- [ ] **Step 6: 커밋**

```bash
git add tsconfig.json components/works/11_StageLighting/fixtures.ts components/works/11_StageLighting/fixtures.test.mts components/works/11_StageLighting/objects.ts components/works/11_StageLighting/objects.test.mts
git commit -m "feat : 무대조명 시뮬레이터 조명기·무대 요소 정의"
```

---

### Task 2: 무대·리깅 계산

**Files:**
- Create: `components/works/11_StageLighting/rig.ts`, `rig.test.mts`

**Interfaces:**
- Consumes: `clamp`, `FixtureType` (Task 1)
- Produces:
  - 타입:
    - `type StageShape = "proscenium" | "thrust" | "arena"`
    - `type StageSettings = { shape; width; depth; deckHeight; floorColor; cycOn; cycColor }`
    - `type Vec3 = { x: number; y: number; z: number }`
    - `type Focus = { x: number; z: number; height: number }`
  - 상수: `GRID = 0.25`, `STAGE_LIMITS`, `DEFAULT_STAGE`, `FOCUS_HEIGHT`
  - 함수:
    - `snap(v, grid?)`
    - `heightPresets(stage): { floor; boom; batten; foh }`
    - `fixtureBounds(stage)`
    - `normalizePosition(p, stage, useGrid?)`
    - `normalizeFocus(f, stage, useGrid?)`
    - `focusPoint(f, stage): Vec3`
    - `stageCenter(stage): { x; z }`
    - `clampToStage(x, z, stage)`
    - `normalizeObjectPosition(x, z, stage, useGrid?)`
    - `defaultPlacement(type, stage, existing: Vec3[]): { position: Vec3; focus: Focus }`
    - `normalizeStage(patch, base): StageSettings`
    - `planHalfHeight(stage, aspect): number`

- [ ] **Step 1: 테스트 작성**

`components/works/11_StageLighting/rig.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STAGE,
  clampToStage,
  defaultPlacement,
  fixtureBounds,
  heightPresets,
  normalizeFocus,
  normalizeObjectPosition,
  normalizePosition,
  normalizeStage,
  planHalfHeight,
  snap,
  stageCenter,
} from "./rig.ts";

const S = DEFAULT_STAGE; // 폭 12, 깊이 8, 바닥 0.9

test("격자 맞춤은 -0을 만들지 않는다", () => {
  assert.equal(snap(1.13), 1.25);
  assert.ok(Object.is(snap(-0.1), 0));
});

test("높이 버튼 값은 무대 바닥 높이를 따른다", () => {
  assert.deepEqual(heightPresets(S), { floor: 1.1, boom: 3.4, batten: 6.5, foh: 7 });
  assert.deepEqual(heightPresets({ ...S, deckHeight: 0 }).floor, 0.2);
});

test("조명기 위치는 범위 안으로, 격자는 끌 수 있다", () => {
  assert.deepEqual(normalizePosition({ x: 100, y: -5, z: -100 }, S), { x: 16, y: 0.2, z: -10 });
  assert.deepEqual(normalizePosition({ x: 1.13, y: 6.4, z: 0.12 }, S), { x: 1.25, y: 6.5, z: 0 });
  assert.deepEqual(normalizePosition({ x: 1.13, y: 6.4, z: 0.12 }, S, false), { x: 1.13, y: 6.4, z: 0.12 });
  const arena = fixtureBounds({ ...S, shape: "arena", width: 14 });
  assert.equal(arena.minZ, -16);
});

test("겨누는 높이는 0~2m", () => {
  assert.equal(normalizeFocus({ x: 0, z: -4, height: 5 }, S).height, 2);
  assert.equal(normalizeFocus({ x: 0, z: -4, height: Number.NaN }, S).height, 1);
});

test("무대 모양별로 배우·소품을 무대 안으로 맞춘다", () => {
  assert.deepEqual(clampToStage(10, 3, S), { x: 6, z: 0 });
  const thrust = { ...S, shape: "thrust" as const };
  assert.deepEqual(clampToStage(5, 2, thrust), { x: 3, z: 2 });
  assert.deepEqual(clampToStage(0, 10, thrust), { x: 0, z: 4 });
  const arena = { ...S, shape: "arena" as const };
  const c = stageCenter(arena);
  assert.deepEqual(c, { x: 0, z: -6 });
  const p = clampToStage(20, -6, arena);
  assert.ok(Math.abs(Math.hypot(p.x - c.x, p.z - c.z) - 6) < 1e-9);
  assert.deepEqual(normalizeObjectPosition(-0.1, -3.13, S), { x: 0, z: -3.25 });
});

test("새 조명기 기본 자리와 겹침 피하기", () => {
  const a = defaultPlacement("profile", S, []);
  assert.deepEqual(a.position, { x: 0, y: 6.5, z: -2.4 });
  assert.deepEqual(a.focus, { x: 0, z: -4, height: 1 });
  const b = defaultPlacement("profile", S, [a.position]);
  assert.equal(b.position.x, 1);
  const f = defaultPlacement("followspot", S, []);
  assert.deepEqual(f.position, { x: 0, y: 7, z: 6 });
  const cyc = defaultPlacement("cyc", S, []);
  assert.deepEqual(cyc.position, { x: 0, y: 6.5, z: -6.8 });
  assert.deepEqual(cyc.focus, { x: 0, z: -8, height: 2 });
});

test("무대 설정 정규화", () => {
  const s = normalizeStage({ width: 30, depth: 1, deckHeight: 9, floorColor: "red" }, S);
  assert.equal(s.width, 20);
  assert.equal(s.depth, 4);
  assert.equal(s.deckHeight, 1.5);
  assert.equal(s.floorColor, S.floorColor);
});

test("평면도 화면 반높이는 무대가 다 들어오게 잡는다", () => {
  assert.ok(Math.abs(planHalfHeight(S, 2) - 8.8) < 1e-9);
  assert.ok(Math.abs(planHalfHeight(S, 0.5) - 19.8) < 1e-9);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test components/works/11_StageLighting/rig.test.mts`
Expected: FAIL (`Cannot find module …/rig.ts`)

- [ ] **Step 3: 구현**

`components/works/11_StageLighting/rig.ts`:

```ts
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
```

- [ ] **Step 4: 통과 확인**

Run: `node --test components/works/11_StageLighting/rig.test.mts && npx tsc --noEmit -p .`
Expected: PASS (8 tests), tsc 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add components/works/11_StageLighting/rig.ts components/works/11_StageLighting/rig.test.mts
git commit -m "feat : 무대조명 시뮬레이터 무대·조명기 위치 계산"
```

---

### Task 3: 큐와 실행 취소

**Files:**
- Create: `components/works/11_StageLighting/cues.ts`, `cues.test.mts`, `history.ts`, `history.test.mts`

**Interfaces:**
- Consumes: `clamp`, `normalizeLevel`, `isHexColor` (Task 1)
- Produces (`cues.ts`):
  - 타입:
    - `type Level = { intensity: number; color: string }`
    - `type Levels = Record<string, Level>`
    - `type Cue = { id: string; label: string; fade: number; levels: Levels }`
  - 상수: `MAX_CUES = 99`, `DEFAULT_FADE = 3`, `BACK_FADE = 1`, `OFF`
  - 레벨·보간:
    - `levelOf(levels, id): Level`
    - `normalizeFade(v): number`
    - `mixColor(a, b, t): string`
    - `interpolateLevels(from, to, ids, t): Levels`
    - `pickLevels(levels, ids): Levels`
    - `levelsEqual(a, b, ids): boolean`
  - 큐 편집:
    - `recordCue(cues, live, ids, id, fade?): Cue[] | null`
    - `overwriteCue(cues, index, live, ids): Cue[]`
    - `deleteCue(cues, index): Cue[]`
    - `moveCue(cues, index, dir: -1 | 1): Cue[]`
    - `removeFixtureFromCues(cues, fixtureId): Cue[]`
  - 재생:
    - `nextIndex(cueIndex, length): number | null`
    - `prevIndex(cueIndex): number | null`
- Produces (`history.ts`):
  - 타입: `type History<T> = { past: T[]; future: T[]; lastKey: string | null; lastTime: number }`
  - 상수: `MAX_HISTORY = 100`, `COALESCE_MS = 600`
  - 함수:
    - `createHistory<T>(): History<T>`
    - `record<T>(h, prev: T, key?: string | null, now?: number): void`
    - `undo<T>(h, current: T): T | null`
    - `redo<T>(h, current: T): T | null`
    - `canUndo(h)`, `canRedo(h)`

- [ ] **Step 1: 테스트 작성**

`components/works/11_StageLighting/cues.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CUES,
  deleteCue,
  interpolateLevels,
  levelOf,
  levelsEqual,
  mixColor,
  moveCue,
  nextIndex,
  normalizeFade,
  overwriteCue,
  prevIndex,
  recordCue,
  removeFixtureFromCues,
  type Cue,
  type Levels,
} from "./cues.ts";

const live: Levels = { a: { intensity: 80, color: "#ffffff" }, b: { intensity: 20, color: "#2246d8" } };

test("색은 선형 RGB에서 섞는다", () => {
  assert.equal(mixColor("#000000", "#ffffff", 0), "#000000");
  assert.equal(mixColor("#000000", "#ffffff", 1), "#ffffff");
  assert.equal(mixColor("#000000", "#ffffff", 0.5), "#bcbcbc");
});

test("보간: 밝기는 선형, 큐에 없는 조명기는 0", () => {
  const to: Levels = { a: { intensity: 0, color: "#000000" } };
  const mid = interpolateLevels(live, to, ["a", "b"], 0.5);
  assert.equal(mid.a.intensity, 40);
  assert.equal(mid.a.color, "#bcbcbc");
  assert.equal(mid.b.intensity, 10);
  const end = interpolateLevels(live, to, ["a", "b", "c"], 1);
  assert.deepEqual(end.b, { intensity: 0, color: "#ffffff" });
  assert.deepEqual(end.c, { intensity: 0, color: "#ffffff" });
  assert.deepEqual(interpolateLevels(live, to, ["a"], -1).a, live.a);
  assert.deepEqual(levelOf({}, "x"), { intensity: 0, color: "#ffffff" });
});

test("큐 저장·덮어쓰기·삭제·이동", () => {
  let cues: Cue[] = recordCue([], live, ["a", "b"], "c1")!;
  assert.equal(cues[0].label, "큐 1");
  assert.equal(cues[0].fade, 3);
  assert.notEqual(cues[0].levels.a, live.a);
  cues = recordCue(cues, { a: { intensity: 10, color: "#ffffff" } }, ["a"], "c2", 0)!;
  assert.equal(cues[1].fade, 0);
  cues = overwriteCue(cues, 0, { a: { intensity: 55, color: "#ff8a2a" } }, ["a"]);
  assert.deepEqual(cues[0].levels, { a: { intensity: 55, color: "#ff8a2a" } });
  cues = moveCue(cues, 0, 1);
  assert.deepEqual(cues.map((c) => c.id), ["c2", "c1"]);
  assert.equal(moveCue(cues, 1, 1), cues);
  cues = deleteCue(cues, 0);
  assert.deepEqual(cues.map((c) => c.id), ["c1"]);
});

test("큐는 최대 MAX_CUES개", () => {
  let cues: Cue[] = [];
  for (let i = 0; i < MAX_CUES; i++) cues = recordCue(cues, live, ["a"], `c${i}`)!;
  assert.equal(recordCue(cues, live, ["a"], "over"), null);
});

test("조명기를 지우면 모든 큐에서 빠진다", () => {
  const cues = recordCue(recordCue([], live, ["a", "b"], "c1")!, live, ["a", "b"], "c2")!;
  const next = removeFixtureFromCues(cues, "b");
  assert.ok(next.every((c) => !("b" in c.levels)));
});

test("바뀜 비교·페이드 시간·다음/이전", () => {
  assert.equal(levelsEqual(live, { ...live }, ["a", "b"]), true);
  assert.equal(levelsEqual(live, { ...live, a: { intensity: 79, color: "#ffffff" } }, ["a"]), false);
  assert.equal(levelsEqual({ a: { intensity: 40.2, color: "#FFFFFF" } }, { a: { intensity: 40, color: "#ffffff" } }, ["a"]), true);
  assert.equal(normalizeFade(45), 30);
  assert.equal(normalizeFade(-1), 0);
  assert.equal(normalizeFade(1.26), 1.3);
  assert.equal(nextIndex(0, 3), 1);
  assert.equal(nextIndex(2, 3), null);
  assert.equal(nextIndex(-1, 0), null);
  assert.equal(prevIndex(0), null);
  assert.equal(prevIndex(2), 1);
});
```

`components/works/11_StageLighting/history.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { COALESCE_MS, MAX_HISTORY, canRedo, canUndo, createHistory, record, redo, undo } from "./history.ts";

test("기록·실행 취소·다시 실행", () => {
  const h = createHistory<number>();
  record(h, 1);
  record(h, 2);
  assert.equal(undo(h, 3), 2);
  assert.equal(undo(h, 2), 1);
  assert.equal(undo(h, 1), null);
  assert.equal(redo(h, 1), 2);
  assert.equal(redo(h, 2), 3);
  assert.equal(canRedo(h), false);
  assert.equal(canUndo(h), true);
});

test("새 기록은 다시 실행 목록을 비운다", () => {
  const h = createHistory<number>();
  record(h, 1);
  undo(h, 2);
  record(h, 1);
  assert.equal(canRedo(h), false);
});

test("같은 key로 짧게 이어진 변경은 한 단계로 합친다", () => {
  const h = createHistory<number>();
  record(h, 10, "level-a", 0);
  record(h, 11, "level-a", 200);
  record(h, 12, "level-a", 400);
  assert.equal(h.past.length, 1);
  record(h, 13, "level-a", 400 + COALESCE_MS + 1);
  assert.equal(h.past.length, 2);
  record(h, 14, "level-b", 400 + COALESCE_MS + 2);
  assert.equal(h.past.length, 3);
  assert.equal(undo(h, 15), 14);
});

test("최대 MAX_HISTORY단계", () => {
  const h = createHistory<number>();
  for (let i = 0; i < MAX_HISTORY + 5; i++) record(h, i);
  assert.equal(h.past.length, MAX_HISTORY);
  assert.equal(h.past[0], 5);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test components/works/11_StageLighting/cues.test.mts components/works/11_StageLighting/history.test.mts`
Expected: FAIL (`Cannot find module`)

- [ ] **Step 3: 구현**

`components/works/11_StageLighting/cues.ts`:

```ts
// 큐(조명 장면) 편집과 큐 사이 보간. node:test 대상 순수 모듈.
import { clamp, isHexColor, normalizeLevel } from "./fixtures.ts";

export type Level = { intensity: number; color: string };
export type Levels = Record<string, Level>;
export type Cue = { id: string; label: string; fade: number; levels: Levels };

export const MAX_CUES = 99;
export const DEFAULT_FADE = 3;
export const BACK_FADE = 1;
// 큐에 값이 없는 조명기는 꺼진 것으로 본다
export const OFF: Level = { intensity: 0, color: "#ffffff" };

export function levelOf(levels: Levels, id: string): Level {
  return levels[id] ?? OFF;
}

export function normalizeFade(v: number): number {
  return Math.round(clamp(Number.isFinite(v) ? v : DEFAULT_FADE, 0, 30) * 10) / 10;
}

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (l: number) => {
  const s = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055;
  return Math.round(clamp(s, 0, 1) * 255);
};
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex2 = (n: number) => n.toString(16).padStart(2, "0");

// 빛은 선형 공간에서 섞여야 중간 단계가 어둡게 꺼지지 않는다
export function mixColor(a: string, b: string, t: number): string {
  const ca = channels(a);
  const cb = channels(b);
  return `#${ca.map((v, i) => hex2(toSrgb(toLinear(v) + (toLinear(cb[i]) - toLinear(v)) * t))).join("")}`;
}

export function interpolateLevels(from: Levels, to: Levels, ids: string[], t: number): Levels {
  const k = clamp(t, 0, 1);
  const out: Levels = {};
  for (const id of ids) {
    const a = levelOf(from, id);
    const b = levelOf(to, id);
    out[id] = {
      intensity: a.intensity + (b.intensity - a.intensity) * k,
      color: k === 0 ? a.color : k === 1 ? b.color : mixColor(a.color, b.color, k),
    };
  }
  return out;
}

export function pickLevels(levels: Levels, ids: string[]): Levels {
  const out: Levels = {};
  for (const id of ids) {
    const l = levelOf(levels, id);
    out[id] = {
      intensity: normalizeLevel(l.intensity),
      color: isHexColor(l.color) ? l.color.toLowerCase() : OFF.color,
    };
  }
  return out;
}

export function levelsEqual(a: Levels, b: Levels, ids: string[]): boolean {
  return ids.every((id) => {
    const x = levelOf(a, id);
    const y = levelOf(b, id);
    return (
      normalizeLevel(x.intensity) === normalizeLevel(y.intensity) &&
      x.color.toLowerCase() === y.color.toLowerCase()
    );
  });
}

export function recordCue(
  cues: Cue[],
  live: Levels,
  ids: string[],
  id: string,
  fade = DEFAULT_FADE,
): Cue[] | null {
  if (cues.length >= MAX_CUES) return null;
  return [
    ...cues,
    { id, label: `큐 ${cues.length + 1}`, fade: normalizeFade(fade), levels: pickLevels(live, ids) },
  ];
}

export function overwriteCue(cues: Cue[], index: number, live: Levels, ids: string[]): Cue[] {
  return cues.map((c, i) => (i === index ? { ...c, levels: pickLevels(live, ids) } : c));
}

export function deleteCue(cues: Cue[], index: number): Cue[] {
  return cues.filter((_, i) => i !== index);
}

export function moveCue(cues: Cue[], index: number, dir: -1 | 1): Cue[] {
  const j = index + dir;
  if (index < 0 || index >= cues.length || j < 0 || j >= cues.length) return cues;
  const next = [...cues];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

export function removeFixtureFromCues(cues: Cue[], fixtureId: string): Cue[] {
  return cues.map((c) => {
    if (!(fixtureId in c.levels)) return c;
    const levels = { ...c.levels };
    delete levels[fixtureId];
    return { ...c, levels };
  });
}

export function nextIndex(cueIndex: number, length: number): number | null {
  const n = cueIndex + 1;
  return n < length ? n : null;
}

export function prevIndex(cueIndex: number): number | null {
  return cueIndex > 0 ? cueIndex - 1 : null;
}
```

`components/works/11_StageLighting/history.ts`:

```ts
// 공연 스냅숏 기반 실행 취소·다시 실행. node:test 대상 순수 모듈.

export const MAX_HISTORY = 100;
// 같은 key의 변경이 이 시간 안에 이어지면(슬라이더 끌기 등) 한 단계로 합친다
export const COALESCE_MS = 600;

export type History<T> = { past: T[]; future: T[]; lastKey: string | null; lastTime: number };

export function createHistory<T>(): History<T> {
  return { past: [], future: [], lastKey: null, lastTime: 0 };
}

// 바뀌기 전 상태(prev)를 남긴다
export function record<T>(h: History<T>, prev: T, key: string | null = null, now = 0): void {
  const merge = key !== null && key === h.lastKey && now - h.lastTime < COALESCE_MS;
  h.lastKey = key;
  h.lastTime = now;
  if (merge) return;
  h.past.push(prev);
  if (h.past.length > MAX_HISTORY) h.past.shift();
  h.future = [];
}

export function undo<T>(h: History<T>, current: T): T | null {
  if (h.past.length === 0) return null;
  const prev = h.past.pop() as T;
  h.future.push(current);
  h.lastKey = null;
  return prev;
}

export function redo<T>(h: History<T>, current: T): T | null {
  if (h.future.length === 0) return null;
  const next = h.future.pop() as T;
  h.past.push(current);
  h.lastKey = null;
  return next;
}

export const canUndo = <T>(h: History<T>) => h.past.length > 0;
export const canRedo = <T>(h: History<T>) => h.future.length > 0;
```

- [ ] **Step 4: 통과 확인**

Run: `node --test components/works/11_StageLighting/cues.test.mts components/works/11_StageLighting/history.test.mts && npx tsc --noEmit -p .`
Expected: PASS (10 tests), tsc 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add components/works/11_StageLighting/cues.ts components/works/11_StageLighting/cues.test.mts components/works/11_StageLighting/history.ts components/works/11_StageLighting/history.test.mts
git commit -m "feat : 무대조명 시뮬레이터 큐 편집·보간과 실행 취소"
```

---

### Task 4: 공연 모델

**Files:**
- Create: `components/works/11_StageLighting/show.ts`, `show.test.mts`

**Interfaces:**
- Consumes: Task 1~3 전부
- Produces:
  - 타입:
    - `type Fixture = { id; type: FixtureType; name; position: Vec3; focus: Focus; beam; softness }`
    - `type Show = { v: 1; stage; objects; fixtures; cues; live: Levels; cueIndex: number; haze: { on: boolean; density: number }; shadows: boolean; nextId: number }`
    - `type ObjectPatch = Partial<{ x; z; rot; scale; color; pose: PersonPose; height; name: string; showName: boolean }>`
    - `type FixturePatch = Partial<{ name: string; position: Vec3; focus: Focus; beam: number; softness: number }>`
  - 상수: `STORAGE_KEY = "stage-lighting-show"`
  - 함수:
    - 생성·무대: `createDefaultShow(): Show`, `updateStage(show, patch): Show`
    - 무대 요소: `addObject(show, spec): { show; id } | null` (`spec`는 `{ kind: "person" } | { kind: "prop"; prop: PropType }`), `updateObject(show, id, patch, useGrid?): Show`, `removeObject(show, id): Show`
    - 조명기: `addFixture(show, type): { show; id } | null`, `updateFixture(show, id, patch, useGrid?): Show`, `setLevel(show, id, patch: Partial<Level>): Show`, `removeFixture(show, id): Show`
    - 저장: `serializeShow(show): string`, `deserializeShow(json): Show | null`

- [ ] **Step 1: 테스트 작성**

`components/works/11_StageLighting/show.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_FIXTURES } from "./fixtures.ts";
import { MAX_OBJECTS } from "./objects.ts";
import {
  addFixture,
  addObject,
  createDefaultShow,
  deserializeShow,
  removeFixture,
  removeObject,
  serializeShow,
  setLevel,
  updateFixture,
  updateObject,
  updateStage,
  type Show,
} from "./show.ts";

test("기본 공연은 직렬화 왕복이 같고 유효하다", () => {
  const s = createDefaultShow();
  assert.equal(s.objects.length, 3);
  assert.equal(s.fixtures.length, 6);
  assert.equal(s.cues.length, 3);
  assert.equal(s.cueIndex, 0);
  assert.deepEqual(deserializeShow(serializeShow(s)), s);
});

test("배우·소품 추가와 개수 제한", () => {
  let s = createDefaultShow();
  const added = addObject(s, { kind: "person" })!;
  const p = added.show.objects.find((o) => o.id === added.id)!;
  assert.equal(p.kind === "person" && p.name, "배우 3");
  assert.ok(!s.objects.some((o) => o.x === p.x && o.z === p.z));
  s = added.show;
  while (s.objects.length < MAX_OBJECTS) s = addObject(s, { kind: "prop", prop: "box" })!.show;
  assert.equal(addObject(s, { kind: "prop", prop: "box" }), null);
});

test("무대 요소 수정은 무대 안·15° 단위로 맞추고, 삭제한다", () => {
  const s = createDefaultShow();
  const id = s.objects[0].id;
  const moved = updateObject(s, id, { x: 50, z: 3.1, rot: 50, scale: 9, color: "nope" });
  const o = moved.objects.find((q) => q.id === id)!;
  assert.deepEqual([o.x, o.z, o.rot, o.scale, o.color], [6, 0, 45, 2, s.objects[0].color]);
  assert.equal(removeObject(moved, id).objects.length, 2);
});

test("무대를 줄이면 밖에 있던 무대 요소가 안으로 들어온다", () => {
  const s = updateObject(createDefaultShow(), "o1", { x: 5.5, z: -7.5 });
  const small = updateStage(s, { width: 6, depth: 4 });
  const o = small.objects.find((q) => q.id === "o1")!;
  assert.deepEqual([o.x, o.z], [3, -4]);
  assert.equal(small.stage.width, 6);
});

test("조명기 추가: 라이브 50%, 큐에는 없음(=꺼짐), 16개 제한", () => {
  let s = createDefaultShow();
  const r = addFixture(s, "par")!;
  assert.deepEqual(r.show.live[r.id], { intensity: 50, color: "#ffffff" });
  assert.ok(r.show.cues.every((c) => !(r.id in c.levels)));
  assert.equal(r.show.fixtures.at(-1)!.name, "PAR 1");
  s = r.show;
  while (s.fixtures.length < MAX_FIXTURES) s = addFixture(s, "profile")!.show;
  assert.equal(addFixture(s, "profile"), null);
});

test("조명기 수정: 위치 범위·격자, 겨누는 높이, 빔 범위", () => {
  const s = createDefaultShow();
  const id = s.fixtures[0].id;
  const t = updateFixture(s, id, {
    position: { x: 1.13, y: 99, z: 0.1 },
    focus: { x: 0.4, z: -3, height: 9 },
    beam: 99,
    name: "  키 라이트  ",
  });
  const f = t.fixtures.find((q) => q.id === id)!;
  assert.deepEqual(f.position, { x: 1.25, y: 10, z: 0 });
  assert.deepEqual(f.focus, { x: 0.5, z: -3, height: 2 });
  assert.equal(f.beam, 50);
  assert.equal(f.name, "키 라이트");
  const free = updateFixture(s, id, { position: { x: 1.13, y: 6.4, z: 0.1 } }, false);
  assert.equal(free.fixtures.find((q) => q.id === id)!.position.x, 1.13);
});

test("라이브 값 설정은 범위를 맞추고 잘못된 색은 무시한다", () => {
  const s = createDefaultShow();
  const id = s.fixtures[0].id;
  const t = setLevel(setLevel(s, id, { intensity: 150 }), id, { color: "blue" });
  assert.deepEqual(t.live[id], { intensity: 100, color: s.live[id].color });
});

test("조명기 삭제는 라이브·모든 큐에서 지우고 저장값도 유효하다", () => {
  const s = createDefaultShow();
  const id = s.fixtures[0].id;
  const t = removeFixture(s, id);
  assert.equal(t.fixtures.length, 5);
  assert.ok(!(id in t.live));
  assert.ok(t.cues.every((c) => !(id in c.levels)));
  assert.deepEqual(deserializeShow(serializeShow(t)), t);
});

test("잘못된 저장값은 null", () => {
  const ok = JSON.parse(serializeShow(createDefaultShow()));
  const bad = (patch: (d: Show & Record<string, unknown>) => void) => {
    const d = structuredClone(ok);
    patch(d);
    return deserializeShow(JSON.stringify(d));
  };
  assert.equal(deserializeShow(null), null);
  assert.equal(deserializeShow("not json"), null);
  assert.equal(bad((d) => ((d as { v: number }).v = 2)), null);
  assert.equal(bad((d) => (d.stage.width = 30)), null);
  assert.equal(bad((d) => (d.objects = Array.from({ length: 41 }, () => d.objects[0]))), null);
  assert.equal(bad((d) => (d.fixtures[0].beam = 99)), null);
  assert.equal(bad((d) => (d.cueIndex = 5)), null);
  assert.equal(bad((d) => (d.fixtures[1].id = d.fixtures[0].id)), null);
  assert.equal(bad((d) => (d.live[d.fixtures[0].id].intensity = 101)), null);
  assert.equal(bad((d) => (d.cues[0].fade = -1)), null);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test components/works/11_StageLighting/show.test.mts`
Expected: FAIL (`Cannot find module …/show.ts`)

- [ ] **Step 3: 구현**

`components/works/11_StageLighting/show.ts`:

```ts
// 공연(무대·무대 요소·조명기·큐) 데이터 모델과 편집·저장. node:test 대상 순수 모듈.
// 편집 함수는 모두 새 객체를 돌려준다(실행 취소 스냅숏으로 쓰기 위해).
import {
  type Cue,
  type Level,
  type Levels,
  MAX_CUES,
  OFF,
  removeFixtureFromCues,
} from "./cues.ts";
import {
  type FixtureType,
  FIXTURE_SPECS,
  MAX_FIXTURES,
  isFixtureType,
  isHexColor,
  normalizeBeam,
  normalizeLevel,
  normalizeSoftness,
} from "./fixtures.ts";
import {
  type PersonPose,
  type PropType,
  type StageObject,
  MAX_OBJECTS,
  PERSON_HEIGHT,
  isPose,
  isProp,
  normalizeHeight,
  normalizeRotation,
  normalizeScale,
} from "./objects.ts";
import {
  type Focus,
  type StageSettings,
  type Vec3,
  DEFAULT_STAGE,
  STAGE_LIMITS,
  defaultPlacement,
  normalizeFocus,
  normalizeObjectPosition,
  normalizePosition,
  normalizeStage,
  stageCenter,
} from "./rig.ts";

export const STORAGE_KEY = "stage-lighting-show";

export type Fixture = {
  id: string;
  type: FixtureType;
  name: string;
  position: Vec3;
  focus: Focus;
  beam: number;
  softness: number;
};

export type Show = {
  v: 1;
  stage: StageSettings;
  objects: StageObject[];
  fixtures: Fixture[];
  cues: Cue[];
  live: Levels;
  cueIndex: number;
  haze: { on: boolean; density: number };
  shadows: boolean;
  nextId: number;
};

export type ObjectPatch = Partial<{
  x: number;
  z: number;
  rot: number;
  scale: number;
  color: string;
  pose: PersonPose;
  height: number;
  name: string;
  showName: boolean;
}>;

export type FixturePatch = Partial<{
  name: string;
  position: Vec3;
  focus: Focus;
  beam: number;
  softness: number;
}>;

const PERSON_COLORS = ["#c94f4f", "#4f7fc9", "#4fa36a", "#c9a24f", "#8a5bc9"];
const PROP_COLOR = "#8a6a4a";
const NAME_MAX = 20;

const cleanName = (v: string, fallback: string) => v.trim().slice(0, NAME_MAX) || fallback;

function fixture(id: string, type: FixtureType, name: string, position: Vec3, focus: Focus): Fixture {
  return {
    id,
    type,
    name,
    position,
    focus,
    beam: FIXTURE_SPECS[type].beam.def,
    softness: FIXTURE_SPECS[type].softness.def,
  };
}

const lv = (intensity: number, color: string): Level => ({ intensity, color });

export function createDefaultShow(): Show {
  const fixtures = [
    fixture("f1", "profile", "프로파일 1", { x: -3, y: 7, z: 6 }, { x: -1.5, z: -3, height: 1.2 }),
    fixture("f2", "profile", "프로파일 2", { x: 3, y: 7, z: 6 }, { x: 1.5, z: -3.5, height: 1 }),
    fixture("f3", "fresnel", "프레넬 1", { x: -3, y: 6.5, z: -1.25 }, { x: -1.5, z: -3, height: 1.2 }),
    fixture("f4", "fresnel", "프레넬 2", { x: 3, y: 6.5, z: -1.25 }, { x: 1.5, z: -3.5, height: 1 }),
    fixture("f5", "cyc", "호리존트 1", { x: -3, y: 6.5, z: -6.75 }, { x: -3, z: -8, height: 2 }),
    fixture("f6", "cyc", "호리존트 2", { x: 3, y: 6.5, z: -6.75 }, { x: 3, z: -8, height: 2 }),
  ];
  const cue = (id: string, label: string, foh: Level, fresnel: Level, cyc: Level): Cue => ({
    id,
    label,
    fade: 3,
    levels: { f1: foh, f2: foh, f3: fresnel, f4: fresnel, f5: cyc, f6: cyc },
  });
  const cues = [
    cue("c1", "전체 밝음", lv(80, "#ffffff"), lv(80, "#ffffff"), lv(60, "#ffe4b5")),
    cue("c2", "따뜻한 낮", lv(70, "#ffe4b5"), lv(60, "#ffc879"), lv(70, "#8fd3ff")),
    cue("c3", "파란 밤", lv(20, "#b9d2ff"), lv(35, "#2246d8"), lv(50, "#2246d8")),
  ];
  return {
    v: 1,
    stage: { ...DEFAULT_STAGE },
    objects: [
      { id: "o1", kind: "person", pose: "stand", height: 1.75, name: "배우 1", showName: true, x: -1.5, z: -3, rot: 0, scale: 1, color: PERSON_COLORS[0] },
      { id: "o2", kind: "prop", prop: "chair", x: 1.5, z: -3.5, rot: 0, scale: 1, color: PROP_COLOR },
      { id: "o3", kind: "person", pose: "sit", height: 1.7, name: "배우 2", showName: true, x: 1.5, z: -3.5, rot: 0, scale: 1, color: PERSON_COLORS[1] },
    ],
    fixtures,
    cues,
    live: structuredClone(cues[0].levels),
    cueIndex: 0,
    haze: { on: false, density: 0.4 },
    shadows: true,
    nextId: 10,
  };
}

const takeId = (show: Show, prefix: string) => ({
  id: `${prefix}${show.nextId}`,
  nextId: show.nextId + 1,
});

export function updateStage(show: Show, patch: Partial<StageSettings>): Show {
  const stage = normalizeStage(patch, show.stage);
  // 무대가 줄거나 모양이 바뀌면 밖에 남은 무대 요소를 안으로 들인다
  const objects = show.objects.map((o) => {
    const p = normalizeObjectPosition(o.x, o.z, stage, false);
    return p.x === o.x && p.z === o.z ? o : { ...o, ...p };
  });
  return { ...show, stage, objects };
}

export function addObject(
  show: Show,
  spec: { kind: "person" } | { kind: "prop"; prop: PropType },
): { show: Show; id: string } | null {
  if (show.objects.length >= MAX_OBJECTS) return null;
  const { id, nextId } = takeId(show, "o");
  const c = stageCenter(show.stage);
  let x = c.x;
  while (show.objects.some((o) => Math.abs(o.x - x) < 0.01 && Math.abs(o.z - c.z) < 0.01)) x += 0.5;
  const pos = normalizeObjectPosition(x, c.z, show.stage);
  const people = show.objects.filter((o) => o.kind === "person").length;
  const obj: StageObject =
    spec.kind === "person"
      ? {
          id,
          kind: "person",
          pose: "stand",
          height: PERSON_HEIGHT.def,
          name: `배우 ${people + 1}`,
          showName: true,
          ...pos,
          rot: 0,
          scale: 1,
          color: PERSON_COLORS[people % PERSON_COLORS.length],
        }
      : { id, kind: "prop", prop: spec.prop, ...pos, rot: 0, scale: 1, color: PROP_COLOR };
  return { show: { ...show, objects: [...show.objects, obj], nextId }, id };
}

export function updateObject(show: Show, id: string, patch: ObjectPatch, useGrid = true): Show {
  return {
    ...show,
    objects: show.objects.map((o) => {
      if (o.id !== id) return o;
      const pos = normalizeObjectPosition(patch.x ?? o.x, patch.z ?? o.z, show.stage, useGrid);
      const common = {
        ...pos,
        rot: patch.rot === undefined ? o.rot : normalizeRotation(patch.rot),
        scale: patch.scale === undefined ? o.scale : normalizeScale(patch.scale),
        color: isHexColor(patch.color) ? patch.color.toLowerCase() : o.color,
      };
      if (o.kind === "prop") return { ...o, ...common };
      return {
        ...o,
        ...common,
        pose: isPose(patch.pose) ? patch.pose : o.pose,
        height: patch.height === undefined ? o.height : normalizeHeight(patch.height),
        name: patch.name === undefined ? o.name : cleanName(patch.name, o.name),
        showName: typeof patch.showName === "boolean" ? patch.showName : o.showName,
      };
    }),
  };
}

export function removeObject(show: Show, id: string): Show {
  return { ...show, objects: show.objects.filter((o) => o.id !== id) };
}

export function addFixture(show: Show, type: FixtureType): { show: Show; id: string } | null {
  if (show.fixtures.length >= MAX_FIXTURES) return null;
  const { id, nextId } = takeId(show, "f");
  const place = defaultPlacement(type, show.stage, show.fixtures.map((f) => f.position));
  const count = show.fixtures.filter((f) => f.type === type).length;
  const f = fixture(id, type, `${FIXTURE_SPECS[type].label} ${count + 1}`, place.position, place.focus);
  return {
    show: {
      ...show,
      fixtures: [...show.fixtures, f],
      live: { ...show.live, [id]: { intensity: 50, color: OFF.color } },
      nextId,
    },
    id,
  };
}

export function updateFixture(show: Show, id: string, patch: FixturePatch, useGrid = true): Show {
  return {
    ...show,
    fixtures: show.fixtures.map((f) =>
      f.id !== id
        ? f
        : {
            ...f,
            name: patch.name === undefined ? f.name : cleanName(patch.name, f.name),
            position: patch.position ? normalizePosition(patch.position, show.stage, useGrid) : f.position,
            focus: patch.focus ? normalizeFocus(patch.focus, show.stage, useGrid) : f.focus,
            beam: patch.beam === undefined ? f.beam : normalizeBeam(f.type, patch.beam),
            softness: patch.softness === undefined ? f.softness : normalizeSoftness(f.type, patch.softness),
          },
    ),
  };
}

export function setLevel(show: Show, id: string, patch: Partial<Level>): Show {
  const cur = show.live[id] ?? OFF;
  return {
    ...show,
    live: {
      ...show.live,
      [id]: {
        intensity: patch.intensity === undefined ? cur.intensity : normalizeLevel(patch.intensity),
        color: isHexColor(patch.color) ? patch.color.toLowerCase() : cur.color,
      },
    },
  };
}

export function removeFixture(show: Show, id: string): Show {
  const live = { ...show.live };
  delete live[id];
  return {
    ...show,
    fixtures: show.fixtures.filter((f) => f.id !== id),
    live,
    cues: removeFixtureFromCues(show.cues, id),
  };
}

export function serializeShow(show: Show): string {
  return JSON.stringify(show);
}

const num = (v: unknown, lo: number, hi: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const FAR = 100;

const validVec = (v: unknown) =>
  isObj(v) && num(v.x, -FAR, FAR) && num(v.y, -FAR, FAR) && num(v.z, -FAR, FAR);

const validLevels = (v: unknown) =>
  isObj(v) &&
  Object.values(v).every((l) => isObj(l) && num(l.intensity, 0, 100) && isHexColor(l.color));

function validObject(o: unknown): boolean {
  if (!isObj(o) || typeof o.id !== "string") return false;
  if (!num(o.x, -FAR, FAR) || !num(o.z, -FAR, FAR) || !num(o.rot, 0, 359)) return false;
  if (!num(o.scale, 0.5, 2) || !isHexColor(o.color)) return false;
  if (o.kind === "prop") return isProp(o.prop);
  return (
    o.kind === "person" &&
    isPose(o.pose) &&
    num(o.height, PERSON_HEIGHT.min, PERSON_HEIGHT.max) &&
    typeof o.name === "string" &&
    typeof o.showName === "boolean"
  );
}

function validFixture(f: unknown): boolean {
  if (!isObj(f) || typeof f.id !== "string" || !isFixtureType(f.type)) return false;
  const spec = FIXTURE_SPECS[f.type];
  return (
    typeof f.name === "string" &&
    validVec(f.position) &&
    isObj(f.focus) &&
    num(f.focus.x, -FAR, FAR) &&
    num(f.focus.z, -FAR, FAR) &&
    num(f.focus.height, 0, 2) &&
    num(f.beam, spec.beam.min, spec.beam.max) &&
    num(f.softness, spec.softness.min, spec.softness.max)
  );
}

const validCue = (c: unknown) =>
  isObj(c) &&
  typeof c.id === "string" &&
  typeof c.label === "string" &&
  num(c.fade, 0, 30) &&
  validLevels(c.levels);

function validStage(s: unknown): boolean {
  return (
    isObj(s) &&
    (s.shape === "proscenium" || s.shape === "thrust" || s.shape === "arena") &&
    num(s.width, STAGE_LIMITS.width.min, STAGE_LIMITS.width.max) &&
    num(s.depth, STAGE_LIMITS.depth.min, STAGE_LIMITS.depth.max) &&
    num(s.deckHeight, STAGE_LIMITS.deckHeight.min, STAGE_LIMITS.deckHeight.max) &&
    isHexColor(s.floorColor) &&
    typeof s.cycOn === "boolean" &&
    isHexColor(s.cycColor)
  );
}

// 하나라도 맞지 않으면 null — 호출하는 쪽은 기본 공연으로 시작한다
export function deserializeShow(json: string | null): Show | null {
  if (!json) return null;
  try {
    const d: unknown = JSON.parse(json);
    if (!isObj(d) || d.v !== 1 || !validStage(d.stage)) return null;
    const { objects, fixtures, cues } = d;
    if (!Array.isArray(objects) || objects.length > MAX_OBJECTS || !objects.every(validObject)) return null;
    if (!Array.isArray(fixtures) || fixtures.length > MAX_FIXTURES || !fixtures.every(validFixture)) return null;
    if (!Array.isArray(cues) || cues.length > MAX_CUES || !cues.every(validCue)) return null;
    if (!validLevels(d.live)) return null;
    if (!Number.isInteger(d.cueIndex) || (d.cueIndex as number) < -1 || (d.cueIndex as number) >= cues.length) return null;
    if (!isObj(d.haze) || typeof d.haze.on !== "boolean" || !num(d.haze.density, 0, 1)) return null;
    if (typeof d.shadows !== "boolean" || !Number.isInteger(d.nextId) || (d.nextId as number) < 1) return null;
    const ids = [...objects, ...fixtures, ...cues].map((x) => (x as { id: string }).id);
    if (new Set(ids).size !== ids.length) return null;
    return d as unknown as Show;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test components/works/11_StageLighting/*.test.mts && npx tsc --noEmit -p . && npx eslint components/works/11_StageLighting`
Expected: PASS (35 tests), tsc·eslint 출력 없음

- [ ] **Step 5: 커밋**

```bash
git add components/works/11_StageLighting/show.ts components/works/11_StageLighting/show.test.mts
git commit -m "feat : 무대조명 시뮬레이터 공연 모델·편집·저장 형식"
```

---

### Task 5: 메시(배우·소품·조명기 몸체·이름표)

**Files:**
- Create: `components/works/11_StageLighting/meshes.ts`

**Interfaces:**
- Consumes: `PersonPose`, `PropType` (Task 1), `FixtureType` (Task 1)
- Produces:
  - `buildPerson(pose: PersonPose, color: string): THREE.Group` — 키 1.75m 기준, 발이 y = 0
  - `buildProp(type: PropType, color: string): THREE.Group` — 바닥이 y = 0
  - `buildFixtureBody(type: FixtureType): { group: THREE.Group; lens: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> }` — 빛이 나가는 쪽이 +Z(`lookAt`용)
  - `buildNameTag(text: string): THREE.Sprite`
  - `setHighlight(root: THREE.Object3D, level: 0 | 1 | 2): void`
  - `disposeObject(root: THREE.Object3D): void`

이 Task에는 단위 테스트가 없다(three 메시 생성). Task 6·7의 화면 검증과 Task 8 Playwright가 확인한다.

- [ ] **Step 1: 구현**

`components/works/11_StageLighting/meshes.ts`:

```ts
// 무대 요소와 조명기 몸체를 기본 도형으로 만든다.
import * as THREE from "three";
import type { FixtureType } from "./fixtures";
import type { PersonPose, PropType } from "./objects";

const SKIN = "#d9b38c";
const IRON = "#2a2a2a";
const UP = new THREE.Vector3(0, 1, 0);

const mat = (color: string) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0 });

// a에서 b까지 이어지는 캡슐(팔다리·몸통)
function limb(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 8), m);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  return mesh;
}

function castShadows(root: THREE.Object3D) {
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

// 키 1.75m 마네킹. 앉기는 엉덩이가 의자 높이(0.45m)에 오고 다리가 +z(앞)로 나온다.
export function buildPerson(pose: PersonPose, color: string): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const cloth = mat(color);
  const skin = mat(SKIN);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const hipY = pose === "sit" ? 0.45 : 0.9;

  for (const s of [-1, 1]) {
    if (pose === "sit") {
      body.add(limb(V(0.1 * s, 0.47, 0), V(0.1 * s, 0.47, 0.42), 0.07, cloth));
      body.add(limb(V(0.1 * s, 0.47, 0.42), V(0.1 * s, 0.05, 0.45), 0.06, cloth));
    } else {
      const swing = pose === "walk" ? 0.25 * s : 0;
      body.add(limb(V(0.1 * s, 0.9, 0), V(0.1 * s, 0.05, swing), 0.07, cloth));
    }
  }
  body.add(limb(V(0, hipY + 0.05, 0), V(0, hipY + 0.55, 0), 0.17, cloth));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skin);
  head.position.set(0, hipY + 0.75, 0);
  body.add(head);
  const shoulder = hipY + 0.55;
  for (const s of [-1, 1]) {
    const hand =
      pose === "arms"
        ? V(0.8 * s, shoulder, 0)
        : pose === "walk"
          ? V(0.25 * s, shoulder - 0.55, -0.2 * s)
          : V(0.25 * s, shoulder - 0.6, 0.05);
    body.add(limb(V(0.2 * s, shoulder, 0), hand, 0.05, skin));
  }
  // 눕기: 선 자세를 뒤로 눕혀 머리가 −z로 가게 하고, 몸 가운데가 원점에 오게 옮긴다
  if (pose === "lie") {
    body.rotation.x = -Math.PI / 2;
    body.position.set(0, 0.17, 0.85);
  }
  castShadows(root);
  return root;
}

export function buildProp(type: PropType, color: string): THREE.Group {
  const g = new THREE.Group();
  const m = mat(color);
  const dark = mat(IRON);
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material = m) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    b.position.set(x, y, z);
    g.add(b);
  };
  const cyl = (r: number, h: number, x: number, y: number, z: number, material: THREE.Material = m) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), material);
    c.position.set(x, y, z);
    g.add(c);
  };
  const sphere = (r: number, x: number, y: number, z: number, material: THREE.Material = m) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), material);
    s.position.set(x, y, z);
    g.add(s);
  };
  switch (type) {
    case "chair":
      box(0.5, 0.05, 0.5, 0, 0.45, 0);
      box(0.5, 0.45, 0.05, 0, 0.7, -0.225);
      for (const x of [-0.22, 0.22]) for (const z of [-0.22, 0.22]) box(0.04, 0.42, 0.04, x, 0.21, z);
      break;
    case "table":
      box(1.4, 0.05, 0.8, 0, 0.725, 0);
      for (const x of [-0.65, 0.65]) for (const z of [-0.35, 0.35]) box(0.05, 0.7, 0.05, x, 0.35, z);
      break;
    case "bed":
      box(2, 0.3, 1.4, 0, 0.15, 0);
      box(1.95, 0.2, 1.35, 0, 0.4, 0, mat("#efefef"));
      box(0.08, 0.6, 1.4, -0.96, 0.6, 0);
      break;
    case "stairs":
      for (let i = 0; i < 3; i++) box(1.2, 0.2 * (i + 1), 0.3, 0, 0.1 * (i + 1), 0.3 - i * 0.3);
      break;
    case "platform":
      box(2, 0.4, 2, 0, 0.2, 0);
      break;
    case "tree":
      cyl(0.15, 1.6, 0, 0.8, 0, mat("#6b4a2b"));
      sphere(0.75, 0, 2.25, 0);
      break;
    case "doorframe":
      box(0.12, 2.2, 0.2, -0.54, 1.1, 0);
      box(0.12, 2.2, 0.2, 0.54, 1.1, 0);
      box(1.2, 0.12, 0.2, 0, 2.14, 0);
      break;
    case "column":
      cyl(0.2, 4, 0, 2, 0);
      break;
    case "box":
      box(0.6, 0.6, 0.6, 0, 0.3, 0);
      break;
    case "lamppost":
      cyl(0.2, 0.1, 0, 0.05, 0, dark);
      cyl(0.05, 3, 0, 1.5, 0, dark);
      sphere(0.18, 0, 3.05, 0);
      break;
  }
  castShadows(g);
  return g;
}

// 원통 몸체 + 앞쪽 렌즈. 빛이 나가는 쪽이 +Z라 group.lookAt(포커스)로 겨눈다.
export function buildFixtureBody(type: FixtureType) {
  const group = new THREE.Group();
  const len = type === "followspot" ? 0.6 : type === "cyc" ? 0.3 : 0.4;
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(type === "cyc" ? 0.22 : 0.16, 0.16, len, 16),
    new THREE.MeshStandardMaterial({ color: IRON, roughness: 0.5, metalness: 0.4 }),
  );
  shell.rotation.x = Math.PI / 2;
  group.add(shell);
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.13, 20),
    new THREE.MeshBasicMaterial({ color: "#000000" }),
  );
  lens.position.z = len / 2 + 0.001;
  group.add(lens);
  return { group, lens };
}

export function buildNameTag(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.roundRect(4, 8, 248, 48, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 33);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(1, 0.25, 1);
  sprite.renderOrder = 10;
  // 이름표는 고를 대상이 아니다(스프라이트 레이캐스트는 카메라가 필요하기도 하다)
  sprite.raycast = () => {};
  return sprite;
}

const HIGHLIGHT = ["#000000", "#1d3a73", "#3b6fd8"];

// 0 없음, 1 마우스를 올림, 2 선택됨
export function setHighlight(root: THREE.Object3D, level: 0 | 1 | 2): void {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m && "emissive" in m && m.emissive) {
      m.emissive.set(HIGHLIGHT[level]);
      m.emissiveIntensity = 0.6;
    }
  });
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) {
      (m as THREE.MeshBasicMaterial).map?.dispose();
      m.dispose();
    }
  });
}
```

- [ ] **Step 2: 확인**

Run: `npx tsc --noEmit -p . && npx eslint components/works/11_StageLighting/meshes.ts`
Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add components/works/11_StageLighting/meshes.ts
git commit -m "feat : 무대조명 시뮬레이터 배우·소품·조명기 메시"
```

---

### Task 6: 3D 장면 훅

**Files:**
- Create: `components/works/11_StageLighting/useStageScene.ts`

**Interfaces:**
- Consumes:
  - Task 2: `stageCenter`, `focusPoint`, `planHalfHeight`, `StageSettings`, `Vec3`
  - Task 3: `Levels`, `OFF`
  - Task 1: `candela`, `FIXTURE_SPECS`
  - Task 4: `Show`, `Fixture`
  - Task 5: 메시 함수 전부
- Produces:
  - `type Tab = "stage" | "elements" | "fixtures"`
  - `type View = "design" | "audience" | "plan"`
  - `type Pick = { kind: "object" | "fixture" | "focus"; id: string }`
  - `type SceneApi` (아래 코드의 메서드 9개)
  - `useStageScene(containerRef, onError?): RefObject<SceneApi | null>`

이 Task에는 단위 테스트가 없다. Task 7에서 화면을 붙인 뒤 dev 서버로 보고, Task 8 Playwright가 확인한다.

- [ ] **Step 1: 구현**

`components/works/11_StageLighting/useStageScene.ts`:

```ts
"use client";

import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { type Levels, OFF } from "./cues";
import { candela } from "./fixtures";
import {
  buildFixtureBody,
  buildNameTag,
  buildPerson,
  buildProp,
  disposeObject,
  setHighlight,
} from "./meshes";
import { type StageSettings, type Vec3, focusPoint, planHalfHeight, stageCenter } from "./rig";
import type { Fixture, Show } from "./show";

export type Tab = "stage" | "elements" | "fixtures";
export type View = "design" | "audience" | "plan";
export type Pick = { kind: "object" | "fixture" | "focus"; id: string };

export type SceneApi = {
  setShow(show: Show, opts: { tab: Tab; selected: Pick | null; levels: Levels }): void;
  setLevels(levels: Levels): void;
  setView(view: View, row: number): void;
  setHover(p: Pick | null): void;
  pick(clientX: number, clientY: number): Pick | null;
  planePoint(clientX: number, clientY: number, y: number): { x: number; z: number } | null;
  heightAt(clientX: number, clientY: number, anchor: Vec3): number | null;
  setOrbitEnabled(on: boolean): void;
  exportPng(): Promise<Blob | null>;
};

const BACKGROUND = "#07080b";
const HOUSE_FLOOR = "#151515";
const SEAT = "#2a1d1d";
const FRAME = "#1a1a1a";
const RING = "#ffb547";
const ROWS = 10;
const ROW_DEPTH = 0.9;
const ROW_RISE = 0.25;
const SEAT_HEIGHT = 0.45;
const EYE = 1.2;
const PERSON_BASE = 1.75;
const HAZE_GAIN = 0.35;

type FixtureView = {
  light: THREE.SpotLight;
  target: THREE.Object3D;
  body: THREE.Group;
  lens: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  cone: THREE.Mesh<THREE.ConeGeometry, THREE.ShaderMaterial>;
  coneKey: string;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  fixture: Fixture;
};

type ObjectView = { group: THREE.Group; key: string };

// 연무: 광원 쪽이 밝고, 정면에서 볼수록(원뿔 가장자리에서 멀수록) 진한 가산 혼합 원뿔
const HAZE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const HAZE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float along = pow(vUv.y, 1.5);
    float edge = pow(abs(dot(normalize(vNormal), normalize(vView))), 2.0);
    gl_FragColor = vec4(uColor * uStrength * along * edge, 1.0);
  }
`;

function seatRows(width: number, frontZ: number): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: SEAT, roughness: 0.9 });
  for (let r = 0; r < ROWS; r++) {
    const h = SEAT_HEIGHT + r * ROW_RISE;
    const row = new THREE.Mesh(new THREE.BoxGeometry(width + 4, h, ROW_DEPTH - 0.1), m);
    row.position.set(0, h / 2, frontZ + 2 + r * ROW_DEPTH + ROW_DEPTH / 2);
    row.receiveShadow = true;
    g.add(row);
  }
  return g;
}

function buildStage(stage: StageSettings): THREE.Group {
  const g = new THREE.Group();
  const deckH = Math.max(stage.deckHeight, 0.02);
  const floor = new THREE.MeshStandardMaterial({ color: stage.floorColor, roughness: 0.85 });
  const add = (mesh: THREE.Mesh) => {
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    g.add(mesh);
  };
  const house = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: HOUSE_FLOOR, roughness: 1 }),
  );
  house.rotation.x = -Math.PI / 2;
  house.receiveShadow = true;
  g.add(house);

  if (stage.shape === "arena") {
    const r = stage.width / 2;
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(r, r, deckH, 64), floor);
    deck.position.set(0, deckH / 2, -r);
    add(deck);
    for (let k = 0; k < 4; k++) {
      const side = new THREE.Group();
      side.position.set(0, 0, -r);
      side.rotation.y = (k * Math.PI) / 2;
      side.add(seatRows(stage.width, r - 2 + 1));
      g.add(side);
    }
    return g;
  }

  const deck = new THREE.Mesh(new THREE.BoxGeometry(stage.width, deckH, stage.depth), floor);
  deck.position.set(0, deckH / 2, -stage.depth / 2);
  add(deck);
  if (stage.shape === "thrust") {
    const t = new THREE.Mesh(new THREE.BoxGeometry(stage.width / 2, deckH, stage.depth / 2), floor);
    t.position.set(0, deckH / 2, stage.depth / 4);
    add(t);
  } else {
    const fm = new THREE.MeshStandardMaterial({ color: FRAME, roughness: 0.9 });
    for (const s of [-1, 1]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 0.4), fm);
      col.position.set(s * (stage.width / 2 + 0.5), stage.deckHeight + 3, 0.2);
      add(col);
    }
    const header = new THREE.Mesh(new THREE.BoxGeometry(stage.width + 2, 1, 0.4), fm);
    header.position.set(0, stage.deckHeight + 6.5, 0.2);
    add(header);
  }
  if (stage.cycOn) {
    const cyc = new THREE.Mesh(
      new THREE.PlaneGeometry(stage.width, 7),
      new THREE.MeshStandardMaterial({ color: stage.cycColor, roughness: 1 }),
    );
    cyc.position.set(0, stage.deckHeight + 3.5, -stage.depth - 0.05);
    cyc.receiveShadow = true;
    g.add(cyc);
  }
  g.add(seatRows(stage.width, stage.shape === "thrust" ? stage.depth / 2 : 0));
  return g;
}

function findPick(o: THREE.Object3D | null): Pick | null {
  for (let cur = o; cur; cur = cur.parent) {
    const p = cur.userData.pick as Pick | undefined;
    if (p) return p;
  }
  return null;
}

export function useStageScene(containerRef: RefObject<HTMLDivElement | null>, onError?: () => void) {
  const apiRef = useRef<SceneApi | null>(null);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      onErrorRef.current?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND);
    // 조명기 효과가 잘 보이도록 환경광은 아주 어둡게
    scene.add(new THREE.HemisphereLight(0x8090a0, 0x101010, 0.12));

    const designCam = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
    const audienceCam = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
    const planCam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
    planCam.up.set(0, 0, -1);
    const orbit = new OrbitControls(designCam, renderer.domElement);
    orbit.maxPolarAngle = Math.PI / 2 - 0.05;
    const planControls = new OrbitControls(planCam, renderer.domElement);
    planControls.enableRotate = false;
    planControls.screenSpacePanning = true;
    planControls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    planControls.enabled = false;

    let view: View = "design";
    let row = 5;
    let camera: THREE.Camera = designCam;
    let stage: StageSettings | null = null;
    let stageKey = "";
    let stageGroup: THREE.Group | null = null;
    let show: Show | null = null;
    let tab: Tab = "stage";
    let selected: Pick | null = null;
    let hover: Pick | null = null;
    let levels: Levels = {};
    let needsRender = true;
    const objects = new Map<string, ObjectView>();
    const fixtures = new Map<string, FixtureView>();
    const request = () => {
      needsRender = true;
    };
    orbit.addEventListener("change", request);
    planControls.addEventListener("change", request);

    function aspect() {
      const w = container!.clientWidth || 1;
      const h = container!.clientHeight || 1;
      return w / h;
    }

    function placeCameras(resetDesign: boolean) {
      if (!stage) return;
      const c = stageCenter(stage);
      const deck = stage.deckHeight;
      if (resetDesign) {
        orbit.target.set(c.x, deck + 1, c.z);
        designCam.position.set(0, deck + 8, c.z + 15);
        orbit.update();
        planControls.target.set(c.x, 0, c.z);
        planCam.position.set(c.x, 40, c.z);
        planCam.zoom = 1;
        planControls.update();
      }
      const front = stage.shape === "arena" ? c.z + stage.width / 2 - 1 : stage.shape === "thrust" ? stage.depth / 2 : 0;
      const r = row - 1;
      audienceCam.position.set(0, SEAT_HEIGHT + r * ROW_RISE + EYE, front + 2 + r * ROW_DEPTH + ROW_DEPTH / 2);
      audienceCam.lookAt(0, deck + 1.2, c.z);
      resize();
    }

    function resize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const a = w / h;
      designCam.aspect = a;
      audienceCam.aspect = a;
      designCam.updateProjectionMatrix();
      audienceCam.updateProjectionMatrix();
      if (stage) {
        const half = planHalfHeight(stage, a);
        planCam.top = half;
        planCam.bottom = -half;
        planCam.left = -half * a;
        planCam.right = half * a;
        planCam.updateProjectionMatrix();
      }
      request();
    }

    function syncStage(next: StageSettings) {
      const key = JSON.stringify(next);
      if (key === stageKey) return;
      const sizeChanged =
        !stage || stage.width !== next.width || stage.depth !== next.depth || stage.shape !== next.shape;
      stageKey = key;
      stage = next;
      if (stageGroup) {
        scene.remove(stageGroup);
        disposeObject(stageGroup);
      }
      stageGroup = buildStage(next);
      scene.add(stageGroup);
      placeCameras(sizeChanged);
    }

    function objectKey(o: Show["objects"][number]) {
      return o.kind === "person"
        ? `p|${o.pose}|${o.color}|${o.name}|${o.showName}`
        : `r|${o.prop}|${o.color}`;
    }

    function syncObjects(list: Show["objects"]) {
      const seen = new Set<string>();
      for (const o of list) {
        seen.add(o.id);
        const key = objectKey(o);
        let v = objects.get(o.id);
        if (!v || v.key !== key) {
          if (v) {
            scene.remove(v.group);
            disposeObject(v.group);
          }
          const group = new THREE.Group();
          group.add(o.kind === "person" ? buildPerson(o.pose, o.color) : buildProp(o.prop, o.color));
          if (o.kind === "person" && o.showName) {
            const tag = buildNameTag(o.name);
            tag.name = "tag";
            group.add(tag);
          }
          group.userData.pick = { kind: "object", id: o.id } satisfies Pick;
          scene.add(group);
          v = { group, key };
          objects.set(o.id, v);
        }
        const s = o.kind === "person" ? (o.height / PERSON_BASE) * o.scale : o.scale;
        v.group.position.set(o.x, stage!.deckHeight, o.z);
        v.group.rotation.y = THREE.MathUtils.degToRad(o.rot);
        v.group.scale.setScalar(s);
        const tag = v.group.getObjectByName("tag");
        if (tag) {
          // 이름표는 머리 위 0.3m, 크기는 배율과 관계없이 같게
          tag.position.set(0, PERSON_BASE + 0.3 / s, 0);
          tag.scale.set(1 / s, 0.25 / s, 1);
        }
      }
      for (const [id, v] of objects) {
        if (seen.has(id)) continue;
        scene.remove(v.group);
        disposeObject(v.group);
        objects.delete(id);
      }
    }

    function createFixtureView(f: Fixture): FixtureView {
      const light = new THREE.SpotLight(0xffffff, 0, 0, 0.5, 0.5, 2);
      light.shadow.mapSize.set(512, 512);
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 40;
      light.shadow.bias = -0.0005;
      const target = new THREE.Object3D();
      scene.add(light, target);
      light.target = target;
      const { group: body, lens } = buildFixtureBody(f.type);
      body.userData.pick = { kind: "fixture", id: f.id } satisfies Pick;
      scene.add(body);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1, 1, 32, 1, true),
        new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color() }, uStrength: { value: 0 } },
          vertexShader: HAZE_VERTEX,
          fragmentShader: HAZE_FRAGMENT,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        }),
      );
      cone.raycast = () => {};
      scene.add(cone);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.34, 32),
        new THREE.MeshBasicMaterial({ color: RING, side: THREE.DoubleSide, depthTest: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 5;
      ring.userData.pick = { kind: "focus", id: f.id } satisfies Pick;
      scene.add(ring);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: RING, transparent: true, opacity: 0.5 }),
      );
      line.raycast = () => {};
      scene.add(line);
      return { light, target, body, lens, cone, coneKey: "", ring, line, fixture: f };
    }

    function removeFixtureView(v: FixtureView) {
      scene.remove(v.light, v.target, v.body, v.cone, v.ring, v.line);
      v.light.dispose();
      for (const o of [v.body, v.cone, v.ring, v.line]) disposeObject(o);
    }

    function syncFixtures(list: Fixture[], showShadows: boolean) {
      const seen = new Set<string>();
      const fp = new THREE.Vector3();
      for (const f of list) {
        seen.add(f.id);
        let v = fixtures.get(f.id);
        if (!v || v.fixture.type !== f.type) {
          if (v) removeFixtureView(v);
          v = createFixtureView(f);
          fixtures.set(f.id, v);
        }
        v.fixture = f;
        const p = focusPoint(f.focus, stage!);
        fp.set(p.x, p.y, p.z);
        v.light.position.set(f.position.x, f.position.y, f.position.z);
        v.target.position.copy(fp);
        v.light.angle = THREE.MathUtils.degToRad(f.beam / 2);
        v.light.penumbra = f.softness;
        v.light.castShadow = showShadows;
        v.body.position.copy(v.light.position);
        v.body.lookAt(fp);
        v.ring.position.set(f.focus.x, stage!.deckHeight + 0.02, f.focus.z);
        v.ring.visible = tab === "fixtures";
        v.line.geometry.setFromPoints([v.light.position.clone(), fp.clone()]);
        v.line.visible = tab === "fixtures";
        // 연무 원뿔: 꼭짓점이 조명기, 포커스 너머까지 조금 더 뻗는다
        const dir = fp.clone().sub(v.light.position);
        const length = Math.min(dir.length() * 1.15, 30);
        const key = `${f.beam}|${length.toFixed(2)}`;
        if (key !== v.coneKey) {
          v.cone.geometry.dispose();
          const radius = Math.tan(v.light.angle) * length;
          v.cone.geometry = new THREE.ConeGeometry(radius, length, 32, 1, true);
          v.coneKey = key;
        }
        dir.normalize();
        v.cone.position.copy(v.light.position).addScaledVector(dir, length / 2);
        v.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
      }
      for (const [id, v] of fixtures) {
        if (seen.has(id)) continue;
        removeFixtureView(v);
        fixtures.delete(id);
      }
    }

    function applyLevels() {
      if (!show) return;
      for (const v of fixtures.values()) {
        const l = levels[v.fixture.id] ?? OFF;
        const k = Math.max(0, Math.min(1, l.intensity / 100));
        v.light.intensity = candela(v.fixture.type, l.intensity);
        v.light.color.set(l.color);
        v.lens.material.color.set(l.color).multiplyScalar(0.12 + 0.88 * k);
        v.cone.material.uniforms.uColor.value.set(l.color);
        v.cone.material.uniforms.uStrength.value = k * show.haze.density * HAZE_GAIN;
        v.cone.visible = show.haze.on && k > 0;
      }
      request();
    }

    function applyHighlights() {
      const level = (p: Pick): 0 | 1 | 2 =>
        selected && selected.id === p.id && (selected.kind === p.kind || (p.kind === "fixture" && selected.kind === "focus"))
          ? 2
          : hover && hover.id === p.id && hover.kind === p.kind
            ? 1
            : 0;
      for (const [id, v] of objects) setHighlight(v.group, level({ kind: "object", id }));
      for (const [id, v] of fixtures) {
        setHighlight(v.body, level({ kind: "fixture", id }));
        const ringOn = selected?.id === id || (hover?.kind === "focus" && hover.id === id);
        v.ring.material.color.set(ringOn ? "#ffffff" : RING);
      }
      request();
    }

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane();
    const hit = new THREE.Vector3();

    function setRay(clientX: number, clientY: number): boolean {
      const r = renderer.domElement.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return true;
    }

    const api: SceneApi = {
      setShow(next, opts) {
        show = next;
        tab = opts.tab;
        selected = opts.selected;
        levels = opts.levels;
        syncStage(next.stage);
        syncObjects(next.objects);
        syncFixtures(next.fixtures, next.shadows);
        applyLevels();
        applyHighlights();
      },
      setLevels(next) {
        levels = next;
        applyLevels();
      },
      setView(nextView, nextRow) {
        view = nextView;
        row = nextRow;
        camera = view === "design" ? designCam : view === "audience" ? audienceCam : planCam;
        orbit.enabled = view === "design";
        planControls.enabled = view === "plan";
        placeCameras(false);
      },
      setHover(p) {
        hover = p;
        applyHighlights();
      },
      pick(clientX, clientY) {
        if (!setRay(clientX, clientY)) return null;
        const targets: THREE.Object3D[] = [];
        for (const v of objects.values()) targets.push(v.group);
        for (const v of fixtures.values()) {
          targets.push(v.body);
          if (v.ring.visible) targets.push(v.ring);
        }
        const hits = raycaster.intersectObjects(targets, true);
        return hits.length ? findPick(hits[0].object) : null;
      },
      planePoint(clientX, clientY, y) {
        if (!setRay(clientX, clientY)) return null;
        plane.set(new THREE.Vector3(0, 1, 0), -y);
        return raycaster.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
      },
      heightAt(clientX, clientY, anchor) {
        if (!setRay(clientX, clientY)) return null;
        // 카메라를 마주 보는 수직 평면 위에서 높이만 읽는다
        const n = new THREE.Vector3();
        camera.getWorldDirection(n);
        n.y = 0;
        if (n.lengthSq() < 1e-6) n.set(0, 0, 1);
        n.normalize();
        plane.setFromNormalAndCoplanarPoint(n, new THREE.Vector3(anchor.x, anchor.y, anchor.z));
        return raycaster.ray.intersectPlane(plane, hit) ? hit.y : null;
      },
      setOrbitEnabled(on) {
        orbit.enabled = on && view === "design";
        planControls.enabled = on && view === "plan";
      },
      exportPng() {
        renderer.render(scene, camera);
        return new Promise((resolve) => renderer.domElement.toBlob(resolve, "image/png"));
      },
    };

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!needsRender) return;
      needsRender = false;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    apiRef.current = api;

    return () => {
      apiRef.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      orbit.dispose();
      planControls.dispose();
      for (const v of fixtures.values()) removeFixtureView(v);
      for (const v of objects.values()) disposeObject(v.group);
      if (stageGroup) disposeObject(stageGroup);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [containerRef]);

  return apiRef;
}
```

- [ ] **Step 2: 확인**

Run: `npx tsc --noEmit -p . && npx eslint components/works/11_StageLighting/useStageScene.ts`
Expected: 출력 없음

- [ ] **Step 3: 커밋**

```bash
git add components/works/11_StageLighting/useStageScene.ts
git commit -m "feat : 무대조명 시뮬레이터 3D 장면(무대·조명·연무·시점·선택)"
```

---

### Task 7: 화면·입력·큐 재생·저장, 라우트·등록

**Files:**
- Create:
  - `components/works/11_StageLighting/panels.tsx`
  - `components/works/11_StageLighting/StageLighting.tsx`
  - `app/stage-lighting/page.tsx`
  - `app/stage-lighting/guide.ts`
- Modify: `lib/tools.ts`, `lib/tools.test.mts`, `app/privacy/page.tsx`

**Interfaces:**
- Consumes: Task 1~6 전부
- Produces: 페이지 `/stage-lighting`

- [ ] **Step 1: 도구 목록 테스트 기대값 (실패하는 테스트)**

`lib/tools.test.mts`:
- `toolsIn` 테스트의 창작 줄을 `["visual-novel-studio", "nemo-nemo-beam", "monorism", "stage-lighting"]`로 바꾼다.
- 검색 테스트에 다음 줄을 추가한다.

```ts
  assert.deepEqual(slugs(searchTools("조명")), ["stage-lighting"]);
```

Run: `node --test lib/tools.test.mts`
Expected: FAIL (2건)

- [ ] **Step 2: 등록**

`lib/tools.ts`의 `TOOLS` 끝에 추가:

```ts
  {
    slug: "stage-lighting",
    category: "creative",
    title: "무대조명 시뮬레이터",
    desc: "조명 큐를 짜고 GO를 눌러 봐요",
    about:
      "무대를 고르고 배우와 소품을 세운 뒤, 조명기를 끌어다 걸고 밝기와 색을 맞춰요. 장면마다 큐로 저장해 두면 GO 한 번에 다음 조명으로 천천히 바뀌어요.",
    tags: ["조명", "무대", "연극", "공연", "큐", "3D", "시뮬레이터", "조명 디자인"],
    thumb: null,
  },
```

`app/privacy/page.tsx`의 `STORAGE_ITEMS` 배열 끝(`];` 바로 앞)에 추가:

```ts
  {
    tool: "무대조명 시뮬레이터",
    where: "localStorage",
    keys: ["stage-lighting-show"],
    what: "무대 설정, 배우·소품 배치, 조명기 위치·색·밝기, 큐 목록",
  },
```

Run: `node --test lib/tools.test.mts`
Expected: PASS

- [ ] **Step 3: 패널 컴포넌트**

`components/works/11_StageLighting/panels.tsx`:

```tsx
"use client";

import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { type Cue, type Level, type Levels, OFF } from "./cues";
import { FIXTURE_SPECS, FIXTURE_TYPES, GELS, type FixtureType } from "./fixtures";
import { POSES, PROPS, type PersonPose, type PropType, type StageObject } from "./objects";
import { STAGE_LIMITS, type StageSettings, heightPresets } from "./rig";
import type { Fixture, FixturePatch, ObjectPatch, Show } from "./show";

export const PANEL_BUTTON =
  "inline-flex items-center gap-1 rounded-md border border-neutral-600 bg-neutral-800 px-2 py-1 text-xs font-bold text-neutral-100 hover:bg-neutral-700 disabled:opacity-40";
const LABEL = "flex flex-col gap-1 text-xs text-neutral-300";
const SECTION = "flex flex-col gap-3 border-b border-neutral-800 p-3";

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className={LABEL}>
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums text-neutral-400">
          {Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-amber-400"
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between text-xs text-neutral-300">
      {label}
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-10 cursor-pointer rounded border border-neutral-600 bg-transparent"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-xs text-neutral-300">
      {label}
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-amber-400"
      />
    </label>
  );
}

const SHAPES: { id: StageSettings["shape"]; label: string }[] = [
  { id: "proscenium", label: "프로시니엄" },
  { id: "thrust", label: "돌출형" },
  { id: "arena", label: "원형" },
];

export function StagePanel({
  show,
  onStage,
  onHaze,
  onShadows,
}: {
  show: Show;
  onStage: (patch: Partial<StageSettings>, key: string) => void;
  onHaze: (patch: Partial<Show["haze"]>, key: string) => void;
  onShadows: (on: boolean) => void;
}) {
  const s = show.stage;
  return (
    <div>
      <div className={SECTION}>
        <div className="flex gap-1" role="group" aria-label="무대 모양">
          {SHAPES.map((sh) => (
            <button
              key={sh.id}
              type="button"
              aria-pressed={s.shape === sh.id}
              onClick={() => onStage({ shape: sh.id }, "shape")}
              className={`${PANEL_BUTTON} flex-1 justify-center aria-pressed:border-amber-400 aria-pressed:text-amber-300`}
            >
              {sh.label}
            </button>
          ))}
        </div>
        <Slider label={s.shape === "arena" ? "지름" : "폭"} value={s.width} min={STAGE_LIMITS.width.min} max={STAGE_LIMITS.width.max} step={0.5} unit="m" onChange={(v) => onStage({ width: v }, "width")} />
        {s.shape !== "arena" && (
          <Slider label="깊이" value={s.depth} min={STAGE_LIMITS.depth.min} max={STAGE_LIMITS.depth.max} step={0.5} unit="m" onChange={(v) => onStage({ depth: v }, "depth")} />
        )}
        <Slider label="무대 바닥 높이" value={s.deckHeight} min={0} max={1.5} step={0.05} unit="m" onChange={(v) => onStage({ deckHeight: v }, "deck")} />
        <ColorField label="바닥색" value={s.floorColor} onChange={(v) => onStage({ floorColor: v }, "floor")} />
        {s.shape !== "arena" && (
          <>
            <Toggle label="배경막(사이클로라마)" checked={s.cycOn} onChange={(v) => onStage({ cycOn: v }, "cyc")} />
            {s.cycOn && <ColorField label="배경막 색" value={s.cycColor} onChange={(v) => onStage({ cycColor: v }, "cycColor")} />}
          </>
        )}
      </div>
      <div className={SECTION}>
        <Toggle label="그림자" checked={show.shadows} onChange={onShadows} />
        <Toggle label="연무(빔 보이기)" checked={show.haze.on} onChange={(v) => onHaze({ on: v }, "hazeOn")} />
        {show.haze.on && (
          <Slider label="연무 농도" value={show.haze.density} min={0} max={1} step={0.05} onChange={(v) => onHaze({ density: v }, "haze")} />
        )}
      </div>
    </div>
  );
}

export function ElementsPanel({
  objects,
  selectedId,
  full,
  onAddPerson,
  onAddProp,
  onSelect,
  onUpdate,
  onRemove,
}: {
  objects: StageObject[];
  selectedId: string | null;
  full: boolean;
  onAddPerson: () => void;
  onAddProp: (p: PropType) => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: ObjectPatch, key: string) => void;
  onRemove: (id: string) => void;
}) {
  const [prop, setProp] = useState<PropType>("chair");
  const sel = objects.find((o) => o.id === selectedId) ?? null;
  const labelOf = (o: StageObject) => (o.kind === "person" ? o.name : PROPS[o.prop].label);
  return (
    <div>
      <div className={SECTION}>
        <button type="button" disabled={full} onClick={onAddPerson} className={PANEL_BUTTON}>
          <Plus aria-hidden className="size-3.5" />
          등장인물 추가
        </button>
        <div className="flex gap-1">
          <select
            aria-label="소품 종류"
            value={prop}
            onChange={(e) => setProp(e.target.value as PropType)}
            className="flex-1 rounded-md border border-neutral-600 bg-neutral-800 px-1 text-xs"
          >
            {(Object.keys(PROPS) as PropType[]).map((p) => (
              <option key={p} value={p}>
                {PROPS[p].label}
              </option>
            ))}
          </select>
          <button type="button" disabled={full} onClick={() => onAddProp(prop)} className={PANEL_BUTTON}>
            <Plus aria-hidden className="size-3.5" />
            소품 추가
          </button>
        </div>
        {full && <p className="text-[11px] text-neutral-400">무대 요소는 최대 40개까지 둘 수 있어요</p>}
        <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto" aria-label="무대 요소 목록">
          {objects.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                aria-current={o.id === selectedId}
                onClick={() => onSelect(o.id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-neutral-800 aria-[current=true]:bg-neutral-700"
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: o.color }} />
                {labelOf(o)}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {sel && (
        <div className={SECTION} aria-label="선택한 무대 요소">
          <h3 className="text-sm font-bold">{labelOf(sel)}</h3>
          <p className="text-[11px] tabular-nums text-neutral-400">
            x {sel.x.toFixed(2)} · z {sel.z.toFixed(2)} · {sel.rot}°
          </p>
          {sel.kind === "person" && (
            <>
              <label className={LABEL}>
                이름
                <input
                  type="text"
                  aria-label="이름"
                  value={sel.name}
                  maxLength={20}
                  onChange={(e) => onUpdate(sel.id, { name: e.target.value }, "name")}
                  className="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-xs"
                />
              </label>
              <Toggle label="이름표 보이기" checked={sel.showName} onChange={(v) => onUpdate(sel.id, { showName: v }, "showName")} />
              <label className={LABEL}>
                자세
                <select
                  aria-label="자세"
                  value={sel.pose}
                  onChange={(e) => onUpdate(sel.id, { pose: e.target.value as PersonPose }, "pose")}
                  className="rounded border border-neutral-600 bg-neutral-800 px-1 py-1 text-xs"
                >
                  {(Object.keys(POSES) as PersonPose[]).map((p) => (
                    <option key={p} value={p}>
                      {POSES[p]}
                    </option>
                  ))}
                </select>
              </label>
              <Slider label="키" value={sel.height} min={1.4} max={2} step={0.01} unit="m" onChange={(v) => onUpdate(sel.id, { height: v }, "height")} />
            </>
          )}
          <Slider label="크기" value={sel.scale} min={0.5} max={2} step={0.05} unit="×" onChange={(v) => onUpdate(sel.id, { scale: v }, "scale")} />
          <ColorField label="색" value={sel.color} onChange={(v) => onUpdate(sel.id, { color: v }, "color")} />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-neutral-300">방향</span>
            <button type="button" className={PANEL_BUTTON} onClick={() => onUpdate(sel.id, { rot: sel.rot - 15 }, "rot")} aria-label="왼쪽으로 15° 돌리기" title="왼쪽으로 15° (Q)">
              ⟲ 15°
            </button>
            <button type="button" className={PANEL_BUTTON} onClick={() => onUpdate(sel.id, { rot: sel.rot + 15 }, "rot")} aria-label="오른쪽으로 15° 돌리기" title="오른쪽으로 15° (E)">
              15° ⟳
            </button>
          </div>
          <button type="button" className={PANEL_BUTTON} onClick={() => onRemove(sel.id)}>
            <Trash2 aria-hidden className="size-3.5" />
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export function FixturesPanel({
  show,
  levels,
  selectedId,
  full,
  onAdd,
  onSelect,
  onUpdate,
  onLevel,
  onRemove,
}: {
  show: Show;
  levels: Levels;
  selectedId: string | null;
  full: boolean;
  onAdd: (t: FixtureType) => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: FixturePatch, key: string, useGrid?: boolean) => void;
  onLevel: (id: string, patch: Partial<Level>, key: string) => void;
  onRemove: (id: string) => void;
}) {
  const [type, setType] = useState<FixtureType>("profile");
  const sel: Fixture | null = show.fixtures.find((f) => f.id === selectedId) ?? null;
  const presets = heightPresets(show.stage);
  const level = (id: string) => levels[id] ?? OFF;
  return (
    <div>
      <div className={SECTION}>
        <div className="flex gap-1">
          <select
            aria-label="조명기 종류"
            value={type}
            onChange={(e) => setType(e.target.value as FixtureType)}
            className="flex-1 rounded-md border border-neutral-600 bg-neutral-800 px-1 text-xs"
          >
            {FIXTURE_TYPES.map((t) => (
              <option key={t} value={t}>
                {FIXTURE_SPECS[t].label}
              </option>
            ))}
          </select>
          <button type="button" disabled={full} onClick={() => onAdd(type)} className={PANEL_BUTTON}>
            <Plus aria-hidden className="size-3.5" />
            조명기 추가
          </button>
        </div>
        {full && <p className="text-[11px] text-neutral-400">조명기는 최대 16개까지 걸 수 있어요</p>}
        <ul className="flex max-h-44 flex-col gap-0.5 overflow-y-auto" aria-label="조명기 목록">
          {show.fixtures.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                aria-current={f.id === selectedId}
                onClick={() => onSelect(f.id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-neutral-800 aria-[current=true]:bg-neutral-700"
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: level(f.id).color }} />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="h-1.5 w-12 overflow-hidden rounded bg-neutral-700">
                  <span className="block h-full bg-amber-400" style={{ width: `${level(f.id).intensity}%` }} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {sel && (
        <div className={SECTION} aria-label="선택한 조명기">
          <label className={LABEL}>
            이름
            <input
              type="text"
              aria-label="조명기 이름"
              value={sel.name}
              maxLength={20}
              onChange={(e) => onUpdate(sel.id, { name: e.target.value }, "fxName")}
              className="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-xs"
            />
          </label>
          <Slider label="밝기" value={Math.round(level(sel.id).intensity)} min={0} max={100} step={1} unit="%" onChange={(v) => onLevel(sel.id, { intensity: v }, "level")} />
          <div className="flex flex-wrap gap-1">
            {[0, 30, 50, 70, 100].map((v) => (
              <button key={v} type="button" className={PANEL_BUTTON} onClick={() => onLevel(sel.id, { intensity: v }, "levelBtn")}>
                {v}%
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="젤 색">
            {GELS.map((g) => (
              <button
                key={g.color}
                type="button"
                title={g.name}
                aria-label={g.name}
                aria-pressed={level(sel.id).color === g.color}
                onClick={() => onLevel(sel.id, { color: g.color }, "gel")}
                className="size-6 rounded-full border border-neutral-600 aria-pressed:ring-2 aria-pressed:ring-amber-400"
                style={{ backgroundColor: g.color }}
              />
            ))}
          </div>
          <ColorField label="색 직접 고르기" value={level(sel.id).color} onChange={(v) => onLevel(sel.id, { color: v }, "color")} />
          <Slider label="빔 각도" value={sel.beam} min={FIXTURE_SPECS[sel.type].beam.min} max={FIXTURE_SPECS[sel.type].beam.max} step={1} unit="°" onChange={(v) => onUpdate(sel.id, { beam: v }, "beam")} />
          <Slider label="가장자리 부드러움" value={sel.softness} min={FIXTURE_SPECS[sel.type].softness.min} max={FIXTURE_SPECS[sel.type].softness.max} step={0.01} onChange={(v) => onUpdate(sel.id, { softness: v }, "soft")} />
          <Slider label="겨누는 높이" value={sel.focus.height} min={0} max={2} step={0.05} unit="m" onChange={(v) => onUpdate(sel.id, { focus: { ...sel.focus, height: v } }, "focusH")} />
          <div className="flex flex-col gap-1 text-xs text-neutral-300">
            높이 바로 맞추기
            <div className="flex flex-wrap gap-1">
              {([
                ["바닥", presets.floor],
                ["붐", presets.boom],
                ["배튼", presets.batten],
                ["FOH", presets.foh],
              ] as const).map(([label, y]) => (
                <button key={label} type="button" className={PANEL_BUTTON} onClick={() => onUpdate(sel.id, { position: { ...sel.position, y } }, "heightBtn", false)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] tabular-nums text-neutral-400">
            위치 x {sel.position.x.toFixed(2)} · y {sel.position.y.toFixed(2)} · z {sel.position.z.toFixed(2)}
          </p>
          <p className="text-[11px] text-neutral-400">몸체를 끌면 옮기고, Shift+끌기는 높이, 바닥의 주황 고리를 끌면 겨누는 곳이 바뀌어요.</p>
          <button type="button" className={PANEL_BUTTON} onClick={() => onRemove(sel.id)}>
            <Trash2 aria-hidden className="size-3.5" />
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export function CueBar({
  cues,
  cueIndex,
  selectedCue,
  changed,
  onGo,
  onBack,
  onRecord,
  onOverwrite,
  onDelete,
  onMove,
  onSelectCue,
  onJump,
  onFade,
}: {
  cues: Cue[];
  cueIndex: number;
  selectedCue: number | null;
  changed: boolean;
  onGo: () => void;
  onBack: () => void;
  onRecord: () => void;
  onOverwrite: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onSelectCue: (i: number) => void;
  onJump: (i: number) => void;
  onFade: (v: number) => void;
}) {
  const sel = selectedCue !== null ? cues[selectedCue] : null;
  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-neutral-800 bg-neutral-900 p-2 md:flex-row md:items-center">
      <div className="flex gap-1">
        <button type="button" onClick={onBack} className={PANEL_BUTTON} title="이전 큐 (Backspace)">
          이전
        </button>
        <button
          type="button"
          onClick={onGo}
          title="다음 큐로 (Space)"
          className="rounded-md bg-amber-400 px-4 py-1 text-sm font-extrabold text-neutral-950 hover:bg-amber-300"
        >
          GO
        </button>
        {changed && <span className="self-center rounded bg-amber-400/20 px-1.5 text-[11px] font-bold text-amber-300">바뀜</span>}
      </div>
      <ol className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="큐 목록">
        {cues.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              aria-current={i === cueIndex ? "step" : undefined}
              aria-pressed={i === selectedCue}
              onClick={() => onSelectCue(i)}
              onDoubleClick={() => onJump(i)}
              title="두 번 누르면 이 큐로 넘어가요"
              className={`whitespace-nowrap rounded-md border px-2 py-1 text-xs ${
                i === cueIndex ? "border-amber-400 text-amber-300" : "border-neutral-700 text-neutral-200"
              } aria-pressed:bg-neutral-700`}
            >
              <span className="font-bold tabular-nums">{i + 1}</span> {c.label}
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" onClick={onRecord} className={PANEL_BUTTON}>
          큐 저장
        </button>
        <button type="button" onClick={onOverwrite} disabled={!sel} className={PANEL_BUTTON}>
          덮어쓰기
        </button>
        <button type="button" onClick={() => onMove(-1)} disabled={!sel} className={PANEL_BUTTON} aria-label="큐 앞으로">
          <ArrowLeft aria-hidden className="size-3.5" />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={!sel} className={PANEL_BUTTON} aria-label="큐 뒤로">
          <ArrowRight aria-hidden className="size-3.5" />
        </button>
        <button type="button" onClick={onDelete} disabled={!sel} className={PANEL_BUTTON} aria-label="큐 삭제">
          <Trash2 aria-hidden className="size-3.5" />
        </button>
        {sel && (
          <label className="flex items-center gap-1 text-xs text-neutral-300">
            페이드
            <input
              type="number"
              aria-label="페이드 시간"
              min={0}
              max={30}
              step={0.5}
              value={sel.fade}
              onChange={(e) => onFade(Number(e.target.value))}
              className="w-14 rounded border border-neutral-600 bg-neutral-800 px-1 py-0.5 tabular-nums"
            />
            초
          </label>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 메인 컴포넌트**

`components/works/11_StageLighting/StageLighting.tsx`:

```tsx
"use client";

import { Download, Redo2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BACK_FADE,
  type Levels,
  deleteCue,
  interpolateLevels,
  levelsEqual,
  moveCue,
  nextIndex,
  normalizeFade,
  overwriteCue,
  prevIndex,
  recordCue,
} from "./cues";
import { MAX_FIXTURES } from "./fixtures";
import { canRedo, canUndo, createHistory, record, redo, undo } from "./history";
import { MAX_OBJECTS } from "./objects";
import { CueBar, ElementsPanel, FixturesPanel, PANEL_BUTTON, StagePanel } from "./panels";
import {
  STORAGE_KEY,
  type Show,
  addFixture,
  addObject,
  createDefaultShow,
  deserializeShow,
  removeFixture,
  removeObject,
  serializeShow,
  setLevel,
  updateFixture,
  updateObject,
  updateStage,
} from "./show";
import { type Pick, type Tab, type View, useStageScene } from "./useStageScene";

const SAVE_DELAY_MS = 500;
const DRAG_THRESHOLD_PX = 3;

const TABS: { id: Tab; label: string }[] = [
  { id: "stage", label: "무대 설정" },
  { id: "elements", label: "무대 요소" },
  { id: "fixtures", label: "조명기" },
];
const VIEWS: { id: View; label: string }[] = [
  { id: "design", label: "설계" },
  { id: "audience", label: "관객석" },
  { id: "plan", label: "평면도" },
];

type Fade = { from: Levels; to: Levels; ids: string[]; start: number; dur: number; index: number };
type Drag = {
  pick: Pick;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  offset: { x: number; z: number };
  shift: boolean;
};

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || t.tagName === "TEXTAREA" || t.tagName === "SELECT" ||
    (t.tagName === "INPUT" && !["range", "checkbox", "color", "button"].includes((t as HTMLInputElement).type)));

export default function StageLighting() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const scene = useStageScene(containerRef, () => setWebglFailed(true));

  const [show, setShow] = useState<Show>(createDefaultShow);
  const showRef = useRef(show);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const [tab, setTab] = useState<Tab>("stage");
  const [view, setView] = useState<View>("design");
  const viewRef = useRef<View>("design");
  const [row, setRow] = useState(5);
  const [selected, setSelected] = useState<Pick | null>(null);
  const [selectedCue, setSelectedCue] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const [dragLabel, setDragLabel] = useState<{ x: number; y: number; text: string } | null>(null);
  const historyRef = useRef(createHistory<Show>());
  const fadeRef = useRef<Fade | null>(null);
  const liveRef = useRef<Levels>(show.live);
  const dragRef = useRef<Drag | null>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const hoverRef = useRef<Pick | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- 저장 ----
  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, serializeShow(showRef.current));
    } catch {
      // 저장 공간이 없거나 막혀 있으면 조용히 넘어간다
    }
  }, []);
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveNow, SAVE_DELAY_MS);
  }, [saveNow]);

  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) saveNow();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [saveNow]);

  // 저장된 공연을 한 번 불러온다. 서버 렌더와 첫 화면을 맞추려고 effect에서 읽는다.
  useEffect(() => {
    let saved: Show | null = null;
    try {
      saved = deserializeShow(localStorage.getItem(STORAGE_KEY));
    } catch {
      saved = null;
    }
    hydratedRef.current = true;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (saved) {
      showRef.current = saved;
      liveRef.current = saved.live;
      setShow(saved);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    scheduleSave();
  }, [scheduleSave]);

  // ---- 상태 바꾸기 ----
  const refreshHistory = useCallback(() => {
    const h = historyRef.current;
    setHistoryState({ undo: canUndo(h), redo: canRedo(h) });
  }, []);

  // 실행 취소 기록 없이 바꾼다(큐 재생, 끌기 도중)
  const replace = useCallback(
    (next: Show) => {
      showRef.current = next;
      if (!fadeRef.current) liveRef.current = next.live;
      setShow(next);
      scheduleSave();
    },
    [scheduleSave],
  );

  function stopFade() {
    if (!fadeRef.current) return;
    fadeRef.current = null;
    setFading(false);
    replace({ ...showRef.current, live: liveRef.current });
  }

  // 편집: 바뀌기 전 상태를 기록하고 바꾼다. key가 같고 짧게 이어지면 한 단계로 합친다.
  function change(fn: (s: Show) => Show, key: string | null = null) {
    stopFade();
    const prev = showRef.current;
    const next = fn(prev);
    if (next === prev) return;
    record(historyRef.current, prev, key, performance.now());
    replace(next);
    refreshHistory();
  }

  // ---- 큐 재생 ----
  function finishFade() {
    const f = fadeRef.current;
    if (!f) return;
    fadeRef.current = null;
    setFading(false);
    liveRef.current = f.to;
    replace({ ...showRef.current, live: f.to, cueIndex: f.index });
  }

  function runFade(index: number, seconds: number) {
    finishFade();
    const s = showRef.current;
    const ids = s.fixtures.map((f) => f.id);
    const to = interpolateLevels(s.cues[index].levels, s.cues[index].levels, ids, 1);
    if (seconds <= 0) {
      liveRef.current = to;
      replace({ ...s, live: to, cueIndex: index });
      return;
    }
    fadeRef.current = { from: liveRef.current, to, ids, start: performance.now(), dur: seconds * 1000, index };
    setFading(true);
  }

  function go() {
    finishFade();
    const s = showRef.current;
    const n = nextIndex(s.cueIndex, s.cues.length);
    if (n !== null) runFade(n, s.cues[n].fade);
  }

  function back() {
    finishFade();
    const p = prevIndex(showRef.current.cueIndex);
    if (p !== null) runFade(p, BACK_FADE);
  }

  useEffect(() => {
    if (!fading) return;
    let raf = 0;
    const tick = () => {
      const f = fadeRef.current;
      if (!f) return;
      const t = (performance.now() - f.start) / f.dur;
      const levels = interpolateLevels(f.from, f.to, f.ids, t);
      liveRef.current = levels;
      scene.current?.setLevels(levels);
      if (t >= 1) {
        finishFade();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // finishFade는 ref만 읽고 replace는 안정적이다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fading, scene]);

  // ---- 장면 동기화 ----
  useEffect(() => {
    scene.current?.setShow(show, {
      tab,
      selected,
      levels: fadeRef.current ? liveRef.current : show.live,
    });
  }, [show, tab, selected, scene, hydrated]);

  useEffect(() => {
    viewRef.current = view;
    scene.current?.setView(view, row);
  }, [view, row, scene]);

  // ---- 선택·삭제·실행 취소 ----
  function select(p: Pick | null) {
    setSelected(p);
    if (p) setTab(p.kind === "object" ? "elements" : "fixtures");
  }

  function removeSelected() {
    const p = selected;
    if (!p) return;
    if (p.kind === "object") change((s) => removeObject(s, p.id));
    else change((s) => removeFixture(s, p.id));
    setSelected(null);
  }

  function doUndo() {
    stopFade();
    const prev = undo(historyRef.current, showRef.current);
    if (prev) replace(prev);
    refreshHistory();
  }

  function doRedo() {
    stopFade();
    const next = redo(historyRef.current, showRef.current);
    if (next) replace(next);
    refreshHistory();
  }

  function rotateSelected(delta: number) {
    if (selected?.kind !== "object") return;
    const o = showRef.current.objects.find((q) => q.id === selected.id);
    if (o) change((s) => updateObject(s, o.id, { rot: o.rot + delta }), `rot-${o.id}`);
  }

  // 키보드 리스너는 한 번만 달고 최신 함수를 ref로 부른다
  const keyActions = useRef({ go, back, doUndo, doRedo, removeSelected, rotateSelected, select, setTab });
  useEffect(() => {
    keyActions.current = { go, back, doUndo, doRedo, removeSelected, rotateSelected, select, setTab };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || document.querySelector("dialog[open]")) return;
      const a = keyActions.current;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) a.doRedo();
        else a.doUndo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space") {
        e.preventDefault();
        a.go();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        a.back();
      } else if (e.key === "Delete") a.removeSelected();
      else if (e.key === "Escape") a.select(null);
      else if (e.key === "1") a.setTab("stage");
      else if (e.key === "2") a.setTab("elements");
      else if (e.key === "3") a.setTab("fixtures");
      else if (e.key.toLowerCase() === "q") a.rotateSelected(-15);
      else if (e.key.toLowerCase() === "e") a.rotateSelected(15);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- 3D 직접 조작 ----
  // OrbitControls보다 먼저 받으려고 capture 단계 리스너로 단다
  const pointerActions = useRef({ down: (_e: PointerEvent) => {}, move: (_e: PointerEvent) => {}, up: (_e: PointerEvent) => {} });
  // 렌더 중에 ref를 바꾸면 React 린트가 막으므로 매 렌더 뒤 effect에서 최신 처리기로 바꾼다
  useEffect(() => {
    pointerActions.current = {
    down(e) {
      const api = scene.current;
      if (!api || e.button !== 0) return;
      downRef.current = { x: e.clientX, y: e.clientY };
      const p = api.pick(e.clientX, e.clientY);
      if (!p) return;
      select(p);
      if (viewRef.current === "audience") return;
      api.setOrbitEnabled(false);
      const s = showRef.current;
      let offset = { x: 0, z: 0 };
      if (p.kind === "object") {
        const o = s.objects.find((q) => q.id === p.id);
        const pt = api.planePoint(e.clientX, e.clientY, s.stage.deckHeight);
        if (o && pt) offset = { x: o.x - pt.x, z: o.z - pt.z };
      } else {
        const f = s.fixtures.find((q) => q.id === p.id);
        const y = p.kind === "fixture" ? f?.position.y ?? 0 : s.stage.deckHeight;
        const pt = api.planePoint(e.clientX, e.clientY, y);
        if (f && pt) {
          const base = p.kind === "fixture" ? f.position : f.focus;
          offset = { x: base.x - pt.x, z: base.z - pt.z };
        }
      }
      dragRef.current = { pick: p, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false, offset, shift: e.shiftKey };
      containerRef.current?.setPointerCapture(e.pointerId);
    },
    move(e) {
      const api = scene.current;
      if (!api) return;
      const d = dragRef.current;
      if (!d) {
        const p = api.pick(e.clientX, e.clientY);
        const prev = hoverRef.current;
        if (p?.id !== prev?.id || p?.kind !== prev?.kind) {
          hoverRef.current = p;
          api.setHover(p);
        }
        if (containerRef.current)
          containerRef.current.style.cursor = p && viewRef.current !== "audience" ? "grab" : "";
        return;
      }
      if (e.pointerId !== d.pointerId) return;
      if (!d.moved) {
        if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD_PX) return;
        d.moved = true;
        stopFade();
        record(historyRef.current, showRef.current, null, performance.now());
        refreshHistory();
      }
      const s = showRef.current;
      let next = s;
      let text = "";
      if (d.pick.kind === "object") {
        const pt = api.planePoint(e.clientX, e.clientY, s.stage.deckHeight);
        if (!pt) return;
        next = updateObject(s, d.pick.id, { x: pt.x + d.offset.x, z: pt.z + d.offset.z }, !e.altKey);
        const o = next.objects.find((q) => q.id === d.pick.id);
        if (o) text = `x ${o.x.toFixed(2)} · z ${o.z.toFixed(2)}`;
      } else {
        const f = s.fixtures.find((q) => q.id === d.pick.id);
        if (!f) return;
        if (d.pick.kind === "fixture" && e.shiftKey) {
          const y = api.heightAt(e.clientX, e.clientY, f.position);
          if (y === null) return;
          next = updateFixture(s, f.id, { position: { ...f.position, y } });
          d.shift = true;
        } else if (d.pick.kind === "fixture") {
          // Shift를 떼면 지금 자리에서 수평 끌기를 다시 시작한다
          if (d.shift) {
            const pt0 = api.planePoint(e.clientX, e.clientY, f.position.y);
            if (pt0) d.offset = { x: f.position.x - pt0.x, z: f.position.z - pt0.z };
            d.shift = false;
          }
          const pt = api.planePoint(e.clientX, e.clientY, f.position.y);
          if (!pt) return;
          next = updateFixture(s, f.id, { position: { ...f.position, x: pt.x + d.offset.x, z: pt.z + d.offset.z } });
        } else {
          const pt = api.planePoint(e.clientX, e.clientY, s.stage.deckHeight);
          if (!pt) return;
          next = updateFixture(s, f.id, { focus: { ...f.focus, x: pt.x + d.offset.x, z: pt.z + d.offset.z } });
        }
        const nf = next.fixtures.find((q) => q.id === f.id)!;
        text =
          d.pick.kind === "focus"
            ? `겨눔 x ${nf.focus.x.toFixed(2)} · z ${nf.focus.z.toFixed(2)}`
            : `x ${nf.position.x.toFixed(2)} · y ${nf.position.y.toFixed(2)} · z ${nf.position.z.toFixed(2)}`;
      }
      replace(next);
      const r = containerRef.current?.getBoundingClientRect();
      if (r) setDragLabel({ x: e.clientX - r.left + 14, y: e.clientY - r.top + 14, text });
    },
    up(e) {
      const api = scene.current;
      const d = dragRef.current;
      if (d && e.pointerId === d.pointerId) {
        dragRef.current = null;
        api?.setOrbitEnabled(true);
        setDragLabel(null);
        return;
      }
      // 빈 곳을 눌렀다 거의 움직이지 않고 떼면 선택을 푼다(시점 회전은 그대로)
      const down = downRef.current;
      downRef.current = null;
      if (down && api && Math.hypot(e.clientX - down.x, e.clientY - down.y) < DRAG_THRESHOLD_PX && !api.pick(e.clientX, e.clientY))
        setSelected(null);
    },
    };
  });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const down = (e: PointerEvent) => pointerActions.current.down(e);
    const move = (e: PointerEvent) => pointerActions.current.move(e);
    const up = (e: PointerEvent) => pointerActions.current.up(e);
    el.addEventListener("pointerdown", down, { capture: true });
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down, { capture: true });
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  async function savePng() {
    const blob = await scene.current?.exportPng();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stage-lighting-${timestamp()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const ids = show.fixtures.map((f) => f.id);
  const panelLevels = fading ? liveRef.current : show.live;
  const changed =
    !fading && show.cueIndex >= 0 && !!show.cues[show.cueIndex] && !levelsEqual(show.live, show.cues[show.cueIndex].levels, ids);
  const selObjectId = selected?.kind === "object" ? selected.id : null;
  const selFixtureId = selected && selected.kind !== "object" ? selected.id : null;
  const nextCueId = () => `c${showRef.current.nextId}`;

  return (
    <div className="flex h-full flex-col bg-neutral-950 text-neutral-100">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-3 py-2">
        <div className="flex gap-1" role="group" aria-label="시점">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)} className={`${PANEL_BUTTON} aria-pressed:border-amber-400 aria-pressed:text-amber-300`}>
              {v.label}
            </button>
          ))}
        </div>
        {view === "audience" && (
          <label className="flex items-center gap-1 text-xs text-neutral-300">
            객석 {row}열
            <input type="range" aria-label="객석 줄" min={1} max={10} step={1} value={row} onChange={(e) => setRow(Number(e.target.value))} className="w-24 accent-amber-400" />
          </label>
        )}
        <div className="ml-auto flex gap-1">
          <button type="button" aria-label="실행 취소" title="실행 취소 (Ctrl/⌘+Z)" disabled={!historyState.undo} onClick={doUndo} className={PANEL_BUTTON}>
            <Undo2 aria-hidden className="size-4" />
          </button>
          <button type="button" aria-label="다시 실행" title="다시 실행 (Ctrl/⌘+Shift+Z)" disabled={!historyState.redo} onClick={doRedo} className={PANEL_BUTTON}>
            <Redo2 aria-hidden className="size-4" />
          </button>
          <button type="button" onClick={savePng} className={PANEL_BUTTON}>
            <Download aria-hidden className="size-4" />
            PNG로 저장
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <div ref={containerRef} aria-label="무대 3D 화면" className="relative h-[55vh] shrink-0 touch-none select-none md:h-auto md:flex-1">
          {dragLabel && (
            <span className="pointer-events-none absolute rounded bg-neutral-900/80 px-1.5 py-0.5 text-[11px] tabular-nums text-amber-200" style={{ left: dragLabel.x, top: dragLabel.y }}>
              {dragLabel.text}
            </span>
          )}
          {webglFailed && (
            <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-bold">
              이 브라우저에서는 3D 화면을 그릴 수 없어요. 브라우저 설정에서 WebGL(하드웨어 가속)을 켜거나 다른 브라우저로 열어 주세요.
            </p>
          )}
        </div>
        <aside className="w-full shrink-0 border-t border-neutral-800 bg-neutral-900 md:w-80 md:overflow-y-auto md:border-t-0 md:border-l">
          <div role="tablist" aria-label="패널" className="flex border-b border-neutral-800">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 border-b-2 border-transparent px-2 py-2 text-xs font-bold text-neutral-400 aria-selected:border-amber-400 aria-selected:text-neutral-100"
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === "stage" && (
            <StagePanel
              show={show}
              onStage={(patch, key) => change((s) => updateStage(s, patch), `stage-${key}`)}
              onHaze={(patch, key) => change((s) => ({ ...s, haze: { ...s.haze, ...patch } }), `haze-${key}`)}
              onShadows={(on) => change((s) => ({ ...s, shadows: on }))}
            />
          )}
          {tab === "elements" && (
            <ElementsPanel
              objects={show.objects}
              selectedId={selObjectId}
              full={show.objects.length >= MAX_OBJECTS}
              onAddPerson={() => {
                const r = addObject(showRef.current, { kind: "person" });
                if (r) {
                  change(() => r.show);
                  setSelected({ kind: "object", id: r.id });
                }
              }}
              onAddProp={(prop) => {
                const r = addObject(showRef.current, { kind: "prop", prop });
                if (r) {
                  change(() => r.show);
                  setSelected({ kind: "object", id: r.id });
                }
              }}
              onSelect={(id) => setSelected({ kind: "object", id })}
              onUpdate={(id, patch, key) => change((s) => updateObject(s, id, patch), `obj-${key}-${id}`)}
              onRemove={(id) => {
                change((s) => removeObject(s, id));
                setSelected(null);
              }}
            />
          )}
          {tab === "fixtures" && (
            <FixturesPanel
              show={show}
              levels={panelLevels}
              selectedId={selFixtureId}
              full={show.fixtures.length >= MAX_FIXTURES}
              onAdd={(type) => {
                const r = addFixture(showRef.current, type);
                if (r) {
                  change(() => r.show);
                  setSelected({ kind: "fixture", id: r.id });
                }
              }}
              onSelect={(id) => setSelected({ kind: "fixture", id })}
              onUpdate={(id, patch, key, useGrid) => change((s) => updateFixture(s, id, patch, useGrid), `fx-${key}-${id}`)}
              onLevel={(id, patch, key) => change((s) => setLevel(s, id, patch), `lv-${key}-${id}`)}
              onRemove={(id) => {
                change((s) => removeFixture(s, id));
                setSelected(null);
              }}
            />
          )}
        </aside>
      </div>

      <CueBar
        cues={show.cues}
        cueIndex={show.cueIndex}
        selectedCue={selectedCue !== null && selectedCue < show.cues.length ? selectedCue : null}
        changed={changed}
        onGo={go}
        onBack={back}
        onRecord={() => {
          const id = nextCueId();
          change((s) => {
            const cues = recordCue(s.cues, s.live, s.fixtures.map((f) => f.id), id);
            return cues ? { ...s, cues, cueIndex: cues.length - 1, nextId: s.nextId + 1 } : s;
          });
          setSelectedCue(showRef.current.cues.length - 1);
        }}
        onOverwrite={() => {
          if (selectedCue === null) return;
          change((s) => ({ ...s, cues: overwriteCue(s.cues, selectedCue, s.live, s.fixtures.map((f) => f.id)), cueIndex: selectedCue }));
        }}
        onDelete={() => {
          if (selectedCue === null) return;
          change((s) => {
            const cues = deleteCue(s.cues, selectedCue);
            const cueIndex = s.cueIndex === selectedCue ? -1 : s.cueIndex > selectedCue ? s.cueIndex - 1 : s.cueIndex;
            return { ...s, cues, cueIndex };
          });
          setSelectedCue(null);
        }}
        onMove={(dir) => {
          if (selectedCue === null) return;
          const j = selectedCue + dir;
          if (j < 0 || j >= showRef.current.cues.length) return;
          change((s) => {
            const cueIndex = s.cueIndex === selectedCue ? j : s.cueIndex === j ? selectedCue : s.cueIndex;
            return { ...s, cues: moveCue(s.cues, selectedCue, dir), cueIndex };
          });
          setSelectedCue(j);
        }}
        onSelectCue={(i) => setSelectedCue(i)}
        onJump={(i) => runFade(i, show.cues[i].fade)}
        onFade={(v) => {
          if (selectedCue === null) return;
          change((s) => ({ ...s, cues: s.cues.map((c, i) => (i === selectedCue ? { ...c, fade: normalizeFade(v) } : c)) }), `fade-${selectedCue}`);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 5: 라우트·안내**

`app/stage-lighting/guide.ts`:

```ts
import type { ToolGuideContent } from "../_components/ToolGuide";

export const stageLightingGuide: ToolGuideContent = {
  name: "무대조명 시뮬레이터",
  intro: [
    "무대조명 시뮬레이터는 공연 무대의 조명 연출을 브라우저에서 연습하는 3D 도구입니다. 무대를 고르고 배우와 소품을 세운 뒤, 조명기를 걸어 겨누는 곳과 밝기·색을 정합니다.",
    "장면마다 조명 상태를 큐로 저장해 두면 GO를 누를 때마다 정한 시간 동안 다음 큐로 부드럽게 바뀝니다. 작업한 공연은 이 브라우저에 자동으로 저장됩니다.",
  ],
  steps: [
    {
      title: "무대 설정",
      body: "'무대 설정' 탭에서 프로시니엄·돌출형·원형 가운데 모양을 고르고, 폭·깊이·바닥 높이와 바닥·배경막 색을 정합니다. 그림자와 연무도 여기서 켜고 끕니다.",
    },
    {
      title: "무대 요소 배치",
      body: "'무대 요소' 탭에서 등장인물과 소품을 추가합니다. 3D 화면에서 끌어 옮기고, Q·E 키로 15°씩 돌립니다. 등장인물은 키와 자세(서기·앉기·팔 벌리기·걷기·눕기)를 바꿀 수 있습니다.",
    },
    {
      title: "조명기 걸기",
      body: "'조명기' 탭에서 종류를 골라 추가합니다. 몸체를 끌면 수평으로, Shift를 누른 채 끌면 위아래로 움직이고, 바닥의 주황 고리를 끌면 겨누는 곳이 바뀝니다. 바닥·붐·배튼·FOH 버튼으로 높이를 바로 맞출 수도 있습니다.",
    },
    {
      title: "밝기와 색",
      body: "조명기를 고른 뒤 밝기 슬라이더나 0·30·50·70·100% 버튼으로 밝기를 정하고, 젤 색 동그라미나 색 상자로 색을 고릅니다. 빔 각도와 가장자리 부드러움도 바꿉니다.",
    },
    {
      title: "큐 저장과 GO",
      body: "아래 큐 막대의 '큐 저장'으로 지금 조명 상태를 큐로 남깁니다. GO(Space)를 누르면 다음 큐로, '이전'(Backspace)을 누르면 앞 큐로 넘어갑니다. 큐를 고르면 페이드 시간을 바꾸거나 덮어쓰고 순서를 옮길 수 있고, 두 번 누르면 그 큐로 바로 넘어갑니다.",
    },
    {
      title: "시점과 저장",
      body: "위쪽에서 설계(자유 회전)·관객석(1~10열)·평면도 시점을 고릅니다. 'PNG로 저장'은 지금 보이는 화면을 이미지로 내려받습니다.",
    },
  ],
  notes: [
    {
      title: "조명기 종류",
      body: "프로파일은 가장자리가 또렷해 특정 자리를 정확히 비출 때, 프레넬은 가장자리가 부드러워 넓은 영역을 고르게 채울 때 씁니다. PAR는 밝고 넓은 빛, 팔로우 스포트는 객석 쪽에서 배우를 좁게 따라 비출 때, 호리존트는 배경막 전체를 물들일 때 씁니다.",
    },
    {
      title: "기본 배치",
      body: "배우의 얼굴은 객석 쪽 위에서 비추는 조명(키 라이트)으로 밝히고, 반대쪽에서 약한 빛(필 라이트)으로 그림자를 덜어 냅니다. 뒤쪽 위에서 비추는 백 라이트는 배우를 배경에서 떼어 보이게 합니다. 배경막 색은 장면의 시간과 분위기를 정합니다.",
    },
    {
      title: "페이드 시간",
      body: "큐마다 0~30초의 페이드 시간을 정합니다. 짧으면 장면이 툭 바뀌고, 길면 해가 지듯 천천히 바뀝니다. 페이드 도중 GO를 누르면 진행 중인 전환을 끝 상태로 맞추고 바로 다음 큐로 넘어갑니다.",
    },
    {
      title: "연무와 그림자",
      body: "연무를 켜면 공중에 빛줄기가 보여 빔의 방향과 폭을 읽기 쉽습니다. 조명기가 많고 그림자를 켠 상태에서 화면이 느리면 그림자를 끄세요.",
    },
    {
      title: "실행 취소",
      body: "배치, 조명 값, 큐 편집은 Ctrl/⌘+Z로 되돌리고 Ctrl/⌘+Shift+Z로 다시 실행합니다. 최대 100단계까지 기억하고, 새로고침하면 기록은 사라지지만 공연은 남습니다.",
    },
  ],
  faq: [
    {
      q: "작업한 공연은 어디에 저장되나요?",
      a: "무대 설정, 배우·소품 배치, 조명기, 큐 목록을 이 브라우저의 localStorage에 저장하고 서버로 보내지 않습니다. 브라우저 데이터를 지우면 함께 사라지니 남기고 싶은 장면은 PNG로 저장해 두세요.",
    },
    {
      q: "화면이 느려요.",
      a: "조명기마다 실시간 그림자를 계산해서, 조명기가 많을수록 무거워집니다. '무대 설정' 탭에서 그림자를 끄거나 연무를 끄면 가벼워집니다.",
    },
    {
      q: "큐에 배우 위치가 저장되지 않아요.",
      a: "큐에는 조명기의 밝기와 색만 담습니다. 장면 전환이 아니라 같은 무대에서 조명 상태가 바뀌는 흐름을 연습하는 도구이기 때문입니다.",
    },
  ],
};
```

`app/stage-lighting/page.tsx`:

```tsx
import type { Metadata } from "next";
import ToolShell from "../_components/ToolShell";
import { stageLightingGuide } from "./guide";
import StageLighting from "@/components/works/11_StageLighting/StageLighting";

const DESCRIPTION =
  "무대를 고르고 배우와 소품을 세운 뒤, 조명기를 걸어 밝기와 색을 맞추고 큐를 GO로 넘겨 보는 3D 무대조명 연습 도구예요.";

export const metadata: Metadata = {
  title: "무대조명 시뮬레이터",
  description: DESCRIPTION,
  openGraph: { title: "무대조명 시뮬레이터", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "무대조명 시뮬레이터", description: DESCRIPTION },
};

export default function StageLightingPage() {
  return (
    <ToolShell guide={stageLightingGuide}>
      <main className="min-h-0 flex-1 overflow-hidden bg-neutral-950 text-neutral-100">
        <StageLighting />
      </main>
    </ToolShell>
  );
}
```

- [ ] **Step 6: 확인**

Run: `node --test lib/tools.test.mts components/works/11_StageLighting/*.test.mts && npx tsc --noEmit -p . && npx eslint app/stage-lighting app/privacy lib components/works/11_StageLighting`
Expected: PASS, 출력 없음

dev 서버(`npm run dev:services`, 레포 루트)에서 `http://localhost:3100/stage-lighting`을 열어 다음을 직접 본다.
- 기본 공연(배우 2, 의자, 조명기 6)이 비친다.
- GO를 누르면 3초 동안 따뜻한 낮으로 바뀐다.
- 콘솔 오류가 없다.

빛이 너무 어둡거나 밝으면 `fixtures.ts`의 `maxCandela`와 `useStageScene.ts`의 `HemisphereLight` 세기를 조정하고, 설계 문서 광도 표를 같이 고친다(ledger에 Ruling으로 남김).

- [ ] **Step 7: 커밋**

```bash
git add components/works/11_StageLighting app/stage-lighting app/privacy/page.tsx lib/tools.ts lib/tools.test.mts
git commit -m "feat : 무대조명 시뮬레이터 추가"
```

---

### Task 8: 문서·빌드·화면 검증

**Files:**
- Modify: `CLAUDE.md`(레포 루트)
- Modify: `docs/superpowers/specs/2026-11-14-stage-lighting-design.md`(검증 절의 `fixtures` 줄)
- Create(세션 스크래치): `verify-stage.mjs`

- [ ] **Step 1: 문서**

`CLAUDE.md`:
- `app/<service>/page.tsx` 줄의 라우트 목록에 `stage-lighting`을 추가한다.
- `components/works/1_KnitMuffler/` … `10_Monorism/` 줄을 `… 11_StageLighting/`으로 바꾸고, 설명의 도구 목록에 "stage lighting"을 넣는다.
- Commands 절 테스트 명령 끝에 ` apps/services/components/works/11_StageLighting/*.test.mts`를 붙인다.

설계 문서 10장 `fixtures` 줄을 실제 테스트에 맞게 바꾼다.

```markdown
   - `fixtures`: 종류별 범위 정규화(밖의 값은 가장자리로), 밝기·광도, 종류·색 판별
```

- [ ] **Step 2: 테스트·린트·빌드**

Run (레포 루트):

```bash
node --test apps/services/lib/tools.test.mts apps/services/components/works/_shared/*.test.mts apps/services/components/works/7_TextEncoding/encoding.test.mts apps/services/components/works/10_Monorism/*.test.mts apps/services/components/works/11_StageLighting/*.test.mts
npm run lint && npm run build --workspace services
grep -o 'https://[^<]*stage-lighting' apps/services/public/sitemap-0.xml
```

Expected: 테스트 전부 PASS, 빌드 오류 없음, sitemap 한 줄

- [ ] **Step 3: Playwright 검증**

dev 서버를 띄운 상태에서 세션 스크래치 디렉터리에 아래 파일을 만들어 실행한다. `REPO`는 레포 절대 경로로 바꾼다. 평면도 화면 좌표는 `rig.ts`의 `planHalfHeight`·`stageCenter`로 계산한다.

```js
import { chromium } from "REPO/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import { DEFAULT_STAGE, planHalfHeight, stageCenter } from "REPO/apps/services/components/works/11_StageLighting/rig.ts";

const URL = "http://localhost:3100/stage-lighting";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
const errors = [];
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
p.on("pageerror", (e) => errors.push(e.message));

let lastJson = null;
// 저장값이 바뀔 때까지 최대 4초 기다렸다 읽는다(expectChange=false면 바로 읽는다)
async function saved(expectChange = true) {
  let json = null;
  for (let t = 0; t < 40; t++) {
    await p.waitForTimeout(100);
    json = await p.evaluate(() => localStorage.getItem("stage-lighting-show"));
    if (json && t >= 6 && (!expectChange || json !== lastJson)) break;
  }
  lastJson = json;
  return JSON.parse(json);
}

async function ready() {
  await p.locator('[aria-label="무대 3D 화면"] canvas').waitFor();
  await p.waitForTimeout(600);
}

await p.goto(URL, { waitUntil: "networkidle" });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "networkidle" });
await ready();
let s = await saved();
assert.equal(s.fixtures.length, 6);
assert.equal(s.cues.length, 3);

// 탭 전환
await p.getByRole("tab", { name: "무대 요소" }).click();
assert.ok(await p.getByRole("button", { name: "등장인물 추가" }).isVisible());
await p.getByRole("tab", { name: "조명기" }).click();
assert.ok(await p.getByRole("button", { name: "조명기 추가" }).isVisible());

// 평면도에서 세계 좌표 → 화면 좌표
await p.getByRole("button", { name: "평면도" }).click();
await p.waitForTimeout(300);
const box = await p.getByLabel("무대 3D 화면").boundingBox();
const aspect = box.width / box.height;
const half = planHalfHeight(DEFAULT_STAGE, aspect);
const c = stageCenter(DEFAULT_STAGE);
const toScreen = (x, z) => ({
  x: box.x + box.width / 2 + ((x - c.x) / (half * aspect)) * (box.width / 2),
  y: box.y + box.height / 2 + ((z - c.z) / half) * (box.height / 2),
});

// 배우 1(-1.5, -3)을 누르면 무대 요소 탭이 열리고, 끌면 옮겨진다
const a1 = toScreen(-1.5, -3);
await p.mouse.click(a1.x, a1.y);
assert.equal(await p.getByRole("tab", { name: "무대 요소" }).getAttribute("aria-selected"), "true");
const to1 = toScreen(0, -2);
await p.mouse.move(a1.x, a1.y);
await p.mouse.down();
await p.mouse.move(to1.x, to1.y, { steps: 8 });
await p.mouse.up();
s = await saved();
const o1 = s.objects.find((o) => o.id === "o1");
assert.ok(Math.abs(o1.x - 0) <= 0.25 && Math.abs(o1.z + 2) <= 0.25, JSON.stringify(o1));

// 실행 취소
await p.keyboard.press("Control+z");
s = await saved();
assert.deepEqual([s.objects[0].x, s.objects[0].z], [-1.5, -3]);

// 조명기 f1(-3, ·, 6) 몸체를 옆으로 끌기 → 조명기 탭, x가 바뀜
const f1 = toScreen(-3, 6);
await p.mouse.move(f1.x, f1.y);
await p.mouse.down();
const f1to = toScreen(-1, 6);
await p.mouse.move(f1to.x, f1to.y, { steps: 8 });
await p.mouse.up();
assert.equal(await p.getByRole("tab", { name: "조명기" }).getAttribute("aria-selected"), "true");
s = await saved();
assert.equal(s.fixtures[0].position.x, -1);

// 조준 고리(f1 포커스 -1.5, -3)를 끌기
const r1 = toScreen(-1.5, -3);
await p.mouse.move(r1.x, r1.y);
await p.mouse.down();
const r1to = toScreen(-2.5, -3);
await p.mouse.move(r1to.x, r1to.y, { steps: 8 });
await p.mouse.up();
s = await saved();
assert.equal(s.fixtures[0].focus.x, -2.5);

// 조명기 추가 + 밝기
await p.getByRole("button", { name: "조명기 추가" }).click();
await p.getByRole("button", { name: "100%" }).click();
s = await saved();
assert.equal(s.fixtures.length, 7);
assert.equal(s.live[s.fixtures[6].id].intensity, 100);

// GO: 큐 1 → 큐 2(3초), GO 연타는 끝 상태로 맞추고 넘어간다
await p.getByRole("button", { name: "GO" }).click();
await p.getByRole("button", { name: "GO" }).click();
s = await saved();
assert.equal(s.cueIndex, 1);
await p.waitForTimeout(3500);
s = await saved();
assert.equal(s.cueIndex, 2);
assert.equal(s.live.f3.color, "#2246d8");
assert.equal(s.live[s.fixtures[6].id].intensity, 0);

// 큐 저장
await p.getByRole("button", { name: "큐 저장" }).click();
s = await saved();
assert.equal(s.cues.length, 4);

// 새로고침 후 유지
await p.reload({ waitUntil: "networkidle" });
await ready();
s = await saved(false);
assert.equal(s.cues.length, 4);
assert.equal(s.fixtures.length, 7);

// 시점 전환
for (const name of ["관객석", "평면도", "설계"]) {
  await p.getByRole("button", { name }).click();
  await p.waitForTimeout(300);
}

// PNG
const [download] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "PNG로 저장" }).click()]);
assert.match(download.suggestedFilename(), /^stage-lighting-\d{8}-\d{4}\.png$/);

// 모바일 폭
const m = await ctx.newPage();
await m.setViewportSize({ width: 375, height: 812 });
await m.goto(URL, { waitUntil: "networkidle" });
assert.equal(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

await b.close();
assert.deepEqual(errors, [], errors.join("\n"));
console.log("OK");
```

Run: `node <scratch>/verify-stage.mjs`
Expected: `OK`

위 스크립트의 GO 연타 부분 설명:
- 첫 GO는 큐 2로 3초 페이드를 시작한다.
- 곧바로 누른 두 번째 GO가 그 페이드를 끝 상태(cueIndex 1)로 맞추고, 큐 3으로 다음 페이드를 시작한다.
- 그래서 저장값은 먼저 cueIndex 1이 되고, 3.5초 뒤에는 2가 된다.

실패하면 원인을 고치고 `fix : …` 커밋을 만든다.

- [ ] **Step 4: 사용자 확인 목록**

결과 보고에 다음을 적는다.
- 조명 느낌(광도·색)
- 연무 모양
- 조명기 16개 + 그림자 성능
- 끌어서 옮기기 손맛
- 터치 기기에서 끌기·시점 회전

- [ ] **Step 5: 커밋**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-11-14-stage-lighting-design.md
git commit -m "docs : 무대조명 시뮬레이터 추가에 맞춰 CLAUDE.md·설계 검증 항목 갱신"
```

---

## Self-Review

- **설계 문서 대비 누락:** 없음.

| 설계 문서 절 | Task |
|---|---|
| 좌표 | 2 |
| 무대 모양·범위·객석 | 2·6 |
| 무대 요소(자세 5·소품 10·40개) | 1·4·5 |
| 조명기 자유 배치·범위·높이 버튼·기본 자리 | 2·4·6·7 |
| 조명기 5종 범위·젤 12·16개 | 1·7 |
| 그림자·연무 | 6·7 |
| 큐(저장·덮어쓰기·삭제·이동·보간·없는 조명기 0·삭제 반영·GO 연타·편집 시 멈춤·단축키·99개) | 3·7 |
| 패널 탭 3개·자동 전환·조준 고리 표시·큐 막대 상시 | 7 |
| 시점 3종 | 6·7 |
| 직접 조작(누른 채 끌기, Shift 높이, Alt 격자 끄기, 좌표 표시, 관객석 끌기 금지, Delete·Esc, 실행 취소 100) | 3·7 |
| 저장·기본 공연·PNG·개인정보처리방침 | 4·7 |
| 구조·WebGL 안내 | 6·7 |
| 안내 문구 | 7 |
| 검증 | 각 Task·8 |

- **설계 문서와 다르게 정한 점:**
  - `objects.ts`·`panels.tsx`를 더했다.
  - 실행 취소에 같은 key 병합(600ms)을 넣어 슬라이더 끌기가 한 단계가 되게 했다.
  - 큐 재생(GO·이전)은 편집이 아니므로 실행 취소 기록에 넣지 않는다.
- **타입 일관성:** 아래 이름이 정의 Task와 사용 Task에서 같다.
  - `Show`, `Fixture`, `FixturePatch`, `ObjectPatch`
  - `Pick`, `Tab`, `View`
  - `Levels`, `Level`, `Cue`
  - `StageSettings`, `Vec3`, `Focus`
