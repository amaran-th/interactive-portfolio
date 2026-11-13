# 조명 연습실 보완 설계 (1.5단계: 실제 장비식 조작·극장 공간)

1단계(`2026-11-13-stage-lighting-design.md`) 위에 얹는 변경. 상용 프리비즈 프로그램을 참고해 "실제 극장에서 하는 방식"에 가깝게 고친다.

## 벤치마킹 요약

| 프로그램 | 가져올 점 |
|---|---|
| Capture | 조명기를 걸고 끌어서 포커스하면 라이트 플롯이 자동으로 만들어진다. 조명기마다 채널·색 지정. 빔 표현 품질 단계. |
| Vectorworks Spotlight | 조명기는 이름 붙은 걸 위치(FOH, 1번 일렉트릭…)에 매달린다. 조명기마다 채널·위치·종류·색·포커스 데이터를 갖고, 이걸 모은 조명기 목록표(instrument schedule)를 만든다. 플롯에 채널 번호·색 라벨을 붙인다. |
| Vision 소프트웨어 콘솔 | 일반 조명기는 아이리스·포커스·셔터 같은 실제 손잡이 이름으로 조절한다. |
| ETC Augment3d | 3D 공간의 한 점을 찍어 포커스(XYZ 포커스). 콘솔의 채널 단위 조작과 연동. |
| wysiwyg | 거리 제곱에 반비례하는 빛 감쇠(1단계에서 이미 decay 2). |

가장 중요한 차이: 실제 극장에서 **일반 조명기(프로필·프레넬·PAR)는 큐에 밝기만 기록된다.** 색(젤)·각도·조준은 공연 전 '포커스' 때 손으로 맞춰 두고 공연 내내 그대로다. 색을 큐마다 바꾸려면 LED처럼 색을 섞는 장비를 쓴다. 팔로우 스팟은 오퍼레이터가 큐마다 대상을 따라가고 크기(아이리스)를 바꾼다. 이 구분을 그대로 옮기면 "어떤 장면에 어떤 조명기를 몇 대 걸어야 하는지"를 실제처럼 고민하게 된다.

## 1. 데이터 모델 v2 (`show.ts`)

```ts
type HangId = "foh" | "e1" | "e2" | "e3" | "boomL" | "boomR" | "floor";
type FixtureKind = "profile" | "fresnel" | "par" | "follow" | "ledpar" | "cyc";
type ParLamp = "vnsp" | "nsp" | "mfl" | "wfl";

type Focus = {            // 손으로 맞추는 값(큐 밖)
  target: Vec3;           // 조준점
  zoom: number;           // 0..1 — 종류별 의미(아래 표)
  sharpness: number;      // 0..1 — 1이 선명(프로필·팔로우 포커스)
  lamp: ParLamp;          // PAR만 의미
  gel: string;            // #rrggbb, 젤 색(LED는 무시)
};

type Fixture = { id: string; channel: number; kind: FixtureKind; name: string;
                 hang: HangId; along: number;      // 걸 위치 위 좌표(m)
                 castShadow: boolean; focus: Focus };

type FixtureLevel = { intensity: number;           // 모든 종류
                      color?: string;               // ledpar·cyc만
                      target?: Vec3; zoom?: number }; // follow만

type Show = { version: 2; ...1단계와 같음; venue: Venue };
type Venue = { rows: number; houseLights: boolean };  // houseLights는 저장 안 함(아래)
```

- **큐에 기록하는 값**(종류별 `CUE_PARAMS`): profile·fresnel·par는 `intensity`만. follow는 `intensity·target·zoom`. ledpar·cyc는 `intensity·color`.
- 실제 빛 = `focus` 위에 큐 레벨의 허용된 값을 덮은 것. 순수 함수 `resolve(fixture, level): Resolved`(`{intensity, color, target, beamAngle, softness}`)로 한 곳에서 계산하고 씬·보간·diff가 모두 이걸 쓴다.
- **종류별 손잡이**(`zoom`·`sharpness`를 빔 각도·부드러움으로 바꾸는 표):

| 종류 | 손잡이 이름 | beamAngle | softness |
|---|---|---|---|
| profile | 줌, 포커스 | 15–50° (zoom) | 0.05(선명)–0.6 (sharpness) |
| fresnel | 스팟↔플러드 | 15–70° (zoom) | 0.75 고정 |
| par | 램프 VNSP/NSP/MFL/WFL | 11 / 14 / 26 / 55° | 0.5 고정 |
| follow | 아이리스, 포커스 | 4–20° (zoom) | 0.05–0.5 |
| ledpar | 렌즈(좁게↔넓게) | 15–40° (zoom) | 0.5 고정 |
| cyc | (없음) | 90° | 0.9 |

- **채널**: 1–99, 조명기마다 하나, 중복 불가. 추가 시 비어 있는 가장 작은 번호.
- **걸 위치**(무대 크기에 따라 좌표 계산, `hangPoint(stage, hang, along): Vec3`):
  - `foh` 객석 위 앞: z = +4, y = 높이+1, along = x
  - `e1`·`e2`·`e3` 무대 위 1·2·3번 일렉트릭: z = −깊이×0.2 / ×0.5 / ×0.8, y = 높이, along = x
  - `boomL`·`boomR` 무대 양옆 세로 기둥: x = ∓(폭/2+0.8), z = −깊이/2, along = 높이(0.5–4m)
  - `floor` 배경막 앞 바닥: z = −깊이+0.6, y = 0.3, along = x
  - along은 위치 길이 안으로 clamp. 무대 크기를 바꾸면 조명기가 위치를 따라 움직인다.
- **젤 견본**(`GELS`, 일반 이름): 오픈(젤 없음, 할로겐 색 #fff1dc), 페일 앰버, 웜 앰버, 오렌지, 레드, 핑크, 매젠타, 라벤더, 퍼플, 딥 블루, CT 블루, 스카이 블루, 시안, 그린 — 14장. 견본 밖 색은 직접 고르기. 상표 번호는 쓰지 않는다.
- **v1 저장본 변환**(`migrateV1`): 조명기 위치는 가장 가까운 걸 위치로 붙이고 along을 맞춘다. `live`의 레벨(색·조준·각도·부드러움)을 그 조명기의 `focus`로 옮기고(젤 = 그 색), 큐에는 밝기만 남긴다(종류가 허용하는 값은 유지). 채널은 배열 순서대로 1부터.
- 새 기본 공연: FOH 프로필 2(채널 1·2), 1번 일렉트릭 프레넬 2(3·4, 웜 앰버), 3번 일렉트릭 PAR MFL 2(5·6, 딥 블루, 역광), 바닥 cyc 1(7, LED), 팔로우 1(8, FOH 가운데). 큐 2개(처음·장면 1).

## 2. 조작 화면

**속성 패널 — 조명기**를 실제 순서대로 나눈다.
1. **걸기**: 채널 번호, 이름, 종류, 걸 위치(드롭다운), 위치 위 좌우/높이 슬라이더, 그림자.
2. **포커스**(공연 전 손으로 맞추는 값, 큐와 무관): 종류별 손잡이(위 표 이름 그대로), 젤 견본첩 + 직접 고르기, 조준(바닥의 노란 고리를 끈다) + 팬·틸트 각도 표시(읽기 전용).
3. **큐 값**(지금 상태, 큐에 저장되는 값): 디머 0–100%. follow는 조준·아이리스, LED는 색도 여기.
   - follow·LED의 조준·색은 큐 값 칸에서만 바꾸고, 포커스 칸에는 나오지 않는다.
- **솔로**: 이 조명기만 켜서 보기(Eos의 Highlight처럼). 켜 둔 동안 다른 조명은 꺼지고 이 조명은 디머 100%로 보인다. 저장·큐와 무관한 보기 상태. 다른 대상을 고르거나 Esc를 누르면 꺼진다.

**채널 패널**(오른쪽 패널 위 탭 `속성`/`채널`): 콘솔 페이더처럼 채널 번호 순 목록. 각 줄 = 채널, 이름, 종류, 걸 위치, 젤 색칩, 디머 페이더(0–100). 줄을 누르면 그 조명기를 고른다. 이것이 Vectorworks식 조명기 목록표 역할도 한다.

**라이트 플롯 시점**(`위에서` → `플롯`으로 이름 변경): 정사영으로 내려다보고, 배턴(파이프)과 걸 위치 이름, 조명기마다 채널 번호 동그라미와 젤 색 테두리 라벨을 보인다. 빔·헤이즈는 숨기고 작업등 밝기로 그린다. 라벨은 HTML 오버레이(조명기 화면 좌표로 배치, 카메라 이동 때만 갱신).

**큐 바**: 변화 없음. GO 페이드는 큐에 있는 값만 보간한다.

## 3. 극장 공간

- **객석**: 무대 형태별 계단식 좌석. 프로시니엄 = 앞(부채꼴 아님, 직선 줄), 돌출 = 앞+양옆, 원형 = 사방. 줄 수 `venue.rows` 4–20(기본 10), 줄 간격 0.9m, 줄마다 0.25m씩 높아진다. 좌석 폭 0.55m. 좌석은 `InstancedMesh` 1개(등받이·좌판 합친 지오메트리), 객석 단(계단 바닥)도 줄마다 박스 하나씩을 합친 메시 1개.
- **극장 벽**: 바닥·벽 4면·천장 상자(무대+객석을 감쌈, 안쪽 면만 그림). 프로시니엄·돌출은 무대 앞에 아치 틀(폭+0.4, 높이 = 무대 높이). 배턴(일렉트릭·FOH)은 가는 원기둥, 붐은 세로 원기둥.
- **객석등**: 툴바 토글. 켜면 2초 동안 0→1로 밝아지고 끄면 2초 동안 꺼진다(실제 객석등 페이드처럼). 구현은 그림자 없는 반구광 + 방향광 1개의 세기 조절과 천장 등 원판의 자체 발광. 조명 개수는 고정이라 셰이더 재컴파일이 없다. 페이드 중에만 렌더한다. 저장하지 않고, 큐와도 무관하다(보는 용도).
- **객석 시점**: 몇 번째 줄(1–rows)과 좌우(왼쪽·가운데·오른쪽)를 골라 그 좌석 눈높이(좌석 바닥 + 1.15m)에서 무대 가운데를 본다. 시점 버튼 옆 작은 선택 칸. 회전 제한(좌우 ±25°)은 그대로.
- 편집 시점 카메라는 극장 벽 안에서 시작한다(무대 앞 객석 위).

## 4. 성능

- 객석·벽·배턴은 정적 메시 몇 개(좌석 InstancedMesh 1, 객석 단 1, 벽 1, 배턴 1 합친 메시) — 드로우콜 4개 내외 추가. 좌석과 객석 단은 그림자를 받기만 하고 만들지 않는다(그림자 패스 비용 없음).
- 객석등은 고정 광원 2개의 세기만 바꾸므로 재컴파일 없음.
- 플롯 라벨 오버레이는 카메라가 움직일 때 rAF 안에서 한 번에 위치 갱신(조명기 24개 → DOM 24개).
- 나머지 원칙(필요할 때만 그리기, 그림자 조건부 갱신)은 1단계 그대로.

## 5. 저장

- `version: 2`. v1을 읽으면 `migrateV1`로 바꾸고 안내 문구 "예전 형식의 무대를 새 형식으로 바꿨어요."를 띄운다. 바꾼 결과는 다음 변경 때 저장된다.
- `venue.houseLights`는 저장하지 않는다(타입에서 뺀다 — `Venue = { rows: number }`).
- 저장 키는 그대로 `stage-lighting-show`, `stage-lighting-quality`.

## 6. 하지 않는 것(2단계로)

셔터·반도어(빛 모양 자르기)는 고보와 같은 마스크 투사 기술이 필요해 2단계에 고보·무빙 라이트와 함께 넣는다. 포커스 팔레트, CSV 내보내기, DMX도 하지 않는다.

## 7. 테스트

- node:test
  - `show`: 채널 자동 배정·중복 거부, `hangPoint` 좌표와 along clamp, 무대 크기 변경 시 조명기 위치 이동, `resolve` 종류별(프로필 큐에 color가 있어도 무시, LED는 반영, follow target 반영), PAR 램프 각도, 직렬화 왕복 v2, `migrateV1`(위치→걸 위치, 레벨→포커스, 큐에 밝기만), 깨진 v2.
  - `cues`: 일반 조명기 큐 사이 보간은 밝기만 바뀌고 `aimChanged`는 false, follow 조준 변경은 true, LED 색 보간.
  - `store.diffShow`: 포커스 변경은 `shadowsDirty`, 밝기만은 아님.
  - `venue`(순수): 좌석 배치 개수·줄 높이, 형태별 객석 방향, 시점 좌석 좌표.
- Playwright: v1 저장본을 넣고 열기 → 안내 + 조명기가 걸 위치에 붙음, 객석등 켜기 → 2초 뒤 렌더 멈춤, 객석 시점 줄 바꾸기, 채널 페이더로 디머 변경, 솔로, 1단계 항목 1–7 재실행.

## 참고한 자료

- Capture Polar 소개(churchproduction.com), Capture 매뉴얼 소프트웨어 개요(capture.se)
- Vectorworks Spotlight 도움말: Lighting design, Lighting Device Properties
- Vectorworks Vision: The Software Console palette
- ETC Augment3d: Fixtures in Augment3d, Quick Start Guide
- CAST wysiwyg Release 24 소개(jimonlight.com)
