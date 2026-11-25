# 조명 연습실 패널 다듬기 — 인라인 라벨·색 칸·큐 바텀시트·도트 파비콘

## 포인트 컬러와 라벨
- 다크 테마 포인트 컬러를 앰버(`--color-point: #f5b54a`)로 바꾸고, 선택된 버튼·현재 큐·GO에만 쓴다.
- 어색한 한글 용어는 업계 표기대로 영문으로 둔다(조명기 종류, Zoom/Iris, 젤 이름, Record/Update, Focus center 등).

## 라벨은 필드와 같은 줄
- `ui.ts`의 `FIELD_LABEL`(`w-14 shrink-0`)을 모든 입력의 라벨 칸으로 쓴다. `Slider`는 라벨·슬라이더·값, `Segmented`·`TextField`·`Vec3Field`·선택 칸도 같은 줄이다.
- 한 줄에 두 필드를 놓을 때는 `Segmented compact`, `NumberField align` 옵션으로 라벨 폭을 조절한다(인물의 키·체형).
- 젤은 라벨 오른쪽에 견본 14개, 그 아래 직접 고르기 칸과 현재 젤 이름을 둔다.

## 색 칸
- 브라우저 기본 `<input type="color">`는 안쪽 여백과 견본 테두리가 있어 사각형 안 사각형으로 보인다. `COLOR_INPUT`이 `::-webkit-color-swatch-wrapper` 여백과 swatch 테두리를 없앤다.
- `ColorField`를 `<label>`로 감싸면 줄 어디를 눌러도 색 고르기 창이 열려서 `<div>`로 바꾸고, 색 칸은 `ml-auto`로 오른쪽 끝에 붙인다.

## 큐 바텀시트
- `CueBar` 위쪽 손잡이로 접고 편다. `grid-rows-[0fr]↔[1fr]` 전환으로 높이를 몰라도 부드럽게 접히고, 접힌 영역은 `inert`로 포커스를 막는다.
- 접힌 상태에서는 현재 큐 한 줄(누르면 펴짐)과 BACK·GO만 남는다.

## 도트 파비콘
- `app/stage-lighting/icon.svg`: 파이프에 매달린 조명기가 앰버 빛을 바닥에 비추는 16×16 그림.
- `app/color-picker/icon.svg`: 빨간 고무 꼭지 스포이트와 파란 색 방울.
- 같은 색이 이어지는 칸을 `<rect>` 하나로 합치고 `shape-rendering="crispEdges"`로 그린다. 보이저 라우트의 `icon.svg`가 Turbopack 패닉을 일으킨 적이 있어 배포 전 `npm run build`로 확인한다.

## 관련 코드
- `apps/services/components/works/11_StageLighting/ui.ts` — `DARK_THEME`, `FIELD_LABEL`, `COLOR_INPUT`
- `apps/services/components/works/11_StageLighting/fields.tsx` — 인라인 라벨 필드들
- `apps/services/components/works/11_StageLighting/GelPicker.tsx` — 젤 견본
- `apps/services/components/works/11_StageLighting/CueBar.tsx` — 큐 바텀시트
- `apps/services/app/stage-lighting/icon.svg`, `apps/services/app/color-picker/icon.svg` — 도트 파비콘
