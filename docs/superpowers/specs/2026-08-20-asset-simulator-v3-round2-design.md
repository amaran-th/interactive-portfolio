# 자산 시뮬레이터 v3 2라운드: 시뮬레이션 범위 확장, 자산·그룹 색상, 목표 달성 예측

이 문서는 v1([2026-08-18-asset-simulator-design.md](2026-08-18-asset-simulator-design.md)), v2([2026-08-18-asset-simulator-v2-design.md](2026-08-18-asset-simulator-v2-design.md)), v3 1라운드([2026-08-19-asset-simulator-v3-round1-design.md](2026-08-19-asset-simulator-v3-round1-design.md))가 전부 구현·리뷰 완료된 뒤 진행하는 v3의 두 번째 라운드다. 원래 계획된 범위는 "목표 금액 설정 + 달성 시점 예측"이었는데, 브레인스토밍 도중 관련된 두 가지 요청(시뮬레이션 범위 확장, 자산·그룹 색상 커스터마이즈)이 함께 들어와 이번 라운드에 묶어서 진행한다.

## 목표

1. 타임라인 슬라이더·차트가 보여주는 시뮬레이션 범위(현재 고정 120개월)를 사용자가 프리셋으로 바꿀 수 있게 한다.
2. 자산(AssetClass) 하나하나에 색상을 자동 배정하고 수동으로도 바꿀 수 있게 하며, 그룹도 이름·색상·삭제를 편집할 수 있게 한다. 영역/막대 차트가 같은 그룹 안에서도 자산별로 시각적으로 구분되게 한다.
3. 총자산 또는 특정 자산·그룹을 기준으로 목표 금액을 설정하면, 그 금액을 달성하는 실제 시점을 계산해 보여준다.

## 1. 시뮬레이션 범위 확장

### 데이터

`types.ts`의 고정 상수 `HORIZON_MONTHS = 120`을 제거하고, 프리셋 배열을 추가한다.

```ts
export const HORIZON_PRESET_YEARS = [5, 10, 20, 30] as const;
export const DEFAULT_HORIZON_YEARS = 10;
```

`AssetSimulator.tsx`에 `horizonMonths` 상태(기본 `DEFAULT_HORIZON_YEARS * 12` = 120)를 추가하고, 헤더의 환율 입력 옆에 프리셋 버튼 그룹(5/10/20/30년)을 둔다. 버튼을 누르면 `horizonMonths`가 즉시 바뀌고, 시뮬레이션이 다시 돌며 슬라이더 범위와 4개 차트가 새 범위로 다시 그려진다.

### 계산 엔진 변경

`simulation.ts`의 두 함수가 지금은 import한 상수 `HORIZON_MONTHS`를 직접 참조하는데, 파라미터로 받도록 바꾼다.

```ts
export function runSimulation(
  input: SimulationInput,
  today: Date = new Date(),
  horizonMonths: number,
): MonthSnapshot[]

export function validateSchedule(
  schedule: RepeatSchedule,
  today: Date,
  horizonMonths: number,
): string | null
```

`validateSchedule`은 세 입력 폼(`IncomeSection`, `ExpenseSection`, `TransferRuleSection`)에서 호출되므로, 세 컴포넌트 모두 `horizonMonths: number` prop을 새로 받아 `AssetSimulator.tsx` → `InputPanel.tsx` → 각 섹션으로 전달한다. `TimelineSlider.tsx`는 지금 상수를 직접 import해서 `max`로 쓰고 있는데, 이제 `max` prop으로 받는다.

5개 차트 컴포넌트(`AssetAreaChart`, `GroupDonutChart`, `FlowDiagram`, `ComparisonBarChart`, `TimelineSlider` 중 후자를 제외한 4개)는 전달받은 `snapshots` 배열의 길이를 그대로 쓰기 때문에 상수를 직접 참조하지 않는다 — 이 변경으로 인한 수정이 필요 없다.

## 2. 자산·그룹 색상 시스템 + 그룹 편집

### 데이터

`AssetClass`에 `color: string` 필드를 추가한다.

```ts
export type AssetClass = {
  id: string;
  name: string;
  groupId?: string;
  currency: Currency;
  initialBalance: number;
  annualReturnRate: number;
  isPrimary: boolean;
  color: string;   // 신규
};
```

`NewAssetClassInput`에는 `color`를 넣지 않는다 — 생성 폼에는 색상 선택 UI를 두지 않고, 자산을 추가할 때 자동으로 배정한다(그룹처럼). 이후 목록에서 수동으로 바꾼다.

`GROUP_PALETTE`(기존 8색)를 자산 색상 배정에도 재사용하되, 그룹과 독립적인 카운터로 순환한다.

```ts
export function nextAssetColor(existingCount: number): string {
  return GROUP_PALETTE[existingCount % GROUP_PALETTE.length];
}
```

### 자산 색상 수동 변경

`GroupAssetSection.tsx`의 자산 목록 행마다 색상 스와치(작은 원)를 추가한다. 클릭하면 그 행 아래에 8색 팔레트가 펼쳐지고, 하나를 고르면 `onUpdateAssetClass(id, { ...현재 필드, color: 새색상 })`이 즉시 호출된다(전체 수정 폼을 열지 않는 가벼운 동작).

### 그룹 편집

`GroupPicker.tsx`를 네이티브 `<select>`에서 버튼 + 커스텀 드롭다운 패널로 바꾼다.

- 버튼: 현재 선택된 그룹 이름(또는 "그룹 없음") 표시, 클릭 시 패널 토글.
- 패널의 각 그룹 행: 색상 스와치(클릭 시 그 줄에 8색 팔레트가 펼쳐져 그룹 색을 바꿈) + 이름(클릭 시 인라인 텍스트 입력으로 전환, Enter로 저장, Escape로 취소) + 삭제 아이콘(✕).
- 패널 맨 아래: 기존과 동일한 "새 그룹 만들기" 입력행.
- 패널 바깥을 클릭하거나 Escape를 누르면 닫힌다.

```ts
type GroupPickerProps = {
  groups: Group[];
  value: string;
  onChange: (groupId: string) => void;
  onCreateGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;  // 신규
  onRemoveGroup: (id: string) => void;                                          // 신규
};
```

`GroupPicker`는 자산/수입/지출 세 섹션에서 재사용되므로, `onUpdateGroup`/`onRemoveGroup`을 `AssetSimulator.tsx`에서 만들어 `InputPanel.tsx`를 거쳐 세 섹션 모두에 전달한다.

`handleUpdateGroup`은 이름·색상만 바꾸는 단순 갱신이다. `handleRemoveGroup`은 그 그룹을 참조하던 자산·수입·지출 항목의 `groupId`를 전부 `undefined`로 비운다(v1/v2에서 자산 삭제 시 이체 규칙을 정리했던 것과 같은 패턴 — 참조 무결성을 지키되 데이터 자체는 지우지 않는다).

### 차트 반영

지금 `AssetAreaChart`/`ComparisonBarChart`는 그룹 단위로 밴드/구간을 하나씩 그리고, 그룹 없는 자산은 전부 "미분류" 회색 밴드 하나로 뭉쳐서 그린다. 이제 **그룹 소속과 무관하게 자산 하나당 밴드/구간을 하나씩** 그리도록 바꾼다.

- 밴드의 `fill`은 그 자산의 `color`.
- 그룹에 속한 자산은 `stroke`를 소속 그룹의 `color`로 2px 두께로 두른다. 그룹 없는 자산은 stroke 없음.
- 같은 그룹의 자산들은 스택 안에서 서로 인접하게 배치해(정렬 순서: 그룹별로 묶은 뒤 그룹 내부는 자산 추가 순서) 테두리 색으로 같은 그룹임이 시각적으로 드러나게 한다.
- 값 조회: 그룹 집계(`snapshot.groupTotals[groupId]`) 대신 자산별 실제 값(`snapshot.assetBalancesKRW[assetId]`)을 그대로 쓴다.

`GroupDonutChart`는 이미 도넛 안에서 자산별로 슬라이스가 나뉘어 있었지만, 색상은 `SLICE_COLORS`라는 별도의 고정 팔레트를 순환해서 썼다. 이제 슬라이스 색을 `asset.color`로 바꿔 목록·다른 차트와 색이 일치하게 한다. 탭 자체(그룹별/미분류)는 지금처럼 유지한다.

`FlowDiagram`은 이번 변경의 영향을 받지 않는다(자산 색이 아니라 수입/자산/지출을 나타내는 고정 색을 쓰고, 이 라운드에서 바꿀 이유가 없다).

## 3. 목표 금액 + 달성 시점 예측

### 데이터

```ts
export type GoalMetric =
  | { type: "total" }
  | { type: "asset"; assetId: string }
  | { type: "group"; groupId: string };

export type Goal = {
  metric: GoalMetric;
  targetAmount: number;
};
```

`AssetSimulator.tsx`에 `goal: Goal | null` 상태를 추가한다(단일 목표만 지원, 목표가 없으면 `null`). 대상 자산·그룹이 나중에 삭제되면 목표도 함께 초기화한다(`handleRemoveAssetClass`/`handleRemoveGroup`에서 `goal?.metric`이 삭제되는 대상을 가리키면 `goal`을 `null`로 되돌린다).

### 계산

`simulation.ts`에 추가한다.

```ts
export const GOAL_SEARCH_CAP_MONTHS = 6000; // 500년

function goalMetricValue(goal: Goal, snapshot: MonthSnapshot): number {
  if (goal.metric.type === "total") return snapshot.totalBalance;
  if (goal.metric.type === "asset") {
    return snapshot.assetBalancesKRW[goal.metric.assetId] ?? 0;
  }
  return snapshot.groupTotals[goal.metric.groupId] ?? 0;
}

export function findGoalAchievementMonth(
  input: SimulationInput,
  goal: Goal,
  today: Date,
  searchCapMonths: number = GOAL_SEARCH_CAP_MONTHS,
): number | null {
  const snapshots = runSimulation(input, today, searchCapMonths);
  const found = snapshots.find(
    (s) => goalMetricValue(goal, s) >= goal.targetAmount,
  );
  return found ? found.monthIndex : null;
}
```

`runSimulation`을 그대로 재사용해 500년치 스냅샷을 만들고 첫 달성 월을 찾는다(엔진 로직 중복 없음). 500개월 안팎의 순수 산술 반복이라 성능 부담은 무시할 수준이다. 이 계산은 1번 항목에서 사용자가 고른 프리셋 범위(예: 10년)와 무관하게 항상 실제 달성 시점을 찾는다 — 슬라이더·차트는 프리셋 범위까지만 보여주지만, 목표 예측 문구는 그보다 훨씬 먼 시점(예: "23년 후")도 표시할 수 있다.

`monthIndex === 0`으로 찾아지면(이미 목표를 달성한 상태) "이미 달성했습니다"로 표시한다. `searchCapMonths` 안에서 못 찾으면 `null`을 반환하고 "500년 내 달성 불가"로 표시한다.

### UI

새 컴포넌트 `GoalCard.tsx`를 만들어 기존 4개 차트와 같은 그리드에 5번째 카드로 놓는다.

- 지표 선택: "총자산" / "특정 자산" / "특정 그룹" 셀렉트. 후자 둘을 고르면 두 번째 셀렉트가 나타나 대상 자산/그룹을 고른다.
- 목표 금액 입력.
- 결과 표시:
  - 달성 가능: `"약 {formatMonthsFromNow(달성월)} ({목표월의 연-월}) 달성 예상"`
  - 이미 달성: `"이미 달성했습니다"`
  - 500년 내 불가: `"500년 내 달성 불가"`
- 진행률: 현재 선택된 슬라이더 시점의 지표 값 / 목표 금액 (%, 100% 초과 가능). 진행 바 형태로 시각화.
- 목표가 설정되지 않았으면(`goal === null`) 입력 폼만 보이고 결과 영역은 비어 있다.

## 엣지 케이스

- 목표 대상 자산/그룹이 삭제되면 목표를 초기화한다(위 데이터 섹션 참고).
- 목표 금액이 0 이하면 입력을 막는다(기존 금액 입력 폼들과 동일한 검증 패턴).
- 자산이 하나도 없는 상태에서 "총자산" 목표를 설정하면 `totalBalance`가 항상 0이라 목표액이 0보다 크면 영원히 달성 불가로 뜬다 — 별도 처리 없이 계산 결과를 그대로 보여준다(자연스러운 동작).
- 그룹 삭제 시 그 그룹에 속했던 자산들은 `groupId`가 비워지고 색상은 유지된다(색상은 자산 고유 속성이라 그룹과 무관).
- 프리셋 범위를 줄였을 때(예: 30년 → 5년) 이미 5년보다 뒤 시점에 스케줄된 수입/지출/이체 항목이 있으면, 그 항목들은 시뮬레이션에서 더 이상 반영되지 않는다(범위 밖이므로) — 데이터 자체는 삭제되지 않고, 범위를 다시 늘리면 다시 반영된다.

## 범위 밖 (Non-goals, 이번 라운드)

- 사이드바 2단 분할, 명칭 변경(자산군→자산 유형), 기본값 채우기, 새로고침 경고, 아이콘 활용 — 4라운드에서 다룬다.
- 누적 이력 패널, 시나리오 비교 UI — 3라운드에서 다룬다.
- 여러 개의 목표를 동시에 설정하는 기능은 이번 라운드에 넣지 않는다(단일 목표만).
- `FlowDiagram`의 색상 체계는 이번 라운드에서 바꾸지 않는다.
- 자유 색상 선택(컬러피커)은 넣지 않는다 — 지정된 팔레트에서만 고른다.
