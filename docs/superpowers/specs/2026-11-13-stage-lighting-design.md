# 조명 연습실 설계 (1단계)

공연 무대 조명 연출을 연습하는 3D 시뮬레이터. 무대·소품·등장인물을 배치하고 조명기를 걸어 큐를 만들고, 페이드로 재생해 객석 시점에서 확인한다.

- 라우트: `apps/services/app/stage-lighting/` (`page.tsx`, `guide.ts`)
- 컴포넌트: `apps/services/components/works/11_StageLighting/`
- 카테고리: `creative`
- 렌더링: three.js 0.187(이미 의존성), 스포트라이트 + 가짜 빔 원뿔(헤이즈)

## 범위

**1단계(이 문서)**: 무대 프리셋·소품·인물 마네킹·기본 조명기 세트·헤이즈·큐 목록과 페이드 재생·편집/객석/위에서 보기 시점·브라우저 자동 저장.

**2단계(별도 문서)**: 무빙 라이트(팬·틸트를 큐에 기록하고 페이드 중 이동), 고보(`SpotLight.map` 무늬 투사). 1단계의 조준점 기반 데이터가 그대로 확장 지점이다.

하지 않는 것: 파일 내보내기·불러오기, 여러 공연 목록, PNG 저장, 사용자 3D 모델 업로드, DMX 연동.

## 성능 목표

- M1급 노트북에서 조명기 24대(그림자 8대) 상태로 궤도 회전·드래그 60fps.
- 정지 상태에서 렌더 0프레임.
- 드래그·슬라이더 입력은 같은 프레임에 화면 반영.

## 1. 데이터 구조 (`show.ts`, 순수 모듈)

고정 설정(패치)과 큐마다 바뀌는 값(레벨)을 나눈다.

```ts
type Vec3 = { x: number; y: number; z: number };   // 미터, y가 위

type StageShape = "proscenium" | "thrust" | "round";
type Stage = { shape: StageShape; width: number; depth: number; height: number;
               floorColor: string; backdropColor: string };

type PropKind = "chair" | "table" | "stairs" | "platform" | "pillar" | "box" | "doorframe";
type Prop = { id: string; kind: PropKind; position: Vec3; rotationY: number;
              scale: Vec3; color: string };

type Build = "slim" | "average" | "stocky";
type Pose = "stand" | "sit" | "armsOpen" | "walk";
type Actor = { id: string; name: string; position: Vec3; rotationY: number;
               height: number; build: Build; pose: Pose;
               clothColor: string; skinColor: string };

type FixtureKind = "profile" | "par" | "fresnel" | "follow" | "cyc";
type Fixture = { id: string; kind: FixtureKind; name: string;
                 position: Vec3; castShadow: boolean };

type FixtureLevel = { intensity: number;   // 0..1
                      color: string;       // #rrggbb
                      target: Vec3;        // 조준점
                      beamAngle: number;   // 도, 종류별 범위
                      softness: number };  // 0..1 → penumbra

type LookState = { levels: Record<string, FixtureLevel>; haze: number }; // haze 0..1
type Cue = { id: string; number: number; name: string; fadeSec: number; look: LookState };

type Show = { version: 1; stage: Stage; props: Prop[]; actors: Actor[];
              fixtures: Fixture[]; cues: Cue[]; live: LookState };
```

- `live`는 현재 무대 상태다. 편집은 항상 `live`에 하고, 큐에는 "현재 상태로 큐 저장/덮어쓰기"로만 기록한다(실제 콘솔과 같은 방식).
- 상한: 조명기 24, 소품 40, 인물 40, 큐 99. 상한에 닿으면 추가 버튼을 비활성화하고 이유를 표시한다.
- 조명기를 지우면 모든 큐와 `live`에서 그 id 레벨을 지운다. 큐에 없는 조명기는 밝기 0으로 본다.
- 수치는 범위로 자른다(clamp). 무대 크기 폭 4–20m, 깊이 3–15m, 높이 3–12m. 인물 키 1.0–2.1m. 페이드 0–60초.
- 함수: `defaultShow()`, `addProp/updateProp/removeProp`, 인물·조명기 같은 형태, `saveCue(show, cueId?)`, `removeCue`, `serialize(show): string`, `deserialize(text): Show | null`(형식 위반·버전 불일치면 null, 필드는 하나씩 검증·clamp).
- 모든 갱신은 불변: 바뀐 엔티티만 새 객체가 된다.

## 2. 프리셋 (`presets.ts`, 순수 모듈)

- 무대 3종 기본값. 기본 공연은 프로시니엄 10×8×6m, 인물 2명, 조명기 6대(프로필 앞 2, PAR 워시 위 2, 프레넬 뒤 1, 호리존트 1), 큐 1개.
- 소품 종류별 기본 크기·색.
- 조명기 종류별 기본값: 빔 각도 범위와 기본값, 기본 softness, 기본 걸림 위치(앞 객석 위 바, 무대 위 바, 바닥 호리존트).
  - profile 15–50°, 기본 26°, softness 0.1 (선명한 가장자리)
  - par 10–60°, 기본 40°, softness 0.4
  - fresnel 15–70°, 기본 45°, softness 0.7
  - follow 5–30°, 기본 12°, softness 0.2
  - cyc 60–100°, 기본 90°, softness 0.9

## 3. 보간 (`cues.ts`, 순수 모듈)

- `lerpLook(a, b, t): LookState` — 밝기·빔 각도·softness·헤이즈는 선형, 색은 선형 RGB 공간에서 보간 후 sRGB로, 조준점은 Vec3 선형. 한쪽에만 있는 조명기는 다른 쪽을 밝기 0·같은 색·같은 조준점으로 본다.
- `fadeProgress(elapsedMs, fadeSec): number` — 0..1, `fadeSec = 0`이면 즉시 1. 이징은 사인 in-out.
- `aimChanged(a, b): boolean` — 두 상태 사이에 조준점·빔 각도가 다른 조명기가 있는지. 없으면 페이드 동안 그림자 맵 갱신을 생략한다.

## 4. 상태 흐름 (`store.ts`)

- 작은 외부 store: `getState`, `setState(updater)`, `subscribe`. React는 `useSyncExternalStore` + 선택자로 필요한 조각만 구독한다(속성 패널은 선택된 대상만).
- `diffShow(prev, next)` (순수): 종류별 추가·변경·삭제 id 목록. 참조 비교로 계산한다. node 테스트 대상.
- 씬은 store를 구독해 diff 결과만 three 객체에 반영한다.
- 실행 취소/다시 실행: 공연 스냅샷 스택(최대 100). 드래그·슬라이더 한 번 조작이 한 단계.

## 5. 렌더링 (`useStageScene.ts`)

**필요할 때만 그리기**
- `requestRender()`가 다음 rAF에 한 번만 그린다(중복 요청 병합).
- 그리는 경우: 카메라 이동, 드래그·슬라이더, 페이드 재생, store 변경, 리사이즈. OrbitControls 관성은 `change` 이벤트가 멈출 때까지 요청한다.

**그림자**
- `renderer.shadowMap.autoUpdate = false`, 타입 `PCFShadowMap`, 맵 1024.
- 물체·인물·조명기 위치나 조준점·빔 각도가 바뀔 때만 `needsUpdate = true`. 밝기·색만 바뀌는 변경과 페이드는 갱신하지 않는다.
- 드래그 중에는 4프레임에 한 번 갱신, 손을 놓으면 한 번 갱신.
- 그림자 대상은 `castShadow`가 켜진 조명기 중 최대 품질 단계 한도(8/4/0)까지. 한도를 넘는 체크는 비활성화하고 이유를 표시한다.

**조작 중 품질**
- 평소 픽셀 비율 `min(devicePixelRatio, 2)`, 드래그·궤도 회전 중 1, 조작이 끝나고 150ms 뒤 원래 비율로 한 프레임.
- 자동 품질: 조작 중 최근 30프레임 평균이 22ms를 넘으면 한 단계 내리고(그림자 8→4→0, 원뿔 분할 32→16), 올리지는 않는다(세션 안에서 흔들림 방지). 상단 메뉴에서 자동/높음/낮음을 고르면 자동 조정을 끈다. 선택은 저장한다.

**드로우콜·셰이더**
- 마네킹: 머리·몸통·팔·다리 부위를 `mergeGeometries`로 합쳐 인물당 메시 1개. 키·체형·자세가 바뀔 때만 다시 만든다.
- 소품: 종류별 `InstancedMesh` + `instanceColor`. 종류별 용량은 40으로 고정 할당하고 `count`로 조절한다.
- 재질은 종류별 공유(MeshStandardMaterial, 거칠기 높게, 환경맵 없음). 조명기 추가·삭제로 일어나는 재컴파일은 프로그램 몇 개에 그친다.
- 조명: 조명기마다 `SpotLight`(decay 2) + 타깃 객체. 톤 매핑 ACES, 노출 고정.
- 빔 원뿔: 열린 원뿔 지오메트리, 가산 블렌딩, `depthWrite: false`, 그림자 미수신. 셰이더는 축 방향 감쇠 × 가장자리 부드러움 × 밝기 × 헤이즈. 헤이즈 0이거나 밝기 0이면 `visible = false`.

**무대·작업등**
- 무대 바닥·배경막·객석 바닥(어두운 면)을 형태별로 만든다. 돌출은 앞쪽으로 튀어나온 바닥, 원형은 원판 + 사방 객석.
- 작업등: 약한 HemisphereLight. 켜면 모든 조명을 꺼도 무대가 보인다. 기본 켜짐, 객석 시점으로 바꾸면 끈다.

**카메라 3종**
- 편집: 원근 + OrbitControls(관성).
- 객석: 객석 중앙 눈높이(1.2m, 무대 앞 끝에서 무대 깊이만큼 뒤)에서 무대 중앙을 본다. 회전만 소폭 허용(좌우 ±25°).
- 위에서 보기: 정사영 카메라, 위에서 아래로.

**선택·드래그**
- 레이캐스트는 대상마다 보이지 않는 상자 프록시에만 한다.
- 바닥 드래그는 레이와 수평면(y = 대상 높이 0)의 교점을 수식으로 구한다. 무대 범위를 조금 넘어서는 것까지 허용한다.
- 조명기를 선택하면 조준점 손잡이(바닥 위 고리)가 보이고 드래그로 조준한다.
- 포인터 이동은 rAF 단위로 묶는다. 드래그 중에는 three 객체만 움직이고 손을 놓을 때 store에 한 번 기록한다.
- 조명기 본체 위치는 속성 패널 수치로 고친다(공중이라 드래그 평면이 애매하다).

**정리**
- 삭제된 대상의 지오메트리·재질·그림자 맵 dispose. 언마운트 시 렌더러·컨트롤·리스너 정리.
- WebGL 생성 실패는 try/catch로 잡아 오류 문구를 보여 준다.

## 6. 화면과 조작 (`StageLighting.tsx` 외)

- 씬 모듈은 동적 import. 셸과 패널이 먼저 뜨고 3D 영역에 로딩 표시.
- 상단 바: `+ 추가`(소품 종류·인물·조명기 종류 메뉴), 시점 전환(편집/객석/위), 작업등, 헤이즈 슬라이더, 품질, 실행 취소/다시 실행.
- 3D 뷰: 클릭 선택, 빈 곳 클릭 시 선택 해제, `Delete`/`Backspace`로 삭제, `Esc` 선택 해제.
- 오른쪽 속성 패널(좁은 화면에선 아래 시트): 선택 대상의 수치. 아무것도 선택하지 않았으면 무대 설정.
  - 조명기 패널은 고정 설정(이름·종류·위치·그림자)과 현재 레벨(밝기·색·빔 각도·부드러움)을 나눠 보여 준다.
- 하단 큐 바: 큐 목록(번호·이름·페이드), `큐 저장`, `덮어쓰기`, `삭제`, `GO`(다음 큐로 페이드), `BACK`(이전 큐로 즉시). 재생 중 진행 막대는 ref로 스타일만 바꾼다. 재생 중 편집을 시작하면 페이드를 멈추고 그 시점 상태를 `live`로 둔다.
- 단축키: `Space` = GO. 글자 입력칸 포커스 중이거나 사용 안내가 열려 있으면 단축키를 무시한다.
- 큐 재생 시 객석 시점으로 자동 전환(토글, 기본 켜짐).
- 페이드 재생은 rAF 루프에서 `lerpLook` 결과를 three 조명에 직접 쓰고, 끝나면 store `live`에 한 번 반영한다.

## 7. 저장

- `localStorage` 키 `stage-lighting-show`: 공연 직렬화. 변경 후 1초 디바운스, 직렬화는 `requestIdleCallback`(없으면 `setTimeout`) 안에서.
- `pagehide`·`visibilitychange(hidden)`·언마운트 시 즉시 저장.
- 키 `stage-lighting-quality`: 품질 선택.
- 저장본이 깨졌거나 버전이 다르면 기본 공연으로 시작하고 안내 문구를 띄운다(기존 저장본은 덮어쓰기 전까지 그대로 둔다).
- 저장 실패(용량 초과 등)는 안내 문구로 알린다.
- 개인정보처리방침 `STORAGE_ITEMS`에 두 키 추가.

## 8. 등록

- `lib/tools.ts` `TOOLS`: slug `stage-lighting`, category `creative`, title `조명 연습실`, `desc`·`about`(해요체)·`tags`(조명, 무대, 공연, 3D, 큐 등), `thumb`.
- `guide.ts`(합니다체): 사용 방법·알아 두면 좋은 점·FAQ. 실제 기능만 쓴다.
- `page.tsx`: `ToolShell`로 감싸고 `<main className="min-h-0 flex-1 ...">`.
- 썸네일 `apps/services/public/playground/` 추가.
- CLAUDE.md 구조·테스트 명령 갱신.

## 9. 테스트

- node:test (`*.test.mts`, 순수 모듈은 다른 모듈 import 없음):
  - `show.test.mts`: 기본 공연 형태, 추가·삭제·상한, 조명기 삭제 시 큐 레벨 정리, clamp, 직렬화 왕복, 깨진 입력·버전 불일치 null.
  - `cues.test.mts`: `lerpLook` 양 끝·중간, 한쪽에만 있는 조명기, 색 선형 RGB 보간, `fadeProgress` 0초·경계, `aimChanged`.
  - `store.test.mts`(`diffShow`): 추가·변경·삭제 id, 변경 없을 때 빈 결과.
- Playwright 스모크(scratchpad, dev 서버 3100):
  - 추가 → 큐 저장 → GO → 새로고침 후 복원.
  - 개발 모드 `window.__stageStats`(렌더 횟수·그림자 갱신 횟수·최근 프레임 시간)로: 정지 2초 렌더 0회, 밝기만 바뀌는 페이드 중 그림자 갱신 0회, 조명기 24대 궤도 회전 평균 프레임 시간 기록.
  - `__stageStats`는 `process.env.NODE_ENV !== "production"`일 때만 노출.
