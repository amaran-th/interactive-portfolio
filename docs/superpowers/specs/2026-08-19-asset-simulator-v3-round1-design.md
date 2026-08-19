# 자산 시뮬레이터 v3 1라운드: 캐시플로우 데이터 모델 통합

이 문서는 v1([2026-08-18-asset-simulator-design.md](2026-08-18-asset-simulator-design.md))과 v2([2026-08-18-asset-simulator-v2-design.md](2026-08-18-asset-simulator-v2-design.md))가 전부 구현·리뷰 완료된 뒤 진행하는 v3의 첫 라운드다. v3는 여러 독립적인 서브 기능(데이터 모델 통합, 목표 금액 추적, 분석/비교 UI, 레이아웃 폴리시)으로 나눠 순서대로 브레인스토밍하기로 했고, 이 문서는 그중 가장 기초가 되는 **1라운드: 정기/비정기 캐시플로우 통합**만 다룬다. 나머지 라운드는 이 라운드가 끝난 뒤 별도 스펙으로 진행한다.

## 목표

- "고정"과 "비정기"로 나뉘어 있던 수입·지출 리스트를 각각 하나로 합치고, 반복 방식을 항목별 옵션(무기한 반복 / 특정 날짜까지 반복 / 횟수만큼 반복 / 1회성)으로 설정할 수 있게 한다.
- 이체 규칙에도 같은 반복 옵션을 적용해, 예적금 만기·전세보증금 반환·대출 실행처럼 특정 시점에 한 번 발생하는 자산 이동(1회성 이체)을 자연스럽게 표현한다.
- 지출에도 그룹을 지정할 수 있게 한다(현재는 수입만 그룹 지원).

## 데이터 모델

### RepeatSchedule (신규, 공용 타입)

```ts
export type RepeatUntil =
  | { type: "indefinite" }
  | { type: "date"; date: string }   // "YYYY-MM", 이 달까지 반복(포함)
  | { type: "count"; count: number }; // N회 반복(1 이상)

export type RepeatSchedule =
  | { mode: "once"; date: string }   // "YYYY-MM"
  | {
      mode: "recurring";
      startDate: string;             // "YYYY-MM"
      frequency: "monthly" | "yearly";
      until: RepeatUntil;
    };
```

### IncomeItem / ExpenseItem (FixedIncome·FixedExpense·IrregularCashflow 대체)

```ts
export type IncomeItem = {
  id: string;
  name: string;
  amount: number;
  groupId?: string;
  schedule: RepeatSchedule;
};

export type ExpenseItem = {
  id: string;
  name: string;
  amount: number;
  groupId?: string;   // 신규 — v2까지 지출은 그룹 미지원이었음
  schedule: RepeatSchedule;
};
```

v2의 `FixedIncome`, `FixedExpense`, `IrregularCashflow` 타입과 `NewFixedIncomeInput`/`NewFixedExpenseInput`/`NewIrregularCashflowInput`은 이 두 타입과 그에 대응하는 `NewIncomeItemInput`/`NewExpenseItemInput`으로 완전히 대체된다(제거).

### TransferRule 확장

```ts
export type TransferRule = {
  id: string;
  fromAssetId: string;
  toAssetId: string;
  mode: "fixed" | "percentOfSource";
  amount: number;
  schedule: RepeatSchedule;   // 기존 frequency: "monthly" | "yearly" 필드 대체
};
```

통화 일치 제약(출발·도착 자산군이 같은 통화여야 함)은 스케줄과 무관하게 그대로 유지된다. `percentOfSource` 모드는 1회성 이체에도 그대로 쓸 수 있다(예: "적금 만기 시 잔액의 100%를 현금 계좌로 이체").

### SimulationInput 변경

```ts
export type SimulationInput = {
  groups: Group[];
  assetClasses: AssetClass[];
  incomes: IncomeItem[];       // fixedIncomes + irregularIncomes 대체
  expenses: ExpenseItem[];     // fixedExpenses + irregularExpenses 대체
  transferRules: TransferRule[];
  exchangeRate: number;
};
```

## 계산 엔진

새 공용 판정 함수가 기존의 "고정은 항상 적용 / 비정기는 날짜 일치할 때만 적용" 이원 로직을 대체한다:

```ts
export function fires(schedule: RepeatSchedule, month: number, today: Date): boolean {
  if (schedule.mode === "once") {
    return monthIndexFromTargetDate(schedule.date, today) === month;
  }
  const start = monthIndexFromTargetDate(schedule.startDate, today);
  const period = schedule.frequency === "monthly" ? 1 : 12;
  if (month < start || (month - start) % period !== 0) return false;
  const occurrence = (month - start) / period + 1;
  if (schedule.until.type === "count") return occurrence <= schedule.until.count;
  if (schedule.until.type === "date") {
    return month <= monthIndexFromTargetDate(schedule.until.date, today);
  }
  return true; // indefinite
}
```

매달 시뮬레이션 루프에서:
- `incomeIn = incomes.filter(i => fires(i.schedule, month, today)).reduce(sum amount)`
- `expenseOut = expenses.filter(e => fires(e.schedule, month, today)).reduce(sum amount)`
- 이체 규칙은 `transferRules.filter(r => fires(r.schedule, month, today))`로 이번 달 실행 대상만 골라 기존과 동일하게 처리(퍼센트 모드 잔액 클램프 포함).

나머지 흐름(수입→지출→이체→성장률 적용 순서, KRW 환산, 그룹 집계)은 v2와 동일하게 유지된다.

## 입력 UI

- **수입 카드**: v2의 "고정수입"·"비정기 수입" 두 카드가 "수입" 카드 하나로 합쳐진다. 리스트 각 행은 이름 · 금액 · (있으면) 그룹 배지 · 스케줄 요약(`"매월 · 무기한"`, `"매년 · 24회"`, `"2027-03 · 1회성"` 등)을 보여준다.
- **지출 카드**: 동일한 패턴으로 통합되고, 그룹 선택기(`GroupPicker`)가 신규로 추가된다.
- **이체 규칙 카드**: 기존 매월/매년 select가 스케줄 서브폼으로 교체된다.
- **스케줄 서브폼**(세 카드 공용 패턴): "반복" / "일시" 토글이 맨 위. "일시"를 고르면 날짜 선택기 하나(기존 비정기 항목과 동일한 검증 — 다음 달부터 선택 가능, `HORIZON_MONTHS` 이내). "반복"을 고르면 시작 날짜(다음 달부터 선택 가능, 같은 검증), 주기(매월/매년), 종료 조건(무기한/날짜까지/횟수) 순으로 나타난다. 종료 조건이 "날짜까지"면 시작 날짜보다 이전을 고를 수 없게 막고, "횟수"면 1 이상의 정수만 허용한다.
- 클릭 시 수정, Enter 제출(필수값 미입력 시 포커스 이동) 패턴은 기존과 동일하게 세 폼 모두에 적용된다.

## 엣지 케이스

- "날짜까지" 반복에서 종료 날짜가 시작 날짜보다 이르면 입력을 막고 안내 문구를 보여준다.
- "횟수" 반복에서 1 미만의 값은 막는다(기본값 1).
- 반복 주기가 "매년"이고 시작월이 예를 들어 3월이면, 이후 발동은 15개월 후, 27개월 후... 식으로 항상 시작월 기준 12개월 간격이다(달력상 매년 3월이 아니라 "N개월 경과" 기준 — `HORIZON_MONTHS`가 절대 개월 수 기반이라는 기존 설계와 일관됨).

## 범위 밖 (Non-goals, 이번 라운드)

- 목표 금액·달성 시점 예측, 누적 이력 패널, 시나리오 비교, 사이드바 2단 분할, 명칭 변경(자산군→자산 유형), 기본값 채우기, 새로고침 경고, 아이콘 활용 — 전부 다음 라운드에서 다룬다.
- 스케줄에 "매주"·"매일" 등 월 단위보다 세밀한 주기는 추가하지 않는다(월/년만 지원, 기존 범위 유지).
- 반복 종료 후 같은 항목을 다시 활성화하는 기능은 없다(끝난 반복은 새 항목으로 다시 만들어야 함).
