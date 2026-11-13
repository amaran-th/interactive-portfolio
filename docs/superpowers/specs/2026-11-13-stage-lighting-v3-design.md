# 조명 연습실 v3 설계: 사이드바 개편·극장 템플릿·올라서기/겹침·사람 모델

2026-11-13. v2(`2026-11-13-stage-lighting-v2-design.md`) 위에 얹는다. 사용자가 채팅에서 승인한 설계를 옮겼다.

## 목표

1. 사이드바: 3D 화면 위에 떠 있는 반투명·블러 패널. 위는 요소 목록, 아래는 고른 요소의 속성. 편집이 슬라이더 위주라 불편하던 점을 고친다.
2. 객석: 자유 끌기 대신 실제 극장형 템플릿 + 수치 조절 + 규칙 보정.
3. 인물·소품을 단·계단·탁자·상자 위로 끌면 그 윗면에 올라서고, 높이(y)를 직접 바꿀 수 있다. 바닥에서 겹치면 놓을 때 가까운 빈자리로 밀어낸다.
4. 인물: 외부 사람 모델(Quaternius Universal Base Characters·Universal Animation Library, CC0 무료판). 남녀 구분, 자세 다양화, 현실적인 키·체형.
5. 추가 메뉴·요소 목록에 SVG 아이콘.

## 1. 사이드바

- 3D 화면은 툴바·큐 바 사이 전체 폭. 패널은 오른쪽에 `absolute`로 떠 있다(`bg-white/70 backdrop-blur-md`, 테두리·그림자). 너비 기본 320px, 왼쪽 가장자리를 끌어 260–480px. 접기 버튼으로 24px 손잡이만 남긴다. 모바일(<768px)은 아래쪽 시트(높이 45%).
- 요소 목록: 그룹 `무대·객석`(한 줄) / `인물` / `소품` / `조명기`(채널 순, 줄마다 디머 range). 그룹은 접힌다. 줄 = 아이콘 + 이름(조명기는 채널 번호 동그라미 + 이름). 누르면 선택. 목록 높이는 패널의 40%까지, 넘치면 스크롤.
- 속성: 머리줄(아이콘·종류·이름 입력·복제·삭제) + 접히는 구역. 위치는 `X/Y/Z` 숫자 칸 세 개(라벨을 좌우로 끌면 값이 바뀜, 칸에 직접 입력, Enter·blur에 확정). 각도도 숫자 칸 + 끌기. 색은 칩 + 색 입력.
  - 인물: 위치 / 사람(성별·키·체형·자세·머리) / 색(피부·상의·하의·신발·머리)
  - 소품: 위치 / 크기 / 색
  - 조명기: 걸기 / 포커스 / 큐 값 (v2 그대로, 숫자 칸으로)
  - 무대·객석: 무대 / 객석(템플릿) / 좌석 지도(보기 전용, 좌석 누르면 그 자리 시점)
- 복제: ⌘/Ctrl+D, 머리줄 버튼. 복제본은 0.5m 옆에 놓이고 겹침 보정을 거친다.
- 기존 `속성/채널/객석` 탭은 없앤다(채널은 목록의 조명기 그룹이 대신).

## 2. 객석 템플릿

`Venue = { template: VenueTemplate }`, 좌석 블록은 `templateBlocks(stage, template)`가 계산한다(저장하지 않음).

- `VenueTemplate = { kind, rows, width, aisle, rake, gap, widen, balconyRows }`
  - `kind`: `studio`(소극장: 한 블록) · `hall`(중극장: 가운데 + 양옆, 통로 2개) · `grand`(대극장: hall + 발코니) · `thrust`(세 면) · `arena`(네 면)
  - `rows` 줄 수(4–25), `width` 가운데 블록 좌석 수(6–30), `aisle` 통로 폭(1.0–2.0m), `rake` 단차(0.1–0.5m), `gap` 무대 앞 거리(1.0–4.0m), `widen` 뒷줄로 갈수록 늘어나는 좌석 수(줄당 0–1, 두 줄마다 1석 같은 소수), `balconyRows`(grand만, 3–10).
- 규칙: 블록 위치·방향은 계산으로만 정해진다. 양옆 블록은 가운데 블록 바깥에서 통로 폭만큼 떨어져 무대 중심을 향해 15° 돈다. 발코니는 1층 뒷줄 뒤 2m 위·뒤에 겹쳐 놓는다(높이 = 1층 마지막 줄 + 3m). 돌출·원형은 v2 기본 배치를 템플릿 수치로 일반화한다. 블록끼리·무대와 겹치지 않는다(테스트로 보장).
- 무대 형태를 바꾸면 템플릿 종류가 맞지 않을 때만 기본 종류로 바꾼다(proscenium→hall, thrust→thrust, round→arena).
- 좌석 지도는 보기 전용. 좌석을 누르면 그 자리 시점. 블록 끌기·회전 UI는 없앤다.
- `SeatBlock`에 `elevation`(블록 바닥 높이) 추가.

## 3. 올라서기와 겹침

순수 모듈 `placement.ts`.

- `surfaceAt(props, x, z, ignoreId)` → 그 점 아래에 있는 소품 윗면 높이 중 가장 높은 값(없으면 0). 소품별 윗면: 단·상자·탁자 = scale.y, 의자 = 앉는 면(0.45·scale.y/0.9), 계단 = 칸별(로컬 z에 따라 단 높이), 기둥·문틀 = 올라서지 않음. 소품 회전을 반영한다.
- 끌기: 인물·소품의 y = `surfaceAt`(자기 자신 제외). 놓을 때 `resolveOverlap`.
- `resolveOverlap(items, id, pos)` → 같은 높이층(|Δy| < 0.3)에서 원(인물 반지름 0.3, 소품은 바닥 대각선/2)끼리 겹치면 겹친 거리만큼 바깥으로 밀어낸다. 최대 8번 반복, 그래도 겹치면 원래 자리. 무대 바닥 범위로 자른다.
- 패널 Y 칸: 직접 입력하면 그 값으로 고정(0–6m). 다시 끌면 표면을 따른다.

## 4. 사람 모델

- 에셋: `public/stage-lighting/` 아래 `body-male.glb`, `body-female.glb`(텍스처·눈·눈썹 제거, 몸 메시 + 뼈대만), `hair-*.glb`(짧은 가르마·번·긴 머리·짧은 머리·빡빡), `poses.glb`(고른 동작에서 한 프레임씩 뽑은 1프레임 클립들). 만드는 스크립트는 `apps/services/scripts/stage-lighting-assets/`에 두고, 라이선스(CC0, Quaternius) 안내 `LICENSE.md`를 에셋 폴더에 둔다. 합계 3MB 이하 목표.
- 자세(`Pose`): `stand`(Idle) `talk`(Idle_Talking) `walk`(Walk) `formalWalk`(Walk_Formal) `run`(Jog) `sit`(Sitting_Idle) `sitTalk`(Sitting_Talking) `crouch`(Crouch_Idle) `kneel`(Fixing_Kneeling) `dance`(Dance) `push`(Push) `reach`(Interact) `lie`(Death01 마지막 프레임) `armsOpen`(Spell_Simple_Idle). 각 자세의 프레임 시각은 에셋 스크립트에서 정한다.
- 굽기(baking): (성별, 자세, 체형) 조합마다 한 번, 뼈대를 적용한 정점을 고정 `BufferGeometry`로 굳혀 캐시한다. 인물은 `Mesh`(SkinnedMesh 아님)로 그려 지금처럼 가볍다. 키는 메시 전체 균일 스케일(모델 키 기준).
- 체형: 굽기 전에 뼈 두께 스케일. 근육질인 무료 모델을 `보통`에서 어깨(clavicle)·위팔·가슴(spine_03) 두께를 줄여 평범한 체형으로 맞추고, `마름`은 더 줄이고 `통통`은 몸통·허벅지를 키운다. 축 방향은 에셋 확인 뒤 정한다.
- 색: 정점마다 부위 가중치 4채널(피부·상의·하의·신발)을 뼈 가중치로 계산해 attribute로 넣고, 재질 셰이더(`onBeforeCompile`, 공유 프로그램)가 인물별 색 uniform 4개로 섞는다. 경계가 부드럽다. 머리카락은 별도 메시, 색 하나.
- 키: 여 150–180cm(기본 160), 남 160–195cm(기본 173). 성별을 바꾸면 범위 밖 키만 맞춘다.
- 로딩: 처음 인물을 그릴 때 에셋을 받는다. 받는 동안·실패 시 v2 절차적 마네킹으로 그린다(실패 시 안내 한 번).
- 피킹 박스: (성별, 자세, 키, 체형)으로 굳힌 메시의 바운딩 박스.

## 5. 아이콘

`icons.tsx`: 소품 7종·인물(남/여)·조명기 6종·무대 SVG(24px, `currentColor`). 추가 메뉴, 요소 목록, 속성 머리줄에서 쓴다. 이모지 금지.

## 저장(v3)

- `Show.version: 3`. `Actor`: `gender`, `height`(m), `build`, `pose`, `hair`, `skinColor`, `topColor`, `bottomColor`, `shoeColor`, `hairColor`, `position`(y 포함), `rotationY`, `name`. `Venue = { template }`.
- v2 → v3: 인물 gender `male`, 키 clamp, 자세 `stand/sit/armsOpen/walk` 그대로, `clothColor`→`topColor`, 하의 `#2a2a35`, 신발 `#1a1a1a`, 머리 `short`/`#1a1512`. 객석은 무대 형태 기본 템플릿. v1은 v2 변환 뒤 v3 변환.

## 성능 기준

- 정지 0프레임, 객석·인물 수정 시에만 재생성. 인물 40명 × 약 12.5k 삼각형 = 50만 삼각형이 그림자 맵 8개에 그려진다. 품질 `자동`이 느리면 그림자를 줄이는 기존 경로를 쓴다. 굽은 지오메트리는 같은 (성별, 자세, 체형)끼리 공유.
