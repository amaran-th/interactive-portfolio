# 조명 연습실 보완(1.5단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 조명 연습실을 실제 극장 방식(걸 위치·채널·포커스와 큐 값 분리·실제 손잡이 이름·젤)으로 바꾸고, 객석·극장 공간·객석등·플롯 시점·물리 기반 빔/헤이즈를 더한다.

**Architecture:** `show.ts`를 v2 모델로 바꾸고 `resolve(fixture, level)`가 실제 빛 값을 한 곳에서 계산한다. 보간·diff·씬은 모두 `resolve` 결과만 쓴다. 객석 배치는 순수 모듈 `venue.ts`, 3D는 `scene/venue.ts`. UI는 속성 패널을 걸기/포커스/큐 값으로 나누고 채널 패널 탭을 더한다.

**Tech Stack:** 1단계와 같음(three 0.187, React 19, node:test, Playwright).

**Spec:** `docs/superpowers/specs/2026-11-13-stage-lighting-v2-design.md` (1단계 스펙 `2026-11-13-stage-lighting-design.md` 위에 얹는다)

## Global Constraints

- 1단계 계획의 Global Constraints 전부 유지(순수 모듈 type-only import, 상한, 품질 단계, 저장 키, 린트 규칙, 문구 규칙, 커밋 형식, push 금지).
- 작업 트리의 남의 모노리즘 변경은 건드리지 않는다. `lib/tools.ts`처럼 남의 변경이 섞인 파일은 index blob으로 내 hunk만 스테이징한다.
- `Show.version = 2`. v1은 `migrateV1`로 읽고 안내 "예전 형식의 무대를 새 형식으로 바꿨어요."
- 큐 값(`CUE_PARAMS`): profile·fresnel·par = intensity, follow = intensity·target·zoom, ledpar·cyc = intensity·color.
- 손잡이 표(스펙 1절)와 걸 위치 좌표, 젤 14장, 객석(줄 4–20 기본 10, 줄 간격 0.9m, 줄당 0.25m 상승, 좌석 폭 0.55m, 눈높이 +1.15m), 객석등 페이드 2초, 헤이즈 상승 1/20·하강 1/40 per s, HG g = 0.6 배율 clamp 0.3–4, 빔 폭 배율 `tan13°/tan(각/2)` clamp 0.3–3 — 값은 스펙 그대로.

## Review Focus

1. v1 저장본(1단계 기본 공연·조명기 24대·큐 여러 개)이 손실 없이 v2로 열린다 — 밝기는 큐마다 유지, 색·조준은 포커스로(Task 1 테스트).
2. 무대 크기를 줄여 along이 범위를 벗어나면 조명기가 걸 위치 끝으로 붙는다(Task 1 테스트).
3. 일반 조명기 큐 사이 GO는 그림자 갱신 0회, follow 조준이 바뀌는 GO는 갱신(Task 2 테스트 + Task 6 Playwright).
4. 솔로 중 GO·편집·선택 변경 → 솔로가 풀리고 실제 상태로 돌아온다(Task 5).
5. 채널 번호 직접 입력 시 중복 → 거부하고 원래 번호 유지(Task 1 테스트).

---

### Task 1: v2 데이터 모델 (`show.ts`)

**Files:** Modify `apps/services/components/works/11_StageLighting/show.ts`, `show.test.mts`

**Interfaces — Produces:**
- 스펙 1절 타입 전부(`HangId`, `FixtureKind`(ledpar 추가), `ParLamp`, `Focus`, `Fixture`, `FixtureLevel`, `Venue = { rows: number }`, `Show.version: 2`, `Show.venue`).
- `HANGS: HangId[]`, `HANG_LABELS`(FOH, 1번 일렉트릭, 2번 일렉트릭, 3번 일렉트릭, 왼쪽 붐, 오른쪽 붐, 바닥), `hangPoint(stage: Stage, hang: HangId, along: number): Vec3`, `hangRange(stage, hang): [number, number]`(FOH·일렉트릭: ±(폭/2+1), 바닥: ±폭/2, 붐: [0.5, 4]).
- `GELS: { name: string; color: string }[]` 14장(첫 장 `오픈` #fff1dc).
- `PAR_LAMPS: Record<ParLamp, { label: string; angle: number }>` = vnsp 11, nsp 14, mfl 26, wfl 55.
- `KNOBS: Record<FixtureKind, { zoom?: [label, minDeg, maxDeg]; sharp?: [label, minSoft, maxSoft]; softness?: number }>` — 스펙 표 그대로(profile 줌 15–50·포커스 0.6→0.05, fresnel 스팟↔플러드 15–70·0.75, par softness 0.5(램프로 각도), follow 아이리스 4–20·포커스 0.5→0.05, ledpar 렌즈 15–40·0.5, cyc 90°·0.9).
- `CUE_PARAMS: Record<FixtureKind, ("intensity" | "color" | "target" | "zoom")[]>`.
- `type Resolved = { intensity: number; color: string; target: Vec3; beamAngle: number; softness: number; position: Vec3 }`, `resolve(stage: Stage, f: Fixture, level: FixtureLevel | undefined): Resolved` — 허용되지 않은 레벨 필드는 무시. ledpar·cyc의 color 기본은 `#ffffff`, 일반 조명기 color는 `focus.gel`.
- `nextChannel(show): number`, `setChannel(show, id, channel): Show`(1–99 밖이거나 중복이면 그대로).
- `addFixture(show, kind)`: 기본 걸 위치 — profile·follow → foh, fresnel·par·ledpar → e1, cyc → floor. along 0. 채널 `nextChannel`.
- `updateFocus(show, id, patch: Partial<Focus>)`, `updateFixture`(hang·along·kind·name·castShadow; hang이 바뀌면 along을 새 범위로 clamp), `updateLevel(show, id, patch: Partial<FixtureLevel>)`(허용 필드만 남김).
- `updateVenue(show, patch)`(rows 4–20).
- `migrateV1(raw: unknown): Show | null`, `deserialize(text): { show: Show; migrated: boolean } | null`.
- 기본 공연: 스펙 1절(채널 1–8, 큐 2개 `처음`·`장면 1`, 장면 1은 역광 PAR·cyc 위주). 헤이즈 0.4.

- [ ] **Step 1: 테스트 교체** — `show.test.mts`를 v2로 다시 쓴다. 반드시 들어갈 단언:
  - 기본 공연: `version === 2`, 채널이 `[1..8]`, 조명기 종류 집합에 profile·fresnel·par·cyc·follow, `venue.rows === 10`.
  - `addFixture` 채널은 비어 있는 가장 작은 번호(채널 3 삭제 후 추가 → 3).
  - `setChannel` 중복 → 같은 객체, 0·100 → 같은 객체.
  - `hangPoint(stage10x8x6, "e2", 1)` = `{x: 1, y: 6, z: -4}`; `"foh"` z = 4, y = 7; `"boomL"` x = −5.8, y = along; along 20 → 범위 끝으로 clamp.
  - 무대 폭을 10→6으로 줄이면 along 4.5였던 e1 조명기의 실제 위치 x가 4(=6/2+1)로.
  - `resolve`: profile 레벨에 `color: "#ff0000"`이 있어도 결과 color = `focus.gel`; ledpar는 레벨 color; follow는 레벨 target·zoom; par의 beamAngle = 램프 각도; profile zoom 0 → 15°, 1 → 50°; profile sharpness 1 → softness 0.05.
  - `updateLevel(profile, { color })`는 레벨에 color를 남기지 않는다.
  - 직렬화 왕복 v2, 깨진 v2 → null.
  - `migrateV1`: 1단계 형식 JSON(테스트 안에 v1 고정 픽스처 — 조명기 (−2, 6, 3) profile, 레벨 color #ff8800·target (−1,0,−3)·beamAngle 26·softness 0.1, 큐 2개 밝기 0.8/0.3)을 넣으면 `hang === "foh"`, `focus.gel === "#ff8800"`, `focus.target` 그대로, 큐 레벨은 `{ intensity }`만(0.8, 0.3), 채널 1, `migrated === true`.
- [ ] **Step 2:** `node --test apps/services/components/works/11_StageLighting/show.test.mts` → FAIL.
- [ ] **Step 3: 구현.** `migrateV1`: v1 조명기 위치에서 가장 가까운 걸 위치(각 위치의 대표 좌표와 거리) 선택, along = 그 위치의 축 좌표(x 또는 y). zoom = 각도를 KNOBS 범위로 역산(PAR는 가장 가까운 램프), sharpness = softness를 역산. 레벨 color가 LED·cyc면 큐에 color 유지.
- [ ] **Step 4:** 같은 명령 → PASS.
- [ ] **Step 5: 커밋** — `feat : 조명 연습실 v2 데이터 모델(걸 위치·채널·포커스) 추가`

### Task 2: 보간·diff·헤이즈·객석 배치 (`cues.ts`, `store.ts`, `venue.ts`)

**Files:** Modify `cues.ts`, `cues.test.mts`, `store.ts`, `store.test.mts`; Create `venue.ts`, `venue.test.mts`

**Interfaces — Produces:**
- `lerpLook(a, b, t, fixtures)` — v2 레벨의 있는 필드만 보간(intensity 선형, color 선형 RGB, target Vec3, zoom 선형). 한쪽에만 있는 필드는 다른 쪽 값으로 둔다.
- `aimChanged(a, b, fixtures)` — 어느 조명기든 레벨의 target·zoom이 다르면 true(일반 조명기는 이 필드가 없으므로 false).
- `stepHaze(current, target, dtSec): number` — 상승 1/20·하강 1/40 per s, 목표를 넘지 않음.
- `diffShow` — `shadowsDirty`: stage·props·actors·fixtures 변화(포커스 포함), 레벨 target·zoom 변화. `venue: boolean` 추가.
- `venue.ts`(순수, type-only import): `type Seat = { x: number; y: number; z: number; rotationY: number; row: number; side: "front" | "left" | "right" | "back" }`, `seatLayout(stage: Stage, rows: number): Seat[]`, `riserBoxes(stage, rows): { x: number; z: number; w: number; d: number; h: number; rotationY: number }[]`, `seatView(stage, rows, row: number, side: "left" | "center" | "right"): { eye: Vec3; target: Vec3 }`, `venueBox(stage, rows): { minX, maxX, minZ, maxZ, height }`.
  - 프로시니엄: 앞쪽 줄, 첫 줄 z = 1.5, 줄마다 +0.9, 바닥 높이 = −0.6 + row×0.25, 좌석 x는 ±(폭/2+2) 범위에 0.55 간격, 무대를 본다(rotationY = π).
  - 돌출: 앞 + 양옆(돌출부 옆, 회전 ±π/2). 원형: 원주 방향 줄, 반지름 = r+1.5+row×0.9.
  - `seatView` eye = 그 줄 가운데/좌·우 1/3 좌석 바닥 + 1.15, target = (0, 1, −깊이/2).

- [ ] **Step 1: 테스트**
  - cues: 일반 조명기 두 큐(밝기만 다름) → `aimChanged` false, 중간 밝기 보간; follow target 다름 → true; ledpar 색 보간 #000→#fff 중간 `#bcbcbc`; `stepHaze(0, 1, 10) === 0.5`, `stepHaze(1, 0, 10) === 0.75`, `stepHaze(0.9, 1, 10) === 1`, `stepHaze(0.5, 0.5, 1) === 0.5`.
  - store: `updateFocus`만 → `shadowsDirty` true; 밝기만 → false; `updateVenue` → `venue` true, `shadowsDirty` false.
  - venue: 프로시니엄 rows 10 → 좌석 줄 번호 집합 크기 10, 마지막 줄 바닥 = −0.6+9×0.25+…(구현 규칙대로 단언), 모든 좌석 z > 0; 돌출 → side에 left·right 포함; 원형 → side "back" 포함; `seatView(…, 1, "center").eye.x === 0`.
- [ ] **Step 2:** `node --test apps/services/components/works/11_StageLighting/*.test.mts` → 새 테스트 FAIL.
- [ ] **Step 3: 구현.**
- [ ] **Step 4:** → PASS(전체).
- [ ] **Step 5: 커밋** — `feat : 조명 연습실 v2 보간·헤이즈 속도·객석 배치 추가`

### Task 3: 극장 공간 3D (`scene/venue.ts`, `scene/beam.ts`)

**Files:** Create `scene/venue.ts`; Modify `scene/beam.ts`, `scene/stage.ts`(아치 틀은 venue로)

**Interfaces — Produces:**
- `class VenueLayer { group: THREE.Group; houseMaterials: THREE.MeshStandardMaterial[]; build(stage, rows): void; setHouseLevel(v: number): void; dispose(): void }` — 좌석 InstancedMesh 1(좌판+등받이 합친 지오메트리, `receiveShadow`만), 객석 단 메시 1(riserBoxes 합침), 벽·천장 상자(BackSide), 프로시니엄·돌출 아치 틀, 배턴(FOH·e1–e3 가로 원기둥 반지름 0.03, 붐 세로 원기둥) 합친 메시 1, 천장 등 원판 8개(InstancedMesh, emissive 세기 = house level).
- `setHouseLevel(v)`는 천장 등 emissive만 바꾼다. 실제 빛은 씬 훅의 객석등 광원(반구광 + 방향광)이 맡는다.
- 빔 셰이더: uniform `uLightPos`(vec3), `uAngleBoost`(float, JS에서 `clamp(tan13°/tan(각/2), 0.3, 3)`); 프래그먼트에서 `vWorld`로 `dir = normalize(vWorld − uLightPos)`, `toCam = normalize(cameraPosition − vWorld)`, HG 배율 `clamp(hg(dot(dir,toCam), 0.6) / (1/(4π)), 0.3, 4)`를 알파에 곱한다.

- [ ] **Step 1: 작성.** - [ ] **Step 2:** tsc·eslint 0. - [ ] **Step 3: 커밋** — `feat : 조명 연습실 객석·극장 공간과 빔 산란 추가`

### Task 4: 씬 훅 v2 (`useStageScene.ts`)

**Files:** Modify `useStageScene.ts`

**Interfaces — Produces (SceneApi 변경):**
- `ViewMode = "edit" | "audience" | "plot"`.
- 추가: `setHouseLights(on: boolean): void`(2초 페이드, 페이드 중에만 렌더), `setSeat(row: number, side: "left" | "center" | "right"): void`, `setSolo(fixtureId: string | null): void`, `setHazeTarget(target: number, immediate: boolean): void`, `onHaze(fn: (actual: number) => void): void`(따라가는 동안 rAF마다 실제 값), `fixtureScreenPoints(): { id: string; channel: number; gel: string; x: number; y: number }[]`, `onCamera(fn: () => void): void`(카메라 변화 시).
- `applyLook(look, shadows)` 유지 — 내부는 `resolve` 사용. 헤이즈는 `applyLook`이 목표를 바꾸지 않는다(재생 쪽이 `setHazeTarget(target, false)` 호출).
- 조명기 위치 = `resolve(...).position`(= `hangPoint`).
- 객석등 광원: `HemisphereLight(0xfff4e0, 0x202020, 0)` + `DirectionalLight(0xfff4e0, 0)`(그림자 없음), 레벨 v에서 각각 1.2v, 0.8v.
- 플롯 시점: 정사영 + 빔 숨김 + 작업등 강제 켬(시점을 벗어나면 원래 작업등 상태).
- 솔로: 대상 외 조명 intensity 0, 대상은 resolve 결과에 intensity 1. 해제 시 현재 `live`로 복원.
- 편집 카메라 초기 위치: 객석 위 (0, 6, 첫 줄+4), venue 상자 안.
- `__stageStats`에 `hazeActual` 추가.

- [ ] **Step 1: 작성.** - [ ] **Step 2:** tsc·eslint 0, Playwright 스크린샷(편집·객석·플롯 시점, 객석등 켬)로 객석·벽·배턴·라벨이 보이고 정지 렌더 0회 확인. - [ ] **Step 3: 커밋** — `feat : 조명 연습실 씬에 객석등·좌석 시점·솔로·헤이즈 속도 반영`

### Task 5: 화면 v2

**Files:** Modify `Inspector.tsx`, `Toolbar.tsx`, `StageLighting.tsx`, `useCuePlayback.ts`, `persistence.ts`; Create `ChannelPanel.tsx`, `GelPicker.tsx`, `PlotLabels.tsx`

- **Inspector — 조명기**: `걸기`(채널 숫자 입력 — 중복이면 입력칸 빨간 테두리와 "채널 N은 이미 써요", 이름, 종류, 걸 위치 select, along 슬라이더(붐이면 `높이`), 그림자) / `포커스`(KNOBS 라벨대로 슬라이더, PAR는 램프 4버튼, `GelPicker`, 조준 안내 + 팬·틸트 각도 읽기 전용 — 팬 = atan2(dx, −dz)°, 틸트 = 수직에서의 각도°; follow·LED는 포커스 칸에서 조준/색 대신 "큐마다 바꿔요" 안내) / `큐 값`(디머, follow: 아이리스 + "고리를 끌어 대상을 따라가요", LED: 색) / `솔로` 토글 버튼 / 삭제.
  - 노란 고리 드래그: 일반 조명기 → `updateFocus(target)`, follow → `updateLevel(target)`.
- **무대 패널**: 객석 줄 수 슬라이더(4–20) 추가.
- **ChannelPanel**: 패널 위 탭 `속성`/`채널`. 채널 순 행: 채널, 이름, 종류 라벨, 걸 위치 라벨, 젤 색칩, 디머 range. 행 클릭 → 선택 + 속성 탭.
- **Toolbar**: 시점 `편집`/`객석`/`플롯`, 객석 시점일 때 줄 select(1–rows)와 좌·중·우 세그먼트, `객석등` 토글(작업등 옆), 헤이즈 옆 상태 `채우는 중`/`빠지는 중`(onHaze 실제값이 목표와 0.01 넘게 다를 때).
- **PlotLabels**: 플롯 시점에서만, 3D 뷰 위 absolute 오버레이. `fixtureScreenPoints()`를 `onCamera`·store 변경 때 rAF 한 번으로 갱신. 라벨 = 채널 번호 동그라미(테두리 = 젤 색).
- **useCuePlayback**: GO 시작 때 `scene.setHazeTarget(to.haze, false)`, BACK·jump는 `setHazeTarget(…, false)`. 툴바 헤이즈 슬라이더는 `setHazeTarget(v, true)`. GO·편집·선택 변경 시 솔로 해제.
- **persistence.loadShow**: `deserialize`가 `migrated: true`면 안내 "예전 형식의 무대를 새 형식으로 바꿨어요."

- [ ] **Step 1: 작성.** - [ ] **Step 2:** tsc·eslint 0. - [ ] **Step 3:** Playwright 스크린샷으로 패널 세 구역·채널 탭·플롯 라벨 확인. - [ ] **Step 4: 커밋** — `feat : 조명 연습실 걸기·포커스·큐 값 패널과 채널 패널 추가`

### Task 6: 안내·등록·검증

**Files:** Modify `app/stage-lighting/guide.ts`, `lib/tools.ts`(내 항목 about·tags만, hunk 스테이징), `app/privacy/page.tsx`(what 문구), `CLAUDE.md`(필요 시)

- [ ] **Step 1: guide.ts 다시 쓰기**(합니다체, 실제 동작만): 걸기와 채널, 포커스와 큐 값의 차이(일반 조명기는 큐에 밝기만), 손잡이 이름, 젤, 솔로, 채널 패널, 플롯, 객석·객석등·좌석 시점, 헤이즈가 천천히 차고 빠지는 이유, 빔이 보이는 정도(역광·좁은 빔·짙은 젤), v1 변환 FAQ.
- [ ] **Step 2: TOOLS about·tags 갱신**(about 해요체: 극장 방식 강조), privacy what = "무대 설정, 객석 줄 수, 소품·인물·조명기 배치와 포커스, 큐 목록, 품질 설정".
- [ ] **Step 3: 전체 테스트** — `node --test apps/services/lib/tools.test.mts apps/services/components/works/_shared/*.test.mts apps/services/components/works/7_TextEncoding/encoding.test.mts apps/services/components/works/10_Monorism/*.test.mts apps/services/components/works/11_StageLighting/*.test.mts` → 0 fail.
- [ ] **Step 4: Playwright**(1단계 verify 스크립트를 v2에 맞게 고쳐 1–7 재실행) + 추가: (8) v1 저장본 → 안내 + 조명기가 걸 위치 좌표에 있음(`__stageStats` 대신 저장본 재읽기로 hang 확인), (9) 객석등 켬 → 2.5초 뒤 렌더 멈춤, (10) 채널 패널 디머 → 해당 조명 밝기 변화(렌더 발생) , (11) 솔로 켬 → GO → 솔로 버튼 해제, (12) 헤이즈 큐 GO 뒤 `hazeActual`이 즉시 목표가 아니라 서서히 변함.
- [ ] **Step 5:** `npm run lint` 0 errors, `cd apps/services && npx next build` 성공.
- [ ] **Step 6: 커밋** — `feat : 조명 연습실 보완 안내 갱신`
