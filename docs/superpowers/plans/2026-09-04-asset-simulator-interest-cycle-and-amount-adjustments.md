# 자산 시뮬레이터 이자 지급 주기 + 금액 변동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자산군에 "이자 지급 주기"(매월 복리 / 매년 N월 일시 지급)를 추가하고, 수입·지출·이체(고정액) 항목에 "금액 변동"(기간 지정 % 또는 금액 인상/인하, 정기 반복 인상/인하)을 추가한다.

**Architecture:** `types.ts`에 `InterestCycle`/`AmountAdjustment` 타입을 추가하고 `AssetClass`/`IncomeItem`/`ExpenseItem`/`TransferRule`(및 `New*Input`)을 확장한다. `simulation.ts`의 `fires()` 옆에 `occurrences()`/`effectiveAmount()` 헬퍼를 추가하고, `runSimulation()`의 자산 복리 루프와 수입/지출/이체 금액 사용처를 이 헬퍼를 쓰도록 바꾼다. 입력 폼(`GroupAssetSection`, `IncomeSection`, `ExpenseSection`, `TransferRuleSection`)에 새 필드를 편집하는 UI를 추가하고, `IncomeSection`/`ExpenseSection`/`TransferRuleSection`이 공유하는 `AmountAdjustmentEditor` 컴포넌트를 새로 만든다. `FlowRatioChart`(물가상승률 반영 경로)와 `exportUtils.ts`(JSON import 하위호환)도 새 헬퍼/필드를 반영한다.

**Tech Stack:** Next.js 16 + React 19 + TypeScript(strict) + Tailwind v4. 이 앱에는 테스트 러너가 없다(`CLAUDE.md`: "No test suite is configured") — `npm run lint`/`npx tsc --noEmit`(타입 검증)와 `npm run dev:services`로 띄운 개발 서버에서의 수동 시나리오 검증(필요하면 시나리오 JSON 내보내기로 저장된 값을 직접 확인)으로 대체한다.

**Spec:** `docs/superpowers/specs/2026-09-04-asset-simulator-interest-cycle-and-amount-adjustments-design.md`

## Global Constraints

- 자산 이자 지급 주기는 매월/매년 두 가지만 지원한다(분기 등 다른 주기 없음).
- `TransferRule`의 금액 변동은 `mode === "fixed"`일 때만 의미를 가지며, UI도 `fixed` 모드에서만 노출한다. `percentOfSource`는 대상에서 제외한다.
- 금액 변동(`AmountAdjustment`) UI는 `schedule.mode === "recurring"`인 항목에만 노출한다. 일시성(`mode: "once"`) 항목에는 노출하지 않는다.
- 금액 변동 구간 간 겹침(overlap)에 대한 별도 검증/경고는 넣지 않는다 — 겹치면 시작일(`fromDate`/`startDate`) 오름차순으로 그대로 누적 적용된다.
- 기존 시나리오 데이터 하위호환: `AssetClass.interestCycle`이 없으면 `{ mode: "monthly" }`로, `IncomeItem`/`ExpenseItem`/`TransferRule.adjustments`가 없으면 `[]`로 채운다. 이 정규화는 `parseScenarioJson`(JSON 가져오기) 한 곳에서만 필요하다 — 시나리오 상태는 `localStorage`에 저장되지 않고 항상 `seedScenario()`로 새로 시드되므로, 다른 하위호환 경로는 없다.
- 새로 추가하는 자산/수입/지출/이체 항목은 각각 `interestCycle: { mode: "monthly" }`, `adjustments: []`을 기본값으로 생성한다.

---

## Task 1: 타입 확장 + 시드 데이터 갱신

**Files:**
- Modify: `apps/services/components/works/6_AssetSimulator/types.ts:16-25` (`AssetClass`), `types.ts:27-39`(근처에 새 타입 추가), `types.ts:41-66`(`IncomeItem`/`ExpenseItem`/`TransferRule`), `types.ts:136-165`(`New*Input`)
- Modify: `apps/services/components/works/6_AssetSimulator/AssetSimulator.tsx:110-314` (`emptyScenario`, `seedScenario`)

**Interfaces:**
- Produces: `InterestCycle`(`{ mode: "monthly" } | { mode: "yearly"; month: number }`), `AmountAdjustment`(discriminated union `kind: "period" | "recurring"`) — 이후 모든 태스크가 이 타입을 import해서 쓴다.
- Produces: `AssetClass.interestCycle: InterestCycle`(필수), `IncomeItem`/`ExpenseItem`/`TransferRule`의 `adjustments: AmountAdjustment[]`(필수) — Task 2~8이 이 필드를 읽고 쓴다.

- [ ] **Step 1: `types.ts`에 `InterestCycle`, `AmountAdjustment` 타입 추가**

`apps/services/components/works/6_AssetSimulator/types.ts`의 `RepeatSchedule` 타입(27-39행) 바로 뒤, `IncomeItem` 타입(41행) 바로 앞에 삽입:

```ts
export type InterestCycle =
  | { mode: "monthly" }
  | { mode: "yearly"; month: number }; // 1-12

export type AmountAdjustment =
  | {
      kind: "period";
      id: string;
      fromDate: string; // "YYYY-MM"
      toDate?: string; // "YYYY-MM", 비우면 이후 계속(영구 변경)
      type: "percent" | "amount";
      direction: "increase" | "decrease";
      value: number;
    }
  | {
      kind: "recurring";
      id: string;
      startDate: string; // "YYYY-MM"
      frequency: "monthly" | "yearly";
      until: RepeatUntil;
      type: "percent" | "amount";
      direction: "increase" | "decrease";
      value: number;
      persist: boolean; // true: 누적 유지(인상) / false: 발생한 달만 적용(보너스)
    };
```

- [ ] **Step 2: `AssetClass`/`IncomeItem`/`ExpenseItem`/`TransferRule`에 새 필드 추가**

`types.ts:16-25`의 `AssetClass`를 다음으로 교체:

```ts
export type AssetClass = {
  id: string;
  name: string;
  groupId?: string;
  currency: Currency;
  initialBalance: number;
  annualReturnRate: number;
  interestCycle: InterestCycle;
  isPrimary: boolean;
  color: string;
};
```

`types.ts`의 `IncomeItem`(41-47행)을 다음으로 교체:

```ts
export type IncomeItem = {
  id: string;
  name: string;
  amount: number;
  categoryId?: string;
  schedule: RepeatSchedule;
  adjustments: AmountAdjustment[];
};
```

`ExpenseItem`(49-55행)을 다음으로 교체:

```ts
export type ExpenseItem = {
  id: string;
  name: string;
  amount: number;
  categoryId?: string;
  schedule: RepeatSchedule;
  adjustments: AmountAdjustment[];
};
```

`TransferRule`(59-66행)을 다음으로 교체:

```ts
export type TransferRule = {
  id: string;
  fromAssetId: string;
  toAssetId: string;
  mode: TransferMode;
  amount: number;
  schedule: RepeatSchedule;
  adjustments: AmountAdjustment[];
};
```

- [ ] **Step 3: `New*Input` 타입에도 동일하게 추가**

`types.ts`의 `NewAssetClassInput`(136-143행)을 다음으로 교체:

```ts
export type NewAssetClassInput = {
  name: string;
  groupId?: string;
  currency: Currency;
  initialBalance: number;
  annualReturnRate: number;
  interestCycle: InterestCycle;
  color: string;
};
```

`NewIncomeItemInput`(145-150행)을 다음으로 교체:

```ts
export type NewIncomeItemInput = {
  name: string;
  amount: number;
  categoryId?: string;
  schedule: RepeatSchedule;
  adjustments: AmountAdjustment[];
};
```

`NewExpenseItemInput`(152-157행)을 다음으로 교체:

```ts
export type NewExpenseItemInput = {
  name: string;
  amount: number;
  categoryId?: string;
  schedule: RepeatSchedule;
  adjustments: AmountAdjustment[];
};
```

`NewTransferRuleInput`(159-165행)을 다음으로 교체:

```ts
export type NewTransferRuleInput = {
  fromAssetId: string;
  toAssetId: string;
  mode: TransferMode;
  amount: number;
  schedule: RepeatSchedule;
  adjustments: AmountAdjustment[];
};
```

- [ ] **Step 4: 타입 체크로 컴파일 에러(=아직 안 고친 리터럴) 확인**

Run: `cd apps/services && npx tsc --noEmit`
Expected: FAIL — `AssetSimulator.tsx`의 `emptyScenario`/`seedScenario` 안 자산/수입/지출/이체 객체 리터럴들이 `interestCycle`/`adjustments`가 없다는 에러를 낸다.

- [ ] **Step 5: `emptyScenario`의 자산 리터럴에 `interestCycle` 추가**

`apps/services/components/works/6_AssetSimulator/AssetSimulator.tsx:120-130`:

```ts
    assetClasses: [
      {
        id: newId(),
        name: "기본 자산",
        currency: "KRW",
        initialBalance: 0,
        annualReturnRate: 0,
        interestCycle: { mode: "monthly" },
        isPrimary: true,
        color: GROUP_PALETTE[0],
      },
    ],
```

- [ ] **Step 6: `seedScenario`의 자산 4개 리터럴에 `interestCycle` 추가**

`AssetSimulator.tsx:170-210`의 `assetClasses` 배열 안 4개 객체 각각에 `annualReturnRate: 0,` 다음 줄로 `interestCycle: { mode: "monthly" },`를 추가한다(파킹통장/청년미래적금/S&P500/삼성전자 4개 모두 동일하게).

예시(첫 번째 항목, 나머지 3개도 같은 자리에 같은 줄 추가):

```ts
      {
        id: primaryId,
        name: "파킹통장",
        currency: "KRW",
        initialBalance: 1_000_000,
        annualReturnRate: 0,
        interestCycle: { mode: "monthly" },
        isPrimary: true,
        color: GROUP_PALETTE[2],
      },
```

- [ ] **Step 7: `seedScenario`의 수입/지출/이체 리터럴에 `adjustments: []` 추가**

`AssetSimulator.tsx:211-308`의 `incomes`(3개), `expenses`(5개), `transferRules`(4개) 배열 안 모든 객체 리터럴에 `schedule: ...,` 다음 줄로 `adjustments: [],`를 추가한다. 예를 들어 첫 번째 income:

```ts
      {
        id: newId(),
        name: "아르바이트 월급",
        amount: 1_100_000,
        schedule: monthlyRecurring(nextMonth),
        adjustments: [],
      },
```

같은 패턴을 나머지 income 2개, expense 5개, transferRule 4개 리터럴 전부에 적용한다.

- [ ] **Step 8: 컴파일 통과 확인**

Run: `cd apps/services && npx tsc --noEmit`
Expected: PASS(에러 없음)

- [ ] **Step 9: Commit**

```bash
git add apps/services/components/works/6_AssetSimulator/types.ts apps/services/components/works/6_AssetSimulator/AssetSimulator.tsx
git commit -m "feat : 자산 이자 지급 주기·수입/지출/이체 금액 변동 타입 추가"
```

---

## Task 2: `AmountAdjustmentEditor` 공유 컴포넌트 생성

**Files:**
- Modify: `apps/services/components/works/6_AssetSimulator/input-sections/ScheduleEditor.tsx:12-21` (상수 export)
- Create: `apps/services/components/works/6_AssetSimulator/input-sections/AmountAdjustmentEditor.tsx`

**Interfaces:**
- Consumes: `AmountAdjustment`(Task 1), `RepeatUntil`, `addMonths`, `newId`, `toMonthInputValue`(모두 `../types`에 이미 존재), `monthIndexFromTargetDate`(`../simulation`에 이미 존재), `CustomSelect`(`../CustomSelect`, props: `{ value, onChange, options, compact?, className? }`, 이미 존재).
- Produces: `AmountAdjustmentEditor` 컴포넌트, props `{ value: AmountAdjustment[]; onChange: (adjustments: AmountAdjustment[]) => void; today: Date }` — Task 4, 5가 `IncomeSection`/`ExpenseSection`/`TransferRuleSection`에서 이 컴포넌트를 사용한다.
- Produces: `ScheduleEditor.tsx`에서 export된 `FREQUENCY_OPTIONS`, `UNTIL_TYPE_OPTIONS` — 이 태스크의 `AmountAdjustmentEditor`가 재사용한다.

- [ ] **Step 1: `ScheduleEditor.tsx`의 옵션 상수를 export**

`apps/services/components/works/6_AssetSimulator/input-sections/ScheduleEditor.tsx:12-21`을 다음으로 교체:

```ts
export const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "매월" },
  { value: "yearly", label: "매년" },
];

export const UNTIL_TYPE_OPTIONS = [
  { value: "indefinite", label: "무기한" },
  { value: "date", label: "특정 날짜까지" },
  { value: "count", label: "횟수" },
];
```

(변경 내용은 두 상수 선언 앞에 `export` 키워드를 붙이는 것뿐 — 나머지 파일은 그대로 둔다.)

- [ ] **Step 2: 타입 체크**

Run: `cd apps/services && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: `AmountAdjustmentEditor.tsx` 생성**

Create `apps/services/components/works/6_AssetSimulator/input-sections/AmountAdjustmentEditor.tsx`:

```tsx
"use client";

import { Plus, X } from "lucide-react";
import {
  AmountAdjustment,
  RepeatUntil,
  addMonths,
  newId,
  toMonthInputValue,
} from "../types";
import { monthIndexFromTargetDate } from "../simulation";
import CustomSelect from "../CustomSelect";
import { FREQUENCY_OPTIONS, UNTIL_TYPE_OPTIONS } from "./ScheduleEditor";

const TYPE_OPTIONS = [
  { value: "percent", label: "%" },
  { value: "amount", label: "금액" },
];

const DIRECTION_OPTIONS = [
  { value: "increase", label: "인상" },
  { value: "decrease", label: "인하" },
];

const PERSIST_OPTIONS = [
  { value: "true", label: "계속 유지" },
  { value: "false", label: "그 달만" },
];

type AmountAdjustmentEditorProps = {
  value: AmountAdjustment[];
  onChange: (adjustments: AmountAdjustment[]) => void;
  today: Date;
};

export default function AmountAdjustmentEditor({
  value,
  onChange,
  today,
}: AmountAdjustmentEditorProps) {
  const nextMonthValue = toMonthInputValue(addMonths(today, 1));
  const preview = (date: string) =>
    `${monthIndexFromTargetDate(date, today)}개월 후`;

  const update = (id: string, patch: Partial<AmountAdjustment>) => {
    onChange(
      value.map((adj) =>
        adj.id === id ? ({ ...adj, ...patch } as AmountAdjustment) : adj,
      ),
    );
  };

  const remove = (id: string) => {
    onChange(value.filter((adj) => adj.id !== id));
  };

  const addPeriod = () => {
    onChange([
      ...value,
      {
        kind: "period",
        id: newId(),
        fromDate: nextMonthValue,
        type: "percent",
        direction: "increase",
        value: 10,
      },
    ]);
  };

  const addRecurring = () => {
    onChange([
      ...value,
      {
        kind: "recurring",
        id: newId(),
        startDate: nextMonthValue,
        frequency: "yearly",
        until: { type: "indefinite" },
        type: "percent",
        direction: "increase",
        value: 5,
        persist: true,
      },
    ]);
  };

  const handleRecurringUntilTypeChange = (
    adj: Extract<AmountAdjustment, { kind: "recurring" }>,
    type: RepeatUntil["type"],
  ) => {
    if (type === "indefinite") {
      update(adj.id, { until: { type: "indefinite" } });
    } else if (type === "count") {
      update(adj.id, { until: { type: "count", count: 1 } });
    } else {
      update(adj.id, { until: { type: "date", date: adj.startDate } });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((adj) => (
            <li
              key={adj.id}
              className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white/80 p-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  {adj.kind === "period" ? "기간" : "정기 변동"}
                </span>
                <button
                  type="button"
                  onClick={() => remove(adj.id)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {adj.kind === "period" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    value={adj.fromDate}
                    onChange={(e) =>
                      update(adj.id, { fromDate: e.target.value })
                    }
                    type="month"
                    min={nextMonthValue}
                    className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                  />
                  <span className="text-[11px] text-gray-400">
                    {preview(adj.fromDate)} ~
                  </span>
                  <input
                    value={adj.toDate ?? ""}
                    onChange={(e) =>
                      update(adj.id, { toDate: e.target.value || undefined })
                    }
                    type="month"
                    min={adj.fromDate}
                    placeholder="계속"
                    className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      value={adj.startDate}
                      onChange={(e) =>
                        update(adj.id, { startDate: e.target.value })
                      }
                      type="month"
                      min={nextMonthValue}
                      className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                    />
                    <span className="text-[11px] text-gray-400">
                      {preview(adj.startDate)}
                    </span>
                    <CustomSelect
                      value={adj.frequency}
                      onChange={(v) =>
                        update(adj.id, {
                          frequency: v as "monthly" | "yearly",
                        })
                      }
                      options={FREQUENCY_OPTIONS}
                      compact
                      className="w-20 shrink-0"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CustomSelect
                      value={adj.until.type}
                      onChange={(v) =>
                        handleRecurringUntilTypeChange(
                          adj,
                          v as RepeatUntil["type"],
                        )
                      }
                      options={UNTIL_TYPE_OPTIONS}
                      compact
                      className="w-28 shrink-0"
                    />
                    {adj.until.type === "date" && (
                      <input
                        value={adj.until.date}
                        onChange={(e) =>
                          update(adj.id, {
                            until: { type: "date", date: e.target.value },
                          })
                        }
                        type="month"
                        min={adj.startDate}
                        className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                      />
                    )}
                    {adj.until.type === "count" && (
                      <input
                        value={adj.until.count}
                        onChange={(e) =>
                          update(adj.id, {
                            until: {
                              type: "count",
                              count: Math.max(1, Number(e.target.value) || 1),
                            },
                          })
                        }
                        type="number"
                        min={1}
                        className="w-16 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                      />
                    )}
                    <CustomSelect
                      value={String(adj.persist)}
                      onChange={(v) => update(adj.id, { persist: v === "true" })}
                      options={PERSIST_OPTIONS}
                      compact
                      className="w-24 shrink-0"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                <CustomSelect
                  value={adj.type}
                  onChange={(v) =>
                    update(adj.id, { type: v as "percent" | "amount" })
                  }
                  options={TYPE_OPTIONS}
                  compact
                  className="w-16 shrink-0"
                />
                <CustomSelect
                  value={adj.direction}
                  onChange={(v) =>
                    update(adj.id, {
                      direction: v as "increase" | "decrease",
                    })
                  }
                  options={DIRECTION_OPTIONS}
                  compact
                  className="w-16 shrink-0"
                />
                <input
                  value={adj.value}
                  onChange={(e) =>
                    update(adj.id, { value: Number(e.target.value) || 0 })
                  }
                  type="number"
                  className="w-20 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addPeriod}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:border-gray-300 hover:bg-gray-50"
        >
          <Plus className="h-3 w-3" /> 기간 추가
        </button>
        <button
          type="button"
          onClick={addRecurring}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500 hover:border-gray-300 hover:bg-gray-50"
        >
          <Plus className="h-3 w-3" /> 정기 변동 추가
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 타입 체크**

Run: `cd apps/services && npx tsc --noEmit`
Expected: PASS — 아직 어디서도 import하지 않으므로 미사용 컴포넌트지만 그 자체로 타입 에러가 없어야 한다.

- [ ] **Step 5: Commit**

```bash
git add apps/services/components/works/6_AssetSimulator/input-sections/ScheduleEditor.tsx apps/services/components/works/6_AssetSimulator/input-sections/AmountAdjustmentEditor.tsx
git commit -m "feat : 금액 변동(기간/정기) 편집 컴포넌트 추가"
```

---

## Task 3: `GroupAssetSection` — 이자 지급 주기 UI

**Files:**
- Modify: `apps/services/components/works/6_AssetSimulator/input-sections/GroupAssetSection.tsx`

**Interfaces:**
- Consumes: `InterestCycle`(Task 1, `../types`), `CustomSelect`(기존).
- Produces: 폼에서 만든 `NewAssetClassInput.interestCycle` — `AssetSimulator.tsx`의 `handleAddAssetClass`/`handleUpdateAssetClass`(732/740행)는 `{ id: newId(), ...input }` / `{ ...a, ...input }` 형태로 이미 `input`을 그대로 스프레드하므로 이 태스크 이후 별도 수정이 필요 없다.

- [ ] **Step 1: import에 `InterestCycle` 추가**

`GroupAssetSection.tsx:5-13`을 다음으로 교체:

```ts
import {
  AssetClass,
  Currency,
  GROUP_PALETTE,
  Group,
  InterestCycle,
  NewAssetClassInput,
  nextVisibleColor,
  usedColors,
} from "../types";
```

- [ ] **Step 2: 이자 지급 주기 옵션 상수 추가**

`GroupAssetSection.tsx:18-21`(`CURRENCY_OPTIONS` 선언부) 바로 뒤에 추가:

```ts
const INTEREST_CYCLE_OPTIONS = [
  { value: "monthly", label: "매월" },
  { value: "yearly", label: "매년" },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월`,
}));
```

- [ ] **Step 3: state 추가**

`GroupAssetSection.tsx:57`(`const [returnRate, setReturnRate] = useState("0");`) 바로 뒤에 추가:

```ts
  const [interestCycleMode, setInterestCycleMode] = useState<
    "monthly" | "yearly"
  >("monthly");
  const [interestCycleMonth, setInterestCycleMonth] = useState("1");
```

- [ ] **Step 4: `resetForm`에 초기화 추가**

`GroupAssetSection.tsx:104-114`의 `resetForm`에서 `setReturnRate("0");` 다음 줄에 추가:

```ts
    setInterestCycleMode("monthly");
    setInterestCycleMonth("1");
```

- [ ] **Step 5: `startEdit`에 값 채우기 추가**

`GroupAssetSection.tsx:116-126`의 `startEdit`에서 `setReturnRate(String(asset.annualReturnRate));` 다음 줄에 추가:

```ts
    setInterestCycleMode(asset.interestCycle.mode);
    setInterestCycleMonth(
      asset.interestCycle.mode === "yearly"
        ? String(asset.interestCycle.month)
        : "1",
    );
```

- [ ] **Step 6: `handleSubmit`에서 `interestCycle` 구성**

`GroupAssetSection.tsx:128-147`의 `handleSubmit`을 다음으로 교체:

```ts
  const handleSubmit = () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    const interestCycle: InterestCycle =
      interestCycleMode === "monthly"
        ? { mode: "monthly" }
        : { mode: "yearly", month: Number(interestCycleMonth) };
    const input: NewAssetClassInput = {
      name: name.trim(),
      groupId: groupId || undefined,
      currency,
      initialBalance: (isLiability ? -1 : 1) * (Number(balance) || 0),
      annualReturnRate: Number(returnRate) || 0,
      interestCycle,
      color,
    };
    if (editingId) {
      onUpdateAssetClass(editingId, input);
    } else {
      onAddAssetClass(input);
    }
    resetForm();
  };
```

- [ ] **Step 7: 폼 JSX에 이자 지급 주기 선택 추가**

`GroupAssetSection.tsx:450-458`(연 이율 `<label>` 블록) 바로 뒤, 제출 버튼 `<div className="flex gap-2">`(459행) 앞에 삽입:

```tsx
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>이자 지급 주기</span>
          <CustomSelect
            value={interestCycleMode}
            onChange={(v) => setInterestCycleMode(v as "monthly" | "yearly")}
            options={INTEREST_CYCLE_OPTIONS}
            borderClassName="border-indigo-200"
            className="w-24 shrink-0"
          />
          {interestCycleMode === "yearly" && (
            <CustomSelect
              value={interestCycleMonth}
              onChange={setInterestCycleMonth}
              options={MONTH_OPTIONS}
              borderClassName="border-indigo-200"
              className="w-20 shrink-0"
            />
          )}
        </div>
```

- [ ] **Step 8: 타입 체크**

Run: `cd apps/services && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 9: 수동 검증**

`npm run dev:services`로 개발 서버를 띄우고 `/asset-simulator` 접속. "현재 자산" 패널에서 자산을 하나 추가하면서 "이자 지급 주기"를 "매년"으로 바꾸고 "12월"을 선택 → 저장. 다시 그 자산을 클릭해 편집 폼을 열었을 때 "매년"/"12월"이 그대로 유지되는지 확인. 우측 상단(또는 시나리오 메뉴)의 "JSON으로 내보내기"로 시나리오를 내려받아, 방금 추가한 자산 객체에 `"interestCycle":{"mode":"yearly","month":12}`가 들어있는지 확인.

- [ ] **Step 10: Commit**

```bash
git add apps/services/components/works/6_AssetSimulator/input-sections/GroupAssetSection.tsx
git commit -m "feat : 자산 폼에 이자 지급 주기 선택 UI 추가"
```

---

## Task 4: `IncomeSection`/`ExpenseSection` — 금액 변동 UI 연결

**Files:**
- Modify: `apps/services/components/works/6_AssetSimulator/input-sections/IncomeSection.tsx`
- Modify: `apps/services/components/works/6_AssetSimulator/input-sections/ExpenseSection.tsx`

**Interfaces:**
- Consumes: `AmountAdjustmentEditor`(Task 2), `AmountAdjustment`(Task 1).
- Produces: 폼에서 만든 `NewIncomeItemInput.adjustments`/`NewExpenseItemInput.adjustments` — `AssetSimulator.tsx`의 `handleAddIncome`/`handleUpdateIncome`/`handleAddExpense`/`handleUpdateExpense`(797-844행)는 이미 `input`을 그대로 스프레드하므로 별도 수정이 필요 없다.

두 파일은 색상 토큰(`indigo`/`rose`)과 문구("수입"/"지출")만 다를 뿐 구조가 동일하다 — 아래 단계를 `IncomeSection.tsx`에 적용한 뒤 `ExpenseSection.tsx`에도 동일하게 반복한다. `IncomeSection.tsx`는 아직 전체를 읽지 않았으므로, `ExpenseSection.tsx`(Step 1의 대응 라인)를 기준으로 동일 패턴을 찾아 적용한다.

- [ ] **Step 1: import에 `AmountAdjustment`/`AmountAdjustmentEditor` 추가**

`IncomeSection.tsx` 상단의 `../types` import에 `AmountAdjustment`를 추가하고, `ScheduleEditor` import 바로 아래에 `AmountAdjustmentEditor` import를 추가한다. `ExpenseSection.tsx:5-16`을 예로 들면 다음으로 교체:

```ts
import {
  Category,
  ExpenseItem,
  NewExpenseItemInput,
  RepeatSchedule,
  AmountAdjustment,
  addMonths,
  toMonthInputValue,
} from "../types";
import { validateSchedule } from "../simulation";
import CategoryPicker from "./CategoryPicker";
import ScheduleEditor from "./ScheduleEditor";
import AmountAdjustmentEditor from "./AmountAdjustmentEditor";
import FloatingFormPanel from "./FloatingFormPanel";
import { useDragReorder } from "./useDragReorder";
```

`IncomeSection.tsx`에서도 동일하게 `../types` import에 `AmountAdjustment` 추가, `ScheduleEditor` import 아래에 `AmountAdjustmentEditor` import 추가.

- [ ] **Step 2: state 추가**

`ExpenseSection.tsx:74-77`(`schedule`/`error` state) 바로 뒤에 추가:

```ts
  const [adjustments, setAdjustments] = useState<AmountAdjustment[]>([]);
```

`IncomeSection.tsx`에서도 동일한 위치(schedule state 선언 바로 뒤)에 동일한 줄 추가.

- [ ] **Step 3: `resetForm`/`startEdit`에 반영**

`ExpenseSection.tsx:99-106`의 `resetForm`에서 `setSchedule(defaultSchedule(today));` 다음 줄에 추가:

```ts
    setAdjustments([]);
```

`ExpenseSection.tsx:108-116`의 `startEdit`에서 `setSchedule(item.schedule);` 다음 줄에 추가:

```ts
    setAdjustments(item.adjustments);
```

`IncomeSection.tsx`에서도 동일한 두 위치에 동일한 줄 추가.

- [ ] **Step 4: 스케줄이 "일시"로 바뀌면 금액 변동 초기화**

`ExpenseSection.tsx:285`의 `<ScheduleEditor value={schedule} onChange={setSchedule} today={today} />`를 다음으로 교체:

```tsx
        <ScheduleEditor
          value={schedule}
          onChange={(s) => {
            setSchedule(s);
            if (s.mode === "once") setAdjustments([]);
          }}
          today={today}
        />
```

`IncomeSection.tsx`의 동일한 `<ScheduleEditor .../>` 사용처도 같은 패턴으로 교체.

- [ ] **Step 5: `handleSubmit`에 `adjustments` 포함**

`ExpenseSection.tsx:133-138`의 `input` 객체 구성을 다음으로 교체:

```ts
    const input: NewExpenseItemInput = {
      name: name.trim(),
      amount: Number(amount),
      categoryId: categoryId || undefined,
      schedule,
      adjustments,
    };
```

`IncomeSection.tsx`에서도 `NewIncomeItemInput` 객체 구성에 동일하게 `adjustments,` 추가.

- [ ] **Step 6: 폼 JSX에 `AmountAdjustmentEditor` 삽입**

`ExpenseSection.tsx:285`(Step 4에서 교체한 `<ScheduleEditor .../>`) 바로 뒤, `{error && <p ...>}`(286행) 앞에 삽입:

```tsx
        {schedule.mode === "recurring" && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-gray-500">금액 변동</p>
            <AmountAdjustmentEditor
              value={adjustments}
              onChange={setAdjustments}
              today={today}
            />
          </div>
        )}
```

`IncomeSection.tsx`의 폼에서도 `<ScheduleEditor .../>` 바로 뒤, 에러 메시지 표시 앞에 동일하게 삽입.

- [ ] **Step 7: 타입 체크**

Run: `cd apps/services && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: 수동 검증**

개발 서버에서 수입 항목을 하나 추가하면서 스케줄을 "반복"(매월)으로 두고 "금액 변동" 아래 "+ 기간 추가"를 눌러 시작월/종료월/유형(%)/방향(인상)/값(10)을 채운 뒤 저장. 다시 그 항목을 클릭해 편집 폼을 열었을 때 방금 추가한 기간 변동이 그대로 남아있는지 확인. 스케줄을 "일시"로 바꾸면 "금액 변동" 섹션 자체가 사라지는지 확인. 지출 항목에서도 동일하게 확인. JSON 내보내기로 `incomes[].adjustments`에 입력한 값이 정확히 들어있는지 확인.

- [ ] **Step 9: Commit**

```bash
git add apps/services/components/works/6_AssetSimulator/input-sections/IncomeSection.tsx apps/services/components/works/6_AssetSimulator/input-sections/ExpenseSection.tsx
git commit -m "feat : 수입/지출 폼에 금액 변동(기간/정기) 편집 UI 연결"
```

---

## Task 5: `TransferRuleSection` — 금액 변동 UI 연결(고정액 모드 전용)

**Files:**
- Modify: `apps/services/components/works/6_AssetSimulator/input-sections/TransferRuleSection.tsx`

**Interfaces:**
- Consumes: `AmountAdjustmentEditor`(Task 2), `AmountAdjustment`(Task 1).
- Produces: 폼에서 만든 `NewTransferRuleInput.adjustments` — `AssetSimulator.tsx`의 `handleAddTransferRule`/`handleUpdateTransferRule`(847-863행)은 이미 `input`을 그대로 스프레드하므로 별도 수정이 필요 없다.

- [ ] **Step 1: import 추가**

`TransferRuleSection.tsx` 상단의 `../types` import에 `AmountAdjustment`를 추가하고, `ScheduleEditor` import 아래에 `AmountAdjustmentEditor` import를 추가한다(정확한 현재 import 블록은 파일을 열어 그 자리에 추가 — `IncomeSection.tsx`/`ExpenseSection.tsx`와 동일한 import 세트 + `TransferMode`/`NewTransferRuleInput` 기존 import는 그대로 유지).

- [ ] **Step 2: state 추가**

`TransferRuleSection.tsx:70-78`(`mode`/`amount`/`schedule`/`error` state) 바로 뒤에 추가:

```ts
  const [adjustments, setAdjustments] = useState<AmountAdjustment[]>([]);
```

- [ ] **Step 3: `resetForm`/`startEdit`에 반영**

`resetForm`(주변 118-131행 근처)에서 스케줄 초기화 다음 줄에 추가:

```ts
    setAdjustments([]);
```

`startEdit`(120-131행)에서 `setAmount(String(rule.amount));` 다음 줄에 추가:

```ts
    setAdjustments(rule.adjustments);
```

- [ ] **Step 4: 이체 방식/스케줄이 바뀌면 금액 변동 초기화**

`TransferRuleSection.tsx:300-306`의 이체 방식 `<CustomSelect>`를 다음으로 교체:

```tsx
            <CustomSelect
              value={mode}
              onChange={(v) => {
                setMode(v as TransferMode);
                if (v !== "fixed") setAdjustments([]);
              }}
              options={TRANSFER_MODE_OPTIONS}
              borderClassName="border-amber-200"
              className="w-44 shrink-0"
            />
```

`TransferRuleSection.tsx:316-320`의 `<ScheduleEditor .../>`를 다음으로 교체:

```tsx
          <ScheduleEditor
            value={schedule}
            onChange={(s) => {
              setSchedule(s);
              if (s.mode === "once") setAdjustments([]);
            }}
            today={today}
          />
```

- [ ] **Step 5: `handleSubmit`에 `adjustments` 포함**

`TransferRuleSection.tsx:148-154`의 `input` 객체 구성을 다음으로 교체:

```ts
    const input: NewTransferRuleInput = {
      fromAssetId: effectiveFrom,
      toAssetId: effectiveTo,
      mode,
      amount: Number(amount),
      schedule,
      adjustments,
    };
```

- [ ] **Step 6: 폼 JSX에 `AmountAdjustmentEditor` 삽입(고정액 + 반복 스케줄일 때만)**

Step 4에서 교체한 `<ScheduleEditor .../>` 바로 뒤, `{error && <p ...>}`(321행) 앞에 삽입:

```tsx
          {mode === "fixed" && schedule.mode === "recurring" && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-gray-500">금액 변동</p>
              <AmountAdjustmentEditor
                value={adjustments}
                onChange={setAdjustments}
                today={today}
              />
            </div>
          )}
```

- [ ] **Step 7: 타입 체크**

Run: `cd apps/services && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: 수동 검증**

개발 서버에서 이체 규칙을 하나 추가하면서 방식을 "고정액", 스케줄을 "반복"(매월)으로 두면 "금액 변동" 섹션이 보이는지 확인. 방식을 "비율(%)"로 바꾸면 섹션이 사라지고 기존에 입력했던 변동 값도 초기화되는지 확인. "+ 정기 변동 추가"로 시작월/주기(매년)/유지 여부(계속 유지)/유형(금액)/방향(인상)/값을 채운 뒤 저장, 다시 편집 폼을 열어 값이 유지되는지 확인.

- [ ] **Step 9: Commit**

```bash
git add apps/services/components/works/6_AssetSimulator/input-sections/TransferRuleSection.tsx
git commit -m "feat : 이체 규칙(고정액) 폼에 금액 변동 편집 UI 연결"
```

---

## Task 6: `simulation.ts` — 이자 지급 주기 분기 + `occurrences`/`effectiveAmount` 헬퍼 적용

**Files:**
- Modify: `apps/services/components/works/6_AssetSimulator/simulation.ts`

**Interfaces:**
- Consumes: `AmountAdjustment`, `InterestCycle`(Task 1, `./types`), 기존 `fires()`/`monthIndexFromTargetDate()`.
- Produces: `occurrences(startDate, frequency, until, month, today): number`, `effectiveAmount(baseAmount, adjustments, month, today): number` — Task 7(`FlowRatioChart.tsx`)이 `effectiveAmount`를 가져다 쓴다.

이 태스크부터 Task 1~5에서 쌓아온 데이터(이자 지급 주기, 금액 변동)가 실제 시뮬레이션 결과에 반영되기 시작한다.

- [ ] **Step 1: import에 `AmountAdjustment` 추가**

`simulation.ts:1-10`을 다음으로 교체:

```ts
import {
  AmountAdjustment,
  AssetClass,
  Goal,
  GOAL_SEARCH_CAP_MONTHS,
  Group,
  MonthSnapshot,
  RepeatSchedule,
  SimulationInput,
  formatMonthsFromNow,
} from "./types";
```

- [ ] **Step 2: `fires()` 뒤에 `occurrences`/`effectiveAmount` 헬퍼 추가**

`simulation.ts:39`(`fires` 함수의 닫는 `}`) 바로 뒤, `validateSchedule` 함수(41행) 앞에 삽입:

```ts

/** startDate부터 시작해 month(포함)까지 이 반복 일정이 총 몇 번 발생했는지 센다.
 * fires()는 "정확히 이 달에 발생하는가"만 보지만, 이건 "누적 발생 횟수"가
 * 필요한 persist:true 금액 변동에 쓴다. */
export function occurrences(
  startDate: string,
  frequency: "monthly" | "yearly",
  until: RepeatUntil,
  month: number,
  today: Date,
): number {
  const start = monthIndexFromTargetDate(startDate, today);
  if (month < start) return 0;
  const period = frequency === "monthly" ? 1 : 12;
  let count = Math.floor((month - start) / period) + 1;
  if (until.type === "count") {
    count = Math.min(count, until.count);
  }
  if (until.type === "date") {
    const untilMonth = monthIndexFromTargetDate(until.date, today);
    if (untilMonth < start) return 0;
    const untilMaxOccurrence = Math.floor((untilMonth - start) / period) + 1;
    count = Math.min(count, untilMaxOccurrence);
  }
  return Math.max(0, count);
}

/** 기간(period)/정기(recurring) 금액 변동을 시작일 오름차순으로 baseAmount에
 * 순서대로 적용한 최종 금액을 계산한다. */
export function effectiveAmount(
  baseAmount: number,
  adjustments: AmountAdjustment[],
  month: number,
  today: Date,
): number {
  const steps: {
    sortKey: number;
    type: "percent" | "amount";
    direction: "increase" | "decrease";
    value: number;
  }[] = [];

  for (const adj of adjustments) {
    if (adj.kind === "period") {
      const from = monthIndexFromTargetDate(adj.fromDate, today);
      const to = adj.toDate
        ? monthIndexFromTargetDate(adj.toDate, today)
        : Infinity;
      if (month >= from && month <= to) {
        steps.push({
          sortKey: from,
          type: adj.type,
          direction: adj.direction,
          value: adj.value,
        });
      }
    } else {
      const start = monthIndexFromTargetDate(adj.startDate, today);
      const count = occurrences(
        adj.startDate,
        adj.frequency,
        adj.until,
        month,
        today,
      );
      if (adj.persist) {
        for (let i = 0; i < count; i++) {
          steps.push({
            sortKey: start,
            type: adj.type,
            direction: adj.direction,
            value: adj.value,
          });
        }
      } else if (
        count > 0 &&
        fires(
          {
            mode: "recurring",
            startDate: adj.startDate,
            frequency: adj.frequency,
            until: adj.until,
          },
          month,
          today,
        )
      ) {
        steps.push({
          sortKey: start,
          type: adj.type,
          direction: adj.direction,
          value: adj.value,
        });
      }
    }
  }

  steps.sort((a, b) => a.sortKey - b.sortKey);

  let amount = baseAmount;
  for (const step of steps) {
    const sign = step.direction === "increase" ? 1 : -1;
    amount =
      step.type === "percent"
        ? amount * (1 + (sign * step.value) / 100)
        : amount + sign * step.value;
  }
  return amount;
}
```

이 함수는 `RepeatUntil` 타입을 매개변수로 쓰지만 현재 `simulation.ts`는 이를 import하지 않는다 — Step 1에서 교체한 import 블록에 `RepeatUntil`도 추가해야 한다. Step 1의 import 블록을 다음으로 다시 교체한다:

```ts
import {
  AmountAdjustment,
  AssetClass,
  Goal,
  GOAL_SEARCH_CAP_MONTHS,
  Group,
  MonthSnapshot,
  RepeatSchedule,
  RepeatUntil,
  SimulationInput,
  formatMonthsFromNow,
} from "./types";
```

- [ ] **Step 3: 타입 체크**

Run: `cd apps/services && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: `runSimulation`의 수입/지출에 `effectiveAmount` 적용**

`simulation.ts:168-192`(현재 Step 2 삽입으로 줄 번호가 밀렸으므로, `if (primary) {` 블록을 찾아 교체)를 다음으로 교체:

```ts
    if (primary) {
      const incomeIn = input.incomes
        .filter((item) => fires(item.schedule, month, today))
        .reduce(
          (sum, item) =>
            sum + effectiveAmount(item.amount, item.adjustments, month, today),
          0,
        );
      balances[primary.id] += incomeIn;
      flow.incomeIn = incomeIn;

      // 지출도 이체와 마찬가지로, 잔액이 부족하면 마이너스로 밀어붙이는
      // 대신 그 지출 항목만 이번 달에 중단시킨다.
      let expenseOut = 0;
      for (const item of input.expenses) {
        if (!fires(item.schedule, month, today)) continue;
        const amount = effectiveAmount(
          item.amount,
          item.adjustments,
          month,
          today,
        );
        if (balances[primary.id] < amount) {
          flow.failedExpenses.push({
            itemId: item.id,
            name: item.name,
            amount,
          });
          continue;
        }
        balances[primary.id] -= amount;
        expenseOut += amount;
      }
      flow.expenseOut = expenseOut;
    }
```

- [ ] **Step 5: `runSimulation`의 이체(고정액 모드)에 `effectiveAmount` 적용**

`simulation.ts`에서 `const requested =` 로 시작하는 블록(이체 루프 안)을 다음으로 교체:

```ts
      const requested =
        rule.mode === "fixed"
          ? effectiveAmount(rule.amount, rule.adjustments, month, today)
          : sourceBalance * (rule.amount / 100);
```

- [ ] **Step 6: `runSimulation`의 자산 복리 루프에 이자 지급 주기 분기 추가**

`simulation.ts`에서 다음 블록을 찾아:

```ts
    for (const asset of assetClasses) {
      const monthlyRate = asset.annualReturnRate / 100 / 12;
      balances[asset.id] *= 1 + monthlyRate;
    }
```

다음으로 교체:

```ts
    for (const asset of assetClasses) {
      const cycle = asset.interestCycle;
      if (cycle.mode === "monthly") {
        const monthlyRate = asset.annualReturnRate / 100 / 12;
        balances[asset.id] *= 1 + monthlyRate;
      } else {
        const simulatedMonth = ((today.getMonth() + month) % 12) + 1;
        if (simulatedMonth === cycle.month) {
          balances[asset.id] *= 1 + asset.annualReturnRate / 100;
        }
      }
    }
```

- [ ] **Step 7: 타입 체크**

Run: `cd apps/services && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: 수동 검증 — 이자 지급 주기**

개발 서버에서 새 시나리오를 만들고, 기본 자산 외에 자산을 하나 추가한다(초기 잔액 1,000,000원, 연 이율 12%, 이자 지급 주기 "매년" + 지금 달의 다음 달로 월 지정). 시간 슬라이더를 1개월 후로 옮기면 그 자산 잔액이 1,120,000원(=1,000,000×1.12)으로 한 번에 뛰는지 확인하고, 그 다음 달들은 잔액이 그대로 유지되는지 확인. 비교를 위해 다른 자산을 이자 지급 주기 "매월", 연 이율 12%로 추가하고 1개월 후 잔액이 1,010,000원(=1,000,000×(1+0.12/12))인지 확인.

- [ ] **Step 9: 수동 검증 — 금액 변동**

수입 항목을 하나 추가한다(금액 1,000,000원, 매월 반복, 시작 다음 달). "+ 기간 추가"로 시작 2개월 후 ~ 종료 없음, 유형 %, 방향 인상, 값 10을 추가한다. 시간 슬라이더를 1개월 후로 옮기면 "이번 달 수입/지출 구성" 패널에 1,000,000원이 표시되고, 2개월 후로 옮기면 1,100,000원(=1,000,000×1.1)이 표시되는지 확인.

같은 항목에 "+ 정기 변동 추가"로 시작 1개월 후, 주기 매년, 유지 여부 "그 달만", 유형 금액, 방향 인상, 값 200,000을 추가한다. 정확히 1개월 후 시점에서만 1,200,000원(또는 위 % 변동과 합쳐진 값)이 표시되고, 2개월 후에는 그 보너스가 빠진 값으로 돌아가는지 확인(유지 여부를 "계속 유지"로 바꾸면 이후 달에도 200,000원이 계속 더해지는지 함께 확인).

- [ ] **Step 10: Commit**

```bash
git add apps/services/components/works/6_AssetSimulator/simulation.ts
git commit -m "feat : 이자 지급 주기 분기 및 금액 변동 계산을 시뮬레이션 루프에 반영"
```

---

## Task 7: `FlowRatioChart` — 금액 변동을 물가상승률 반영 경로에 적용

**Files:**
- Modify: `apps/services/components/works/6_AssetSimulator/FlowRatioChart.tsx`

**Interfaces:**
- Consumes: `effectiveAmount`(Task 6, `./simulation`).

`FlowRatioChart`는 스냅샷의 `flow` 필드가 아니라 `IncomeItem`/`ExpenseItem` 정의를 직접 읽어 매달 자기 스스로 필터링하므로(Task 6에서 고친 `runSimulation`의 계산 경로와는 별개), 여기서도 `effectiveAmount`를 명시적으로 적용해야 한다.

- [ ] **Step 1: import에 `effectiveAmount` 추가**

`FlowRatioChart.tsx:14`를 다음으로 교체:

```ts
import { fires, effectiveAmount } from "./simulation";
```

- [ ] **Step 2: 수입/지출 목록 구성에 `effectiveAmount` 적용**

`FlowRatioChart.tsx:335-354`를 다음으로 교체:

```ts
  const incomeItems: FlowItem[] = incomes
    .filter((item) => fires(item.schedule, snapshot.monthIndex, today))
    .map((item) => ({
      id: item.id,
      name: item.name,
      categoryId: item.categoryId,
      amount: realAmount(
        effectiveAmount(item.amount, item.adjustments, snapshot.monthIndex, today),
      ),
    }));
  const expenseItems: FlowItem[] = expenses
    .filter(
      (item) =>
        fires(item.schedule, snapshot.monthIndex, today) &&
        !failedExpenseIds.has(item.id),
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      categoryId: item.categoryId,
      amount: realAmount(
        effectiveAmount(item.amount, item.adjustments, snapshot.monthIndex, today),
      ),
    }));
```

- [ ] **Step 3: 타입 체크**

Run: `cd apps/services && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 수동 검증**

Task 6의 Step 9에서 만든 금액 변동이 있는 수입 항목을 그대로 두고, "이번 달 수입/지출 구성" 도넛에서 해당 항목의 금액이 Task 6에서 확인한 값(예: 2개월 후 1,100,000원)과 일치하는지 확인. 물가상승률 반영 토글을 켰을 때도 이 값이 먼저 금액 변동이 적용된 뒤 할인되는지(토글을 켜고 끈 비율이 다른 항목과 동일한 할인율을 보이는지) 확인.

- [ ] **Step 5: Commit**

```bash
git add apps/services/components/works/6_AssetSimulator/FlowRatioChart.tsx
git commit -m "fix : 수입/지출 구성 차트에 금액 변동 반영"
```

---

## Task 8: `exportUtils.ts` — `parseScenarioJson` 하위호환 기본값 채우기

**Files:**
- Modify: `apps/services/components/works/6_AssetSimulator/exportUtils.ts`

**Interfaces:**
- Consumes: `Scenario`, `AssetClass`, `IncomeItem`, `ExpenseItem`, `TransferRule`(모두 기존 `./types` export).

- [ ] **Step 1: `parseScenarioJson`에 정규화 로직 추가**

`exportUtils.ts:1`의 import와 `exportUtils.ts:32-51`의 `parseScenarioJson` 함수만 교체한다(파일의 다른 함수 — `todayStamp`/`downloadTextFile`/`exportScenarioJson`/`csvCell`/`exportSnapshotsCsv` — 는 그대로 유지).

`exportUtils.ts:1`을 다음으로 교체:

```ts
import {
  AssetClass,
  ExpenseItem,
  IncomeItem,
  MonthSnapshot,
  Scenario,
  TransferRule,
  newId,
} from "./types";
```

`exportUtils.ts:32-51`(`parseScenarioJson` 함수 전체, 위의 doc-comment 포함)을 다음으로 교체:

```ts
/** 이 필드들이 추가되기 전에 내보낸 시나리오 JSON을 가져올 때, 없는
 * 필드를 기본값으로 채운다. 시나리오 상태는 localStorage에 저장되지
 * 않고 항상 seedScenario()로 새로 시드되므로, 하위호환이 필요한 건
 * 이 JSON import 경로 하나뿐이다. */
export function parseScenarioJson(text: string): Scenario | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("name" in parsed) ||
    !("assetClasses" in parsed) ||
    !Array.isArray((parsed as Scenario).assetClasses)
  ) {
    return null;
  }
  const scenario = parsed as Scenario;
  const normalizeAsset = (a: AssetClass): AssetClass => ({
    interestCycle: { mode: "monthly" },
    ...a,
  });
  const normalizeAdjustments = <T extends { adjustments: unknown[] }>(
    item: T,
  ): T => ({ adjustments: [], ...item });
  return {
    ...scenario,
    id: newId(),
    assetClasses: scenario.assetClasses.map(normalizeAsset),
    incomes: (scenario.incomes ?? []).map((i: IncomeItem) =>
      normalizeAdjustments(i),
    ),
    expenses: (scenario.expenses ?? []).map((e: ExpenseItem) =>
      normalizeAdjustments(e),
    ),
    transferRules: (scenario.transferRules ?? []).map((t: TransferRule) =>
      normalizeAdjustments(t),
    ),
  };
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd apps/services && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 수동 검증 — 하위호환**

이번 세션 이전에 내보낸(또는 이 태스크 이전 코드로 내보낸) `interestCycle`/`adjustments`가 없는 시나리오 JSON 파일을 하나 준비한다(없다면 Task 1 이전 상태를 흉내내어, 방금 내보낸 JSON 파일을 텍스트 편집기로 열어 `"interestCycle":{...}` 부분과 모든 `"adjustments":[]` 부분을 수동으로 지운 사본을 만든다). 개발 서버의 "JSON 가져오기"로 이 파일을 불러왔을 때 에러 없이 시나리오가 로드되고, 자산 편집 폼을 열면 이자 지급 주기가 "매월"로, 수입/지출/이체 편집 폼을 열면 금액 변동이 비어 있는 상태로 나오는지 확인.

- [ ] **Step 4: Commit**

```bash
git add apps/services/components/works/6_AssetSimulator/exportUtils.ts
git commit -m "fix : 시나리오 JSON 가져오기 시 이자 지급 주기·금액 변동 하위호환 기본값 채우기"
```

---

## Self-Review 결과

**스펙 커버리지:**
- 자산 이자 지급 주기 타입/시뮬레이션 분기/UI → Task 1, 6, 3.
- 수입/지출/이체(고정액) 금액 변동 타입/계산/UI(기간+정기, persist) → Task 1, 6, 2, 4, 5.
- 하위호환(JSON 가져오기 기본값 채우기) → Task 8.
- 물가상승률과의 관계(계산된 명목 금액을 이후 할인) → Task 6에서 `runSimulation`이 명목 금액을 계산하고, Task 7에서 `FlowRatioChart`가 `effectiveAmount` 결과를 `realAmount`로 감싸 순서를 지킨다.
- 범위 제외 사항(분기 주기 없음, `percentOfSource` 제외, `once` UI 미노출, 겹침 검증 없음)은 모두 Global Constraints에 반영하고 각 태스크 구현에서 그대로 따랐다(예: Task 5 Step 6의 `mode === "fixed"` 조건, Task 4/5의 `schedule.mode === "recurring"` 조건).

**플레이스홀더 스캔:** 전 태스크의 코드 블록은 실제 삽입/교체될 코드이며 "TBD"/"similar to Task N" 형태의 생략이 없다. Task 4는 두 파일(Income/Expense)이 구조적으로 동일해 "동일하게 반복"이라 적었지만, 각 단계마다 실제 코드 스니펫을 `ExpenseSection.tsx` 기준으로 완전히 제시했고 어느 줄에 적용하는지도 명시했다 — 두 파일이 진짜로 동일한 구조임은 이 계획을 쓰기 전 두 파일을 모두 읽어 확인했다.

**타입 일관성:** `AmountAdjustment`(Task 1) → `occurrences`/`effectiveAmount`(Task 6) → `AmountAdjustmentEditor`(Task 2) → 각 섹션의 `adjustments` state(Task 4/5) 전부 동일한 타입/필드명(`kind`/`fromDate`/`toDate`/`startDate`/`frequency`/`until`/`type`/`direction`/`value`/`persist`)을 쓴다. `InterestCycle`(Task 1) → `runSimulation`의 `cycle.mode`/`cycle.month`(Task 6) → `GroupAssetSection`의 `interestCycleMode`/`interestCycleMonth`(Task 3) 간 필드명도 일치한다.

---

**Plan complete and saved to `docs/superpowers/plans/2026-09-04-asset-simulator-interest-cycle-and-amount-adjustments.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
