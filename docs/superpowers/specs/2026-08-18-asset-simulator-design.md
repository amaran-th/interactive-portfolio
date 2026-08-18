# 자산 시뮬레이터 (Asset Simulator) 설계

## 개요

현재 자산(다중 자산군)과 고정/비정기 수입·지출, 자산군 간 이체 규칙을 입력하면, 슬라이더로 미래 시점을 탐색하며 예상 자산 추이를 시각화하는 플레이그라운드 Work.

`/new-work` 커맨드 패턴에 따라 `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/`에 구현하고, `Works/data.tsx`에 항목을 추가하며, `app/(services)/asset-simulator/page.tsx` 서비스 페이지를 만든다. (정확한 표시 타이틀·설명 문구는 구현 완료 후 데이터 등록 단계에서 정한다.)

## 파일 구조

```
Works/6_AssetSimulator/
  AssetSimulator.tsx     메인 오케스트레이터 (client component, 입력 상태 보관)
  types.ts                데이터 타입 정의
  useSimulation.ts         월 단위 계산 엔진 훅
  InputPanel.tsx           입력 폼 전체 (그룹/자산군/수입/지출/이체 규칙)
  TimelineSlider.tsx        미래 시점 탐색 슬라이더
  AssetAreaChart.tsx       그룹별 스택 영역 그래프 (SVG 직접 구현)
  GroupDonutChart.tsx      그룹 내 자산군 비율 도넛 차트 (SVG 직접 구현)
  FlowDiagram.tsx          선택 시점 자산 이동 흐름도 (SVG, Sankey 스타일)
```

차트 3종은 외부 라이브러리 없이 SVG로 직접 구현한다. 프로젝트에 차트 라이브러리가 없고, 다크 테마·글래스모피즘 디자인과 자연스럽게 어울리게 하기 위함.

저장은 세션 메모리(`useState`)만 사용한다. 새로고침하면 초기화된다.

## 데이터 모델 (types.ts)

```ts
type Group = {
  id: string;
  name: string;
  color: string; // 팔레트에서 자동 순환 할당
};

type AssetClass = {
  id: string;
  name: string;
  groupId: string;
  initialBalance: number;
  annualReturnRate: number; // 기본값 0, "상세 옵션"에서만 노출
  isPrimary: boolean; // 정확히 하나만 true — 수입 유입 / 고정지출 유출 대상 계좌
};

type FixedExpense = {
  id: string;
  name: string;
  amount: number; // 매달 기본 계좌에서 유출
};

type IrregularCashflow = {
  id: string;
  name: string;
  amount: number;
  targetDate: string; // "YYYY-MM", <input type="month"> 값
};
// IrregularExpense, IrregularIncome은 동일 구조를 각각의 배열로 관리

type TransferRule = {
  id: string;
  fromAssetId: string;
  toAssetId: string;
  mode: "fixed" | "percentOfSource";
  amount: number; // mode="fixed"면 금액, "percentOfSource"면 %
  frequency: "monthly" | "yearly";
};
```

`monthlyIncome: number` (고정 월수입 단일 값), `horizonMonths = 120`(10년, 고정)도 시뮬레이션 입력에 포함된다.

## 시뮬레이션 엔진 (useSimulation)

입력이 바뀌면 0~`horizonMonths` 개월을 순서대로 계산한다. 각 달(m)마다:

1. **수입 유입**: `monthlyIncome`을 기본 계좌에 더한다. `targetDate`가 이번 달과 일치하는 비정기 수입이 있으면 함께 더한다.
2. **지출 유출**: 모든 `FixedExpense` 합계를 기본 계좌에서 뺀다. `targetDate`가 이번 달과 일치하는 비정기 지출이 있으면 함께 뺀다.
3. **이체 규칙 실행**: `frequency="monthly"`인 규칙은 매달, `frequency="yearly"`인 규칙은 12개월마다 실행한다. `mode="percentOfSource"`는 출발 자산 잔액의 %만큼 이체하되, 잔액이 부족하면 가능한 만큼만 이체한다(음수 방지).
4. **수익률 반영**: 각 자산군에 `annualReturnRate / 12`를 월복리로 적용한다.
5. **스냅샷 저장**: 자산군별 잔액, 그룹별 합계, 이번 달 발생한 유입/유출/이체 내역(흐름도용)을 기록한다.

`targetDate`는 시뮬레이션 시작월(오늘)과의 차이를 월 인덱스로 환산해 매칭한다. 오늘보다 과거인 `targetDate`는 입력 단계에서 막는다(달력 min 속성).

반환값: `MonthSnapshot[]` (길이 `horizonMonths + 1`), 인덱스로 특정 달의 스냅샷을 가져오는 유틸.

## 입력 패널 (InputPanel)

- **그룹**: 이름 입력 후 추가/삭제. 색상은 자동 순환 할당.
- **자산군**: 이름, 소속 그룹 선택, 현재 잔액 입력. 기본 계좌 여부는 라디오로 하나만 선택. **연 수익률은 기본 0%로 숨겨두고, "상세 옵션 보기" 토글을 펼쳤을 때만 입력 필드가 나타난다** — 입력 항목이 많아 보이는 것을 줄이기 위함.
- **월 고정수입**: 금액 하나.
- **비정기 수입 / 비정기 지출**: 각각 리스트. 이름, 금액, `<input type="month">`로 날짜 선택 — 옆에 오늘 기준 "N개월 후"를 읽기 전용으로 자동 표시.
- **고정지출**: 이름+금액 리스트.
- **이체 규칙**: 출발/도착 자산군 select, 금액방식(고정금액/출발잔액 비율) 토글, 금액, 주기(매월/매년).

리스트 추가/삭제 UX는 기존 `4_YearlyReceipt`의 항목 편집 패턴을 참고한다.

## 시각화 영역

- **TimelineSlider**: 0~120개월 드래그. 선택 시점 라벨("N개월 후 · YYYY.MM")과 그 시점 총자산을 함께 표시.
- **AssetAreaChart**: X축 0~120개월, Y축 총자산, 그룹별 색상 스택 영역. 선택 시점에 세로 커서 라인 표시.
- **GroupDonutChart**: 그룹 탭으로 전환하며, 선택 시점 기준 해당 그룹 내 자산군 구성 비율을 도넛으로 표시.
- **FlowDiagram**: 선택 시점이 속한 달의 흐름 — 수입(고정+비정기) → 기본 계좌 → (고정지출/비정기지출 유출, 각 이체 규칙에 따른 도착 자산군)을 노드-링크로 표시. 링크 두께로 금액 비율을 표현.

## 비주얼 스타일

이 Work의 콘텐츠 영역은 프로젝트 공통 다크 테마 대신, 사용자가 제시한 **라이트 글래스모피즘** 스타일을 사용한다. `1_KnitMuffler`가 이미 같은 방식(모달 크롬은 다크, Work 콘텐츠 자체는 밝은 테마)으로 예외를 두고 있어 선례가 있다.

- **배경**: 파스텔 블루~퍼플 계열 그라디언트 (`from-indigo-100 via-blue-50 to-purple-100` 톤)
- **카드**: 반투명 흰색(`bg-white/70`~`bg-white/80`) + `backdrop-blur` + `rounded-2xl`~`rounded-3xl` + 옅은 그림자. 테두리는 `border-white/40` 정도로 은은하게.
- **상단 요약 타일 행**: 총자산, 선택 시점 총자산, 순증감액 등을 큰 숫자 + 작은 트렌드 스파크라인으로 보여주는 카드 3~4개.
- **차트 카드 그리드**: `AssetAreaChart`(넓은 카드, 그라디언트 채움 영역 그래프), `GroupDonutChart`와 `FlowDiagram`을 나머지 카드에 배치. 카드 안 헤더에 작은 라벨 + 우측 정렬 보조 컨트롤(그룹 탭 등).
- **색상 팔레트**: 그룹별 색상은 블루·퍼플·틸·핑크 계열 소프트 톤을 순환 할당해 이미지의 다중 컬러 느낌을 재현한다.
- **텍스트**: 짙은 회색~검정(`text-gray-800`/`text-gray-900`) 위주, 보조 텍스트는 `text-gray-500`.

`InputPanel`과 `TimelineSlider`도 동일한 라이트 글래스 톤(흰 반투명 패널, 둥근 인풋)으로 통일한다.

## 모달 테마 오버라이드 (WorkModal.tsx)

Work 콘텐츠 영역뿐 아니라, 이 Work를 열었을 때 모달 창 전체(헤더 그라디언트·설명 패널·모바일 탭·닫기 버튼 등)도 라이트로 바뀌어야 한다. 다른 Work를 열 때는 기존 다크 테마가 그대로 유지되어야 한다.

- `Work.tsx`의 `WorkItem` 타입에 `theme?: "light"` 필드를 추가한다(기본값 없음 = 기존 다크).
- `WorkModal.tsx`에서 `selected.theme === "light"` 여부로 라이트/다크 클래스 세트를 담은 객체를 하나 만들고, 기존에 하드코딩되어 있던 배경·텍스트·보더 클래스들을 전부 이 객체 참조로 바꾼다. `isLight`가 false일 때 각 필드 값은 기존 다크 테마 클래스와 완전히 동일해야 한다 — 다른 Work의 렌더링 결과가 한 글자도 달라지면 안 된다.
- 자산 시뮬레이터의 `data.tsx` 항목에 `theme: "light"`를 추가한다.

## 엣지 케이스

- 자산군이 하나도 없으면: 결과 영역에 안내 문구를 표시하고 그래프를 렌더링하지 않는다.
- 기본 계좌가 지정되지 않으면: 수입/지출이 반영되지 않는다는 안내를 표시한다.
- `percentOfSource` 이체가 출발 잔액을 초과하면: 가능한 만큼만 이체(음수 방지).
- 그룹이 없는 자산군은 만들 수 없다 (자산군 생성 시 그룹 선택 필수, 그룹이 없으면 먼저 그룹 추가를 유도).

## 범위 밖 (Non-goals)

- localStorage 등 영속 저장 — 세션 메모리만 사용.
- `horizonMonths`(10년) 사용자 조절 — 고정값으로 시작.
- 인플레이션 반영, 지출 항목별 연간 증가율 — 이번 스펙에서는 다루지 않는다.
