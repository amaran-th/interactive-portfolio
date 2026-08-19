# 자산 시뮬레이터 v3 2라운드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자산 시뮬레이터에 (1) 사용자가 조절 가능한 시뮬레이션 범위(5/10/20/30년 프리셋), (2) 자산·그룹별 색상 자동배정+수동변경+그룹 편집(이름/색상/삭제), (3) 목표 금액 설정과 실제 달성 시점 예측을 추가한다.

**Architecture:** `types.ts`/`simulation.ts`의 계산 엔진에 `horizonMonths` 파라미터화와 목표 탐색 함수를 추가하고, 그 위에 색상 필드·UI(스와치, 커스텀 드롭다운)·신규 `GoalCard` 컴포넌트를 쌓은 뒤, 마지막에 `AssetSimulator.tsx`/`InputPanel.tsx`를 한 번에 재배선하는 컴파일 체크포인트 태스크로 마무리한다. 5개 차트 중 `FlowDiagram.tsx`/`TimelineSlider.tsx`는 각각 스코프 밖/최소 변경이고, `AssetAreaChart`/`ComparisonBarChart`/`GroupDonutChart`는 색상 소스만 바뀐다.

**Tech Stack:** Next.js 16(App Router), React 19, TypeScript, Tailwind CSS v4. 외부 차트/데이트 라이브러리 없음(SVG 직접 그림). 테스트 스위트 없음(CLAUDE.md) — 검증은 `npx tsc --noEmit` + `npm run lint` + Playwright 기반 수동 확인.

**Spec:** [docs/superpowers/specs/2026-08-20-asset-simulator-v3-round2-design.md](../specs/2026-08-20-asset-simulator-v3-round2-design.md)

## Global Constraints

- 테스트 스위트 없음(CLAUDE.md) — 순수 함수는 저장소 루트에 `npx tsx`로 실행하는 1회성 스크립트로 검증 후 삭제(커밋 금지), 아직 배선 안 된 UI 컴포넌트는 `app/scratch-*/page.tsx` 임시 라우트로 검증 후 삭제·`git status`로 흔적 없음 확인.
- 새 npm 의존성 추가 금지.
- `FlowDiagram.tsx`, `TimelineSlider.tsx`(Task 2에서 `horizonMonths` prop만 추가하는 것 제외) 외 나머지 4개 차트 컴포넌트 시그니처(`snapshots`/`groups`/`assetClasses`/`selectedMonth` 등)는 이 라운드에서 값의 계산 방식만 바뀌고 prop 목록은 그대로 유지한다.
- 색상은 지정된 8색 `GROUP_PALETTE`에서만 고른다 — 자유 컬러피커(`input type=color`) 금지.
- `AssetClass`의 `color`는 생성 폼(`NewAssetClassInput`)에는 포함하지 않는다 — 자동 배정 후 목록에서만 수동 변경.
- 목표(Goal)는 단일 목표만 지원한다(리스트 아님, `Goal | null`).
- `findGoalAchievementMonth`의 탐색 상한은 `GOAL_SEARCH_CAP_MONTHS = 6000`(500년)이며, 사용자가 고른 프리셋 범위(`horizonMonths`)와 무관하게 항상 이 상한까지 탐색한다.
- 컴파일 체크포인트는 Task 7(`AssetSimulator.tsx`/`InputPanel.tsx`)이다 — Task 1~6은 서로 다른 파일을 건드리며 각 파일 자체는 내부적으로 타입 일관성을 유지하지만, `AssetSimulator.tsx`/`InputPanel.tsx`가 아직 새 prop들을 공급하지 않아 그 두 파일을 호출하는 지점에서 발생하는 교차 파일 타입 에러는 Task 7 전까지 정상이다. 각 태스크의 `tsc` 검증은 `npx tsc --noEmit | grep <이번 태스크가 만지는 파일명>`으로 스코프를 좁힌다. Task 7부터는 `npx tsc --noEmit`과 `npm run lint`가 프로젝트 전체에서 완전히 클린해야 한다.
- Enter 제출 시 포커스 이동, 클릭 수정, `react-hooks` ESLint 규칙(렌더 중 `.map()`/`.reduce()` 콜백 안에서 외부 `let` 재할당 금지 — `Array.reduce` 누적자 사용) 등 기존 관례를 그대로 따른다.

---

### Task 1: 데이터 모델 + 계산 엔진 확장

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/types.ts` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation.ts` (전체 교체)

**Interfaces:**
- Consumes: 없음(최상위 기반 태스크).
- Produces: `HORIZON_PRESET_YEARS: readonly number[]`, `DEFAULT_HORIZON_YEARS: number`, `GOAL_SEARCH_CAP_MONTHS: number`, `AssetClass.color: string`, `nextAssetColor(existingCount: number): string`, `GoalMetric`, `Goal`, `runSimulation(input: SimulationInput, today: Date, horizonMonths: number): MonthSnapshot[]`(시그니처 변경 — `horizonMonths` 필수 파라미터로 추가, `today` 기본값 제거), `validateSchedule(schedule: RepeatSchedule, today: Date, horizonMonths: number): string | null`(시그니처 변경 — `horizonMonths` 필수 파라미터 추가), `findGoalAchievementMonth(input: SimulationInput, goal: Goal, today: Date, searchCapMonths?: number): number | null`. 이 모든 시그니처를 이후 태스크(2~7)가 그대로 소비한다.

- [ ] **Step 1: `types.ts` 전체 교체**

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
  color: string;
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

export type GoalMetric =
  | { type: "total" }
  | { type: "asset"; assetId: string }
  | { type: "group"; groupId: string };

export type Goal = {
  metric: GoalMetric;
  targetAmount: number;
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

export const HORIZON_PRESET_YEARS = [5, 10, 20, 30] as const;
export const DEFAULT_HORIZON_YEARS = 10;
export const GOAL_SEARCH_CAP_MONTHS = 6000;

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

export function nextAssetColor(existingCount: number): string {
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

- [ ] **Step 2: `simulation.ts` 전체 교체**

```ts
import {
  AssetClass,
  Goal,
  GOAL_SEARCH_CAP_MONTHS,
  Group,
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
  horizonMonths: number,
): string | null {
  const rangeMessage = `1개월 후부터 ${formatMonthsFromNow(horizonMonths)} 사이의 날짜만 선택할 수 있습니다.`;

  if (schedule.mode === "once") {
    const m = monthIndexFromTargetDate(schedule.date, today);
    if (!Number.isFinite(m) || m < 1 || m > horizonMonths) return rangeMessage;
    return null;
  }

  const start = monthIndexFromTargetDate(schedule.startDate, today);
  if (!Number.isFinite(start) || start < 1 || start > horizonMonths) {
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
  today: Date,
  horizonMonths: number,
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

  for (let month = 1; month <= horizonMonths; month++) {
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

- [ ] **Step 3: 스코프 타입체크**

Run: `npx tsc --noEmit | grep -E "types\.ts|simulation\.ts"`
Expected: 빈 출력(이 두 파일 자체는 클린). 다른 파일에서 나는 에러(`useSimulation.ts`가 `runSimulation`을 옛 시그니처로 부르는 등)는 이 시점에 정상이며 무시한다.

- [ ] **Step 4: 순수 함수 수동 검증(1회성 스크립트, 커밋 금지)**

저장소 루트에 `verify-task1.ts`를 만든다(경로는 `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/`를 상대 경로로 import).

```ts
import { runSimulation, findGoalAchievementMonth, validateSchedule } from "./app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation";
import { AssetClass, SimulationInput } from "./app/(portfolio)/playground/_sections/Works/6_AssetSimulator/types";

const today = new Date(2026, 7, 20); // 2026-08-20, 월은 0-indexed

const primary: AssetClass = {
  id: "a1",
  name: "현금",
  currency: "KRW",
  initialBalance: 0,
  annualReturnRate: 0,
  isPrimary: true,
  color: "#818cf8",
};

const input: SimulationInput = {
  groups: [],
  assetClasses: [primary],
  incomes: [
    {
      id: "i1",
      name: "월급",
      amount: 1_000_000,
      schedule: {
        mode: "recurring",
        startDate: "2026-09",
        frequency: "monthly",
        until: { type: "indefinite" },
      },
    },
  ],
  expenses: [],
  transferRules: [],
  exchangeRate: 1350,
};

// 1) runSimulation: horizonMonths=60이면 스냅샷 61개(0..60)
const snaps60 = runSimulation(input, today, 60);
console.assert(snaps60.length === 61, `FAIL 1: expected 61, got ${snaps60.length}`);

// 2) 목표 1200만원(총자산) — 매달 100만원씩 늘어나므로 12개월째 달성
const achieved = findGoalAchievementMonth(
  input,
  { metric: { type: "total" }, targetAmount: 12_000_000 },
  today,
);
console.assert(achieved === 12, `FAIL 2: expected 12, got ${achieved}`);

// 3) 이미 달성한 목표 — 0원 목표는 month 0에 이미 달성
const alreadyAchieved = findGoalAchievementMonth(
  input,
  { metric: { type: "total" }, targetAmount: 0 },
  today,
);
console.assert(alreadyAchieved === 0, `FAIL 3: expected 0, got ${alreadyAchieved}`);

// 4) 소득이 전혀 없는 자산 — 절대 달성 못 하는 목표는 null
const noIncomeInput: SimulationInput = { ...input, incomes: [] };
const neverAchieved = findGoalAchievementMonth(
  noIncomeInput,
  { metric: { type: "total" }, targetAmount: 1_000 },
  today,
  100, // 작은 cap으로 테스트 속도 확보
);
console.assert(neverAchieved === null, `FAIL 4: expected null, got ${neverAchieved}`);

// 5) validateSchedule — horizonMonths 파라미터가 실제로 상한을 바꾼다
const farSchedule = {
  mode: "once" as const,
  date: "2027-10", // today(2026-08) 기준 14개월 후
};
const errorAt12 = validateSchedule(farSchedule, today, 12);
console.assert(errorAt12 !== null, `FAIL 5a: expected error, got ${errorAt12}`);
const okAt24 = validateSchedule(farSchedule, today, 24);
console.assert(okAt24 === null, `FAIL 5b: expected null, got ${okAt24}`);

console.log("all checks passed (see above for any FAIL lines)");
```

Run: `npx --yes tsx verify-task1.ts`
Expected: `all checks passed` 출력, `FAIL` 라인 없음.

- [ ] **Step 5: 스크립트 삭제 및 커밋**

```bash
rm verify-task1.ts
git status --short verify-task1.ts
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/types.ts app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/simulation.ts
git commit -m "feat: 시뮬레이션 범위 파라미터화 및 목표 달성 계산 엔진 추가"
```

---

### Task 2: `useSimulation` 훅 + `TimelineSlider` — horizonMonths 파라미터화

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/useSimulation.ts` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/TimelineSlider.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1의 `runSimulation(input, today, horizonMonths)`.
- Produces: `useSimulation(input: SimulationInput, today: Date, horizonMonths: number): MonthSnapshot[]`(시그니처 변경), `TimelineSlider` props에 `horizonMonths: number` 추가(기존 `max={HORIZON_MONTHS}` 대체).둘 다 Task 7에서 소비한다.

- [ ] **Step 1: `useSimulation.ts` 전체 교체**

```ts
import { useMemo } from "react";
import { MonthSnapshot, SimulationInput } from "./types";
import { runSimulation } from "./simulation";

export function useSimulation(
  input: SimulationInput,
  today: Date,
  horizonMonths: number,
): MonthSnapshot[] {
  return useMemo(
    () => runSimulation(input, today, horizonMonths),
    [input, today, horizonMonths],
  );
}
```

- [ ] **Step 2: `TimelineSlider.tsx` 전체 교체**

```tsx
"use client";

import { formatMonthsFromNow } from "./types";

type TimelineSliderProps = {
  selectedMonth: number;
  onChange: (month: number) => void;
  today: Date;
  horizonMonths: number;
};

function formatMonthLabel(monthIndex: number, today: Date): string {
  const date = new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    1,
  );
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function TimelineSlider({
  selectedMonth,
  onChange,
  today,
  horizonMonths,
}: TimelineSliderProps) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <span className="text-sm text-gray-500">
        {selectedMonth === 0
          ? "지금"
          : `${formatMonthsFromNow(selectedMonth)} · ${formatMonthLabel(selectedMonth, today)}`}
      </span>
      <input
        type="range"
        min={0}
        max={horizonMonths}
        value={selectedMonth}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-indigo-500"
      />
    </div>
  );
}
```

- [ ] **Step 3: 스코프 타입체크**

Run: `npx tsc --noEmit | grep -E "useSimulation\.ts|TimelineSlider\.tsx"`
Expected: 빈 출력. `AssetSimulator.tsx`가 이 둘을 옛 시그니처로 호출하는 에러는 Task 7 전까지 정상이므로 무시한다.

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/useSimulation.ts app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/TimelineSlider.tsx
git commit -m "feat: useSimulation·TimelineSlider에 horizonMonths 파라미터 추가"
```

---

### Task 3: 수입·지출·이체 규칙 섹션 — horizonMonths prop 추가

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/TransferRuleSection.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1의 `validateSchedule(schedule, today, horizonMonths)`.
- Produces: `IncomeSectionProps`/`ExpenseSectionProps`/`TransferRuleSectionProps`에 `horizonMonths: number` 추가. Task 7이 이 세 컴포넌트에 `horizonMonths`를 공급한다. **주의:** 이 태스크는 세 파일의 `validateSchedule` 호출부만 바꾼다 — Task 4가 같은 세 파일 중 `IncomeSection.tsx`/`ExpenseSection.tsx`를 다시 건드리므로, 이 태스크의 변경분(`horizonMonths` prop)이 Task 4의 최종 코드에도 그대로 포함되어 있는지 다음 태스크 브리핑에서 다시 확인한다.

- [ ] **Step 1: `IncomeSection.tsx` 전체 교체**

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
  horizonMonths: number;
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
  horizonMonths,
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
    const scheduleError = validateSchedule(schedule, today, horizonMonths);
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

- [ ] **Step 2: `ExpenseSection.tsx` 전체 교체**

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
  horizonMonths: number;
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
  horizonMonths,
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
    const scheduleError = validateSchedule(schedule, today, horizonMonths);
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

- [ ] **Step 3: `TransferRuleSection.tsx` 전체 교체**

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
  horizonMonths: number;
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
  horizonMonths,
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
    const scheduleError = validateSchedule(schedule, today, horizonMonths);
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

- [ ] **Step 4: 스코프 타입체크**

Run: `npx tsc --noEmit | grep -E "IncomeSection\.tsx|ExpenseSection\.tsx|TransferRuleSection\.tsx"`
Expected: 빈 출력. `InputPanel.tsx`가 이 세 컴포넌트를 옛 props로 호출하는 에러는 Task 7 전까지 정상이므로 무시한다.

- [ ] **Step 5: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/input-sections/TransferRuleSection.tsx
git commit -m "feat: 수입·지출·이체 규칙 폼에 horizonMonths 검증 범위 반영"
```

---

### Task 4: 자산 색상 스와치 + 그룹 편집(커스텀 드롭다운)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupPicker.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupAssetSection.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx` (Task 3의 결과물 위에 추가 교체 — Task 3의 `horizonMonths` 변경분을 반드시 유지한 채로 진행)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx` (위와 동일)

**Interfaces:**
- Consumes: Task 1의 `AssetClass.color`, `nextAssetColor`, `GROUP_PALETTE`, `Group`. Task 3이 이미 적용한 `IncomeSection`/`ExpenseSection`의 `horizonMonths` prop.
- Produces: `GroupPickerProps`에 `onUpdateGroup: (id: string, input: { name: string; color: string }) => void`, `onRemoveGroup: (id: string) => void` 추가. `GroupAssetSectionProps`에 `onUpdateGroup`, `onRemoveGroup`, `onChangeAssetColor: (id: string, color: string) => void` 추가. `IncomeSectionProps`/`ExpenseSectionProps`에 `onUpdateGroup`, `onRemoveGroup` 추가(둘 다 내부 `GroupPicker` 호출에 그대로 전달). Task 7이 이 다섯 개 신규 prop 모두를 공급한다.

- [ ] **Step 1: `GroupPicker.tsx` 전체 교체 — 네이티브 select를 버튼+커스텀 패널로 재작성**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { GROUP_PALETTE, Group } from "../types";

const NONE_VALUE = "";

type GroupPickerProps = {
  groups: Group[];
  value: string;
  onChange: (groupId: string) => void;
  onCreateGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
};

export default function GroupPicker({
  groups,
  value,
  onChange,
  onCreateGroup,
  onUpdateGroup,
  onRemoveGroup,
}: GroupPickerProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedGroup = groups.find((g) => g.id === value);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const closePanel = () => {
    setOpen(false);
    setCreating(false);
    setDraftName("");
    setRenamingId(null);
    setColorPickerId(null);
  };

  const commitNewGroup = () => {
    const name = draftName.trim();
    if (!name) return;
    const id = onCreateGroup(name);
    onChange(id);
    closePanel();
  };

  const startRename = (group: Group) => {
    setRenamingId(group.id);
    setRenameDraft(group.name);
    setColorPickerId(null);
  };

  const commitRename = (group: Group) => {
    const name = renameDraft.trim();
    if (name) {
      onUpdateGroup(group.id, { name, color: group.color });
    }
    setRenamingId(null);
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          e.stopPropagation();
        }
        if (e.key === "Escape" && !renamingId && !creating) {
          closePanel();
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full border border-white/60 bg-white/80 px-2 py-1 text-xs text-gray-700"
      >
        {selectedGroup ? selectedGroup.name : "그룹 없음"}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onChange(NONE_VALUE);
              closePanel();
            }}
            className="w-full rounded-lg px-2 py-1 text-left text-xs text-gray-600 hover:bg-gray-100"
          >
            그룹 없음
          </button>
          <ul className="mt-1 flex flex-col gap-0.5">
            {groups.map((group) => (
              <li key={group.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-1 rounded-lg px-1 py-0.5 hover:bg-gray-100">
                  <button
                    type="button"
                    onClick={() =>
                      setColorPickerId((prev) =>
                        prev === group.id ? null : group.id,
                      )
                    }
                    className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: group.color }}
                    aria-label="그룹 색상 변경"
                  />
                  {renamingId === group.id ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => commitRename(group)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename(group);
                        }
                        if (e.key === "Escape") {
                          setRenamingId(null);
                        }
                      }}
                      className="min-w-0 flex-1 rounded border border-indigo-300 px-1 text-xs outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onChange(group.id);
                        closePanel();
                      }}
                      className="min-w-0 flex-1 truncate text-left text-xs text-gray-700"
                    >
                      {group.name}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startRename(group)}
                    className="shrink-0 text-xs text-gray-400 hover:text-gray-700"
                    aria-label="그룹 이름 수정"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveGroup(group.id)}
                    className="shrink-0 text-xs text-gray-400 hover:text-rose-500"
                    aria-label="그룹 삭제"
                  >
                    ✕
                  </button>
                </div>
                {colorPickerId === group.id && (
                  <div className="flex flex-wrap gap-1 px-1 pb-1">
                    {GROUP_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          onUpdateGroup(group.id, {
                            name: group.name,
                            color,
                          });
                          setColorPickerId(null);
                        }}
                        className="h-4 w-4 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: color }}
                        aria-label={`색상 ${color}로 변경`}
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-gray-100 pt-1">
            {creating ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitNewGroup();
                    }
                    if (e.key === "Escape") {
                      setCreating(false);
                      setDraftName("");
                    }
                  }}
                  placeholder="새 그룹 이름"
                  className="min-w-0 flex-1 rounded border border-indigo-300 px-1 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={commitNewGroup}
                  className="shrink-0 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  만들기
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full rounded-lg px-2 py-1 text-left text-xs text-indigo-600 hover:bg-indigo-50"
              >
                + 새 그룹 만들기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `GroupAssetSection.tsx` 전체 교체 — 색상 스와치 + 그룹 편집 prop 전달**

```tsx
"use client";

import { useRef, useState } from "react";
import {
  AssetClass,
  Currency,
  GROUP_PALETTE,
  Group,
  NewAssetClassInput,
} from "../types";
import GroupPicker from "./GroupPicker";

type GroupAssetSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  onChangeAssetColor: (id: string, color: string) => void;
};

export default function GroupAssetSection({
  groups,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  assetClasses,
  onAddAssetClass,
  onUpdateAssetClass,
  onRemoveAssetClass,
  onSetPrimaryAsset,
  onChangeAssetColor,
}: GroupAssetSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [balance, setBalance] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [returnRate, setReturnRate] = useState("0");
  const [makePrimary, setMakePrimary] = useState(false);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setGroupId("");
    setCurrency("KRW");
    setBalance("");
    setReturnRate("0");
    setMakePrimary(false);
  };

  const startEdit = (asset: AssetClass) => {
    setEditingId(asset.id);
    setName(asset.name);
    setGroupId(asset.groupId ?? "");
    setCurrency(asset.currency);
    setBalance(String(asset.initialBalance));
    setReturnRate(String(asset.annualReturnRate));
    setMakePrimary(asset.isPrimary);
    setShowAdvanced(asset.annualReturnRate !== 0);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    const input: NewAssetClassInput = {
      name: name.trim(),
      groupId: groupId || undefined,
      currency,
      initialBalance: Number(balance) || 0,
      annualReturnRate: Number(returnRate) || 0,
      isPrimary: currency === "KRW" && makePrimary,
    };
    if (editingId) {
      onUpdateAssetClass(editingId, input);
    } else {
      onAddAssetClass(input);
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
    <div className="rounded-2xl border border-indigo-200 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-indigo-700">자산군</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {assetClasses.map((asset) => {
          const group = groups.find((g) => g.id === asset.groupId);
          return (
            <li
              key={asset.id}
              className="flex flex-col gap-1.5 rounded-xl border border-indigo-100 bg-white/80 px-3 py-2 text-sm hover:border-indigo-300"
            >
              <div
                onClick={() => startEdit(asset)}
                className="flex cursor-pointer items-center justify-between"
              >
                <span className="flex flex-1 items-center gap-2">
                  <input
                    type="radio"
                    name="primary-asset"
                    checked={asset.isPrimary}
                    disabled={asset.currency === "USD"}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onSetPrimaryAsset(asset.id)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorPickerId((prev) =>
                        prev === asset.id ? null : asset.id,
                      );
                    }}
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: asset.color }}
                    aria-label="자산 색상 변경"
                  />
                  {group && (
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  <span>{asset.name}</span>
                  <span className="text-gray-400">
                    {asset.currency === "USD"
                      ? `$${asset.initialBalance.toLocaleString()}`
                      : `${asset.initialBalance.toLocaleString()}원`}
                  </span>
                  {asset.isPrimary && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">
                      기본 계좌
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAssetClass(asset.id);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              {colorPickerId === asset.id && (
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {GROUP_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeAssetColor(asset.id, color);
                        setColorPickerId(null);
                      }}
                      className="h-5 w-5 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: color }}
                      aria-label={`색상 ${color}로 변경`}
                    />
                  ))}
                </div>
              )}
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
            placeholder="자산군 이름"
            className="flex-1 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
          <GroupPicker
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
            onUpdateGroup={onUpdateGroup}
            onRemoveGroup={onRemoveGroup}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={currency}
            onChange={(e) => {
              const next = e.target.value as Currency;
              setCurrency(next);
              if (next === "USD") setMakePrimary(false);
            }}
            className="rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="KRW">KRW(원)</option>
            <option value="USD">USD(달러)</option>
          </select>
          <input
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            type="number"
            placeholder="현재 잔액"
            className="flex-1 rounded-full border border-indigo-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={makePrimary}
            disabled={currency === "USD"}
            onChange={(e) => setMakePrimary(e.target.checked)}
          />
          기본 계좌로 지정{currency === "USD" && " (KRW 자산만 가능)"}
        </label>
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="self-start text-xs text-indigo-500 hover:text-indigo-700"
        >
          {showAdvanced ? "상세 옵션 숨기기" : "상세 옵션 보기"}
        </button>
        {showAdvanced && (
          <label className="flex items-center gap-2 text-xs text-gray-600">
            연 수익률(%)
            <input
              value={returnRate}
              onChange={(e) => setReturnRate(e.target.value)}
              type="number"
              className="w-20 rounded-full border border-indigo-200 bg-white/80 px-2 py-1"
            />
          </label>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            {editingId ? "저장" : "자산군 추가"}
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

- [ ] **Step 3: `IncomeSection.tsx`에 `onUpdateGroup`/`onRemoveGroup` prop 추가**

Task 3에서 만든 `IncomeSection.tsx`(파일 전체가 Task 3 Step 1의 코드 상태)를 기준으로, 아래 세 곳만 바꾼다.

`type IncomeSectionProps` 블록에서:
```tsx
type IncomeSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  incomes: IncomeItem[];
  onAddIncome: (input: NewIncomeItemInput) => void;
  onUpdateIncome: (id: string, input: NewIncomeItemInput) => void;
  onRemoveIncome: (id: string) => void;
  today: Date;
  horizonMonths: number;
};
```

함수 파라미터 구조분해에서:
```tsx
export default function IncomeSection({
  groups,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  incomes,
  onAddIncome,
  onUpdateIncome,
  onRemoveIncome,
  today,
  horizonMonths,
}: IncomeSectionProps) {
```

`<GroupPicker>` 호출부에서:
```tsx
          <GroupPicker
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
            onUpdateGroup={onUpdateGroup}
            onRemoveGroup={onRemoveGroup}
          />
```

(이 세 곳 외 파일의 나머지 부분은 Task 3의 결과물과 동일하게 유지한다.)

- [ ] **Step 4: `ExpenseSection.tsx`에 동일하게 `onUpdateGroup`/`onRemoveGroup` prop 추가**

Task 3에서 만든 `ExpenseSection.tsx`를 기준으로, 같은 패턴으로 세 곳을 바꾼다.

```tsx
type ExpenseSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  expenses: ExpenseItem[];
  onAddExpense: (input: NewExpenseItemInput) => void;
  onUpdateExpense: (id: string, input: NewExpenseItemInput) => void;
  onRemoveExpense: (id: string) => void;
  today: Date;
  horizonMonths: number;
};
```

```tsx
export default function ExpenseSection({
  groups,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  expenses,
  onAddExpense,
  onUpdateExpense,
  onRemoveExpense,
  today,
  horizonMonths,
}: ExpenseSectionProps) {
```

```tsx
          <GroupPicker
            groups={groups}
            value={groupId}
            onChange={setGroupId}
            onCreateGroup={onAddGroup}
            onUpdateGroup={onUpdateGroup}
            onRemoveGroup={onRemoveGroup}
          />
```

- [ ] **Step 5: 스코프 타입체크**

Run: `npx tsc --noEmit | grep -E "GroupPicker\.tsx|GroupAssetSection\.tsx|IncomeSection\.tsx|ExpenseSection\.tsx"`
Expected: 빈 출력. `InputPanel.tsx` 쪽 에러는 Task 7 전까지 정상이므로 무시한다.

- [ ] **Step 6: Playwright 기반 수동 확인(스크래치 라우트, 커밋 금지)**

`app/scratch-task4-verify/page.tsx`에 `GroupAssetSection`을 로컬 state로 감싸 렌더하는 임시 페이지를 만들고(`groups`/`assetClasses`/각 핸들러를 `useState`로 최소 구현), `npm run dev`로 다음을 Playwright로 확인한다: (1) 자산 추가 시 색상 스와치가 자동 배정된 색으로 표시되는지, (2) 스와치 클릭 → 팔레트가 펼쳐지고 다른 색 클릭 시 즉시 반영되는지, (3) `GroupPicker` 버튼 클릭 → 패널이 열리고 그룹 목록·색상 스와치·연필·✕가 보이는지, (4) 그룹 이름 옆 연필 클릭 → 인라인 입력으로 전환, Enter로 저장되는지, (5) 그룹 삭제 시 그 그룹을 쓰던 자산의 그룹 배지가 사라지는지, (6) 그룹 색상 스와치 클릭 → 팔레트 선택 시 즉시 반영되는지, (7) Tab으로 "새 그룹 만들기"에 포커스 후 Enter를 눌러도 바깥 폼의 `handleSubmit`이 실행되지 않는지(이벤트 버블링 확인 — v2 Task 3에서 실제로 발생했던 버그 패턴). 확인 후 `app/scratch-task4-verify/`를 삭제하고 `git status`로 흔적이 없는지 확인한다.

- [ ] **Step 7: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupPicker.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupAssetSection.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx
git commit -m "feat: 자산 색상 스와치와 그룹 편집(이름·색상·삭제) UI 추가"
```

---

### Task 5: 차트 3종 — 자산 고유 색상 반영

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetAreaChart.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/ComparisonBarChart.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/GroupDonutChart.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1의 `AssetClass.color`.
- Produces: 세 컴포넌트 모두 prop 시그니처는 그대로(변경 없음) — 내부 색상 계산 로직만 바뀐다. `FlowDiagram.tsx`/`TimelineSlider.tsx`는 이 태스크에서 건드리지 않는다(Global Constraints 참고).

- [ ] **Step 1: `AssetAreaChart.tsx` 전체 교체 — 그룹 집계 대신 자산별 밴드 + 그룹 stroke**

```tsx
"use client";

import { AssetClass, Group, MonthSnapshot, formatKRW } from "./types";

type AssetAreaChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  assetClasses: AssetClass[];
  selectedMonth: number;
};

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = 12;

function orderedAssets(
  assetClasses: AssetClass[],
  groups: Group[],
): AssetClass[] {
  const grouped = groups.flatMap((g) =>
    assetClasses.filter((a) => a.groupId === g.id),
  );
  const ungrouped = assetClasses.filter((a) => !a.groupId);
  return [...grouped, ...ungrouped];
}

export default function AssetAreaChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
}: AssetAreaChartProps) {
  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        자산군을 추가하면 그래프가 나타납니다
      </div>
    );
  }

  const assets = orderedAssets(assetClasses, groups);
  const maxTotal = Math.max(1, ...snapshots.map((s) => s.totalBalance));
  const stepX = (WIDTH - PADDING * 2) / (snapshots.length - 1);
  const scaleY = (value: number) =>
    HEIGHT - PADDING - (value / maxTotal) * (HEIGHT - PADDING * 2);

  const { bands } = assets.reduce<{
    prevTop: number[];
    bands: {
      id: string;
      fill: string;
      stroke: string | undefined;
      points: string;
    }[];
  }>(
    (acc, asset) => {
      const bottom = acc.prevTop;
      const top = snapshots.map(
        (snapshot, i) =>
          bottom[i] + (snapshot.assetBalancesKRW[asset.id] ?? 0),
      );

      const topPoints = top.map(
        (value, i) => `${PADDING + i * stepX},${scaleY(value)}`,
      );
      const bottomPoints = bottom
        .map((value, i) => `${PADDING + i * stepX},${scaleY(value)}`)
        .reverse();

      const group = groups.find((g) => g.id === asset.groupId);

      return {
        prevTop: top,
        bands: [
          ...acc.bands,
          {
            id: asset.id,
            fill: asset.color,
            stroke: group?.color,
            points: [...topPoints, ...bottomPoints].join(" "),
          },
        ],
      };
    },
    { prevTop: snapshots.map(() => 0), bands: [] },
  );

  const cursorX = PADDING + selectedMonth * stepX;
  const totalBalance = snapshots[selectedMonth]?.totalBalance ?? 0;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <p className="text-sm text-gray-500">
        총자산{" "}
        <span className="text-lg font-semibold text-gray-800">
          {formatKRW(totalBalance)}
        </span>
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full">
        {bands.map((band) => (
          <polygon
            key={band.id}
            points={band.points}
            fill={band.fill}
            fillOpacity={0.55}
            stroke={band.stroke}
            strokeWidth={band.stroke ? 2 : 0}
          />
        ))}
        <line
          x1={cursorX}
          y1={PADDING}
          x2={cursorX}
          y2={HEIGHT - PADDING}
          stroke="#4338ca"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: `ComparisonBarChart.tsx` 전체 교체 — 동일한 자산별 구간 + 그룹 stroke**

```tsx
"use client";

import {
  AssetClass,
  Group,
  MonthSnapshot,
  formatKRW,
  formatMonthsFromNow,
} from "./types";

type ComparisonBarChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  assetClasses: AssetClass[];
  selectedMonth: number;
};

const WIDTH = 260;
const HEIGHT = 220;
const BAR_WIDTH = 64;
const BASE_Y = HEIGHT - 30;
const MAX_BAR_HEIGHT = 160;

type Segment = {
  id: string;
  fill: string;
  stroke: string | undefined;
  y: number;
  height: number;
};

function orderedAssets(
  assetClasses: AssetClass[],
  groups: Group[],
): AssetClass[] {
  const grouped = groups.flatMap((g) =>
    assetClasses.filter((a) => a.groupId === g.id),
  );
  const ungrouped = assetClasses.filter((a) => !a.groupId);
  return [...grouped, ...ungrouped];
}

export default function ComparisonBarChart({
  snapshots,
  groups,
  assetClasses,
  selectedMonth,
}: ComparisonBarChartProps) {
  if (assetClasses.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        자산군을 추가하면 비교 그래프가 나타납니다
      </div>
    );
  }

  const nowSnapshot = snapshots[0];
  const futureSnapshot = snapshots[selectedMonth];
  const assets = orderedAssets(assetClasses, groups);

  const maxTotal = Math.max(
    1,
    nowSnapshot.totalBalance,
    futureSnapshot.totalBalance,
  );

  const buildSegments = (snapshot: MonthSnapshot): Segment[] => {
    const { segments } = assets.reduce<{
      cursor: number;
      segments: Segment[];
    }>(
      (acc, asset) => {
        const value = snapshot.assetBalancesKRW[asset.id] ?? 0;
        const height = (value / maxTotal) * MAX_BAR_HEIGHT;
        const y = BASE_Y - acc.cursor - height;
        const group = groups.find((g) => g.id === asset.groupId);
        return {
          cursor: acc.cursor + height,
          segments: [
            ...acc.segments,
            {
              id: asset.id,
              fill: asset.color,
              stroke: group?.color,
              y,
              height,
            },
          ],
        };
      },
      { cursor: 0, segments: [] },
    );
    return segments;
  };

  const nowSegments = buildSegments(nowSnapshot);
  const futureSegments = buildSegments(futureSnapshot);
  const nowX = WIDTH / 2 - BAR_WIDTH - 16;
  const futureX = WIDTH / 2 + 16;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        <text
          x={nowX + BAR_WIDTH / 2}
          y={16}
          textAnchor="middle"
          className="fill-gray-600 text-[11px]"
        >
          {formatKRW(nowSnapshot.totalBalance)}
        </text>
        <text
          x={futureX + BAR_WIDTH / 2}
          y={16}
          textAnchor="middle"
          className="fill-gray-600 text-[11px]"
        >
          {formatKRW(futureSnapshot.totalBalance)}
        </text>
        {nowSegments.map((seg) => (
          <rect
            key={seg.id}
            x={nowX}
            y={seg.y}
            width={BAR_WIDTH}
            height={Math.max(0, seg.height)}
            fill={seg.fill}
            fillOpacity={0.75}
            stroke={seg.stroke}
            strokeWidth={seg.stroke ? 2 : 0}
          />
        ))}
        {futureSegments.map((seg) => (
          <rect
            key={seg.id}
            x={futureX}
            y={seg.y}
            width={BAR_WIDTH}
            height={Math.max(0, seg.height)}
            fill={seg.fill}
            fillOpacity={0.75}
            stroke={seg.stroke}
            strokeWidth={seg.stroke ? 2 : 0}
          />
        ))}
        <text
          x={nowX + BAR_WIDTH / 2}
          y={HEIGHT - 12}
          textAnchor="middle"
          className="fill-gray-500 text-[11px]"
        >
          지금
        </text>
        <text
          x={futureX + BAR_WIDTH / 2}
          y={HEIGHT - 12}
          textAnchor="middle"
          className="fill-gray-500 text-[11px]"
        >
          {selectedMonth === 0 ? "지금" : formatMonthsFromNow(selectedMonth)}
        </text>
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: `GroupDonutChart.tsx` 전체 교체 — 슬라이스 색상을 `asset.color`로 전환**

```tsx
"use client";

import { useState } from "react";
import {
  AssetClass,
  Group,
  MonthSnapshot,
  UNGROUPED_LABEL,
  formatKRW,
} from "./types";

type GroupDonutChartProps = {
  groups: Group[];
  assetClasses: AssetClass[];
  snapshot: MonthSnapshot;
};

type Slice = {
  id: string;
  name: string;
  amount: number;
  ratio: number;
  color: string;
  dashArray: string;
  dashOffset: number;
};

const SIZE = 160;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const UNGROUPED_TAB_ID = "__ungrouped__";

export default function GroupDonutChart({
  groups,
  assetClasses,
  snapshot,
}: GroupDonutChartProps) {
  const hasUngrouped = assetClasses.some((a) => !a.groupId);
  const tabs = [
    ...groups.map((g) => ({ id: g.id, name: g.name })),
    ...(hasUngrouped ? [{ id: UNGROUPED_TAB_ID, name: UNGROUPED_LABEL }] : []),
  ];

  const [selectedTabId, setSelectedTabId] = useState(tabs[0]?.id ?? "");
  const activeTabId = tabs.some((t) => t.id === selectedTabId)
    ? selectedTabId
    : tabs[0]?.id;

  if (!activeTabId) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        자산군을 추가하면 비율이 나타납니다
      </div>
    );
  }

  const assetsInTab =
    activeTabId === UNGROUPED_TAB_ID
      ? assetClasses.filter((a) => !a.groupId)
      : assetClasses.filter((a) => a.groupId === activeTabId);
  const tabTotal =
    activeTabId === UNGROUPED_TAB_ID
      ? snapshot.ungroupedTotalKRW
      : (snapshot.groupTotals[activeTabId] ?? 0);

  const { items: slices } = assetsInTab.reduce<{
    offset: number;
    items: Slice[];
  }>(
    (acc, asset) => {
      const amount = snapshot.assetBalancesKRW[asset.id] ?? 0;
      const ratio = tabTotal > 0 ? amount / tabTotal : 0;
      const dash = ratio * CIRCUMFERENCE;
      const slice: Slice = {
        id: asset.id,
        name: asset.name,
        amount,
        ratio,
        color: asset.color,
        dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashOffset: -acc.offset,
      };
      return { offset: acc.offset + dash, items: [...acc.items, slice] };
    },
    { offset: 0, items: [] },
  );

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedTabId(tab.id)}
            className={`rounded-full px-3 py-1 text-xs ${
              tab.id === activeTabId
                ? "bg-indigo-500 text-white"
                : "bg-white/80 text-gray-600"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {assetsInTab.length === 0 ? (
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={STROKE}
              />
            ) : (
              slices.map((slice) => (
                <circle
                  key={slice.id}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={STROKE}
                  strokeDasharray={slice.dashArray}
                  strokeDashoffset={slice.dashOffset}
                />
              ))
            )}
          </g>
        </svg>
        <ul className="flex flex-col gap-1 text-sm">
          {slices.map((slice) => (
            <li key={slice.id} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.name} · {Math.round(slice.ratio * 100)}% ·{" "}
              {formatKRW(slice.amount)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 스코프 타입체크**

Run: `npx tsc --noEmit | grep -E "AssetAreaChart\.tsx|ComparisonBarChart\.tsx|GroupDonutChart\.tsx"`
Expected: 빈 출력.

- [ ] **Step 5: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/AssetAreaChart.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/ComparisonBarChart.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/GroupDonutChart.tsx
git commit -m "feat: 영역·막대·도넛 차트에 자산 고유 색상과 그룹 테두리 반영"
```

---

### Task 6: `GoalCard` 신규 컴포넌트

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/GoalCard.tsx`

**Interfaces:**
- Consumes: Task 1의 `Goal`, `GoalMetric`, `findGoalAchievementMonth`, `formatMonthsFromNow`, `formatKRW`.
- Produces: `GoalCard` 컴포넌트, props `{ goal: Goal | null; onSetGoal: (goal: Goal | null) => void; assetClasses: AssetClass[]; groups: Group[]; simulationInput: SimulationInput; today: Date; selectedSnapshot: MonthSnapshot }`. Task 7이 다섯 번째 차트 카드로 렌더한다.

- [ ] **Step 1: `GoalCard.tsx` 작성**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AssetClass,
  Goal,
  GoalMetric,
  Group,
  MonthSnapshot,
  SimulationInput,
  formatMonthsFromNow,
} from "./types";
import { findGoalAchievementMonth } from "./simulation";

type GoalCardProps = {
  goal: Goal | null;
  onSetGoal: (goal: Goal | null) => void;
  assetClasses: AssetClass[];
  groups: Group[];
  simulationInput: SimulationInput;
  today: Date;
  selectedSnapshot: MonthSnapshot;
};

type MetricType = GoalMetric["type"];

function metricValueFromSnapshot(
  metric: GoalMetric,
  snapshot: MonthSnapshot,
): number {
  if (metric.type === "total") return snapshot.totalBalance;
  if (metric.type === "asset") {
    return snapshot.assetBalancesKRW[metric.assetId] ?? 0;
  }
  return snapshot.groupTotals[metric.groupId] ?? 0;
}

function formatAchievementDate(monthIndex: number, today: Date): string {
  const date = new Date(
    today.getFullYear(),
    today.getMonth() + monthIndex,
    1,
  );
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function GoalCard({
  goal,
  onSetGoal,
  assetClasses,
  groups,
  simulationInput,
  today,
  selectedSnapshot,
}: GoalCardProps) {
  const [metricType, setMetricType] = useState<MetricType>("total");
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!goal) return;
    setMetricType(goal.metric.type);
    setTargetId(
      goal.metric.type === "asset"
        ? goal.metric.assetId
        : goal.metric.type === "group"
          ? goal.metric.groupId
          : "",
    );
    setAmount(String(goal.targetAmount));
  }, [goal]);

  const achievementMonth = useMemo(() => {
    if (!goal) return undefined;
    return findGoalAchievementMonth(simulationInput, goal, today);
  }, [goal, simulationInput, today]);

  const handleSubmit = () => {
    const targetAmount = Number(amount);
    if (!targetAmount || targetAmount <= 0) return;
    let metric: GoalMetric;
    if (metricType === "total") {
      metric = { type: "total" };
    } else if (metricType === "asset") {
      if (!targetId) return;
      metric = { type: "asset", assetId: targetId };
    } else {
      if (!targetId) return;
      metric = { type: "group", groupId: targetId };
    }
    onSetGoal({ metric, targetAmount });
  };

  const handleClear = () => {
    onSetGoal(null);
    setMetricType("total");
    setTargetId("");
    setAmount("");
  };

  const currentValue = goal
    ? metricValueFromSnapshot(goal.metric, selectedSnapshot)
    : 0;
  const progressRatio =
    goal && goal.targetAmount > 0 ? currentValue / goal.targetAmount : 0;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-gray-700">목표</h3>
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={metricType}
            onChange={(e) => {
              setMetricType(e.target.value as MetricType);
              setTargetId("");
            }}
            className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="total">총자산</option>
            <option value="asset">특정 자산</option>
            <option value="group">특정 그룹</option>
          </select>
          {metricType === "asset" && (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
            >
              <option value="">자산 선택</option>
              {assetClasses.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          )}
          {metricType === "group" && (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm"
            >
              <option value="">그룹 선택</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="목표 금액(원)"
          className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-gray-400"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="self-start rounded-full bg-gray-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            목표 설정
          </button>
          {goal && (
            <button
              type="button"
              onClick={handleClear}
              className="self-start rounded-full px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              목표 해제
            </button>
          )}
        </div>
        {goal && (
          <div className="mt-1 rounded-xl bg-white/80 p-3 text-sm">
            {achievementMonth === undefined ? null : achievementMonth ===
              null ? (
              <p className="text-rose-500">500년 내 달성 불가</p>
            ) : achievementMonth === 0 ? (
              <p className="text-emerald-600">이미 달성했습니다</p>
            ) : (
              <p className="text-gray-700">
                약 {formatMonthsFromNow(achievementMonth)} (
                {formatAchievementDate(achievementMonth, today)}) 달성 예상
              </p>
            )}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{
                  width: `${Math.min(100, Math.max(0, progressRatio * 100))}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              진행률 {Math.round(progressRatio * 100)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 스코프 타입체크**

Run: `npx tsc --noEmit | grep "GoalCard.tsx"`
Expected: 빈 출력.

- [ ] **Step 3: Playwright 기반 수동 확인(스크래치 라우트, 커밋 금지)**

`app/scratch-task6-verify/page.tsx`에 `GoalCard`를 `useState`로 감싼 임시 페이지를 만든다. `assetClasses`에 KRW 자산 하나(초기 잔액 0), `simulationInput.incomes`에 매월 100만원 무기한 수입 하나를 넣고, `selectedSnapshot`은 `runSimulation` 결과의 0번째 스냅샷으로 고정한다. Playwright로 확인: (1) "총자산" + 목표 1200만원 설정 → "약 1년 후 (...) 달성 예상" 텍스트가 뜨는지, 실제 표시된 연월이 today+12개월과 일치하는지, (2) 목표 금액을 0원 이하로 시도하면 목표가 설정되지 않는지, (3) "목표 해제" 클릭 시 결과 영역이 사라지는지, (4) "특정 자산" 선택 후 대상 미선택 상태로 "목표 설정" 클릭 시 아무 일도 안 일어나는지(목표가 null로 남아있는지), (5) 진행률 바의 `width` 스타일이 `Math.round(progressRatio * 100)`과 일치하는 범위인지 `getComputedStyle` 또는 인라인 style로 확인. 확인 후 `app/scratch-task6-verify/`를 삭제하고 `git status`로 흔적이 없는지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/GoalCard.tsx
git commit -m "feat: 목표 금액·달성 시점 예측 카드(GoalCard) 추가"
```

---

### Task 7: `AssetSimulator.tsx` + `InputPanel.tsx` — 최종 배선(컴파일 체크포인트)

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx` (전체 교체)
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx` (전체 교체)

**Interfaces:**
- Consumes: Task 1~6에서 만든 모든 신규 타입·함수·컴포넌트·prop(`horizonMonths` 계열, `nextAssetColor`, `Goal`/`GoalMetric`, `onChangeAssetColor`, `onUpdateGroup`/`onRemoveGroup`, `GoalCard`).
- Produces: 이 태스크 이후 프로젝트 전체가 `npx tsc --noEmit`/`npm run lint` 기준으로 완전히 클린해야 한다(Global Constraints 참고). 이후 태스크가 없다.

- [ ] **Step 1: `AssetSimulator.tsx` 전체 교체**

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  AssetClass,
  DEFAULT_HORIZON_YEARS,
  ExpenseItem,
  Goal,
  Group,
  HORIZON_PRESET_YEARS,
  IncomeItem,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  SimulationInput,
  TransferRule,
  newId,
  nextAssetColor,
  nextGroupColor,
} from "./types";
import { useSimulation } from "./useSimulation";
import InputPanel from "./InputPanel";
import TimelineSlider from "./TimelineSlider";
import AssetAreaChart from "./AssetAreaChart";
import GroupDonutChart from "./GroupDonutChart";
import FlowDiagram from "./FlowDiagram";
import ComparisonBarChart from "./ComparisonBarChart";
import GoalCard from "./GoalCard";

function withGuaranteedPrimary(assets: AssetClass[]): AssetClass[] {
  if (assets.some((a) => a.isPrimary && a.currency === "KRW")) {
    return assets;
  }
  const candidate = assets.find((a) => a.currency === "KRW");
  if (!candidate) return assets;
  return assets.map((a) => ({ ...a, isPrimary: a.id === candidate.id }));
}

function goalReferences(
  goal: Goal | null,
  kind: "asset" | "group",
  id: string,
): boolean {
  if (!goal) return false;
  if (kind === "asset") {
    return goal.metric.type === "asset" && goal.metric.assetId === id;
  }
  return goal.metric.type === "group" && goal.metric.groupId === id;
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
  const [horizonYears, setHorizonYears] = useState(DEFAULT_HORIZON_YEARS);
  const [goal, setGoal] = useState<Goal | null>(null);

  const horizonMonths = horizonYears * 12;

  const handleChangeHorizon = (years: number) => {
    setHorizonYears(years);
    setSelectedMonth((prev) => Math.min(prev, years * 12));
  };

  const handleAddGroup = (name: string): string => {
    const id = newId();
    setGroups((prev) => [
      ...prev,
      { id, name, color: nextGroupColor(prev.length) },
    ]);
    return id;
  };
  const handleUpdateGroup = (
    id: string,
    input: { name: string; color: string },
  ) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...input } : g)),
    );
  };
  const handleRemoveGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setAssetClasses((prev) =>
      prev.map((a) => (a.groupId === id ? { ...a, groupId: undefined } : a)),
    );
    setIncomes((prev) =>
      prev.map((i) => (i.groupId === id ? { ...i, groupId: undefined } : i)),
    );
    setExpenses((prev) =>
      prev.map((e) => (e.groupId === id ? { ...e, groupId: undefined } : e)),
    );
    setGoal((prev) => (goalReferences(prev, "group", id) ? null : prev));
  };

  const handleAddAssetClass = (input: NewAssetClassInput) => {
    setAssetClasses((prev) => {
      const withNew = [
        ...(input.isPrimary
          ? prev.map((a) => ({ ...a, isPrimary: false }))
          : prev),
        { id: newId(), ...input, color: nextAssetColor(prev.length) },
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
  const handleChangeAssetColor = (id: string, color: string) => {
    setAssetClasses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, color } : a)),
    );
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
    setGoal((prev) => (goalReferences(prev, "asset", id) ? null : prev));
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

  const snapshots = useSimulation(simulationInput, today, horizonMonths);
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              {HORIZON_PRESET_YEARS.map((years) => (
                <button
                  key={years}
                  type="button"
                  onClick={() => handleChangeHorizon(years)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    horizonYears === years
                      ? "bg-indigo-500 text-white"
                      : "bg-white/80 text-gray-600"
                  }`}
                >
                  {years}년
                </button>
              ))}
            </div>
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
        </div>
        <div className="grid gap-4 md:grid-cols-[360px_1fr]">
          <InputPanel
            groups={groups}
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onRemoveGroup={handleRemoveGroup}
            assetClasses={assetClasses}
            onAddAssetClass={handleAddAssetClass}
            onUpdateAssetClass={handleUpdateAssetClass}
            onRemoveAssetClass={handleRemoveAssetClass}
            onSetPrimaryAsset={handleSetPrimaryAsset}
            onChangeAssetColor={handleChangeAssetColor}
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
            horizonMonths={horizonMonths}
          />
          <div className="flex flex-col gap-4">
            <TimelineSlider
              selectedMonth={selectedMonth}
              onChange={setSelectedMonth}
              today={today}
              horizonMonths={horizonMonths}
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
              <GoalCard
                goal={goal}
                onSetGoal={setGoal}
                assetClasses={assetClasses}
                groups={assetGroups}
                simulationInput={simulationInput}
                today={today}
                selectedSnapshot={selectedSnapshot}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `InputPanel.tsx` 전체 교체**

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
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  onChangeAssetColor: (id: string, color: string) => void;
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
  horizonMonths: number;
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onUpdateGroup={props.onUpdateGroup}
        onRemoveGroup={props.onRemoveGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onUpdateAssetClass={props.onUpdateAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onSetPrimaryAsset={props.onSetPrimaryAsset}
        onChangeAssetColor={props.onChangeAssetColor}
      />
      <IncomeSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onUpdateGroup={props.onUpdateGroup}
        onRemoveGroup={props.onRemoveGroup}
        incomes={props.incomes}
        onAddIncome={props.onAddIncome}
        onUpdateIncome={props.onUpdateIncome}
        onRemoveIncome={props.onRemoveIncome}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
      <ExpenseSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onUpdateGroup={props.onUpdateGroup}
        onRemoveGroup={props.onRemoveGroup}
        expenses={props.expenses}
        onAddExpense={props.onAddExpense}
        onUpdateExpense={props.onUpdateExpense}
        onRemoveExpense={props.onRemoveExpense}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
      <TransferRuleSection
        assetClasses={props.assetClasses}
        transferRules={props.transferRules}
        onAddTransferRule={props.onAddTransferRule}
        onUpdateTransferRule={props.onUpdateTransferRule}
        onRemoveTransferRule={props.onRemoveTransferRule}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
    </div>
  );
}
```

- [ ] **Step 3: 전체 타입체크·린트**

Run: `npx tsc --noEmit`
Expected: 에러 없음(프로젝트 전체, 스코프 제한 없이).

Run: `npm run lint`
Expected: 0 errors. 기존에 있던 무관한 파일들(`VisualNovelStudio`, `PixelArtMaker` 등)의 사전 존재 warning은 남아있어도 되지만, 이 라운드가 만진 파일에서 새 warning이 생기면 안 된다.

- [ ] **Step 4: Playwright 기반 골든 패스 확인(실제 dev 서버)**

`npm run dev`로 실제 `/playground` 페이지에서 자산 시뮬레이터 Work를 열고 확인한다: (1) 헤더의 5/10/20/30년 프리셋 버튼 클릭 시 슬라이더 최대치와 차트 x축 범위가 바뀌는지, (2) 30년으로 늘린 뒤 슬라이더를 맨 끝으로 옮기고 5년으로 다시 줄였을 때 슬라이더 값이 5년(60개월)을 넘지 않게 클램프되는지, (3) KRW 자산 2개를 다른 그룹으로 만들고 각각 다른 자산을 추가로 넣어 영역/막대 차트에서 자산별 색이 다르고 같은 그룹끼리는 테두리 색이 같은지, (4) 그룹 이름·색을 바꾸면 이미 그려진 차트의 테두리 색도 갱신되는지, (5) 그룹을 삭제하면 그 그룹에 속했던 자산의 그룹 배지가 사라지고 차트에서도 그룹 테두리가 없어지는지(자산 자체와 색은 유지), (6) "총자산" 기준으로 목표를 설정하고 실제 달성 시점이 표시되는지, 자산을 삭제해 목표 대상이 사라지는 시나리오("특정 자산" 목표 후 그 자산 삭제)에서 목표가 자동으로 초기화되는지.

- [ ] **Step 5: 커밋**

```bash
git add app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx app/\(portfolio\)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx
git commit -m "feat: AssetSimulator·InputPanel 최종 배선 — 범위 프리셋·색상·목표 카드 통합"
```

---

### Task 8: 전체 골든 패스 수동 검증

**Files:** 없음(코드 변경 없음, 검증만).

**Interfaces:** 없음.

- [ ] **Step 1: 타입 체크·린트 최종 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 2: 범위 프리셋 골든 패스**

`/asset-simulator`에서 기본 10년 상태로 KRW 자산 하나(초기 잔액 0)와 매월 100만원 무기한 수입을 추가한다. 30년으로 바꾸고 슬라이더를 맨 끝(360개월)까지 옮겨 정확히 3.6억원(360 × 100만원) 근처 값이 나오는지 확인한다. 5년으로 다시 바꾸면 슬라이더가 60개월로 클램프되고 차트 x축도 5년 범위로 다시 그려지는지 확인한다.

- [ ] **Step 3: 자산·그룹 색상 골든 패스**

자산군 4개를 만든다 — 2개는 "그룹A"에, 1개는 "그룹B"에, 1개는 그룹 없이. 도넛 차트에서 각 자산 슬라이스 색이 목록의 스와치 색과 일치하는지, 영역/막대 차트에서 그룹A 소속 2개 자산이 서로 다른 fill이지만 같은 stroke 색을 갖는지, 그룹 없는 자산은 stroke가 없는지 확인한다. 자산 하나의 색상 스와치를 클릭해 다른 색으로 바꾸면 세 차트(영역·막대·도넛) 모두 즉시 갱신되는지 확인한다.

- [ ] **Step 4: 그룹 편집 골든 패스**

`GroupPicker` 드롭다운을 열어 "그룹A"의 이름을 "생활비"로 바꾸고, 색을 다른 색으로 바꾼다. 목록·차트에 즉시 반영되는지 확인한다. "그룹B"를 삭제하고, 그 그룹에 속했던 자산의 그룹 배지가 사라지며 자산 자체와 자산 색은 그대로 남아있는지 확인한다.

- [ ] **Step 5: 목표 달성 예측 골든 패스**

"총자산" 기준으로 실제로 계산 가능한 목표(예: 현재 추세로 2~3년 내 달성 가능한 금액)를 설정하고 "약 N년 M개월 후 (YYYY.MM) 달성 예상" 문구가 뜨는지, 표시된 개월수가 슬라이더로 직접 이동해 확인한 실제 달성 시점과 일치하는지 확인한다. "특정 자산" 기준으로 그 자산을 삭제하면 목표가 자동으로 초기화되는지, "특정 그룹" 기준으로 그 그룹을 삭제해도 마찬가지인지 확인한다. 달성 불가능한 매우 큰 목표(예: 현재 추세로 500년 내 불가능한 금액)를 설정해 "500년 내 달성 불가" 문구가 뜨는지 확인한다.

- [ ] **Step 6: 회귀 확인 — v3 1라운드 기능**

수입/지출/이체 규칙의 반복·일시 스케줄 입력, 클릭 수정, Enter 제출 포커스 이동이 이번 라운드 변경 이후에도 정상 동작하는지 간단히 재확인한다(각 섹션에서 항목 하나씩 추가·수정·삭제).

- [ ] **Step 7: 독립 페이지 확인**

`/asset-simulator`(모달이 아닌 독립 페이지)에서도 위 항목들이 동일하게 동작하는지 확인한다.

이 태스크는 커밋할 코드 변경이 없다. 문제를 발견하면 해당 태스크로 돌아가 수정한다.

---
