# 자산 시뮬레이터 카테고리 체계 분리와 입력 패널 다듬기

수입/지출을 위한 색상 없는 카테고리 체계를 자산 그룹과 분리해 신설하고, 입력 패널과 차트 전반의 자잘한 UX 문제를 정리했다.

## 누적 이력과 스크롤 레이아웃

실패한 이체가 누적 이력에서 아예 누락되던 문제를 고쳤다 — 실패한 지출과 마찬가지로 "(잔액 부족으로 중단)" 표시와 취소선/흐림 스타일로 목록에 남기되, 합계 계산에서는 제외한다.

이력 패널의 스크롤 컨테이너가 남은 높이를 다 못 채우거나 끝없이 늘어나던 버그는, CSS Grid의 `min-height: 0`이 "최소 콘텐츠 크기 이하로 줄어들 수 있게" 해줄 뿐 위쪽 한계(천장)는 만들어주지 않는다는 점에서 비롯됐다. 이 상태에서 형제 컬럼(차트)보다 이력 목록이 길면, 그리드 행 자체가 이력 목록의 자연 높이만큼 늘어나 버린다. 해결책은 `ResizeObserver`로 차트 컬럼의 실측 높이를 구해 이력 패널에 인라인 `maxHeight`로 넘기는 것 — Tailwind 클래스보다 인라인 스타일이 우선하므로 항상 형제 높이에 맞춰 캡이 씌워진다.

## 자산 그룹 vs 수입/지출 카테고리: 완전히 분리된 네임스페이스

수입/지출에도 그룹핑 개념은 필요하지만 색상은 의미가 없다는 논의 끝에, 기존 `Group`(색상 있음, 자산 전용)과 별도로 `Category`(색상 없음)를 신설하고 `Scenario.categories`로 독립된 배열을 두었다. `IncomeItem`/`ExpenseItem`의 `groupId`는 `categoryId`로 교체됐다.

`GroupPicker`를 본떠 색상 관련 코드를 전부 뺀 `CategoryPicker`를 새로 만들었다 — 이름만 있는 카테고리를 만들고 고르고 이름 바꾸고 지우는 동일한 상호작용 패턴을, 색상 스와치 없이 구현한 버전이다. 두 개념을 하나의 타입으로 묶고 UI만 다르게 그리는 대신 아예 별도 타입·별도 CRUD 핸들러 3종 세트로 분리한 이유는, 색상 충돌 회피 로직(`usedColors`, `nextVisibleColor`)이 애초에 "차트에 렌더링되는 개체"에만 의미가 있는 개념이라 수입/지출까지 억지로 끌어들일 이유가 없었기 때문이다.

## 수입/지출 구성 비율 전용 패널

기존 자산 비율 도넛에 토글을 얹는 대신, 수입/지출 전용 `FlowRatioChart` 패널을 자금 흐름도 옆에 새로 만들었다. 수입/지출 각각 작은 도넛으로 표시되며 항목별/카테고리별 보기를 전환할 수 있다. `Category`에는 색상이 없으므로, 렌더링 시점에 `GROUP_PALETTE[i % length]`로 슬라이스 색을 즉석 배정한다(색이 영구히 저장되는 자산/그룹과 달리, 매 렌더마다 순서 기반으로 계산되는 임시 색).

그리드 타일링이 깨지지 않도록 3단 컨테이너 쿼리 브레이크포인트마다 `col-span` 합이 열 수의 배수가 되게 계산해 배치했다(2열 구간 2/1+1/2/2, 3열 구간 2+1/1+2/3 모두 빈 칸 없이 채워짐).

## 색상 스와치를 팝오버 방식으로 통일

자산/그룹 생성 폼에 항상 펼쳐져 있던 색상 팔레트를, 이름 입력 왼쪽의 작은 스와치 버튼을 클릭했을 때만 뜨는 팝오버로 바꿨다. 폼 자체, 리스트 아이템의 색상 변경, `GroupPicker`의 신규/기존 그룹 만들기 흐름까지 네 곳 모두 같은 상호작용 패턴(스와치 → 팝오버 → 8색 그리드)으로 통일했다.

동시에 `usedColors(groups, assetClasses)` 헬퍼를 추가해, 이미 쓰이고 있는 색은 스와치에서 비활성화(`disabled` + 흐림 처리)했다 — 단, 현재 편집 중인 항목 자신의 색은 소스 배열에서 제외하고 계산해 "자기 색이 자기 때문에 막히는" 상황은 피했다.

## 입력 패널 편집 강조

자산/수입/지출/이체 4개 섹션 모두, 리스트에서 현재 편집 중인 항목에 섹션별 테마 색(인디고/에메랄드/로즈/앰버) 배경 + 링 스타일을 적용해 여러 항목을 오가며 편집할 때 어떤 걸 고치고 있는지 한눈에 보이게 했다.

## 자금 흐름도 항목별/그룹별 토글

자산 이체 대상이 많아지면 화살표가 자산 개수만큼 늘어나 복잡해지는 문제를, 그룹별 집계 토글로 완화했다. 그룹별 모드에서는 같은 그룹에 속한 이체 대상들의 금액을 합산해 화살표 하나로 표시한다.

## 트리거 버튼이 텍스트처럼 보이던 버그

"그룹 선택 UI가 일반 텍스트 같다"는 제보의 원인은 `GroupPicker`/`CategoryPicker`의 트리거 버튼이 `border-white/60 bg-white/80`을 쓰고 있었기 때문이다. 이 반투명 흰 테두리는 색이 있는 카드 배경(에메랄드/로즈 톤) 위에서는 잘 보였지만, 정작 이 버튼이 실제로 놓이는 흰 폼 배경(`bg-white`) 위에서는 대비가 사실상 사라져 클릭 가능한 요소로 인식되지 않았다. `border-gray-300 bg-white shadow-sm` + `ChevronDown` 아이콘으로 바꿔, 어느 배경 위에서도 식별 가능하게 고쳤다.

같은 자리에서 "연 수익률"이라는 표현도 "연 이율"로 다듬었다(부채 쪽 "연 이자율"은 그대로 유지 — 대출/부채는 이자율이라는 표현이 더 적합하다는 판단).

## 관련 코드
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/HistoryPanel.tsx` — 실패 이체 표시, `ResizeObserver` 기반 `maxHeight` 캡
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx` — 카테고리 CRUD 핸들러, 차트 컬럼 높이 측정
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/types.ts` — `Category` 타입, `usedColors()` 헬퍼
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/CategoryPicker.tsx` — 색상 없는 카테고리 선택 UI(신규)
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupPicker.tsx` — 트리거 버튼 대비 개선, 색상 스와치 팝오버화
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupAssetSection.tsx` — 스와치 팝오버, `usedColors` 적용, "연 이율" 레이블
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx`, `ExpenseSection.tsx` — `CategoryPicker` 연동, 편집 강조
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/FlowRatioChart.tsx` — 수입/지출 구성 비율 패널(신규)
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/FlowDiagram.tsx` — 항목별/그룹별 토글
- `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/GroupDonutChart.tsx` — 비율/금액 토글, 중첩 `@container`로 좁은 카드 줄바꿈 버그 수정
