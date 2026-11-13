# 조명 연습실 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 무대·소품·인물·조명기를 배치하고 큐를 만들어 페이드로 재생하는 3D 조명 연습 도구 `/stage-lighting`(1단계)을 서비스 앱에 추가한다.

**Architecture:** 순수 모듈(`show.ts` 데이터·조작·직렬화, `cues.ts` 보간, `store.ts` 외부 store·diff·히스토리, `quality.ts` 품질 단계)이 상태를 맡고, three.js 씬(`scene/*` 빌더 + `useStageScene.ts`)은 store diff만 반영해 필요할 때만 그린다. React UI(툴바·속성 패널·큐 바)는 선택자 구독으로 필요한 조각만 다시 그린다.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, TypeScript, three 0.187(`OrbitControls`, `BufferGeometryUtils.mergeGeometries`), node:test, Playwright(scratchpad 스크립트).

**Spec:** `docs/superpowers/specs/2026-11-13-stage-lighting-design.md`

## Global Constraints

- 위치: `apps/services/components/works/11_StageLighting/`, 라우트 `apps/services/app/stage-lighting/`.
- 순수 모듈(`show.ts`, `cues.ts`, `store.ts`, `quality.ts`)은 `import type`만 쓴다(런타임 import 없음). 테스트는 `*.test.mts`에서 `./x.ts`를 import, tsconfig는 이미 `**/*.test.mts`를 제외한다.
- 상한: 조명기 24, 소품 40, 인물 40, 큐 99, 히스토리 100.
- clamp: 무대 폭 4–20m, 깊이 3–15m, 높이 3–12m, 인물 키 1.0–2.1m, 페이드 0–60초, 밝기·softness·헤이즈 0..1, 빔 각도는 종류별 범위.
- 그림자 맵 1024, `PCFShadowMap`, `shadowMap.autoUpdate = false`. 품질 단계 그림자 8/4/0, 원뿔 분할 32/16/16. 자동 품질은 최근 30프레임 평균 > 22ms일 때 한 단계 내리고 올리지 않는다.
- 픽셀 비율 평소 `min(devicePixelRatio, 2)`, 조작 중 1, 조작 끝나고 150ms 뒤 복원.
- 저장 키 `stage-lighting-show`(1초 디바운스, idle 콜백 직렬화, pagehide·visibilitychange·언마운트 즉시 저장), `stage-lighting-quality`.
- `window.__stageStats`는 `process.env.NODE_ENV !== "production"`일 때만.
- React 컴파일러 린트: effect 안 setState는 hydration 한정 eslint-disable, 수동 메모 대신 일반 함수 + 최신 핸들러 ref, 선언 전 접근 금지.
- 문구: UI는 짧은 명사형/해요체, `guide.ts`는 합니다체, `TOOLS.about`은 해요체. CLAUDE.md Writing Guidelines를 따르고 없는 기능은 쓰지 않는다.
- 커밋 메시지 `feat : …`/`fix : …`/`docs : …`, Co-Authored-By 트레일러 없음. push 금지.

## Review Focus

1. 페이드 재생 중 사용자가 슬라이더·드래그로 편집 → 페이드가 멈추고 그 순간 상태가 `live`가 된다(Task 6 테스트 아님 → Task 8 Playwright 시나리오에 포함).
2. 큐가 기록된 뒤 조명기를 삭제·추가 → 삭제된 id 레벨은 사라지고, 새 조명기는 기존 큐에서 밝기 0으로 보인다(Task 1·2 테스트).
3. 저장본이 깨졌을 때 기본 공연으로 시작하되 기존 저장본을 바로 덮어쓰지 않는다(Task 6 `loadShow` 동작, Task 8 Playwright).
4. 그림자 한도보다 많은 조명기에 그림자를 켜려 함 / 품질이 내려가 한도가 줄어듦 → 배열 앞쪽부터 한도까지만 그림자, 나머지는 빛만(Task 3 테스트).
5. 글자 입력칸 포커스 중 Space·Backspace → 단축키 무시(Task 7, `isTextEntryTarget` 재사용).

---

## 좌표 규약 (모든 task 공통)

- 단위 미터, y 위. 무대 앞 끝 중앙이 원점, 무대 안쪽(업스테이지)이 −z, 객석이 +z.
- 프로시니엄: 바닥 x ∈ [−w/2, w/2], z ∈ [−d, 0], 배경막은 z = −d 수직면(폭 w, 높이 h).
- 돌출: 프로시니엄 + 앞쪽 돌출부 x ∈ [−w/4, w/4], z ∈ [0, d·0.4].
- 원형: 중심 (0, 0, −d/2), 반지름 min(w, d)/2 원판. 배경막 없음.
- 인물·소품 `position.y`는 0(바닥 위). 회전은 y축 라디안, 0이면 +z(객석)를 본다.

---

### Task 1: 공연 데이터 모델 (`show.ts`)

**Files:**
- Create: `apps/services/components/works/11_StageLighting/show.ts`
- Test: `apps/services/components/works/11_StageLighting/show.test.mts`

Ruling: 스펙의 `presets.ts` 내용(무대·소품·조명기 기본값)은 `show.ts`에 둔다 — 순수 모듈은 런타임 import를 하지 않는 규약이라 `defaultShow`가 프리셋을 쓰려면 같은 파일이어야 한다.

**Interfaces:**
- Produces: 스펙 1절의 타입 전부(`Vec3`, `StageShape`, `Stage`, `PropKind`, `Prop`, `Build`, `Pose`, `Actor`, `FixtureKind`, `Fixture`, `FixtureLevel`, `LookState`, `Cue`, `Show`)를 그대로 export.
- 상수: `LIMITS = { fixtures: 24, props: 40, actors: 40, cues: 99 }`, `PROP_KINDS: PropKind[]`, `FIXTURE_KINDS: FixtureKind[]`, `PROP_SPECS: Record<PropKind, { label: string; scale: Vec3; color: string }>`, `FIXTURE_SPECS: Record<FixtureKind, { label: string; beam: [min, max, default]; softness: number }>` (값은 스펙 2절: profile [15,50,26] 0.1, par [10,60,40] 0.4, fresnel [15,70,45] 0.7, follow [5,30,12] 0.2, cyc [60,100,90] 0.9), 라벨은 `프로필`·`PAR 워시`·`프레넬`·`팔로우`·`호리존트`, 소품은 `의자`·`탁자`·`계단`·`단`·`기둥`·`상자`·`문틀`.
- 함수:
  - `defaultShow(): Show` — 프로시니엄 10×8×6, 인물 2, 조명기 6(프로필 앞 2: (±2, 6, 3) 조준 (±1, 0, −3) / PAR 위 2: (±2.5, 6, −4) 조준 (±1.5, 0, −4) / 프레넬 뒤 1: (0, 6, −7.5) 조준 (0, 0, −3) / 호리존트 1: (0, 0.3, −7.5) 조준 (0, 4, −8)), `live.haze = 0.4`(첫 화면에서 빔이 보여야 도구 성격이 드러난다), 조명기 6대 모두 밝기 0.8·흰색(호리존트는 #4060ff), 큐 1개(번호 1, 이름 `처음`, 페이드 3, `look` = `live` 깊은 복사). 프로필 2·PAR 2·프레넬은 `castShadow: true`.
  - `newId(prefix: string): string` — `${prefix}-${Date.now().toString(36)}-${counter}`.
  - `clampStage(s: Stage): Stage`, `clampLevel(kind: FixtureKind, l: FixtureLevel): FixtureLevel`.
  - `addProp(show, kind): Show`, `addActor(show): Show`, `addFixture(show, kind): Show` — 상한이면 같은 객체를 그대로 반환. 새 조명기는 `live.levels`에 밝기 0 기본 레벨을 갖는다(기존 큐에는 넣지 않음).
  - `updateProp(show, id, patch: Partial<Prop>)`, `updateActor(...)`, `updateFixture(...)`, `updateStage(show, patch)`, `updateLevel(show, fixtureId, patch: Partial<FixtureLevel>)`, `setHaze(show, haze)` — 모두 clamp, 대상이 없으면 같은 객체 반환.
  - `removeEntity(show, id): Show` — 소품·인물·조명기 어디든 id로 제거. 조명기면 `live.levels`와 모든 `cues[].look.levels`에서도 제거.
  - `levelOf(look, fixture): FixtureLevel` — 레벨이 없으면 밝기 0·기본 빔·흰색·조준 (fixture.position.x, 0, fixture.position.z).
  - `saveCue(show, cueId?: string): Show` — cueId 없으면 새 큐(번호 = 최대 번호 + 1, 이름 `큐 N`, 페이드 3, `look` = `live` 깊은 복사), 있으면 그 큐의 `look` 덮어쓰기. 99개면 새 큐 추가 안 함.
  - `updateCue(show, id, patch: Partial<Pick<Cue, "name" | "fadeSec">>)`, `removeCue(show, id)`.
  - `sortedCues(show): Cue[]` — 번호 오름차순.
  - `serialize(show): string`, `deserialize(text: string): Show | null`.

- [ ] **Step 1: 실패하는 테스트 작성** — `show.test.mts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultShow, addFixture, addProp, removeEntity, saveCue, updateStage,
  updateActor, updateCue, levelOf, serialize, deserialize, LIMITS } from "./show.ts";

test("기본 공연 형태", () => {
  const s = defaultShow();
  assert.equal(s.stage.shape, "proscenium");
  assert.deepEqual([s.stage.width, s.stage.depth, s.stage.height], [10, 8, 6]);
  assert.equal(s.actors.length, 2);
  assert.equal(s.fixtures.length, 6);
  assert.equal(s.cues.length, 1);
  assert.equal(s.fixtures.filter((f) => f.castShadow).length, 5);
  assert.equal(s.live.haze, 0.4);
  assert.deepEqual(s.cues[0].look, s.live);
});

test("조명기 상한 24에서 추가하지 않는다", () => {
  let s = defaultShow();
  for (let i = 0; i < 30; i++) s = addFixture(s, "par");
  assert.equal(s.fixtures.length, LIMITS.fixtures);
  const same = addFixture(s, "par");
  assert.equal(same, s);
});

test("소품 상한 40", () => {
  let s = defaultShow();
  for (let i = 0; i < 45; i++) s = addProp(s, "chair");
  assert.equal(s.props.length, 40);
});

test("조명기 삭제 시 live와 모든 큐에서 레벨 제거", () => {
  let s = saveCue(defaultShow());
  const id = s.fixtures[0].id;
  s = removeEntity(s, id);
  assert.equal(s.fixtures.some((f) => f.id === id), false);
  assert.equal(id in s.live.levels, false);
  for (const c of s.cues) assert.equal(id in c.look.levels, false);
});

test("새 조명기는 기존 큐에 레벨이 없고 levelOf가 밝기 0을 준다", () => {
  let s = addFixture(defaultShow(), "fresnel");
  const f = s.fixtures.at(-1)!;
  assert.equal(f.id in s.cues[0].look.levels, false);
  assert.equal(levelOf(s.cues[0].look, f).intensity, 0);
});

test("saveCue: 새 큐 번호는 최대+1, 덮어쓰기는 개수 유지", () => {
  let s = saveCue(defaultShow());
  assert.deepEqual(s.cues.map((c) => c.number), [1, 2]);
  const n = s.cues.length;
  s = saveCue(s, s.cues[0].id);
  assert.equal(s.cues.length, n);
});

test("saveCue는 live를 깊은 복사한다", () => {
  const s = saveCue(defaultShow());
  const c = s.cues.at(-1)!;
  assert.notEqual(c.look, s.live);
  assert.notEqual(c.look.levels, s.live.levels);
});

test("clamp: 무대·키·페이드", () => {
  let s = updateStage(defaultShow(), { width: 100, depth: 1, height: 7 });
  assert.deepEqual([s.stage.width, s.stage.depth, s.stage.height], [20, 3, 7]);
  s = updateActor(s, s.actors[0].id, { height: 3 });
  assert.equal(s.actors[0].height, 2.1);
  s = updateCue(s, s.cues[0].id, { fadeSec: -2 });
  assert.equal(s.cues[0].fadeSec, 0);
});

test("직렬화 왕복", () => {
  const s = saveCue(addProp(defaultShow(), "table"));
  assert.deepEqual(deserialize(serialize(s)), s);
});

test("깨진 입력·버전 불일치는 null", () => {
  assert.equal(deserialize("{"), null);
  assert.equal(deserialize("null"), null);
  assert.equal(deserialize(JSON.stringify({ ...defaultShow(), version: 2 })), null);
  assert.equal(deserialize(JSON.stringify({ ...defaultShow(), fixtures: "x" })), null);
});

test("역직렬화는 범위 밖 값을 clamp한다", () => {
  const s = defaultShow();
  const raw = JSON.parse(serialize(s));
  raw.stage.width = 999;
  raw.live.haze = 5;
  const back = deserialize(JSON.stringify(raw))!;
  assert.equal(back.stage.width, 20);
  assert.equal(back.live.haze, 1);
});
```

- [ ] **Step 2: 실패 확인** — `node --test apps/services/components/works/11_StageLighting/show.test.mts` → 모듈 없음으로 FAIL.
- [ ] **Step 3: `show.ts` 구현** — 위 Interfaces 그대로. `deserialize`는 JSON 파싱 → `version === 1` → 각 배열·필드 타입 검사(하나라도 형식이 틀리면 null) → clamp. 색은 `/^#[0-9a-f]{6}$/i` 검사. 개수가 상한을 넘으면 앞에서부터 상한까지만 남긴다.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS.
- [ ] **Step 5: 커밋** — `git add apps/services/components/works/11_StageLighting/show.*` → `feat : 조명 연습실 공연 데이터 모델 추가`

### Task 2: 큐 보간 (`cues.ts`)

**Files:**
- Create: `apps/services/components/works/11_StageLighting/cues.ts`
- Test: `apps/services/components/works/11_StageLighting/cues.test.mts`

**Interfaces:**
- Consumes: `import type { LookState, FixtureLevel, Fixture } from "./show"`.
- Produces:
  - `lerpLook(a: LookState, b: LookState, t: number, fixtures: Fixture[]): LookState` — `fixtures` 각각에 대해 보간(한쪽에 없으면 다른 쪽 레벨의 밝기만 0으로 본 값). 결과 `levels`에는 `fixtures`의 id만 있다.
  - `fadeProgress(elapsedMs: number, fadeSec: number): number` — `fadeSec <= 0`이면 1, 아니면 `x = clamp(elapsed / (fadeSec*1000), 0, 1)`, 반환 `(1 − cos(πx)) / 2`.
  - `aimChanged(a: LookState, b: LookState, fixtures: Fixture[]): boolean` — 어느 조명기든 target 좌표나 beamAngle이 다르면 true(한쪽에만 있는 조명기는 다른 쪽 값을 같은 값으로 보므로 false).
  - `hexToLinear(hex): [r,g,b]`, `linearToHex([r,g,b]): string` (sRGB 감마 표준식).

- [ ] **Step 1: 실패하는 테스트**:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { lerpLook, fadeProgress, aimChanged, hexToLinear, linearToHex } from "./cues.ts";

const fx = [{ id: "a", kind: "par", name: "A", position: { x: 0, y: 6, z: 0 }, castShadow: false }] as const;
const lv = (o = {}) => ({ intensity: 0, color: "#ffffff", target: { x: 0, y: 0, z: 0 }, beamAngle: 40, softness: 0.4, ...o });

test("양 끝은 원래 상태", () => {
  const a = { levels: { a: lv({ intensity: 0.2 }) }, haze: 0 };
  const b = { levels: { a: lv({ intensity: 1 }) }, haze: 1 };
  assert.equal(lerpLook(a, b, 0, [...fx]).levels.a.intensity, 0.2);
  assert.equal(lerpLook(a, b, 1, [...fx]).levels.a.intensity, 1);
  assert.equal(lerpLook(a, b, 0.5, [...fx]).haze, 0.5);
});

test("한쪽에만 있는 조명기는 밝기 0에서 올라온다", () => {
  const a = { levels: {}, haze: 0 };
  const b = { levels: { a: lv({ intensity: 1, color: "#ff0000" }) }, haze: 0 };
  const m = lerpLook(a, b, 0.5, [...fx]).levels.a;
  assert.equal(m.intensity, 0.5);
  assert.equal(m.color, "#ff0000");
});

test("색은 선형 RGB에서 보간", () => {
  const a = { levels: { a: lv({ color: "#000000" }) }, haze: 0 };
  const b = { levels: { a: lv({ color: "#ffffff" }) }, haze: 0 };
  // 선형 0.5 → sRGB 약 0.735 → 0xbc
  assert.equal(lerpLook(a, b, 0.5, [...fx]).levels.a.color, "#bcbcbc");
});

test("색 변환 왕복", () => {
  assert.equal(linearToHex(hexToLinear("#3a7bd5")), "#3a7bd5");
});

test("fadeProgress", () => {
  assert.equal(fadeProgress(0, 0), 1);
  assert.equal(fadeProgress(500, 0), 1);
  assert.equal(fadeProgress(0, 2), 0);
  assert.equal(fadeProgress(1000, 2), 0.5);
  assert.equal(fadeProgress(5000, 2), 1);
});

test("aimChanged", () => {
  const a = { levels: { a: lv() }, haze: 0 };
  assert.equal(aimChanged(a, { levels: { a: lv({ intensity: 1, color: "#ff0000" }) }, haze: 1 }, [...fx]), false);
  assert.equal(aimChanged(a, { levels: { a: lv({ target: { x: 1, y: 0, z: 0 } }) }, haze: 0 }, [...fx]), true);
  assert.equal(aimChanged(a, { levels: { a: lv({ beamAngle: 20 }) }, haze: 0 }, [...fx]), true);
});
```

- [ ] **Step 2: 실패 확인** — `node --test apps/services/components/works/11_StageLighting/cues.test.mts` → FAIL.
- [ ] **Step 3: `cues.ts` 구현** — 한쪽에 없는 레벨: 있는 쪽 레벨을 복사하고 intensity만 0. 양쪽 다 없으면 `{ intensity: 0, color: "#ffffff", target: {x: f.position.x, y: 0, z: f.position.z}, beamAngle: 40, softness: 0.5 }`(show.ts의 `levelOf`와 같은 규칙이지만 런타임 import 금지라 이 기본값은 여기 한 번 더 적는다).
- [ ] **Step 4: 통과 확인** — PASS.
- [ ] **Step 5: 커밋** — `feat : 조명 연습실 큐 보간 추가`

### Task 3: store·diff·히스토리·품질 (`store.ts`, `quality.ts`)

**Files:**
- Create: `apps/services/components/works/11_StageLighting/store.ts`, `quality.ts`
- Test: `store.test.mts`, `quality.test.mts` (같은 폴더)

**Interfaces:**
- Consumes: `import type { Show, Fixture, LookState } from "./show"`.
- Produces (`store.ts`):
  - `type Delta = { added: string[]; changed: string[]; removed: string[] }`
  - `type ShowDiff = { stage: boolean; props: Delta; actors: Delta; fixtures: Delta; levels: string[]; haze: boolean; shadowsDirty: boolean }` — `levels`는 `live.levels` 참조가 바뀐 조명기 id(추가 포함). `shadowsDirty`는 stage·props·actors·fixtures 중 하나라도 변하거나, 바뀐 레벨 중 target·beamAngle이 달라진 게 있을 때 true.
  - `diffShow(prev: Show, next: Show): ShowDiff` — 엔티티는 id로 맞추고 객체 참조로 비교.
  - `type Store = { get(): Show; set(next: Show): void; subscribe(fn: () => void): () => void; checkpoint(): void; commit(next: Show): void; undo(): boolean; redo(): boolean; canUndo(): boolean; canRedo(): boolean }`
  - `createStore(initial: Show, maxHistory = 100): Store` — `set`은 히스토리 없이 교체(같은 참조면 알림 없음). `checkpoint`는 현재 상태를 undo 스택에 넣고 redo 비움(직전 checkpoint 이후 변화가 없으면 넣지 않음). `commit(next)` = `checkpoint(); set(next)`. undo 스택은 maxHistory 초과 시 가장 오래된 것부터 버림.
- Produces (`quality.ts`):
  - `type Quality = "auto" | "high" | "low"`, `type Tier = 0 | 1 | 2`
  - `TIERS: { shadows: number; segments: number }[]` = `[{8,32},{4,16},{0,16}]`
  - `nextTier(tier: Tier, recentMs: number[]): Tier` — `recentMs.length >= 30`이고 마지막 30개 평균 > 22이며 tier < 2면 tier+1, 아니면 그대로.
  - `effectiveTier(q: Quality, autoTier: Tier): Tier` — high→0, low→2, auto→autoTier.
  - `shadowFixtureIds(fixtures: Fixture[], limit: number): string[]` — `castShadow`인 것을 배열 순서대로 limit개.

- [ ] **Step 1: 실패하는 테스트** — `store.test.mts`(Show는 테스트 안에서 `defaultShow`·`updateProp` 등을 `./show.ts`에서 import해 만든다 — 테스트 파일의 런타임 import는 허용):

```ts
test("변화 없으면 빈 diff", () => {
  const s = defaultShow();
  const d = diffShow(s, s);
  assert.equal(d.stage, false);
  assert.deepEqual(d.fixtures, { added: [], changed: [], removed: [] });
  assert.deepEqual(d.levels, []);
  assert.equal(d.shadowsDirty, false);
});
test("소품 추가·변경·삭제 id", () => {
  const a = addProp(defaultShow(), "chair");
  const id = a.props[0].id;
  assert.deepEqual(diffShow(defaultShow(), a).props.added.length, 1);
  assert.deepEqual(diffShow(a, updateProp(a, id, { color: "#ff0000" })).props.changed, [id]);
  assert.deepEqual(diffShow(a, removeEntity(a, id)).props.removed, [id]);
});
test("밝기만 바뀌면 shadowsDirty false, 조준 바뀌면 true", () => {
  const s = defaultShow(); const id = s.fixtures[0].id;
  const b = diffShow(s, updateLevel(s, id, { intensity: 0.3 }));
  assert.deepEqual(b.levels, [id]); assert.equal(b.shadowsDirty, false);
  assert.equal(diffShow(s, updateLevel(s, id, { target: { x: 3, y: 0, z: -2 } })).shadowsDirty, true);
});
test("인물 이동은 shadowsDirty", () => {
  const s = defaultShow();
  assert.equal(diffShow(s, updateActor(s, s.actors[0].id, { position: { x: 1, y: 0, z: -2 } })).shadowsDirty, true);
});
test("store: commit/undo/redo", () => {
  const st = createStore(defaultShow());
  const s0 = st.get();
  st.commit(addProp(s0, "box"));
  assert.equal(st.get().props.length, 1);
  assert.equal(st.undo(), true); assert.equal(st.get(), s0);
  assert.equal(st.redo(), true); assert.equal(st.get().props.length, 1);
});
test("store: checkpoint 뒤 여러 set은 한 단계", () => {
  const st = createStore(defaultShow()); const s0 = st.get(); const id = s0.fixtures[0].id;
  st.checkpoint();
  for (const v of [0.1, 0.2, 0.3]) st.set(updateLevel(st.get(), id, { intensity: v }));
  st.undo(); assert.equal(st.get(), s0);
});
test("store: 히스토리 상한", () => {
  const st = createStore(defaultShow(), 3);
  for (let i = 0; i < 5; i++) st.commit(addProp(st.get(), "box"));
  let n = 0; while (st.undo()) n++;
  assert.equal(n, 3);
});
test("store: 같은 참조 set은 알리지 않는다", () => {
  const st = createStore(defaultShow()); let calls = 0;
  st.subscribe(() => calls++); st.set(st.get());
  assert.equal(calls, 0);
});
```

`quality.test.mts`:

```ts
test("nextTier", () => {
  assert.equal(nextTier(0, Array(29).fill(40)), 0);
  assert.equal(nextTier(0, Array(30).fill(23)), 1);
  assert.equal(nextTier(1, Array(30).fill(16)), 1);
  assert.equal(nextTier(2, Array(30).fill(40)), 2);
  assert.equal(nextTier(0, [...Array(10).fill(100), ...Array(30).fill(10)]), 0);
});
test("effectiveTier", () => {
  assert.equal(effectiveTier("high", 2), 0);
  assert.equal(effectiveTier("low", 0), 2);
  assert.equal(effectiveTier("auto", 1), 1);
});
test("shadowFixtureIds는 앞에서부터 한도까지", () => {
  const f = (id: string, c: boolean) => ({ id, kind: "par", name: id, position: { x: 0, y: 0, z: 0 }, castShadow: c });
  const list = [f("a", true), f("b", false), f("c", true), f("d", true)];
  assert.deepEqual(shadowFixtureIds(list as never, 2), ["a", "c"]);
  assert.deepEqual(shadowFixtureIds(list as never, 0), []);
});
```

- [ ] **Step 2: 실패 확인** — `node --test apps/services/components/works/11_StageLighting/store.test.mts apps/services/components/works/11_StageLighting/quality.test.mts` → FAIL.
- [ ] **Step 3: 구현** — Interfaces 그대로.
- [ ] **Step 4: 통과 확인** — 위 명령 + Task 1·2 테스트 함께 → PASS.
- [ ] **Step 5: 커밋** — `feat : 조명 연습실 store·diff·품질 단계 추가`

### Task 4: 씬 빌더 (`scene/`)

**Files:**
- Create: `apps/services/components/works/11_StageLighting/scene/stage.ts`, `scene/props.ts`, `scene/mannequin.ts`, `scene/beam.ts`, `scene/fixtureBody.ts`

**Interfaces:**
- Consumes: `Stage`, `Prop`, `PropKind`, `Actor`, `Build`, `Pose`, `PROP_KINDS`, `FIXTURE_SPECS` from `../show`.
- Produces:
  - `buildStage(stage: Stage): THREE.Group` — 좌표 규약대로 바닥(`receiveShadow`), 배경막(프로시니엄·돌출, `receiveShadow`), 객석 바닥(어두운 #111 평면, 무대 앞 z ∈ [0, d·1.5] 또는 원형이면 둘레), 바닥 앞 가장자리 두께 0.6m 박스(무대 높이감). 재질 `MeshStandardMaterial({ roughness: 0.9, metalness: 0 })`. `disposeGroup(g: THREE.Object3D): void`도 export(지오메트리·재질 dispose).
  - `class PropLayer { readonly group: THREE.Group; constructor(); sync(props: Prop[]): void; setTransform(id: string, pos: Vec3, rotationY: number): void; dispose(): void }` — 종류별 `InstancedMesh`(용량 40, `castShadow`·`receiveShadow`, `instanceColor`), 단위 지오메트리는 종류별로 박스를 `mergeGeometries`(의자 = 좌판·등받이·다리 4, 계단 = 3단, 문틀 = 기둥 2·상인방 1, 탁자 = 상판·다리 4, 단 = 박스, 기둥 = 원기둥, 상자 = 박스). 단위 지오메트리는 크기 1×1×1, 바닥이 y=0. 인스턴스 행렬 = translate(pos) · rotY · scale(prop.scale). id → (kind, index) 맵 유지. `sync`는 전체 재작성(최대 40개라 비용 무시).
  - `buildMannequinGeometry(height: number, build: Build, pose: Pose): THREE.BufferGeometry` — 머리(구)·몸통·골반·팔 2(상·하)·다리 2(상·하)를 캡슐/구로 만들어 `mergeGeometries`. 기준 키 1.7m 비율을 `height/1.7`로 스케일, 체형은 x·z 폭 배수 slim 0.85 / average 1 / stocky 1.25. 자세: stand(차렷), sit(허벅지 수평, 엉덩이 높이 0.45·키비율), armsOpen(팔 수평 옆), walk(한 다리 앞 20°, 반대 팔 앞). 원점 발바닥, +z가 정면. 옷 색과 피부색을 위해 머리·손은 `skin` 그룹, 나머지 `cloth` 그룹으로 `geometry.groups` 두 개(재질 배열 [cloth, skin]).
  - `createBeamMaterial(): THREE.ShaderMaterial` — uniforms `uColor: Color`, `uIntensity: number`, `uHaze: number`, `uSoftness: number`; `transparent`, `blending: AdditiveBlending`, `depthWrite: false`, `side: DoubleSide`. 정점 셰이더는 로컬 y(0 = 조명기, −1 = 끝)와 원뿔 반지름 대비 거리를 varying으로 넘김. 프래그먼트 알파 = `uIntensity * uHaze * 0.35 * (1 − axial)^1.5 * edge`, `edge = 1 − smoothstep(1 − max(uSoftness, 0.05), 1, radial)`. 
  - `buildBeamGeometry(segments: number): THREE.BufferGeometry` — 열린 원뿔, 꼭짓점이 원점, 높이 1, 밑면 반지름 1, −y 방향. 매 프레임 메시 scale로 (반지름 = 거리·tan(각/2), 길이 = 거리)를 맞춘다.
  - `buildFixtureBodyGeometry(): THREE.BufferGeometry` — 지름 0.25·길이 0.4 원기둥 + 요크, 앞이 −y.

- [ ] **Step 1: 빌더 작성** — 위 시그니처. 모든 재질·지오메트리는 모듈 수준 캐시 없이 생성하고 호출자가 dispose한다.
- [ ] **Step 2: 타입·린트 확인** — `cd apps/services && npx tsc --noEmit -p . && npx eslint components/works/11_StageLighting` → 오류 0.
- [ ] **Step 3: 커밋** — `feat : 조명 연습실 씬 빌더 추가`

(화면 확인은 Task 5 끝에서 한다.)

### Task 5: 씬 훅 — 렌더링·동기화·그림자·품질 (`useStageScene.ts`)

**Files:**
- Create: `apps/services/components/works/11_StageLighting/useStageScene.ts`

**Interfaces:**
- Consumes: Task 3 `Store`, `diffShow`, `TIERS`, `nextTier`, `effectiveTier`, `shadowFixtureIds`, `Quality`, `Tier`; Task 4 빌더; Task 1 `levelOf`, `Show`, `LookState`, `Vec3`.
- Produces:
  - `type ViewMode = "edit" | "audience" | "top"`
  - `type Pick = { type: "prop" | "actor" | "fixture" | "aim"; id: string } | null`
  - `type SceneApi = { requestRender(): void; applyLook(look: LookState, shadows: boolean): void; setView(v: ViewMode): void; setWorkLight(on: boolean): void; setQuality(q: Quality): void; setSelected(id: string | null): void; pick(clientX: number, clientY: number): Pick; floorPoint(clientX: number, clientY: number): Vec3 | null; previewEntity(id: string, pos: Vec3): void; previewAim(fixtureId: string, target: Vec3): void; beginInteraction(): void; endInteraction(): void; onTierChange(fn: (t: Tier) => void): void }`
  - `useStageScene(containerRef: RefObject<HTMLDivElement | null>, store: Store, onError: (msg: string) => void): RefObject<SceneApi | null>`

구현 규칙(스펙 5절을 코드로 옮긴다):
- 렌더러: `WebGLRenderer({ antialias: true, preserveDrawingBuffer: false })`, `toneMapping = ACESFilmicToneMapping`, `toneMappingExposure = 1`, `shadowMap.enabled = true`, `type = PCFShadowMap`, `autoUpdate = false`. 생성 실패는 try/catch → `onError("이 브라우저에서 3D 화면을 열지 못했어요.")`.
- 배경 #050507, 작업등 `HemisphereLight(0xffffff, 0x222222, 0.6)`.
- `requestRender`: 플래그가 꺼져 있을 때만 rAF 예약. 프레임에서 `controls.update()`가 true(관성 진행 중)면 다시 예약.
- 조명기: `SpotLight` + 타깃 Object3D + 빔 메시 + 본체 메시. `intensity = level.intensity * 800`(cd, decay 2, distance 0), `angle = beamAngle/2` 라디안, `penumbra = softness`, 색은 `Color.setStyle(hex)`(three 색 관리가 sRGB→선형 변환). 그림자 대상(`shadowFixtureIds(fixtures, TIERS[tier].shadows)`)만 `castShadow = true`, `shadow.mapSize = 1024`, `shadow.camera.near = 0.5`, `far = 40`, `bias = -0.0005`.
- 빔 메시: 조명 위치에 두고 타깃 방향으로 회전, scale = (r, len, r), `len = |target − position| + 1`. 헤이즈 0 또는 밝기 0이면 `visible = false`. 원뿔 분할은 현재 tier 값, 바뀌면 지오메트리 교체.
- store 구독: `diffShow(prev, next)`로 바뀐 것만 반영 — stage면 무대 그룹 교체, props면 `PropLayer.sync`, actors는 changed/added만 지오메트리 재생성(키·체형·자세가 같으면 위치·색만 갱신), fixtures added/removed는 조명 생성·dispose, `levels`는 해당 조명만 `applyLevel`. `shadowsDirty`면 `renderer.shadowMap.needsUpdate = true`. 마지막에 `requestRender()`.
- `applyLook(look, shadows)`: 모든 조명에 레벨 반영(store를 거치지 않음, 페이드용). `shadows`가 true면 그림자 갱신.
- 상호작용 품질: `beginInteraction`→ `setPixelRatio(1)`, 드래그 중 그림자 갱신은 4프레임에 한 번; `endInteraction`→ 150ms 타이머 뒤 `setPixelRatio(min(dpr, 2))`, 그림자 1회 갱신, 렌더. OrbitControls `start`/`end` 이벤트에도 같은 함수를 연결.
- 자동 품질: 상호작용 중 프레임 간격(ms)을 길이 30 링버퍼에 쌓고 `nextTier`로 갱신. tier가 바뀌면 그림자 대상·원뿔 지오메트리 재구성 후 `onTierChange` 콜백. 실제 단계 = `effectiveTier(quality, autoTier)`.
- 카메라:
  - edit: `PerspectiveCamera(45)`, 위치 (0, 9, d + 8), OrbitControls(`enableDamping`, `dampingFactor 0.1`, target (0, 1, −d/2), `maxPolarAngle = π/2 − 0.05`).
  - audience: `PerspectiveCamera(50)`, 위치 (0, 1.2, d), target (0, 1, −d/2), OrbitControls `enablePan false`, `minAzimuthAngle −25°`, `maxAzimuthAngle 25°`, `minDistance`·`maxDistance` = 초기 거리 ×0.6/×1.2, polar 75°–95°.
  - top: `OrthographicCamera`, 위에서 아래, 화면에 무대+객석 앞부분이 들어오게 frustum 계산, OrbitControls `enableRotate false`.
  - 뷰마다 컨트롤을 따로 두고 활성 뷰만 `enabled`. 리사이즈는 `ResizeObserver`.
- 선택 표시: 선택 대상 주위 얇은 흰 테두리 링(바닥 위 `RingGeometry`); 조명기 선택 시 조준점 손잡이(노란 링, 반지름 0.3)와 조명→조준점 점선.
- `pick`: Raycaster 레이를 엔티티 로컬 공간으로 옮겨 단위 박스와 교차(`ray.intersectBox`) — 소품은 scale 박스, 인물은 (0.6·체형, 키, 0.4) 박스, 조명기 본체는 0.5 박스. 조준점 손잡이는 바닥 교점과 target 거리 < 0.4. 가장 가까운 것을 반환.
- `floorPoint`: 레이와 y = 0 평면 교점을 수식으로(`t = −o.y / d.y`, `d.y ≥ 0`이면 null).
- `previewEntity`/`previewAim`: three 객체만 옮기고 `requestRender()`.
- 개발 통계: `process.env.NODE_ENV !== "production"`일 때 `window.__stageStats = { renders: number, shadowUpdates: number, frameMs: number[] }`를 갱신(렌더 1회마다 `renders++`, `needsUpdate`로 실제 그림자 갱신이 일어난 렌더마다 `shadowUpdates++`, `frameMs`는 최근 60개).
- 정리: 언마운트 시 모든 지오메트리·재질·그림자 맵(`light.shadow.map?.dispose()`)·컨트롤·렌더러 dispose, rAF·타이머·옵저버 해제.

- [ ] **Step 1: 훅 작성** — 위 규칙대로.
- [ ] **Step 2: 임시 마운트로 화면 확인** — Task 7 전까지는 `StageLighting.tsx`를 최소형(컨테이너 div + `createStore(defaultShow())` + 훅)으로 만들고 `app/stage-lighting/page.tsx`도 최소형으로 만든다(Task 7·8에서 완성). `npm run dev:services` 뒤 scratchpad Playwright로 `http://localhost:3100/stage-lighting` 스크린샷 → 무대·인물 2명·조명 원뿔 6개가 보인다.
- [ ] **Step 3: 렌더 0회 확인** — 로드 3초 뒤 `__stageStats.renders`를 읽고 2초 더 기다려 다시 읽는다 → 같다.
- [ ] **Step 4: 타입·린트** — `npx tsc --noEmit -p . && npx eslint components/works/11_StageLighting app/stage-lighting` → 0.
- [ ] **Step 5: 커밋** — `feat : 조명 연습실 3D 씬 렌더링 추가`

### Task 6: 저장·페이드 재생 (`persistence.ts`, `useCuePlayback.ts`)

**Files:**
- Create: `apps/services/components/works/11_StageLighting/persistence.ts`, `useCuePlayback.ts`

**Interfaces:**
- Consumes: `serialize`, `deserialize`, `defaultShow`, `Show`, `Cue`, `sortedCues` (Task 1); `lerpLook`, `fadeProgress`, `aimChanged` (Task 2); `Store` (Task 3); `SceneApi` (Task 5); `Quality` (Task 3).
- Produces:
  - `SHOW_KEY = "stage-lighting-show"`, `QUALITY_KEY = "stage-lighting-quality"`
  - `loadShow(): { show: Show; notice: string | null }` — 키 없음 → 기본 공연, null. 있는데 `deserialize`가 null → 기본 공연 + `"저장된 무대를 읽지 못해 기본 무대로 시작했어요. 무언가 고치면 새로 저장돼요."`. localStorage 접근 예외도 같은 처리(문구 `"이 브라우저에서는 저장을 쓸 수 없어요."`).
  - `useAutoSave(store: Store, onError: (msg: string) => void): void` — 구독 후 `store.get()`이 바뀌면 1초 디바운스 → `requestIdleCallback`(없으면 `setTimeout(0)`)에서 `localStorage.setItem(SHOW_KEY, serialize(...))`. 첫 저장은 사용자가 상태를 바꾼 뒤에만(로드 직후 저장하지 않음 — 깨진 저장본 보존). `pagehide`·`visibilitychange(hidden)`·언마운트에 대기 중이면 즉시 저장. setItem 예외 → `onError("저장 공간이 부족해 저장하지 못했어요.")`.
  - `loadQuality(): Quality`, `saveQuality(q: Quality): void` (try/catch, 기본 "auto").
  - `type Playback = { go(): void; back(): void; stop(): void; playing: boolean; currentCueId: string | null }`
  - `useCuePlayback(store: Store, sceneRef: RefObject<SceneApi | null>, progressRef: RefObject<HTMLDivElement | null>): Playback`
    - `go()`: 다음 큐 = `sortedCues`에서 현재 큐 다음(현재 없으면 첫 큐, 마지막이면 아무것도 안 함). from = `store.get().live`, to = 큐 look. rAF마다 `t = fadeProgress(...)`, `scene.applyLook(lerpLook(from, to, t, fixtures), aimChanged(from, to, fixtures))`, `progressRef.current.style.transform = scaleX(t)`. t = 1이면 `store.set({...show, live: 깊은복사(to)})`(히스토리 없음), playing false.
    - `back()`: 이전 큐로 즉시(페이드 0).
    - `stop()`: 진행 중이면 rAF 취소, 그 순간 보간값을 `store.set`으로 `live`에 반영.
    - `playing`·`currentCueId`는 React state(UI 표시용, 페이드 시작·끝에서만 바뀜).

- [ ] **Step 1: 두 파일 작성.**
- [ ] **Step 2: 타입·린트** → 0.
- [ ] **Step 3: 커밋** — `feat : 조명 연습실 자동 저장과 큐 재생 추가`

(동작 검증은 Task 8 Playwright.)

### Task 7: 화면 (`StageLighting.tsx`, `Toolbar.tsx`, `Inspector.tsx`, `CueBar.tsx`)

**Files:**
- Create/complete: `apps/services/components/works/11_StageLighting/StageLighting.tsx`, `Toolbar.tsx`, `Inspector.tsx`, `CueBar.tsx`, `useShow.ts`, `StageLightingLoader.tsx`
- Modify: `apps/services/app/stage-lighting/page.tsx`(Task 5 최소형 → 로더 사용, 완성은 Task 8)

**Interfaces:**
- Consumes: 앞 task 전부; `isTextEntryTarget` from `@/components/works/_shared/imageInput`.
- Produces:
  - `useShow<T>(store: Store, select: (s: Show) => T): T` — `useSyncExternalStore(store.subscribe, () => select(store.get()), () => select(store.get()))`. 선택자는 참조가 안정적인 조각(엔티티 객체, 배열)을 반환한다.
  - `StageLighting` default export(`"use client"`). 클라이언트 전용으로만 렌더되므로 `const [store] = useState(() => createStore(loaded.show))`로 첫 렌더부터 저장본을 쓰고, `loaded.notice`는 첫 안내 문구로 쓴다.
  - `StageLightingLoader.tsx`(`"use client"`): `dynamic(() => import("./StageLighting"), { ssr: false, loading: () => <로딩 표시 "무대를 준비하고 있어요…"> })`를 렌더. `page.tsx`는 이 로더를 쓴다. Ruling: 스펙의 "씬 모듈 동적 import"는 컴포넌트 단위 `next/dynamic`로 충족한다 — three 번들이 라우트 셸과 분리되고, SSR이 없으니 localStorage 로드에 hydration 우회가 필요 없다.

화면 구성(스펙 6절):
- 레이아웃: 세로 flex. 위 `Toolbar`, 가운데 행(3D 뷰 `flex-1` + 오른쪽 `Inspector` 폭 18rem, `md` 미만에서는 3D 뷰 아래 `max-h-[40%] overflow-auto`), 아래 `CueBar`. 모노리즘 툴바의 버튼·색 상자 클래스 관례를 따른다.
- `Toolbar`: `+ 추가` 메뉴(소품 7종 라벨, `인물`, 조명기 5종 라벨; 상한이면 해당 항목 disabled + `title="최대 N개까지 둘 수 있어요"`), 시점 세그먼트(`편집`/`객석`/`위에서`), `작업등` 토글, `헤이즈` 슬라이더(0–100%, `live.haze`), `품질` 선택(`자동`/`높음`/`낮음`, 자동일 때 현재 단계가 내려갔으면 `자동(낮춤)` 표시), `되돌리기`/`다시 하기`. 아이콘은 SVG.
- 3D 뷰 포인터: pointerdown → `scene.pick` → 선택 갱신. 대상이 prop/actor/aim이면 `beginEdit()` 후 드래그 시작(`setPointerCapture`), pointermove는 rAF 하나로 묶어 `floorPoint` → 시작 오프셋 유지 → 무대 범위 ±2m clamp → `previewEntity`/`previewAim`. pointerup → `store.set(update...)`(checkpoint는 pointerdown에서), `endInteraction`. 빈 곳 클릭(이동 4px 미만) → 선택 해제. 대상 없는 드래그는 OrbitControls가 처리.
- `beginEdit()` = `playback.stop(); store.checkpoint();` — 모든 편집(슬라이더 pointerdown/focus, 색 입력 focus, 추가·삭제·큐 저장)이 먼저 부른다.
- `Inspector`: 선택 없음 → 무대(형태 세그먼트, 폭·깊이·높이 슬라이더, 바닥·배경막 색). 소품 → 종류 표시, x·z·회전(°)·크기 xyz·색, `삭제`. 인물 → 이름, 키, 체형, 자세, 옷·피부 색, 회전, `삭제`. 조명기 → **설정**(이름, 종류, 위치 xyz, `그림자` 체크 — 한도 도달 시 disabled + `"그림자는 지금 품질에서 최대 N대예요"`) / **현재 레벨**(밝기 %, 색, 빔 각도 °(종류별 범위), 가장자리 부드러움), `삭제`. 슬라이더는 input마다 `store.set(...)`.
- `CueBar`: 정렬된 큐 칩(번호·이름, 현재 큐 강조, 클릭 = 그 큐로 즉시 이동(`store.set` live = 깊은 복사)), 선택 큐의 이름·페이드(초) 입력, `큐 저장`(새 큐, 99개면 disabled), `덮어쓰기`, `삭제`, `BACK`, `GO`(재생 중엔 진행 막대 `progressRef`), `재생 때 객석 시점` 체크(기본 켜짐; GO 시 켜져 있으면 객석 시점 + 작업등 끔).
- 단축키(window keydown): 대상이 `isTextEntryTarget`이거나 열린 `dialog[open]`이 있으면 무시. `Space`(preventDefault) = GO, `Delete`/`Backspace` = 선택 삭제, `Escape` = 선택 해제, ⌘/Ctrl+Z = 되돌리기, ⌘/Ctrl+Shift+Z = 다시 하기.
- 객석 시점 진입 시 작업등 끔(사용자가 다시 켤 수 있음). 시점·작업등은 저장하지 않는다.
- 안내·오류 문구: `p[role=alert]` 한 줄, 5초 뒤 사라짐(WebGL 실패 문구는 유지).

- [ ] **Step 1: 컴포넌트 작성.**
- [ ] **Step 2: 타입·린트** → 0.
- [ ] **Step 3: 수동 확인(Playwright 스크린샷)** — 조명기 클릭 → 속성 패널에 설정·현재 레벨, 밝기 슬라이더 이동 시 무대 밝기 변화, 조준점 손잡이 드래그 시 빛 이동.
- [ ] **Step 4: 커밋** — `feat : 조명 연습실 화면과 조작 추가`

### Task 8: 라우트·등록·검증

**Files:**
- Create: `apps/services/app/stage-lighting/page.tsx`(완성), `apps/services/app/stage-lighting/guide.ts`
- Modify: `apps/services/lib/tools.ts`, `apps/services/lib/tools.test.mts`, `apps/services/app/privacy/page.tsx`, `CLAUDE.md`

**Interfaces:**
- Consumes: `StageLightingLoader`(Task 7), `ToolShell`, `ToolGuideContent`.

- [ ] **Step 1: 실패하는 테스트** — `tools.test.mts`의 creative 기대값을 `["visual-novel-studio", "nemo-nemo-beam", "monorism", "stage-lighting"]`로, 그리고 `test("조명 검색", () => assert.deepEqual(slugs(searchTools("조명")), ["stage-lighting"]))` 추가. → 실행하면 FAIL.
- [ ] **Step 2: 등록** — `TOOLS`에 `{ slug: "stage-lighting", category: "creative", title: "조명 연습실", desc: "무대에 조명을 걸고 큐를 짜 보는 3D 연습실", about: "무대에 인물과 소품을 세우고 조명기를 걸어 빛을 만들어요. 장면마다 큐로 저장해 페이드로 이어 보고, 객석 자리에서 어떻게 보이는지 확인해요. 만든 무대는 알아서 저장돼요.", tags: ["조명", "무대", "공연", "큐", "3D", "헤이즈", "연극"], thumb: null }` (Ruling: 모노리즘처럼 `thumb: null` — 썸네일 이미지는 별도 작업). `page.tsx`는 모노리즘 페이지와 같은 형태(`metadata` 설명 `"무대에 인물·소품을 두고 조명기를 걸어 큐를 만들고, 객석 시점에서 페이드로 재생해 보는 3D 조명 연습 도구예요."`, `<main className="min-h-0 flex-1 overflow-hidden bg-shade text-ink">`). 개인정보처리방침 `STORAGE_ITEMS`에 `{ tool: "조명 연습실", where: "localStorage", keys: ["stage-lighting-show", "stage-lighting-quality"], what: "무대 설정, 소품·인물·조명기 배치, 큐 목록, 품질 설정" }`.
- [ ] **Step 3: `guide.ts`(합니다체)** — `intro` 2문단, `steps`: 배치하기 / 조명 걸기·조준 / 큐 만들기 / 재생과 객석 시점 / 저장과 품질. 알아 두면 좋은 점·FAQ(그림자 한도, 품질 자동 낮춤, 저장 위치, 깨진 저장본 처리, 단축키). 실제 구현된 동작·수치만 쓴다. 쓴 뒤 humanize-korean 원칙으로 다듬는다.
- [ ] **Step 4: 테스트 전부** — `node --test apps/services/lib/tools.test.mts apps/services/components/works/_shared/*.test.mts apps/services/components/works/7_TextEncoding/encoding.test.mts apps/services/components/works/10_Monorism/*.test.mts apps/services/components/works/11_StageLighting/*.test.mts` → 0 fail.
- [ ] **Step 5: Playwright 검증(scratchpad, dev 서버 3100)** — 각 항목 PASS여야 한다:
  1. 로드 → `+ 추가`로 의자 1개 추가 → `큐 저장` → 큐 2개 → 큐 1 클릭 → `GO` → 페이드 끝(`playing` 해제, 진행 막대 사라짐) → 새로고침 → 의자·큐 2개 복원.
  2. 정지 2초 동안 `__stageStats.renders` 변화 0.
  3. 큐 A·B가 밝기만 다를 때 GO 중 `shadowUpdates` 변화 0.
  4. 페이드 3초 큐 재생 중 1초에 밝기 슬라이더 조작 → 재생 멈춤, 슬라이더 값이 반영된 상태 유지.
  5. `localStorage["stage-lighting-show"] = "{"` 후 새로고침 → 안내 문구(`p[role=alert]`) 표시, 아무 조작 없이 3초 뒤에도 저장값이 `"{"` 그대로.
  6. 이름 입력칸에 포커스하고 Space·Backspace → GO·삭제가 일어나지 않음.
  7. 조명기 24대로 채운 뒤 편집 시점 드래그 회전 2초 → `frameMs` 평균을 기록해 보고(합격 기준 없음, 수치만 보고; SwiftShader 환경 수치임을 명시).
- [ ] **Step 6: 빌드·린트** — 루트에서 `npm run lint && npm run build` → 성공.
- [ ] **Step 7: CLAUDE.md 갱신** — 서비스 라우트 목록에 `stage-lighting`, works 범위 `… 11_StageLighting/`와 설명, 테스트 명령에 `apps/services/components/works/11_StageLighting/*.test.mts` 추가.
- [ ] **Step 8: 커밋** — `feat : 조명 연습실 라우트와 안내 추가`
