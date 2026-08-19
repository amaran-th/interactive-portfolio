# 자산 시뮬레이터 v3 1라운드 Implementation Plan (캐시플로우 통합)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v1+v2가 전부 구현된 자산 시뮬레이터에서, 수입·지출의 "고정/비정기" 이원 리스트와 이체 규칙의 "매월/매년" 고정 주기를 하나의 반복 스케줄(무기한/특정 날짜까지/횟수/1회성) 모델로 통합하고, 지출에도 그룹을 지원한다.

**Architecture:** 공용 `RepeatSchedule` 타입과 판정 함수(`fires`)·검증 함수(`validateSchedule`)를 계산 엔진에 추가하고, 수입·지출·이체 규칙 3개 입력 섹션이 새로 만드는 공용 `ScheduleEditor` 컴포넌트를 통해 스케줄을 입력받도록 재작성한다. 차트 컴포넌트(`AssetAreaChart`/`GroupDonutChart`/`FlowDiagram`/`ComparisonBarChart`/`TimelineSlider`)는 `MonthSnapshot`의 집계 필드만 소비하므로 이번 라운드에서 전혀 수정하지 않는다.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-08-19-asset-simulator-v3-round1-design.md`

## Global Constraints

- 저장은 세션 메모리(`useState`)만 — 계속 유지.
- `HORIZON_MONTHS` = 120 고정 — 변경 없음.
- 새 npm 의존성을 추가하지 않는다. 각 태스크 종료 전 `git status --short package.json package-lock.json`으로 확인한다.
- 프로젝트에 테스트 스위트가 없다 — 검증은 `npx tsc --noEmit`(Task 1~6은 해당 태스크가 만든 파일에 `grep`으로 좁혀서, Task 7부터는 전체), `npm run lint`, `npm run dev` 브라우저 확인. 순수 함수(`simulation.ts`)는 저장소 루트에 임시 `tsx` 스크립트를 만들어 `npx --yes tsx`로 실행 후 삭제한다.
- **차트 컴포넌트 5개(`AssetAreaChart.tsx`, `GroupDonutChart.tsx`, `FlowDiagram.tsx`, `ComparisonBarChart.tsx`, `TimelineSlider.tsx`)는 이번 라운드에서 건드리지 않는다** — `MonthSnapshot`의 필드명(`assetBalances`, `assetBalancesKRW`, `groupTotals`, `ungroupedTotalKRW`, `totalBalance`, `flow`)이 전혀 바뀌지 않으므로 그대로 컴파일된다.
- v2의 `FixedIncome`, `FixedExpense`, `IrregularCashflow`, `TransferFrequency`, `NewFixedIncomeInput`, `NewFixedExpenseInput`, `NewIrregularCashflowInput` 타입은 이번 라운드에서 완전히 제거된다 — 어디에서도 이 이름들을 계속 쓰면 안 된다.
- 모든 사용자 노출 문구는 CLAUDE.md의 Writing Guidelines(번역투 금지, 반복 표현 금지, 단정형)를 따른다.

## 현재 코드 상태 (v1+v2, 이미 구현됨)

```
app/(portfolio)/playground/_sections/Works/6_AssetSimulator/
  types.ts, simulation.ts, useSimulation.ts
  AssetSimulator.tsx, InputPanel.tsx
  input-sections/GroupAssetSection.tsx, GroupPicker.tsx, IncomeSection.tsx, ExpenseSection.tsx, TransferRuleSection.tsx
  TimelineSlider.tsx, AssetAreaChart.tsx, GroupDonutChart.tsx, FlowDiagram.tsx, ComparisonBarChart.tsx
```

**컴파일 상태 노트:** v2 때와 동일하게, Task 1~6은 각자 자기 파일 기준으로 정합적이지만 프로젝트 전체는 Task 7(AssetSimulator.tsx 재배선, 컴파일 체크포인트) 전까지 완전히 컴파일되지 않을 수 있다. 각 태스크는 `npx tsc --noEmit 2>&1 | grep <파일명>`으로 자기 파일만 검증한다.

---

### Task 1: 데이터 모델 통합 + 계산 엔진 (RepeatSchedule·fires·validateSchedule)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/types.ts` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation.ts` (전체 교체)

**Interfaces:**
- Produces: `RepeatUntil`, `RepeatSchedule`, `IncomeItem`, `ExpenseItem`(신규 `groupId?` 포함), `NewIncomeItemInput`, `NewExpenseItemInput`, `TransferRule`(schedule로 교체), `NewTransferRuleInput`(schedule로 교체), `SimulationInput`(incomes/expenses로 교체), `fires(schedule, month, today): boolean`, `validateSchedule(schedule, today): string | null` — 이후 모든 태스크가 이 타입·함수를 그대로 가져다 쓴다.
- Consumes: 없음(최하위 레이어)

- [ ] **Step 1: types.ts 전체 교체**

```ts
export type Currency = "KRW" | "USD";

export type Group = {
  id: string;
  name: string;
  color: string;
};

export type AssetClass = {
  id: string;
  name: string;
  groupId?: string;
  currency: Currency;
  initialBalance: number;
  annualReturnRate: number;
  isPrimary: boolean;
};

export type RepeatUntil =
  | { type: "indefinite" }
  | { type: "date"; date: string }
  | { type: "count"; count: number };

export type RepeatSchedule =
  | { mode: "once"; date: string }
  | {
      mode: "recurring";
      startDate: string;
      frequency: "monthly" | "yearly";
      until: RepeatUntil;
    };

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
  groupId?: string;
  schedule: RepeatSchedule;
};

export type TransferMode = "fixed" | "percentOfSource";

export type TransferRule = {
  id: string;
  fromAssetId: string;
  toAssetId: string;
  mode: TransferMode;
  amount: number;
  schedule: RepeatSchedule;
};

export type SimulationInput = {
  groups: Group[];
  assetClasses: AssetClass[];
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  transferRules: TransferRule[];
  exchangeRate: number;
};

export type MonthFlow = {
  incomeIn: number;
  expenseOut: number;
  transfers: {
    ruleId: string;
    fromAssetId: string;
    toAssetId: string;
    amount: number;
  }[];
};

export type MonthSnapshot = {
  monthIndex: number;
  assetBalances: Record<string, number>;
  assetBalancesKRW: Record<string, number>;
  groupTotals: Record<string, number>;
  ungroupedTotalKRW: number;
  totalBalance: number;
  flow: MonthFlow;
};

export type NewAssetClassInput = {
  name: string;
  groupId?: string;
  currency: Currency;
  initialBalance: number;
  annualReturnRate: number;
  isPrimary: boolean;
};

export type NewIncomeItemInput = {
  name: string;
  amount: number;
  groupId?: string;
  schedule: RepeatSchedule;
};

export type NewExpenseItemInput = {
  name: string;
  amount: number;
  groupId?: string;
  schedule: RepeatSchedule;
};

export type NewTransferRuleInput = {
  fromAssetId: string;
  toAssetId: string;
  mode: TransferMode;
  amount: number;
  schedule: RepeatSchedule;
};

export const HORIZON_MONTHS = 120;

export const GROUP_PALETTE = [
  "#818cf8",
  "#c084fc",
  "#5eead4",
  "#f9a8d4",
  "#93c5fd",
  "#fcd34d",
  "#a3e635",
  "#fca5a5",
];

export const UNGROUPED_LABEL = "미분류";
export const UNGROUPED_COLOR = "#9ca3af";

export function nextGroupColor(existingCount: number): string {
  return GROUP_PALETTE[existingCount % GROUP_PALETTE.length];
}

export function newId(): string {
  return crypto.randomUUID();
}

export function formatKRW(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 100_000_000) {
    return `${sign}${(abs / 100_000_000).toFixed(1)}억원`;
  }
  if (abs >= 10_000) {
    return `${sign}${Math.round(abs / 10_000).toLocaleString()}만원`;
  }
  return `${sign}${Math.round(abs).toLocaleString()}원`;
}

export function formatMonthsFromNow(months: number): string {
  if (months < 12) {
    return `${months}개월 후`;
  }
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder === 0 ? `${years}년 후` : `${years}년 ${remainder}개월 후`;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function toMonthInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
```

- [ ] **Step 2: simulation.ts 전체 교체**

```ts
import {
  AssetClass,
  Group,
  HORIZON_MONTHS,
  MonthSnapshot,
  RepeatSchedule,
  SimulationInput,
  formatMonthsFromNow,
} from "./types";

export function monthIndexFromTargetDate(
  targetDate: string,
  today: Date,
): number {
  const [year, month] = targetDate.split("-").map(Number);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  return (year - todayYear) * 12 + (month - todayMonth);
}

export function fires(
  schedule: RepeatSchedule,
  month: number,
  today: Date,
): boolean {
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
  return true;
}

export function validateSchedule(
  schedule: RepeatSchedule,
  today: Date,
): string | null {
  const rangeMessage = `1개월 후부터 ${formatMonthsFromNow(HORIZON_MONTHS)} 사이의 날짜만 선택할 수 있습니다.`;

  if (schedule.mode === "once") {
    const m = monthIndexFromTargetDate(schedule.date, today);
    if (!Number.isFinite(m) || m < 1 || m > HORIZON_MONTHS) return rangeMessage;
    return null;
  }

  const start = monthIndexFromTargetDate(schedule.startDate, today);
  if (!Number.isFinite(start) || start < 1 || start > HORIZON_MONTHS) {
    return rangeMessage;
  }

  if (schedule.until.type === "date") {
    const until = monthIndexFromTargetDate(schedule.until.date, today);
    if (!Number.isFinite(until) || until < start) {
      return "종료 날짜는 시작 날짜보다 이후여야 합니다.";
    }
  }
  if (schedule.until.type === "count" && schedule.until.count < 1) {
    return "반복 횟수는 1 이상이어야 합니다.";
  }
  return null;
}

function toKRW(
  asset: AssetClass,
  nativeBalance: number,
  exchangeRate: number,
): number {
  return asset.currency === "USD" ? nativeBalance * exchangeRate : nativeBalance;
}

function computeGroupTotals(
  balancesKRW: Record<string, number>,
  assetClasses: AssetClass[],
  groups: Group[],
): { groupTotals: Record<string, number>; ungroupedTotalKRW: number } {
  const groupTotals: Record<string, number> = {};
  for (const group of groups) {
    groupTotals[group.id] = 0;
  }
  let ungroupedTotalKRW = 0;
  for (const asset of assetClasses) {
    const value = balancesKRW[asset.id] ?? 0;
    if (asset.groupId && groupTotals[asset.groupId] !== undefined) {
      groupTotals[asset.groupId] += value;
    } else {
      ungroupedTotalKRW += value;
    }
  }
  return { groupTotals, ungroupedTotalKRW };
}

function sumBalances(balancesKRW: Record<string, number>): number {
  return Object.values(balancesKRW).reduce((sum, value) => sum + value, 0);
}

function buildSnapshot(
  monthIndex: number,
  balances: Record<string, number>,
  assetClasses: AssetClass[],
  groups: Group[],
  exchangeRate: number,
  flow: MonthSnapshot["flow"],
): MonthSnapshot {
  const assetBalancesKRW: Record<string, number> = {};
  for (const asset of assetClasses) {
    assetBalancesKRW[asset.id] = toKRW(
      asset,
      balances[asset.id] ?? 0,
      exchangeRate,
    );
  }
  const { groupTotals, ungroupedTotalKRW } = computeGroupTotals(
    assetBalancesKRW,
    assetClasses,
    groups,
  );
  return {
    monthIndex,
    assetBalances: { ...balances },
    assetBalancesKRW,
    groupTotals,
    ungroupedTotalKRW,
    totalBalance: sumBalances(assetBalancesKRW),
    flow,
  };
}

export function runSimulation(
  input: SimulationInput,
  today: Date = new Date(),
): MonthSnapshot[] {
  const { groups, assetClasses, transferRules, exchangeRate } = input;
  const primary = assetClasses.find((asset) => asset.isPrimary);

  const balances: Record<string, number> = {};
  for (const asset of assetClasses) {
    balances[asset.id] = asset.initialBalance;
  }

  const snapshots: MonthSnapshot[] = [
    buildSnapshot(0, balances, assetClasses, groups, exchangeRate, {
      incomeIn: 0,
      expenseOut: 0,
      transfers: [],
    }),
  ];

  for (let month = 1; month <= HORIZON_MONTHS; month++) {
    const flow: MonthSnapshot["flow"] = {
      incomeIn: 0,
      expenseOut: 0,
      transfers: [],
    };

    if (primary) {
      const incomeIn = input.incomes
        .filter((item) => fires(item.schedule, month, today))
        .reduce((sum, item) => sum + item.amount, 0);
      balances[primary.id] += incomeIn;
      flow.incomeIn = incomeIn;

      const expenseOut = input.expenses
        .filter((item) => fires(item.schedule, month, today))
        .reduce((sum, item) => sum + item.amount, 0);
      balances[primary.id] -= expenseOut;
      flow.expenseOut = expenseOut;
    }

    for (const rule of transferRules) {
      if (!fires(rule.schedule, month, today)) continue;

      const sourceBalance = balances[rule.fromAssetId] ?? 0;
      const requested =
        rule.mode === "fixed"
          ? rule.amount
          : sourceBalance * (rule.amount / 100);
      const amount = Math.max(0, Math.min(requested, sourceBalance));

      balances[rule.fromAssetId] = sourceBalance - amount;
      balances[rule.toAssetId] = (balances[rule.toAssetId] ?? 0) + amount;
      flow.transfers.push({
        ruleId: rule.id,
        fromAssetId: rule.fromAssetId,
        toAssetId: rule.toAssetId,
        amount,
      });
    }

    for (const asset of assetClasses) {
      const monthlyRate = asset.annualReturnRate / 100 / 12;
      balances[asset.id] *= 1 + monthlyRate;
    }

    snapshots.push(
      buildSnapshot(month, balances, assetClasses, groups, exchangeRate, flow),
    );
  }

  return snapshots;
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "6_AssetSimulator/types.ts\|6_AssetSimulator/simulation.ts"`
Expected: 출력 없음(다른 파일들의 에러는 이 시점에 정상).

- [ ] **Step 4: 임시 스크립트로 스케줄 로직 수동 검증**

저장소 루트에 `verify-schedule.ts`를 만든다:

```ts
import { runSimulation, validateSchedule } from "./app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation";

const today = new Date(2026, 0, 1); // 2026-01

const input = {
  groups: [],
  assetClasses: [
    {
      id: "a1",
      name: "현금",
      currency: "KRW" as const,
      initialBalance: 0,
      annualReturnRate: 0,
      isPrimary: true,
    },
    {
      id: "a2",
      name: "저축",
      currency: "KRW" as const,
      initialBalance: 0,
      annualReturnRate: 0,
      isPrimary: false,
    },
  ],
  incomes: [
    {
      id: "i1",
      name: "월급",
      amount: 300_000,
      schedule: {
        mode: "recurring" as const,
        startDate: "2026-02",
        frequency: "monthly" as const,
        until: { type: "indefinite" as const },
      },
    },
    {
      id: "i2",
      name: "연 보너스",
      amount: 1_000_000,
      schedule: {
        mode: "recurring" as const,
        startDate: "2026-02",
        frequency: "yearly" as const,
        until: { type: "count" as const, count: 2 },
      },
    },
  ],
  expenses: [
    {
      id: "e1",
      name: "가전 교체",
      amount: 500_000,
      schedule: { mode: "once" as const, date: "2026-04" },
    },
  ],
  transferRules: [
    {
      id: "t1",
      fromAssetId: "a1",
      toAssetId: "a2",
      mode: "fixed" as const,
      amount: 200_000,
      schedule: {
        mode: "recurring" as const,
        startDate: "2026-02",
        frequency: "yearly" as const,
        until: { type: "indefinite" as const },
      },
    },
  ],
  exchangeRate: 1350,
};

const snapshots = runSimulation(input, today);

// month1: 월급(300,000) + 연보너스 1회차(1,000,000) = 1,300,000 수입, 이체 200,000 -> 현금 1,100,000 / 저축 200,000
console.log("month1 현금:", snapshots[1].assetBalances.a1, "기대값 1100000");
console.log("month1 저축:", snapshots[1].assetBalances.a2, "기대값 200000");

// month2: 월급만(가전교체는 month3에만, 연보너스는 매년이라 다음은 month13)
console.log("month2 incomeIn:", snapshots[2].flow.incomeIn, "기대값 300000");

// month3: 가전 교체 1회성 지출 발동
console.log("month3 expenseOut:", snapshots[3].flow.expenseOut, "기대값 500000");
console.log("month4 expenseOut:", snapshots[4].flow.expenseOut, "기대값 0(1회성이라 재발동 없음)");

// month13: 연 보너스 2회차 발동, 이체도 2회차 발동
console.log("month13 incomeIn:", snapshots[13].flow.incomeIn, "기대값", 300_000 + 1_000_000);
console.log("month13 transfers.length:", snapshots[13].flow.transfers.length, "기대값 1");

// month25: 연 보너스는 횟수(2) 소진되어 더 이상 발동 안 함, 이체는 무기한이라 계속 발동
console.log("month25 incomeIn:", snapshots[25].flow.incomeIn, "기대값 300000");
console.log("month25 transfers.length:", snapshots[25].flow.transfers.length, "기대값 1");

// validateSchedule 검증
console.log(
  "종료<시작 검증:",
  validateSchedule(
    {
      mode: "recurring",
      startDate: "2026-06",
      frequency: "monthly",
      until: { type: "date", date: "2026-03" },
    },
    today,
  ),
  "기대값: null이 아닌 에러 메시지",
);
console.log(
  "횟수<1 검증:",
  validateSchedule(
    {
      mode: "recurring",
      startDate: "2026-02",
      frequency: "monthly",
      until: { type: "count", count: 0 },
    },
    today,
  ),
  "기대값: null이 아닌 에러 메시지",
);
console.log(
  "정상 스케줄:",
  validateSchedule(
    {
      mode: "recurring",
      startDate: "2026-02",
      frequency: "monthly",
      until: { type: "indefinite" },
    },
    today,
  ),
  "기대값: null",
);
```

Run: `npx --yes tsx verify-schedule.ts`
Expected: 모든 줄의 실제 값이 "기대값"과 일치한다.

- [ ] **Step 5: 임시 스크립트 삭제**

```bash
rm verify-schedule.ts
```

- [ ] **Step 6: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/types.ts" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation.ts"
git commit -m "feat: 정기/비정기 캐시플로우를 반복 스케줄 모델로 통합"
```

---

### Task 2: ScheduleEditor 공용 컴포넌트

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/ScheduleEditor.tsx`

**Interfaces:**
- Consumes: `RepeatSchedule`, `RepeatUntil`, `addMonths`, `toMonthInputValue` (Task 1의 `types.ts`), `monthIndexFromTargetDate` (Task 1의 `simulation.ts`)
- Produces: `ScheduleEditorProps`(`value: RepeatSchedule`, `onChange: (schedule: RepeatSchedule) => void`, `today: Date`) — Task 3·4·5(수입/지출/이체 섹션)가 이 컴포넌트를 그대로 가져다 쓴다.

이 컴포넌트는 "반복/일시" 토글과 그에 따른 조건부 필드(시작일·주기·종료조건 또는 날짜 하나)만 렌더링하는 순수 프레젠테이션 컴포넌트다. 값 검증(`validateSchedule`)은 이 컴포넌트가 아니라 이걸 사용하는 상위 폼이 제출 시점에 호출한다.

- [ ] **Step 1: ScheduleEditor.tsx 작성**

```tsx
"use client";

import {
  RepeatSchedule,
  RepeatUntil,
  addMonths,
  toMonthInputValue,
} from "../types";
import { monthIndexFromTargetDate } from "../simulation";

type ScheduleEditorProps = {
  value: RepeatSchedule;
  onChange: (schedule: RepeatSchedule) => void;
  today: Date;
};

export default function ScheduleEditor({
  value,
  onChange,
  today,
}: ScheduleEditorProps) {
  const nextMonthValue = toMonthInputValue(addMonths(today, 1));
  const preview = (date: string) =>
    `${monthIndexFromTargetDate(date, today)}개월 후`;

  const toggle = (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() =>
          onChange({
            mode: "recurring",
            startDate:
              value.mode === "once" ? value.date : nextMonthValue,
            frequency: "monthly",
            until: { type: "indefinite" },
          })
        }
        className={`rounded-full px-3 py-1 text-xs ${
          value.mode === "recurring"
            ? "bg-gray-700 text-white"
            : "bg-white/80 text-gray-500"
        }`}
      >
        반복
      </button>
      <button
        type="button"
        onClick={() =>
          onChange({
            mode: "once",
            date: value.mode === "recurring" ? value.startDate : nextMonthValue,
          })
        }
        className={`rounded-full px-3 py-1 text-xs ${
          value.mode === "once"
            ? "bg-gray-700 text-white"
            : "bg-white/80 text-gray-500"
        }`}
      >
        일시
      </button>
    </div>
  );

  if (value.mode === "once") {
    return (
      <div className="flex flex-col gap-2">
        {toggle}
        <div className="flex items-center gap-2">
          <input
            value={value.date}
            onChange={(e) => onChange({ mode: "once", date: e.target.value })}
            type="month"
            min={nextMonthValue}
            className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
          />
          <span className="text-xs text-gray-500">{preview(value.date)}</span>
        </div>
      </div>
    );
  }

  const handleUntilTypeChange = (type: RepeatUntil["type"]) => {
    if (type === "indefinite") {
      onChange({ ...value, until: { type: "indefinite" } });
    } else if (type === "count") {
      onChange({ ...value, until: { type: "count", count: 1 } });
    } else {
      onChange({ ...value, until: { type: "date", date: value.startDate } });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {toggle}
      <div className="flex items-center gap-2">
        <input
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
          type="month"
          min={nextMonthValue}
          className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
        />
        <span className="text-xs text-gray-500">
          시작 {preview(value.startDate)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={value.frequency}
          onChange={(e) =>
            onChange({
              ...value,
              frequency: e.target.value as "monthly" | "yearly",
            })
          }
          className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
        >
          <option value="monthly">매월</option>
          <option value="yearly">매년</option>
        </select>
        <select
          value={value.until.type}
          onChange={(e) =>
            handleUntilTypeChange(e.target.value as RepeatUntil["type"])
          }
          className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
        >
          <option value="indefinite">무기한</option>
          <option value="date">특정 날짜까지</option>
          <option value="count">횟수</option>
        </select>
      </div>
      {value.until.type === "date" && (
        <div className="flex items-center gap-2">
          <input
            value={value.until.date}
            onChange={(e) =>
              onChange({
                ...value,
                until: { type: "date", date: e.target.value },
              })
            }
            type="month"
            min={value.startDate}
            className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
          />
          <span className="text-xs text-gray-500">
            종료 {preview(value.until.date)}
          </span>
        </div>
      )}
      {value.until.type === "count" && (
        <input
          value={value.until.count}
          onChange={(e) =>
            onChange({
              ...value,
              until: {
                type: "count",
                count: Math.max(1, Number(e.target.value) || 1),
              },
            })
          }
          type="number"
          min={1}
          placeholder="반복 횟수"
          className="w-24 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "ScheduleEditor.tsx"`
Expected: 출력 없음.

- [ ] **Step 3: 수동 확인 (임시 하네스)**

이 컴포넌트는 아직 어디에도 연결되지 않았으므로, 커밋하지 않는 임시 라우트(예: `app/scratch-schedule-verify/page.tsx`)에서 `useState<RepeatSchedule>`로 값을 들고 `<ScheduleEditor value={schedule} onChange={setSchedule} today={new Date()} />`를 렌더링해 확인한다: "일시" 선택 시 날짜 하나만 보이는지, "반복" 선택 시 시작일·주기·종료조건이 나타나는지, 종료조건을 "특정 날짜까지"로 바꾸면 날짜 선택기가, "횟수"로 바꾸면 숫자 입력이 나타나는지, "N개월 후" 미리보기가 날짜를 바꿀 때마다 갱신되는지 확인한다. 확인 후 임시 라우트를 삭제하고 `git status`로 흔적이 없는지 확인한다.

- [ ] **Step 4: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/ScheduleEditor.tsx"
git commit -m "feat: 반복/일시 스케줄 입력 공용 컴포넌트 추가"
```

---

### Task 3: 수입 섹션 재작성 (리스트 통합)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx` (전체 교체)

**Interfaces:**
- Consumes: `Group`, `IncomeItem`, `NewIncomeItemInput`, `RepeatSchedule`, `addMonths`, `toMonthInputValue` (Task 1), `validateSchedule` (Task 1), `GroupPicker`(기존), `ScheduleEditor` (Task 2)
- Produces: `IncomeSectionProps`(`groups`, `onAddGroup`, `incomes`, `onAddIncome`, `onUpdateIncome`, `onRemoveIncome`, `today`) — Task 6(InputPanel)·7(AssetSimulator)이 이 시그니처로 배선한다.

"고정수입"·"비정기 수입" 두 카드가 "수입" 카드 하나(리스트 하나 + 폼 하나)로 합쳐진다.

- [ ] **Step 1: IncomeSection.tsx 전체 교체**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  Group,
  IncomeItem,
  NewIncomeItemInput,
  RepeatSchedule,
  addMonths,
  toMonthInputValue,
} from "../types";
import { validateSchedule } from "../simulation";
import GroupPicker from "./GroupPicker";
import ScheduleEditor from "./ScheduleEditor";

type IncomeSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  incomes: IncomeItem[];
  onAddIncome: (input: NewIncomeItemInput) => void;
  onUpdateIncome: (id: string, input: NewIncomeItemInput) => void;
  onRemoveIncome: (id: string) => void;
  today: Date;
};

function defaultSchedule(today: Date): RepeatSchedule {
  return {
    mode: "recurring",
    startDate: toMonthInputValue(addMonths(today, 1)),
    frequency: "monthly",
    until: { type: "indefinite" },
  };
}

function scheduleSummary(schedule: RepeatSchedule): string {
  if (schedule.mode === "once") return `${schedule.date} · 1회성`;
  const freq = schedule.frequency === "monthly" ? "매월" : "매년";
  if (schedule.until.type === "indefinite") return `${freq} · 무기한`;
  if (schedule.until.type === "count")
    return `${freq} · ${schedule.until.count}회`;
  return `${freq} · ${schedule.until.date}까지`;
}

export default function IncomeSection({
  groups,
  onAddGroup,
  incomes,
  onAddIncome,
  onUpdateIncome,
  onRemoveIncome,
  today,
}: IncomeSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [groupId, setGroupId] = useState("");
  const [schedule, setSchedule] = useState<RepeatSchedule>(
    defaultSchedule(today),
  );
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setAmount("");
    setGroupId("");
    setSchedule(defaultSchedule(today));
    setError(null);
  };

  const startEdit = (item: IncomeItem) => {
    setEditingId(item.id);
    setName(item.name);
    setAmount(String(item.amount));
    setGroupId(item.groupId ?? "");
    setSchedule(item.schedule);
    setError(null);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    if (!amount || Number(amount) === 0) {
      amountRef.current?.focus();
      return;
    }
    const scheduleError = validateSchedule(schedule, today);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }
    setError(null);
    const input: NewIncomeItemInput = {
      name: name.trim(),
      amount: Number(amount),
      groupId: groupId || undefined,
      schedule,
    };
    if (editingId) {
      onUpdateIncome(editingId, input);
    } else {
      onAddIncome(input);
    }
    resetForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-emerald-700">수입</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {incomes.map((item) => {
          const group = groups.find((g) => g.id === item.groupId);
          return (
            <li
              key={item.id}
              onClick={() => startEdit(item)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm hover:border-emerald-300"
            >
              <span className="flex items-center gap-2">
                {group && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                {item.name} · {item.amount.toLocaleString()}원 ·{" "}
                {scheduleSummary(item.schedule)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveIncome(item.id);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-col gap-2" onKeyDown={handleKeyDown}>
        <div className="flex gap-2">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 월급, 프리랜서 계약금"
            className="flex-1 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <GroupPicker
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
          />
        </div>
        <input
          ref={amountRef}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="금액"
          className="rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
        />
        <ScheduleEditor value={schedule} onChange={setSchedule} today={today} />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="self-start rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
          >
            {editingId ? "저장" : "추가"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "IncomeSection.tsx"`
Expected: 출력 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx"
git commit -m "feat: 수입 섹션을 고정·비정기 통합 리스트로 재작성"
```

---

### Task 4: 지출 섹션 재작성 (리스트 통합 + 그룹 지원 신규 추가)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx` (전체 교체)

**Interfaces:**
- Consumes: `Group`, `ExpenseItem`, `NewExpenseItemInput`, `RepeatSchedule`, `addMonths`, `toMonthInputValue` (Task 1), `validateSchedule` (Task 1), `GroupPicker`(기존), `ScheduleEditor` (Task 2)
- Produces: `ExpenseSectionProps`(`groups`, `onAddGroup`, `expenses`, `onAddExpense`, `onUpdateExpense`, `onRemoveExpense`, `today`) — Task 6·7이 이 시그니처로 배선한다. v2까지 지출은 `groups`/`onAddGroup` prop이 없었다 — 이번에 신규로 추가된다.

Task 3의 수입 섹션과 거의 동일한 구조이되, 그룹 선택기가 새로 추가된다.

- [ ] **Step 1: ExpenseSection.tsx 전체 교체**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  ExpenseItem,
  Group,
  NewExpenseItemInput,
  RepeatSchedule,
  addMonths,
  toMonthInputValue,
} from "../types";
import { validateSchedule } from "../simulation";
import GroupPicker from "./GroupPicker";
import ScheduleEditor from "./ScheduleEditor";

type ExpenseSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  expenses: ExpenseItem[];
  onAddExpense: (input: NewExpenseItemInput) => void;
  onUpdateExpense: (id: string, input: NewExpenseItemInput) => void;
  onRemoveExpense: (id: string) => void;
  today: Date;
};

function defaultSchedule(today: Date): RepeatSchedule {
  return {
    mode: "recurring",
    startDate: toMonthInputValue(addMonths(today, 1)),
    frequency: "monthly",
    until: { type: "indefinite" },
  };
}

function scheduleSummary(schedule: RepeatSchedule): string {
  if (schedule.mode === "once") return `${schedule.date} · 1회성`;
  const freq = schedule.frequency === "monthly" ? "매월" : "매년";
  if (schedule.until.type === "indefinite") return `${freq} · 무기한`;
  if (schedule.until.type === "count")
    return `${freq} · ${schedule.until.count}회`;
  return `${freq} · ${schedule.until.date}까지`;
}

export default function ExpenseSection({
  groups,
  onAddGroup,
  expenses,
  onAddExpense,
  onUpdateExpense,
  onRemoveExpense,
  today,
}: ExpenseSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [groupId, setGroupId] = useState("");
  const [schedule, setSchedule] = useState<RepeatSchedule>(
    defaultSchedule(today),
  );
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setAmount("");
    setGroupId("");
    setSchedule(defaultSchedule(today));
    setError(null);
  };

  const startEdit = (item: ExpenseItem) => {
    setEditingId(item.id);
    setName(item.name);
    setAmount(String(item.amount));
    setGroupId(item.groupId ?? "");
    setSchedule(item.schedule);
    setError(null);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    if (!amount || Number(amount) === 0) {
      amountRef.current?.focus();
      return;
    }
    const scheduleError = validateSchedule(schedule, today);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }
    setError(null);
    const input: NewExpenseItemInput = {
      name: name.trim(),
      amount: Number(amount),
      groupId: groupId || undefined,
      schedule,
    };
    if (editingId) {
      onUpdateExpense(editingId, input);
    } else {
      onAddExpense(input);
    }
    resetForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-2xl border border-rose-200 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-rose-700">지출</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {expenses.map((item) => {
          const group = groups.find((g) => g.id === item.groupId);
          return (
            <li
              key={item.id}
              onClick={() => startEdit(item)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-rose-100 bg-white/80 px-3 py-2 text-sm hover:border-rose-300"
            >
              <span className="flex items-center gap-2">
                {group && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                {item.name} · {item.amount.toLocaleString()}원 ·{" "}
                {scheduleSummary(item.schedule)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveExpense(item.id);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-col gap-2" onKeyDown={handleKeyDown}>
        <div className="flex gap-2">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 월세, 여행"
            className="flex-1 rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-rose-400"
          />
          <GroupPicker
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
          />
        </div>
        <input
          ref={amountRef}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="금액"
          className="rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-rose-400"
        />
        <ScheduleEditor value={schedule} onChange={setSchedule} today={today} />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="self-start rounded-full bg-rose-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-600"
          >
            {editingId ? "저장" : "추가"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "ExpenseSection.tsx"`
Expected: 출력 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx"
git commit -m "feat: 지출 섹션을 통합 리스트로 재작성하고 그룹 지원 추가"
```

---

### Task 5: 이체 규칙 섹션 재작성 (일시 이체 지원)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/TransferRuleSection.tsx` (전체 교체)

**Interfaces:**
- Consumes: `AssetClass`, `NewTransferRuleInput`, `RepeatSchedule`, `TransferMode`, `TransferRule`, `addMonths`, `toMonthInputValue` (Task 1), `validateSchedule` (Task 1), `ScheduleEditor` (Task 2)
- Produces: `TransferRuleSectionProps`(`assetClasses`, `transferRules`, `onAddTransferRule`, `onUpdateTransferRule`, `onRemoveTransferRule`, `today` — `today`가 신규 추가됨) — Task 6·7이 이 시그니처로 배선한다.

기존 매월/매년 select가 `ScheduleEditor`로 교체되어, 예적금 만기·전세보증금 반환처럼 특정 시점에 한 번 실행되는 이체(`mode: "once"`)도 표현할 수 있게 된다. 통화 일치 필터(출발·도착 자산군이 같은 통화)는 변경 없이 유지된다.

- [ ] **Step 1: TransferRuleSection.tsx 전체 교체**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  AssetClass,
  NewTransferRuleInput,
  RepeatSchedule,
  TransferMode,
  TransferRule,
  addMonths,
  toMonthInputValue,
} from "../types";
import { validateSchedule } from "../simulation";
import ScheduleEditor from "./ScheduleEditor";

type TransferRuleSectionProps = {
  assetClasses: AssetClass[];
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onUpdateTransferRule: (id: string, input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
  today: Date;
};

function defaultSchedule(today: Date): RepeatSchedule {
  return {
    mode: "recurring",
    startDate: toMonthInputValue(addMonths(today, 1)),
    frequency: "monthly",
    until: { type: "indefinite" },
  };
}

function scheduleSummary(schedule: RepeatSchedule): string {
  if (schedule.mode === "once") return `${schedule.date} · 1회성`;
  const freq = schedule.frequency === "monthly" ? "매월" : "매년";
  if (schedule.until.type === "indefinite") return `${freq} · 무기한`;
  if (schedule.until.type === "count")
    return `${freq} · ${schedule.until.count}회`;
  return `${freq} · ${schedule.until.date}까지`;
}

export default function TransferRuleSection({
  assetClasses,
  transferRules,
  onAddTransferRule,
  onUpdateTransferRule,
  onRemoveTransferRule,
  today,
}: TransferRuleSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromAssetId, setFromAssetId] = useState("");
  const [toAssetId, setToAssetId] = useState("");
  const [mode, setMode] = useState<TransferMode>("fixed");
  const [amount, setAmount] = useState("");
  const [schedule, setSchedule] = useState<RepeatSchedule>(
    defaultSchedule(today),
  );
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const nameOf = (id: string) =>
    assetClasses.find((a) => a.id === id)?.name ?? "?";

  const effectiveFrom = fromAssetId || assetClasses[0]?.id || "";
  const fromAsset = assetClasses.find((a) => a.id === effectiveFrom);
  const sameCurrencyAssets = assetClasses.filter(
    (a) => a.id !== effectiveFrom && a.currency === fromAsset?.currency,
  );
  const effectiveTo =
    toAssetId && sameCurrencyAssets.some((a) => a.id === toAssetId)
      ? toAssetId
      : sameCurrencyAssets[0]?.id || "";

  const resetForm = () => {
    setEditingId(null);
    setFromAssetId("");
    setToAssetId("");
    setMode("fixed");
    setAmount("");
    setSchedule(defaultSchedule(today));
    setError(null);
  };

  const startEdit = (rule: TransferRule) => {
    setEditingId(rule.id);
    setFromAssetId(rule.fromAssetId);
    setToAssetId(rule.toAssetId);
    setMode(rule.mode);
    setAmount(String(rule.amount));
    setSchedule(rule.schedule);
    setError(null);
  };

  const handleSubmit = () => {
    if (!effectiveFrom || !effectiveTo || effectiveFrom === effectiveTo) {
      setError("이체할 수 있는 같은 통화의 자산군이 2개 이상 필요합니다.");
      return;
    }
    if (!amount || Number(amount) === 0) {
      amountRef.current?.focus();
      return;
    }
    const scheduleError = validateSchedule(schedule, today);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }
    setError(null);
    const input: NewTransferRuleInput = {
      fromAssetId: effectiveFrom,
      toAssetId: effectiveTo,
      mode,
      amount: Number(amount),
      schedule,
    };
    if (editingId) {
      onUpdateTransferRule(editingId, input);
    } else {
      onAddTransferRule(input);
    }
    resetForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-amber-700">이체 규칙</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {transferRules.map((rule) => (
          <li
            key={rule.id}
            onClick={() => startEdit(rule)}
            className="flex cursor-pointer items-center justify-between rounded-xl border border-amber-100 bg-white/80 px-3 py-2 text-sm hover:border-amber-300"
          >
            <span>
              {nameOf(rule.fromAssetId)} → {nameOf(rule.toAssetId)} ·{" "}
              {rule.mode === "fixed"
                ? `${rule.amount.toLocaleString()}원`
                : `${rule.amount}%`}{" "}
              · {scheduleSummary(rule.schedule)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTransferRule(rule.id);
              }}
              className="text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-2" onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-2">
          <select
            value={effectiveFrom}
            onChange={(e) => {
              setFromAssetId(e.target.value);
              setToAssetId("");
            }}
            className="flex-1 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-sm"
          >
            {assetClasses.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}({asset.currency})
              </option>
            ))}
          </select>
          <span className="text-gray-400">→</span>
          <select
            value={effectiveTo}
            onChange={(e) => setToAssetId(e.target.value)}
            className="flex-1 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-sm"
            disabled={sameCurrencyAssets.length === 0}
          >
            {sameCurrencyAssets.length === 0 && (
              <option value="">같은 통화 자산군이 없습니다</option>
            )}
            {sameCurrencyAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}({asset.currency})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as TransferMode)}
            className="rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="fixed">고정 금액</option>
            <option value="percentOfSource">출발 잔액 비율(%)</option>
          </select>
          <input
            ref={amountRef}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            placeholder={mode === "fixed" ? "금액" : "%"}
            className="w-24 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
          />
        </div>
        <ScheduleEditor value={schedule} onChange={setSchedule} today={today} />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sameCurrencyAssets.length === 0}
            className="self-start rounded-full bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editingId ? "저장" : "이체 규칙 추가"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "TransferRuleSection.tsx"`
Expected: 출력 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/TransferRuleSection.tsx"
git commit -m "feat: 이체 규칙에 1회성 스케줄(예적금 만기 등) 지원 추가"
```

---

### Task 6: InputPanel.tsx 재배선

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 3·4·5의 최종 Props 시그니처 그대로.
- Produces: `InputPanelProps` 최종본 — Task 7(AssetSimulator.tsx)이 이 시그니처로 배선한다.

- [ ] **Step 1: InputPanel.tsx 전체 교체**

```tsx
"use client";

import {
  AssetClass,
  ExpenseItem,
  Group,
  IncomeItem,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  TransferRule,
} from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";
import IncomeSection from "./input-sections/IncomeSection";
import ExpenseSection from "./input-sections/ExpenseSection";
import TransferRuleSection from "./input-sections/TransferRuleSection";

type InputPanelProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  incomes: IncomeItem[];
  onAddIncome: (input: NewIncomeItemInput) => void;
  onUpdateIncome: (id: string, input: NewIncomeItemInput) => void;
  onRemoveIncome: (id: string) => void;
  expenses: ExpenseItem[];
  onAddExpense: (input: NewExpenseItemInput) => void;
  onUpdateExpense: (id: string, input: NewExpenseItemInput) => void;
  onRemoveExpense: (id: string) => void;
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onUpdateTransferRule: (id: string, input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
  today: Date;
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onUpdateAssetClass={props.onUpdateAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onSetPrimaryAsset={props.onSetPrimaryAsset}
      />
      <IncomeSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        incomes={props.incomes}
        onAddIncome={props.onAddIncome}
        onUpdateIncome={props.onUpdateIncome}
        onRemoveIncome={props.onRemoveIncome}
        today={props.today}
      />
      <ExpenseSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        expenses={props.expenses}
        onAddExpense={props.onAddExpense}
        onUpdateExpense={props.onUpdateExpense}
        onRemoveExpense={props.onRemoveExpense}
        today={props.today}
      />
      <TransferRuleSection
        assetClasses={props.assetClasses}
        transferRules={props.transferRules}
        onAddTransferRule={props.onAddTransferRule}
        onUpdateTransferRule={props.onUpdateTransferRule}
        onRemoveTransferRule={props.onRemoveTransferRule}
        today={props.today}
      />
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit 2>&1 | grep "InputPanel.tsx"`
Expected: 출력 없음(`AssetSimulator.tsx`가 아직 새 props를 안 넘겨서 나는 에러는 그쪽에 표시되며 이 시점엔 정상).

- [ ] **Step 3: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx"
git commit -m "feat: InputPanel을 통합 캐시플로우 시그니처로 재배선"
```

---

### Task 7: AssetSimulator.tsx 전체 재배선 (컴파일 체크포인트)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1의 모든 타입, Task 6의 `InputPanelProps`
- Produces: 없음(최상위 컴포넌트). **이 태스크가 끝나면 프로젝트 전체 `npx tsc --noEmit`이 완전히 clean해야 한다.**

차트 5개(`TimelineSlider`/`AssetAreaChart`/`GroupDonutChart`/`FlowDiagram`/`ComparisonBarChart`)의 호출부는 이번 태스크에서 전혀 건드리지 않는다 — `MonthSnapshot` 필드명이 그대로이므로 기존 호출 코드가 그대로 컴파일된다. `withGuaranteedPrimary`, 자산군 관련 핸들러(추가/수정/삭제/기본계좌 지정), `exchangeRate`/`assetGroups` 로직은 v2 최종본과 동일하게 유지한다 — 이번 태스크는 수입·지출·이체의 상태·핸들러만 통합 모델로 교체한다.

- [ ] **Step 1: AssetSimulator.tsx 전체 교체**

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  AssetClass,
  ExpenseItem,
  Group,
  IncomeItem,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  SimulationInput,
  TransferRule,
  newId,
  nextGroupColor,
} from "./types";
import { useSimulation } from "./useSimulation";
import InputPanel from "./InputPanel";
import TimelineSlider from "./TimelineSlider";
import AssetAreaChart from "./AssetAreaChart";
import GroupDonutChart from "./GroupDonutChart";
import FlowDiagram from "./FlowDiagram";
import ComparisonBarChart from "./ComparisonBarChart";

function withGuaranteedPrimary(assets: AssetClass[]): AssetClass[] {
  if (assets.some((a) => a.isPrimary && a.currency === "KRW")) {
    return assets;
  }
  const candidate = assets.find((a) => a.currency === "KRW");
  if (!candidate) return assets;
  return assets.map((a) => ({ ...a, isPrimary: a.id === candidate.id }));
}

export default function AssetSimulator() {
  const today = useMemo(() => new Date(), []);

  const [groups, setGroups] = useState<Group[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [transferRules, setTransferRules] = useState<TransferRule[]>([]);
  const [exchangeRate, setExchangeRate] = useState(1350);
  const [selectedMonth, setSelectedMonth] = useState(0);

  const handleAddGroup = (name: string): string => {
    const id = newId();
    setGroups((prev) => [
      ...prev,
      { id, name, color: nextGroupColor(prev.length) },
    ]);
    return id;
  };

  const handleAddAssetClass = (input: NewAssetClassInput) => {
    setAssetClasses((prev) => {
      const withNew = [
        ...(input.isPrimary
          ? prev.map((a) => ({ ...a, isPrimary: false }))
          : prev),
        { id: newId(), ...input },
      ];
      return withGuaranteedPrimary(withNew);
    });
  };
  const handleUpdateAssetClass = (id: string, input: NewAssetClassInput) => {
    setAssetClasses((prev) => {
      const updated = prev.map((a) => {
        if (a.id === id) return { ...a, ...input };
        if (input.isPrimary) return { ...a, isPrimary: false };
        return a;
      });
      return withGuaranteedPrimary(updated);
    });
    setTransferRules((prev) => {
      const nextAssets = assetClasses.map((a) =>
        a.id === id ? { ...a, ...input } : a,
      );
      return prev.filter((r) => {
        const from = nextAssets.find((a) => a.id === r.fromAssetId);
        const to = nextAssets.find((a) => a.id === r.toAssetId);
        return from && to && from.currency === to.currency;
      });
    });
  };
  const handleRemoveAssetClass = (id: string) => {
    setAssetClasses((prev) => {
      const removed = prev.find((a) => a.id === id);
      const rest = prev.filter((a) => a.id !== id);
      if (removed?.isPrimary) {
        const nextPrimary = rest.find((a) => a.currency === "KRW");
        if (nextPrimary) {
          return rest.map((a) =>
            a.id === nextPrimary.id ? { ...a, isPrimary: true } : a,
          );
        }
      }
      return rest;
    });
    setTransferRules((prev) =>
      prev.filter((r) => r.fromAssetId !== id && r.toAssetId !== id),
    );
  };
  const handleSetPrimaryAsset = (id: string) => {
    setAssetClasses((prev) =>
      prev.map((a) => ({ ...a, isPrimary: a.id === id })),
    );
  };

  const handleAddIncome = (input: NewIncomeItemInput) => {
    setIncomes((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateIncome = (id: string, input: NewIncomeItemInput) => {
    setIncomes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...input } : i)),
    );
  };
  const handleRemoveIncome = (id: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddExpense = (input: NewExpenseItemInput) => {
    setExpenses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateExpense = (id: string, input: NewExpenseItemInput) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...input } : e)),
    );
  };
  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddTransferRule = (input: NewTransferRuleInput) => {
    setTransferRules((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleUpdateTransferRule = (
    id: string,
    input: NewTransferRuleInput,
  ) => {
    setTransferRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...input } : r)),
    );
  };
  const handleRemoveTransferRule = (id: string) => {
    setTransferRules((prev) => prev.filter((r) => r.id !== id));
  };

  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups,
      assetClasses,
      incomes,
      expenses,
      transferRules,
      exchangeRate,
    }),
    [groups, assetClasses, incomes, expenses, transferRules, exchangeRate],
  );

  const snapshots = useSimulation(simulationInput, today);
  const selectedSnapshot = snapshots[selectedMonth];
  const primaryAsset = assetClasses.find((a) => a.isPrimary);
  const assetGroups = groups.filter((g) =>
    assetClasses.some((a) => a.groupId === g.id),
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 text-gray-800">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-800">자산 시뮬레이터</h2>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            환율(1달러 = 원)
            <input
              type="number"
              min={1}
              value={exchangeRate}
              onChange={(e) =>
                setExchangeRate(Math.max(1, Number(e.target.value) || 1))
              }
              className="w-24 rounded-full border border-white/60 bg-white/80 px-2 py-1 text-sm"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-[360px_1fr]">
          <InputPanel
            groups={groups}
            onAddGroup={handleAddGroup}
            assetClasses={assetClasses}
            onAddAssetClass={handleAddAssetClass}
            onUpdateAssetClass={handleUpdateAssetClass}
            onRemoveAssetClass={handleRemoveAssetClass}
            onSetPrimaryAsset={handleSetPrimaryAsset}
            incomes={incomes}
            onAddIncome={handleAddIncome}
            onUpdateIncome={handleUpdateIncome}
            onRemoveIncome={handleRemoveIncome}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onRemoveExpense={handleRemoveExpense}
            transferRules={transferRules}
            onAddTransferRule={handleAddTransferRule}
            onUpdateTransferRule={handleUpdateTransferRule}
            onRemoveTransferRule={handleRemoveTransferRule}
            today={today}
          />
          <div className="flex flex-col gap-4">
            <TimelineSlider
              selectedMonth={selectedMonth}
              onChange={setSelectedMonth}
              today={today}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <AssetAreaChart
                snapshots={snapshots}
                groups={assetGroups}
                assetClasses={assetClasses}
                selectedMonth={selectedMonth}
              />
              <ComparisonBarChart
                snapshots={snapshots}
                groups={assetGroups}
                assetClasses={assetClasses}
                selectedMonth={selectedMonth}
              />
              <GroupDonutChart
                groups={assetGroups}
                assetClasses={assetClasses}
                snapshot={selectedSnapshot}
              />
              <FlowDiagram
                snapshot={selectedSnapshot}
                primaryAsset={primaryAsset}
                assetClasses={assetClasses}
                exchangeRate={exchangeRate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 전체 타입 체크 및 린트 (컴파일 체크포인트)**

Run: `npx tsc --noEmit && npm run lint`
Expected: **에러 없음.** 남아있다면 Task 3~6 중 어딘가 프롭 이름이 어긋난 것이니 찾아서 고친다.

- [ ] **Step 3: 수동 확인**

Run: `npm run dev`, `http://localhost:3000/asset-simulator` 접속.

- KRW 자산군 하나를 기본 계좌로 추가한다.
- 수입 폼에서 "월급"을 이름·금액 채우고, 스케줄을 "반복 · 매월 · 무기한"(기본값 그대로) 상태로 추가한다. 리스트에 "월급 · N원 · 매월 · 무기한"으로 나오는지 확인한다.
- 수입을 하나 더 추가하되 이번엔 스케줄을 "반복 · 매년 · 횟수 2"로 설정해 추가한다. 리스트 행 클릭 시 폼에 그 값 그대로 채워지는지(수정 진입) 확인한다.
- 지출 폼에서 그룹을 인라인으로 하나 만들고 지정해, 지출에도 그룹 배지가 붙는지 확인한다(v2까지는 지출에 그룹이 없었다).
- 이체 규칙에서 스케줄을 "일시"로 바꾸고 다음 달 날짜를 지정해 추가한 뒤, 슬라이더를 그 달로 옮겨 흐름도에 그 이체가 나타나는지, 그 다음 달에는 사라지는지 확인한다.
- 이체 규칙 스케줄의 종료 조건을 "특정 날짜까지"로 바꾸고 시작 날짜보다 이른 날짜를 넣으면 에러 메시지가 뜨고 추가되지 않는지 확인한다.

- [ ] **Step 4: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: AssetSimulator를 통합 캐시플로우 모델로 재배선"
```

---

### Task 8: 전체 골든 패스 수동 검증

**Files:** 없음(코드 변경 없음, 검증만).

**Interfaces:** 없음.

- [ ] **Step 1: 타입 체크·린트 최종 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 2: 반복 스케줄 골든 패스**

`http://localhost:3000/asset-simulator`에서 KRW 기본 계좌 자산군을 만든다. 수입에 "매월 무기한" 항목(월급)과 "매년 · 횟수 3" 항목(연 보너스)을 추가한다. 슬라이더를 12개월 후, 24개월 후, 36개월 후, 48개월 후로 옮기며 연 보너스가 12·24·36개월 후에는 반영되고 48개월 후부터는 더 이상 반영되지 않는지(총자산 증가폭이 그 시점부터 월급만 반영된 만큼으로 줄어드는지) 확인한다.

- [ ] **Step 3: 1회성 이체 골든 패스**

자산군 2개(둘 다 KRW)를 만들고, 이체 규칙을 "일시" 스케줄로 6개월 후 날짜에 전액 이체(출발 잔액 비율 100%)로 추가한다. 슬라이더를 5개월 후로 옮기면 이체 전 상태, 6개월 후로 옮기면 이체 후 상태(출발 자산 0, 도착 자산에 합산), 7개월 후에도 그 상태가 유지되는지(재이체 없음) 확인한다.

- [ ] **Step 4: 지출 그룹 지원 확인**

지출 항목에 그룹을 지정하고, 도넛 차트 그룹 탭에 그 그룹이 나타나는지, 지출 금액이 자산 총액에 반영되는 것과는 별개로(지출은 자산이 아니므로 도넛/영역 차트의 그룹 집계에는 포함되지 않는다) 지출 리스트 자체에서 그룹 배지가 올바르게 표시되는지 확인한다.

- [ ] **Step 5: 수정·Enter·검증 메시지 회귀 확인**

수입·지출·이체 규칙 각각에서: 행 클릭 시 스케줄을 포함한 모든 값이 폼에 채워지는지, 이름/금액을 비운 채 Enter를 누르면 해당 입력창으로 포커스가 이동하는지, 스케줄의 "반복→일시" 또는 "일시→반복" 전환이 값 손실 없이 부드럽게 되는지(전환 시 날짜값이 최대한 유지되는지) 확인한다.

- [ ] **Step 6: 독립 페이지 확인**

`/asset-simulator`(모달이 아닌 독립 페이지)에서도 위 항목들이 동일하게 동작하는지 확인한다.

이 태스크는 커밋할 코드 변경이 없다. 문제를 발견하면 해당 태스크로 돌아가 수정한다.

---