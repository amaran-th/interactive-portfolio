# 네모네모빔 편집기 UI 정리 — 도움말·패널 스타일·레이아웃·용어

지난 세션에서 쌓인 미커밋 변경(참조 레이어/조작별 대상 레이어 UI 다듬기,
도움말 툴팁, 스프라이트 시트 토글, JPG 배경색)에 이번 세션 작업을 얹어 정리.

## 도움말 문구 중앙화 (`helpTexts.ts`)

`<HelpTip text="…">` 인라인 문자열이 `DrawToolbar` / `LayerPanel` / `ImportPanel`
/ `ExportPanel` 네 곳에 흩어져 있었다. `helpTexts.ts`의 `HELP` 상수 하나로
모으고(레이어 패널 / 도구 옵션 / 이미지 불러오기 / 내보내기로 그룹), 각
컴포넌트는 `HELP.<키>`를 참조한다. 문체·표현 검토를 한 파일에서 한다.

## 떠 있는 패널 디자인 (`panelStyles.ts`)

즐겨찾기 관리·레이어 보정 등 드롭다운/팝오버가 `bg-white + shadow-xl`만 있어
흰 배경 위에서는 경계가 안 보였다.

- `FLOATING_PANEL` = `bg-white ring-1 ring-gray-300 shadow-xl shadow-gray-900/15`.
  1px `ring-gray-300`이 흰↔흰 경계를 만드는 핵심. 컨텍스트 메뉴·블렌드
  드롭다운·툴바 팝오버·텍스트 도구 툴바·narrow 플로팅 패널 등 ~13곳에 적용.
- `FLOATING_PANEL_HEADER` = `ReferenceWindow` 제목표시줄과 같은
  `bg-gray-100 · border-b · text-gray-600 font-semibold` 헤더 스트립. 제목 있는
  패널(즐겨찾기 관리, 레이어 보정, narrow 플로팅 패널)에 붙여 "떠 있는 작은
  창"으로 읽히게 한다.
- 편집기 전역 관례대로 모서리는 각지게. violet 액센트는 넣지 않음(중립).

## 레이아웃 — 불러오기/내보내기를 왼쪽 열로

우측 열(미리보기 + 레이어 + 아코디언 2개)이 세로로 꽉 끼던 문제.

- 이미지 불러오기·내보내기 아코디언을 좌측 열(색상환 아래)로 옮기고
  `mt-auto`로 하단 정렬.
- `importPanel` / `exportPanel` JSX를 컴포넌트 상단으로 hoist해, wide(좌측 열)와
  narrow(플로팅 팝업)가 같은 노드를 재사용한다.
- 좌측 열의 `overflow-y-auto`를 제거했다. 아코디언을 펼치면 색상환까지 함께
  밀려 스크롤됐다 — 색상환은 `shrink-0` 래퍼로 고정하고, 아코디언 묶음에
  `min-h-0`을 줘 열 스크롤 대신 아코디언 내부에서만(`Accordion`의
  `overflow-y-auto`) 스크롤되게 했다.

## 용어 — "활성 레이어" → "현재 레이어"

UI에 보이는 문구만 바꿨다(도구 옵션 세그먼트 `활성`→`현재`, `SCOPE_FULL`
드롭다운 항목·툴팁, `HELP.layerScope`). 코드의 `activeLayer` / `activeLayerId`
변수명과 주석은 유지. "활성 색상"(주 색상, MS페인트식 용어)은 레이어와 무관해
그대로 둔다.

## 즐겨찾기 + 버튼

팔레트가 12개(= `grid-cols-6` 두 줄)로 차면 `+` 버튼을 `disabled`로 남기지
않고 아예 숨긴다 — 셋째 줄에 `+`만 걸리는 어색함을 없앤다.

## `Switch` 컴포넌트 추출

`LayerPanel`의 로컬 `Switch`를 `Switch.tsx`로 빼고 `disabled` prop을 추가해,
핑퐁·어니언 스킨·전역 동일색·SVG 애니메이션·스프라이트 시트 토글이 공유한다.

## 관련 코드

- `apps/services/components/works/5_PixelArtMaker/helpTexts.ts` (신규)
- `apps/services/components/works/5_PixelArtMaker/panelStyles.ts` (신규)
- `apps/services/components/works/5_PixelArtMaker/Switch.tsx` (신규)
- `apps/services/components/works/5_PixelArtMaker/HelpTip.tsx` (신규 — 포털·뷰포트
  클램핑·violet 테마 `?` 툴팁)
- `Editor.tsx` — 좌우 열 레이아웃, `importPanel`/`exportPanel` hoist
- `DrawToolbar.tsx` / `LayerPanel.tsx` / `ImportPanel.tsx` / `ExportPanel.tsx` —
  `HELP` 참조, `FLOATING_PANEL` 적용, 용어 변경
- `ColorWheel.tsx` — 즐겨찾기 관리 패널 헤더, `+` 버튼 숨김, 세트 삭제 아이콘
  상시 표시
- `types.ts` — `TOOLBAR_COMPACT_WIDTH` 1210 → 1170 ("변형" 카드 해체 반영)
