# 자산 이자 지급 주기 + 수입/지출/이체 금액 변동 설계

## 배경

자산 시뮬레이터의 자산군은 `annualReturnRate`(연 이율)를 매달 균등 분할해 복리로 반영한다(`balances *= 1 + rate/100/12`, 매달). 이 방식은 실제로 매달 조금씩 늘어나는 투자 자산에는 맞지만, 예/적금처럼 만기·지급일에 한 번에 이자가 붙는 자산이나, 연봉 인상처럼 특정 시점에 계단식으로 오르는 수입에는 맞지 않는다.

이 스펙은 두 가지를 추가한다:
1. **자산의 이자 지급 주기** — 매월 복리 대신 매년 특정 월에 한 번에 지급되는 방식도 선택 가능하게 한다.
2. **수입/지출/이체(고정액)의 금액 변동** — 이율 개념이 아니라, 기간 지정 또는 정기 반복으로 금액이 오르내리는 것을 표현할 수 있게 한다. 정기 반복은 인상분이 계속 유지되는 경우(연봉 인상)와 그 시점에만 반짝 적용되고 사라지는 경우(보너스)를 모두 지원한다.

기존 시나리오 데이터는 새 필드가 없으므로, 파싱 시 안전한 기본값으로 채워 하위호환을 보장한다.

## 1. 자산 — 이자 지급 주기

### 데이터 모델

```ts
export type InterestCycle =
  | { mode: "monthly" }
  | { mode: "yearly"; month: number }; // 1-12
```

`AssetClass`/`NewAssetClassInput`에 `interestCycle: InterestCycle` 추가. 기본값 `{ mode: "monthly" }` — 기존 시나리오는 파싱 시 이 필드가 없으면 이 기본값으로 채워, 기존 계산 결과가 그대로 유지된다.

### 시뮬레이션 로직 (`simulation.ts`)

현재:
```ts
for (const asset of assetClasses) {
  const monthlyRate = asset.annualReturnRate / 100 / 12;
  balances[asset.id] *= 1 + monthlyRate;
}
```

변경 후:
```ts
for (const asset of assetClasses) {
  const cycle = asset.interestCycle;
  if (cycle.mode === "monthly") {
    const monthlyRate = asset.annualReturnRate / 100 / 12;
    balances[asset.id] *= 1 + monthlyRate;
  } else {
    const simulatedMonth = ((today.getMonth() + month) % 12) + 1; // 1-12
    if (simulatedMonth === cycle.month) {
      balances[asset.id] *= 1 + asset.annualReturnRate / 100;
    }
    // 그 외의 달은 잔액 변화 없음
  }
}
```

`month`는 현재 루프의 시뮬레이션 월 인덱스(0 = 지금), `today`는 시뮬레이션 시작 기준일 — 기존 루프에 이미 존재하는 변수를 그대로 사용한다.

### UI (`GroupAssetSection.tsx`)

자산 추가/수정 폼의 "연 이율(%)" 입력 옆에 "이자 지급 주기" 선택 추가:
- 매월(기본, 라디오/세그먼트 버튼)
- 매년 — 선택 시 월 선택 드롭다운(1~12월) 노출

## 2. 수입/지출/이체(고정액) — 금액 변동

### 데이터 모델

```ts
export type AmountAdjustment =
  | {
      kind: "period";
      id: string;
      fromDate: string;    // "YYYY-MM"
      toDate?: string;     // "YYYY-MM", 비우면 이후 계속(영구 변경)
      type: "percent" | "amount";
      direction: "increase" | "decrease";
      value: number;
    }
  | {
      kind: "recurring";
      id: string;
      startDate: string;   // "YYYY-MM"
      frequency: "monthly" | "yearly";
      until: RepeatUntil;  // 무기한/날짜까지/횟수까지 — 기존 RepeatSchedule과 동일 타입 재사용
      type: "percent" | "amount";
      direction: "increase" | "decrease";
      value: number;
      persist: boolean;    // true: 누적되어 계속 유지(연봉 인상) / false: 발생한 달에만 적용, 다음 달엔 원복(보너스)
    };
```

`IncomeItem`/`ExpenseItem`/`TransferRule`에 `adjustments: AmountAdjustment[]` 추가(기본값 `[]`). `NewIncomeItemInput`/`NewExpenseItemInput`/`NewTransferRuleInput`도 동일하게 확장.

**적용 대상 제한**:
- `TransferRule`은 `mode === "fixed"`인 경우에만 `adjustments`가 의미를 가진다(`percentOfSource`는 원본 잔액에 비례해 이미 자연스럽게 변하므로 대상 아님). UI에서도 `fixed` 모드일 때만 입력 가능.
- 반복(`schedule.mode === "recurring"`) 항목에만 적용. 일시성(`mode: "once"`) 항목은 구간 개념이 무의미하므로 `adjustments` UI를 노출하지 않는다.

### 계산 로직 (`simulation.ts`)

새 헬퍼 `effectiveAmount(baseAmount, adjustments, month, today)`가 특정 월의 최종 금액을 계산한다.

**period 적용 여부**: `fromDate <= 해당월 <= (toDate ?? 무한)` 이면 그 달에 적용.

**recurring 적용 여부/횟수**:
- `occurrences(startDate, frequency, until, month, today)` — `fires()`와 같은 방식으로 `startDate`부터 몇 번째 반복인지 계산하되, "해당 월까지 총 몇 번 반복이 일어났는가"를 센다(기존 `fires()`는 "정확히 이 달에 발생하는가"만 반환하므로 새로 작성).
- `persist: true`: 계산된 총 반복 횟수만큼 델타를 누적 적용(퍼센트면 복리 곱셈 반복, 금액이면 반복 횟수만큼 합산).
- `persist: false`: 반복이 **정확히 이 달에** 발생하는 경우에만 델타를 1회 적용(다음 달 계산엔 영향 없음 — 매달 `effectiveAmount`를 base부터 새로 계산하므로 자동으로 원복됨).

**적용 순서**: 해당 월에 적용 가능한 모든 조정(개별 period, 그리고 recurring이 이 시점까지 누적한 값 또는 이 달의 1회성 값)을 **시작일(`fromDate`/`startDate`) 오름차순**으로 정렬해 `baseAmount`에 순서대로 반영한다. 퍼센트만 연속될 경우 곱셈은 순서와 무관하게 같은 결과를 내지만, 퍼센트와 금액이 섞이면 순서에 따라 결과가 달라지므로 이 규칙으로 고정한다.

```ts
function effectiveAmount(
  baseAmount: number,
  adjustments: AmountAdjustment[],
  month: number,
  today: Date,
): number {
  const steps: { sortKey: number; type: "percent" | "amount"; direction: "increase" | "decrease"; value: number }[] = [];

  for (const adj of adjustments) {
    if (adj.kind === "period") {
      const from = monthIndexFromTargetDate(adj.fromDate, today);
      const to = adj.toDate ? monthIndexFromTargetDate(adj.toDate, today) : Infinity;
      if (month >= from && month <= to) {
        steps.push({ sortKey: from, type: adj.type, direction: adj.direction, value: adj.value });
      }
    } else {
      const start = monthIndexFromTargetDate(adj.startDate, today);
      const count = occurrences(adj.startDate, adj.frequency, adj.until, month, today);
      if (adj.persist) {
        for (let i = 0; i < count; i++) {
          steps.push({ sortKey: start, type: adj.type, direction: adj.direction, value: adj.value });
        }
      } else if (count > 0 && firesExactlyThisMonth(adj, month, today)) {
        steps.push({ sortKey: start, type: adj.type, direction: adj.direction, value: adj.value });
      }
    }
  }

  steps.sort((a, b) => a.sortKey - b.sortKey);

  let amount = baseAmount;
  for (const step of steps) {
    const sign = step.direction === "increase" ? 1 : -1;
    amount = step.type === "percent" ? amount * (1 + (sign * step.value) / 100) : amount + sign * step.value;
  }
  return amount;
}
```

(`occurrences`/`firesExactlyThisMonth`은 실제 구현 시 `fires()` 옆에 함께 정의한다.)

이 `effectiveAmount`는 수입/지출 흐름 계산(`item.amount` 대신 사용), `FlowRatioChart`의 항목별 표시, 목표(Goal) 계산 등 `item.amount`를 직접 참조하던 모든 지점에서 사용한다.

### UI (`IncomeSection.tsx`, `ExpenseSection.tsx`, `TransferRuleSection.tsx`)

항목 수정 폼에 "금액 변동" 섹션 추가, 두 개의 추가 버튼:
- **+ 기간 추가**(period): 시작월, 종료월(선택, 비우면 "계속 유지"), 유형(%/금액), 방향(인상/인하), 값.
- **+ 정기 변동 추가**(recurring): 시작월, 주기(매월/매년), 반복 종료(무기한/날짜까지/횟수까지 — 기존 스케줄 반복 종료 UI 재사용), 유지 여부(계속 유지/그 달만 적용), 유형(%/금액), 방향(인상/인하), 값.

각 조정 항목은 리스트로 표시되고 개별 삭제 가능(기존 income/expense 항목 리스트와 동일한 UX 패턴).

`TransferRuleSection`에서는 `mode === "fixed"`일 때만 이 섹션을 노출한다.

## 하위호환

- `parseScenarioJson`(가져오기)과 기존 로컬 저장 시나리오 로드 시: `AssetClass.interestCycle`이 없으면 `{ mode: "monthly" }`로, `IncomeItem`/`ExpenseItem`/`TransferRule.adjustments`가 없으면 `[]`로 채운다.
- 새로 추가하는 자산/수입/지출/이체 항목은 각각 `interestCycle: { mode: "monthly" }`, `adjustments: []`를 기본값으로 생성한다.

## 물가상승률 반영과의 관계

물가상승률(`realValueSnapshot`)은 시뮬레이션이 끝난 **명목 금액을 화면 표시 시점에 할인**하는 것이고, 이 스펙의 이자 지급 주기·금액 변동은 **시뮬레이션 자체가 계산하는 명목 금액**을 바꾸는 것이다. 서로 독립적으로 동작하며 충돌하지 않는다 — 금액 변동이 반영된 명목 수입/지출/잔액이 먼저 계산되고, 이후 물가상승률 토글이 켜져 있으면 그 결과가 오늘 가치로 할인되어 표시된다.

## 범위 밖(스코프 제외)

- 자산의 이자 지급 주기에 "분기별" 등 매월/매년 외 다른 주기는 추가하지 않는다.
- `percentOfSource` 이체 규칙에는 금액 변동을 적용하지 않는다(이미 원본 잔액에 비례해 자연스럽게 변함).
- 일시성(`mode: "once"`) 수입/지출/이체 항목에는 금액 변동 UI를 제공하지 않는다.
- 금액 변동 구간 간 겹침(overlap)에 대한 별도 검증/경고는 넣지 않는다 — 사용자가 겹치게 구간을 만들면 위에서 정의한 시작일 순서대로 그대로 누적 적용된다.

## 관련 코드
- `apps/services/components/works/6_AssetSimulator/types.ts` — `InterestCycle`, `AmountAdjustment` 타입, `AssetClass`/`IncomeItem`/`ExpenseItem`/`TransferRule` 확장
- `apps/services/components/works/6_AssetSimulator/simulation.ts` — 이자 지급 주기 분기, `effectiveAmount`/`occurrences` 헬퍼, 기존 `fires()` 옆에 추가
- `apps/services/components/works/6_AssetSimulator/input-sections/GroupAssetSection.tsx` — 이자 지급 주기 선택 UI
- `apps/services/components/works/6_AssetSimulator/input-sections/IncomeSection.tsx`, `ExpenseSection.tsx`, `TransferRuleSection.tsx` — 금액 변동(기간/정기) 추가 UI
- `apps/services/components/works/6_AssetSimulator/exportUtils.ts`(`parseScenarioJson`) — 하위호환 기본값 채우기
