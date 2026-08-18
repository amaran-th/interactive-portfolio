# 자산 시뮬레이터 (Asset Simulator) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플레이그라운드에 "자산 시뮬레이터" Work를 추가한다 — 다중 자산군·고정/비정기 수입·지출·자산군 간 이체 규칙을 입력하면, 슬라이더로 미래 시점을 넘겨보며 예상 자산 추이(스택 영역 그래프·그룹 도넛·자금 흐름도)를 확인하는 도구.

**Architecture:** 순수 계산 로직(`simulation.ts`)과 리액트 상태/렌더링(`AssetSimulator.tsx` + 하위 컴포넌트)을 분리한다. `AssetSimulator.tsx`가 모든 입력 상태를 소유하고, `useSimulation` 훅으로 매달 스냅샷 배열을 계산해 하위 컴포넌트(입력 폼, 슬라이더, 3종 SVG 차트)에 내려준다. 이 Work의 콘텐츠 영역과 모달 창은 프로젝트 기본 다크 테마 대신 라이트 글래스모피즘을 쓰며, 이를 위해 공유 컴포넌트 `WorkModal.tsx`에 조건부 테마를 추가한다(다른 Work는 영향 없음).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. 차트는 외부 라이브러리 없이 SVG로 직접 구현.

**Spec:** `docs/superpowers/specs/2026-08-18-asset-simulator-design.md`

## Global Constraints

- 저장은 세션 메모리(`useState`)만 사용한다 — localStorage 등 영속 저장 금지.
- `horizonMonths`는 120(10년) 고정값이다.
- 차트 3종(스택 영역·도넛·흐름도)은 외부 차트 라이브러리 없이 SVG로 직접 구현한다.
- 이 Work의 콘텐츠 영역과, 이 Work를 열었을 때의 모달 창 전체는 라이트 글래스모피즘 스타일을 쓴다. 다른 Work를 열 때 모달은 기존 다크 테마와 100% 동일해야 한다.
- 프로젝트에 테스트 스위트가 구성되어 있지 않다. 검증은 `npx tsc --noEmit`(타입 체크), `npm run lint`, 그리고 `npm run dev`로 브라우저에서 직접 확인하는 방식으로 한다. 순수 계산 로직(`simulation.ts`)만 예외적으로, 저장소 루트에 임시 스크립트를 만들어 `npx --yes tsx`로 실행해 값을 확인한 뒤 삭제한다.
- 모든 사용자 노출 문구는 CLAUDE.md의 Writing Guidelines(번역투 금지, 반복 표현 금지, 단정 가능한 사실은 단정형)를 따른다.

---

### Task 1: 타입 정의 & 색상 팔레트

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/types.ts`

**Interfaces:**
- Produces: `Group`, `AssetClass`, `FixedExpense`, `IrregularCashflow`, `TransferMode`, `TransferFrequency`, `TransferRule`, `SimulationInput`, `MonthFlow`, `MonthSnapshot`, `NewAssetClassInput`, `NewFixedExpenseInput`, `NewIrregularCashflowInput`, `NewTransferRuleInput`, `HORIZON_MONTHS`, `GROUP_PALETTE`, `nextGroupColor()`, `newId()` — 이후 모든 태스크가 이 타입들을 그대로 가져다 쓴다.

- [ ] **Step 1: 폴더 생성 및 types.ts 작성**

```ts
export type Group = {
  id: string;
  name: string;
  color: string;
};

export type AssetClass = {
  id: string;
  name: string;
  groupId: string;
  initialBalance: number;
  annualReturnRate: number;
  isPrimary: boolean;
};

export type FixedExpense = {
  id: string;
  name: string;
  amount: number;
};

export type IrregularCashflow = {
  id: string;
  name: string;
  amount: number;
  targetDate: string; // "YYYY-MM"
};

export type TransferMode = "fixed" | "percentOfSource";
export type TransferFrequency = "monthly" | "yearly";

export type TransferRule = {
  id: string;
  fromAssetId: string;
  toAssetId: string;
  mode: TransferMode;
  amount: number;
  frequency: TransferFrequency;
};

export type SimulationInput = {
  groups: Group[];
  assetClasses: AssetClass[];
  monthlyIncome: number;
  fixedExpenses: FixedExpense[];
  irregularIncomes: IrregularCashflow[];
  irregularExpenses: IrregularCashflow[];
  transferRules: TransferRule[];
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
  groupTotals: Record<string, number>;
  totalBalance: number;
  flow: MonthFlow;
};

export type NewAssetClassInput = {
  name: string;
  groupId: string;
  initialBalance: number;
  annualReturnRate: number;
  isPrimary: boolean;
};

export type NewFixedExpenseInput = { name: string; amount: number };

export type NewIrregularCashflowInput = {
  name: string;
  amount: number;
  targetDate: string;
};

export type NewTransferRuleInput = {
  fromAssetId: string;
  toAssetId: string;
  mode: TransferMode;
  amount: number;
  frequency: TransferFrequency;
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

export function nextGroupColor(existingCount: number): string {
  return GROUP_PALETTE[existingCount % GROUP_PALETTE.length];
}

export function newId(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (이 파일만으로는 아무것도 깨지지 않는다)

- [ ] **Step 3: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/types.ts"
git commit -m "feat: 자산 시뮬레이터 타입 정의 추가"
```

---

### Task 2: 시뮬레이션 순수 함수

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation.ts`

**Interfaces:**
- Consumes: Task 1의 모든 타입 (`SimulationInput`, `MonthSnapshot`, `HORIZON_MONTHS`, `AssetClass`, `Group`)
- Produces: `monthIndexFromTargetDate(targetDate: string, today: Date): number`, `runSimulation(input: SimulationInput, today?: Date): MonthSnapshot[]` — Task 3의 `useSimulation` 훅과 Task 5~7의 입력 섹션(비정기 수입/지출의 "N개월 후" 표시)이 이 함수들을 가져다 쓴다.

- [ ] **Step 1: simulation.ts 작성**

```ts
import {
  AssetClass,
  Group,
  HORIZON_MONTHS,
  MonthSnapshot,
  SimulationInput,
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

function computeGroupTotals(
  balances: Record<string, number>,
  assetClasses: AssetClass[],
  groups: Group[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const group of groups) {
    totals[group.id] = 0;
  }
  for (const asset of assetClasses) {
    totals[asset.groupId] = (totals[asset.groupId] ?? 0) + balances[asset.id];
  }
  return totals;
}

function sumBalances(balances: Record<string, number>): number {
  return Object.values(balances).reduce((sum, value) => sum + value, 0);
}

export function runSimulation(
  input: SimulationInput,
  today: Date = new Date(),
): MonthSnapshot[] {
  const { groups, assetClasses, transferRules } = input;
  const primary = assetClasses.find((asset) => asset.isPrimary);

  const balances: Record<string, number> = {};
  for (const asset of assetClasses) {
    balances[asset.id] = asset.initialBalance;
  }

  const snapshots: MonthSnapshot[] = [
    {
      monthIndex: 0,
      assetBalances: { ...balances },
      groupTotals: computeGroupTotals(balances, assetClasses, groups),
      totalBalance: sumBalances(balances),
      flow: { incomeIn: 0, expenseOut: 0, transfers: [] },
    },
  ];

  for (let month = 1; month <= HORIZON_MONTHS; month++) {
    const flow: MonthSnapshot["flow"] = {
      incomeIn: 0,
      expenseOut: 0,
      transfers: [],
    };

    if (primary) {
      const irregularIncomeThisMonth = input.irregularIncomes
        .filter(
          (item) => monthIndexFromTargetDate(item.targetDate, today) === month,
        )
        .reduce((sum, item) => sum + item.amount, 0);
      const incomeIn = input.monthlyIncome + irregularIncomeThisMonth;
      balances[primary.id] += incomeIn;
      flow.incomeIn = incomeIn;

      const fixedExpenseTotal = input.fixedExpenses.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
      const irregularExpenseThisMonth = input.irregularExpenses
        .filter(
          (item) => monthIndexFromTargetDate(item.targetDate, today) === month,
        )
        .reduce((sum, item) => sum + item.amount, 0);
      const expenseOut = fixedExpenseTotal + irregularExpenseThisMonth;
      balances[primary.id] -= expenseOut;
      flow.expenseOut = expenseOut;
    }

    for (const rule of transferRules) {
      const shouldRun =
        rule.frequency === "monthly" ||
        (rule.frequency === "yearly" && month % 12 === 0);
      if (!shouldRun) continue;

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

    snapshots.push({
      monthIndex: month,
      assetBalances: { ...balances },
      groupTotals: computeGroupTotals(balances, assetClasses, groups),
      totalBalance: sumBalances(balances),
      flow,
    });
  }

  return snapshots;
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 임시 스크립트로 계산 결과 수동 검증**

저장소 루트에 `verify-simulation.ts`를 만든다:

```ts
import { runSimulation } from "./app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation";

const today = new Date(2026, 0, 1); // 2026-01

const input = {
  groups: [{ id: "g1", name: "저축", color: "#000" }],
  assetClasses: [
    {
      id: "a1",
      name: "현금",
      groupId: "g1",
      initialBalance: 1_000_000,
      annualReturnRate: 0,
      isPrimary: true,
    },
  ],
  monthlyIncome: 500_000,
  fixedExpenses: [{ id: "f1", name: "월세", amount: 300_000 }],
  irregularIncomes: [
    { id: "i1", name: "상금", amount: 1_000_000, targetDate: "2026-03" },
  ],
  irregularExpenses: [],
  transferRules: [
    {
      id: "t1",
      fromAssetId: "a1",
      toAssetId: "a1",
      mode: "fixed" as const,
      amount: 0,
      frequency: "monthly" as const,
    },
  ],
};

const snapshots = runSimulation(input, today);

console.log("month0(초기):", snapshots[0].assetBalances.a1, "기대값 1000000");
console.log(
  "month1(수입-지출 1회):",
  snapshots[1].assetBalances.a1,
  "기대값 1200000",
);
console.log(
  "month3(비정기수입 반영):",
  snapshots[3].assetBalances.a1,
  "기대값",
  1_000_000 + 3 * (500_000 - 300_000) + 1_000_000,
);
console.log(
  "month12(1년 누적):",
  snapshots[12].assetBalances.a1,
  "기대값",
  1_000_000 + 12 * (500_000 - 300_000) + 1_000_000,
);
```

Run: `npx --yes tsx verify-simulation.ts`
Expected: 각 줄의 실제 값과 "기대값"이 일치한다.

- [ ] **Step 4: 임시 스크립트 삭제**

```bash
rm verify-simulation.ts
```

- [ ] **Step 5: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/simulation.ts"
git commit -m "feat: 자산 시뮬레이터 계산 엔진 추가"
```

---

### Task 3: useSimulation 훅 + AssetSimulator 셸 + 서비스 페이지 + data.tsx 등록

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/useSimulation.ts`
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx`
- Create: `app/(services)/asset-simulator/page.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/data.tsx`

**Interfaces:**
- Consumes: `runSimulation` (Task 2), `SimulationInput`/`MonthSnapshot`/`HORIZON_MONTHS` (Task 1)
- Produces: `useSimulation(input: SimulationInput): MonthSnapshot[]`, default export `AssetSimulator` — 이후 모든 InputPanel/차트 태스크가 `AssetSimulator.tsx`를 계속 수정한다. 이 태스크부터 `/asset-simulator`에서 매 태스크의 결과를 바로 확인할 수 있다.

- [ ] **Step 1: useSimulation.ts 작성**

```ts
import { useMemo } from "react";
import { MonthSnapshot, SimulationInput } from "./types";
import { runSimulation } from "./simulation";

export function useSimulation(input: SimulationInput): MonthSnapshot[] {
  return useMemo(() => runSimulation(input), [input]);
}
```

- [ ] **Step 2: AssetSimulator.tsx 셸 작성**

```tsx
"use client";

import { useState } from "react";
import { HORIZON_MONTHS, SimulationInput } from "./types";
import { useSimulation } from "./useSimulation";

const EMPTY_INPUT: SimulationInput = {
  groups: [],
  assetClasses: [],
  monthlyIncome: 0,
  fixedExpenses: [],
  irregularIncomes: [],
  irregularExpenses: [],
  transferRules: [],
};

export default function AssetSimulator() {
  const [selectedMonth, setSelectedMonth] = useState(0);
  const snapshots = useSimulation(EMPTY_INPUT);
  const selectedSnapshot = snapshots[selectedMonth];

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 text-gray-800">
      <p className="text-sm text-gray-500">
        선택 시점: {selectedMonth}개월 후 · 총자산{" "}
        {selectedSnapshot.totalBalance.toLocaleString()}원
      </p>
      <input
        type="range"
        min={0}
        max={HORIZON_MONTHS}
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(Number(e.target.value))}
        className="mt-4 w-full accent-indigo-500"
      />
    </div>
  );
}
```

- [ ] **Step 3: 서비스 페이지 작성**

```tsx
import type { Metadata } from "next";
import AssetSimulator from "@/app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator";

export const metadata: Metadata = {
  title: "자산 시뮬레이터",
  description:
    "현재 자산과 지출을 입력하고 슬라이더로 미래 시점을 넘겨보며 예상 자산 추이를 확인하세요.",
  openGraph: {
    title: "자산 시뮬레이터",
    description:
      "현재 자산과 지출을 입력하고 슬라이더로 미래 시점을 넘겨보며 예상 자산 추이를 확인하세요.",
  },
  twitter: {
    card: "summary_large_image",
    title: "자산 시뮬레이터",
    description:
      "현재 자산과 지출을 입력하고 슬라이더로 미래 시점을 넘겨보며 예상 자산 추이를 확인하세요.",
  },
};

export default function AssetSimulatorPage() {
  return (
    <main className="flex h-dvh justify-center overflow-hidden text-gray-800">
      <div className="h-full w-full max-w-5xl">
        <AssetSimulator />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 오늘 날짜 확인**

Run: `date "+%Y.%m.%d"`

출력된 날짜를 다음 단계의 `period` 시작일로 사용한다.

- [ ] **Step 5: data.tsx에 항목 추가**

`app/(portfolio)/playground/_sections/Works/data.tsx` 상단 import에 추가:

```tsx
import AssetSimulator from "./6_AssetSimulator/AssetSimulator";
```

`works` 배열 끝(id: 5 항목 뒤)에 추가:

```tsx
  {
    id: 6,
    title: "자산 시뮬레이터",
    description: `현재 자산과 고정·비정기 수입/지출을 입력하고, 슬라이더로 미래 시점을 넘기며 예상 자산 추이를 확인하는 도구입니다.

  📊 다중 자산군: 자산을 그룹으로 묶어 관리하고, 그룹별 구성 비율과 전체 추이를 함께 봅니다.

  💸 유연한 현금흐름: 월 고정수입/지출뿐 아니라 특정 날짜에 한 번 발생하는 비정기 수입/지출도 반영합니다.

  🔀 이체 규칙: 자산군 간 정기 이체(고정 금액 또는 비율)를 설정하면, 흐름도에서 그 달의 자금 이동을 확인할 수 있습니다.`,
    period: "YYYY.MM.DD - ", // Step 4에서 확인한 날짜로 치환
    platforms: [{ type: "pc" }, { type: "mobile" }],
    content: <AssetSimulator />,
    path: "/asset-simulator",
  },
```

- [ ] **Step 6: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 7: 수동 확인**

Run: `npm run dev`

`http://localhost:3000/asset-simulator`를 열어 라이트 그라디언트 배경, "선택 시점: 0개월 후 · 총자산 0원" 텍스트, 슬라이더가 보이는지 확인한다. 슬라이더를 움직여도 총자산은 계속 0원이어야 한다(아직 자산군이 없으므로 정상).

`http://localhost:3000/playground`에서도 새 카드가 캐러셀에 보이는지 확인한다.

- [ ] **Step 8: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/useSimulation.ts" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx" \
        "app/(services)/asset-simulator/page.tsx" \
        "app/(portfolio)/playground/_sections/Works/data.tsx"
git commit -m "feat: 자산 시뮬레이터 셸과 서비스 페이지, 플레이그라운드 등록 추가"
```

---

### Task 4: 그룹 & 자산군 입력 섹션

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupAssetSection.tsx`
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx`

**Interfaces:**
- Consumes: `Group`, `AssetClass`, `NewAssetClassInput`, `nextGroupColor`, `newId` (Task 1)
- Produces: `GroupAssetSectionProps`, `InputPanelProps`(그룹/자산군 필드만 우선 포함) — Task 5~7이 `InputPanel.tsx`를 계속 확장한다.

- [ ] **Step 1: GroupAssetSection.tsx 작성**

```tsx
"use client";

import { useState } from "react";
import { AssetClass, Group, NewAssetClassInput } from "../types";

type GroupAssetSectionProps = {
  groups: Group[];
  onAddGroup: (name: string) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
};

export default function GroupAssetSection({
  groups,
  onAddGroup,
  onRemoveGroup,
  assetClasses,
  onAddAssetClass,
  onRemoveAssetClass,
  onSetPrimaryAsset,
}: GroupAssetSectionProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetGroupId, setNewAssetGroupId] = useState("");
  const [newAssetBalance, setNewAssetBalance] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newAssetReturnRate, setNewAssetReturnRate] = useState("0");

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim());
    setNewGroupName("");
  };

  const handleAddAssetClass = () => {
    const groupId = newAssetGroupId || groups[0]?.id;
    if (!newAssetName.trim() || !groupId) return;
    onAddAssetClass({
      name: newAssetName.trim(),
      groupId,
      initialBalance: Number(newAssetBalance) || 0,
      annualReturnRate: Number(newAssetReturnRate) || 0,
      isPrimary: assetClasses.length === 0,
    });
    setNewAssetName("");
    setNewAssetBalance("");
    setNewAssetReturnRate("0");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">그룹</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {groups.map((group) => (
            <span
              key={group.id}
              className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              {group.name}
              <button
                type="button"
                onClick={() => onRemoveGroup(group.id)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="예: 저축, 투자"
            className="flex-1 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <button
            type="button"
            onClick={handleAddGroup}
            className="rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            추가
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">자산군</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {assetClasses.map((asset) => {
            const group = groups.find((g) => g.id === asset.groupId);
            return (
              <li
                key={asset.id}
                className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="primary-asset"
                    checked={asset.isPrimary}
                    onChange={() => onSetPrimaryAsset(asset.id)}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group?.color ?? "#ccc" }}
                  />
                  {asset.name}
                  <span className="text-gray-400">
                    {asset.initialBalance.toLocaleString()}원
                  </span>
                  {asset.isPrimary && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">
                      기본 계좌
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveAssetClass(asset.id)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={newAssetName}
              onChange={(e) => setNewAssetName(e.target.value)}
              placeholder="자산군 이름"
              className="flex-1 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
            />
            <select
              value={newAssetGroupId || groups[0]?.id || ""}
              onChange={(e) => setNewAssetGroupId(e.target.value)}
              className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
            >
              {groups.length === 0 && (
                <option value="">그룹을 먼저 추가하세요</option>
              )}
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <input
            value={newAssetBalance}
            onChange={(e) => setNewAssetBalance(e.target.value)}
            type="number"
            placeholder="현재 잔액"
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
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
                value={newAssetReturnRate}
                onChange={(e) => setNewAssetReturnRate(e.target.value)}
                type="number"
                className="w-20 rounded-full border border-white/60 bg-white/80 px-2 py-1"
              />
            </label>
          )}
          <button
            type="button"
            onClick={handleAddAssetClass}
            disabled={groups.length === 0}
            className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            자산군 추가
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: InputPanel.tsx 작성 (최초 버전, 그룹/자산군만)**

```tsx
"use client";

import { AssetClass, Group, NewAssetClassInput } from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";

type InputPanelProps = {
  groups: Group[];
  onAddGroup: (name: string) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onRemoveGroup={props.onRemoveGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onSetPrimaryAsset={props.onSetPrimaryAsset}
      />
    </div>
  );
}
```

- [ ] **Step 3: AssetSimulator.tsx 전체 교체**

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  AssetClass,
  Group,
  HORIZON_MONTHS,
  NewAssetClassInput,
  SimulationInput,
  newId,
  nextGroupColor,
} from "./types";
import { useSimulation } from "./useSimulation";
import InputPanel from "./InputPanel";

export default function AssetSimulator() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(0);

  const handleAddGroup = (name: string) => {
    setGroups((prev) => [
      ...prev,
      { id: newId(), name, color: nextGroupColor(prev.length) },
    ]);
  };
  const handleRemoveGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setAssetClasses((prev) => prev.filter((a) => a.groupId !== id));
  };
  const handleAddAssetClass = (input: NewAssetClassInput) => {
    setAssetClasses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleRemoveAssetClass = (id: string) => {
    setAssetClasses((prev) => prev.filter((a) => a.id !== id));
  };
  const handleSetPrimaryAsset = (id: string) => {
    setAssetClasses((prev) =>
      prev.map((a) => ({ ...a, isPrimary: a.id === id })),
    );
  };

  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups,
      assetClasses,
      monthlyIncome: 0,
      fixedExpenses: [],
      irregularIncomes: [],
      irregularExpenses: [],
      transferRules: [],
    }),
    [groups, assetClasses],
  );

  const snapshots = useSimulation(simulationInput);
  const selectedSnapshot = snapshots[selectedMonth];

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 p-4 text-gray-800">
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <InputPanel
          groups={groups}
          onAddGroup={handleAddGroup}
          onRemoveGroup={handleRemoveGroup}
          assetClasses={assetClasses}
          onAddAssetClass={handleAddAssetClass}
          onRemoveAssetClass={handleRemoveAssetClass}
          onSetPrimaryAsset={handleSetPrimaryAsset}
        />
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            선택 시점: {selectedMonth}개월 후 · 총자산{" "}
            {selectedSnapshot.totalBalance.toLocaleString()}원
          </p>
          <input
            type="range"
            min={0}
            max={HORIZON_MONTHS}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 수동 확인**

Run: `npm run dev`, `http://localhost:3000/asset-simulator` 접속.

그룹을 하나 추가하고(예: "저축"), 자산군을 하나 추가한다(예: "현금", 잔액 1000000). 목록에 라디오가 자동으로 첫 자산에 체크되어 "기본 계좌" 배지가 보이는지, "상세 옵션 보기"를 눌렀을 때 연 수익률 입력이 나타나는지 확인한다. 슬라이더를 끝까지 옮겨도 수입/지출이 없으므로 총자산은 입력한 잔액 그대로여야 한다.

- [ ] **Step 6: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/GroupAssetSection.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: 자산 시뮬레이터 그룹·자산군 입력 섹션 추가"
```

---

### Task 5: 수입 입력 섹션 (고정수입 + 비정기수입)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx`

**Interfaces:**
- Consumes: `IrregularCashflow`, `NewIrregularCashflowInput` (Task 1), `monthIndexFromTargetDate` (Task 2)
- Produces: `IncomeSectionProps` — 이 태스크에서 `InputPanel`에 `today: Date` prop이 새로 생기며, Task 6도 이 prop을 재사용한다.

- [ ] **Step 1: IncomeSection.tsx 작성**

```tsx
"use client";

import { useState } from "react";
import { IrregularCashflow, NewIrregularCashflowInput } from "../types";
import { monthIndexFromTargetDate } from "../simulation";

type IncomeSectionProps = {
  monthlyIncome: number;
  onChangeMonthlyIncome: (value: number) => void;
  irregularIncomes: IrregularCashflow[];
  onAddIrregularIncome: (input: NewIrregularCashflowInput) => void;
  onRemoveIrregularIncome: (id: string) => void;
  today: Date;
};

function toMonthInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function IncomeSection({
  monthlyIncome,
  onChangeMonthlyIncome,
  irregularIncomes,
  onAddIrregularIncome,
  onRemoveIrregularIncome,
  today,
}: IncomeSectionProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [targetDate, setTargetDate] = useState(toMonthInputValue(today));

  const handleAdd = () => {
    if (!name.trim() || !amount) return;
    onAddIrregularIncome({
      name: name.trim(),
      amount: Number(amount),
      targetDate,
    });
    setName("");
    setAmount("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">월 고정수입</h3>
        <input
          value={monthlyIncome || ""}
          onChange={(e) => onChangeMonthlyIncome(Number(e.target.value) || 0)}
          type="number"
          placeholder="월급 등"
          className="mt-2 w-full rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
        />
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">비정기 수입</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {irregularIncomes.map((item) => {
            const monthsFromNow = monthIndexFromTargetDate(
              item.targetDate,
              today,
            );
            return (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm"
              >
                <span>
                  {item.name} · {item.amount.toLocaleString()}원 ·{" "}
                  {monthsFromNow}개월 후
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveIrregularIncome(item.id)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 프리랜서 계약금"
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <div className="flex items-center gap-2">
            <input
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              type="month"
              min={toMonthInputValue(today)}
              className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-500">
              {monthIndexFromTargetDate(targetDate, today)}개월 후
            </span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: InputPanel.tsx에 IncomeSection 추가**

`InputPanel.tsx` 전체를 다음으로 교체한다:

```tsx
"use client";

import {
  AssetClass,
  Group,
  IrregularCashflow,
  NewAssetClassInput,
  NewIrregularCashflowInput,
} from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";
import IncomeSection from "./input-sections/IncomeSection";

type InputPanelProps = {
  groups: Group[];
  onAddGroup: (name: string) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  monthlyIncome: number;
  onChangeMonthlyIncome: (value: number) => void;
  irregularIncomes: IrregularCashflow[];
  onAddIrregularIncome: (input: NewIrregularCashflowInput) => void;
  onRemoveIrregularIncome: (id: string) => void;
  today: Date;
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onRemoveGroup={props.onRemoveGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onSetPrimaryAsset={props.onSetPrimaryAsset}
      />
      <IncomeSection
        monthlyIncome={props.monthlyIncome}
        onChangeMonthlyIncome={props.onChangeMonthlyIncome}
        irregularIncomes={props.irregularIncomes}
        onAddIrregularIncome={props.onAddIrregularIncome}
        onRemoveIrregularIncome={props.onRemoveIrregularIncome}
        today={props.today}
      />
    </div>
  );
}
```

- [ ] **Step 3: AssetSimulator.tsx 수정**

`AssetSimulator.tsx`에서 다음을 변경한다:

- `newId`는 이미 import 되어 있다. `NewIrregularCashflowInput` 타입을 import 목록에 추가한다.
- `useState` 목록에 아래를 추가:

```tsx
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [irregularIncomes, setIrregularIncomes] = useState<
    IrregularCashflow[]
  >([]);
  const today = useMemo(() => new Date(), []);
```

(`IrregularCashflow` 타입도 import 목록에 추가한다.)

- 핸들러 목록에 추가:

```tsx
  const handleAddIrregularIncome = (input: NewIrregularCashflowInput) => {
    setIrregularIncomes((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleRemoveIrregularIncome = (id: string) => {
    setIrregularIncomes((prev) => prev.filter((e) => e.id !== id));
  };
```

- `simulationInput`의 `useMemo`를 다음으로 교체:

```tsx
  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups,
      assetClasses,
      monthlyIncome,
      fixedExpenses: [],
      irregularIncomes,
      irregularExpenses: [],
      transferRules: [],
    }),
    [groups, assetClasses, monthlyIncome, irregularIncomes],
  );
```

- `<InputPanel ... />` 호출에 다음 prop들을 추가:

```tsx
          monthlyIncome={monthlyIncome}
          onChangeMonthlyIncome={setMonthlyIncome}
          irregularIncomes={irregularIncomes}
          onAddIrregularIncome={handleAddIrregularIncome}
          onRemoveIrregularIncome={handleRemoveIrregularIncome}
          today={today}
```

- [ ] **Step 4: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 수동 확인**

`http://localhost:3000/asset-simulator`에서 월 고정수입에 500000을 입력하고, 슬라이더를 1개월 후로 옮기면 총자산이 자산군 잔액 + 500000(기본 계좌가 지정된 경우)만큼 늘어나는지 확인한다. 비정기 수입을 다음 달로 추가하고 "1개월 후" 라벨이 맞는지, 날짜를 바꾸면 라벨도 같이 바뀌는지 확인한다.

- [ ] **Step 6: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/IncomeSection.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: 자산 시뮬레이터 수입 입력 섹션 추가"
```

---

### Task 6: 지출 입력 섹션 (고정지출 + 비정기지출)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx`

**Interfaces:**
- Consumes: `FixedExpense`, `IrregularCashflow`, `NewFixedExpenseInput`, `NewIrregularCashflowInput` (Task 1), `monthIndexFromTargetDate` (Task 2)
- Produces: `ExpenseSectionProps`

- [ ] **Step 1: ExpenseSection.tsx 작성**

```tsx
"use client";

import { useState } from "react";
import {
  FixedExpense,
  IrregularCashflow,
  NewFixedExpenseInput,
  NewIrregularCashflowInput,
} from "../types";
import { monthIndexFromTargetDate } from "../simulation";

type ExpenseSectionProps = {
  fixedExpenses: FixedExpense[];
  onAddFixedExpense: (input: NewFixedExpenseInput) => void;
  onRemoveFixedExpense: (id: string) => void;
  irregularExpenses: IrregularCashflow[];
  onAddIrregularExpense: (input: NewIrregularCashflowInput) => void;
  onRemoveIrregularExpense: (id: string) => void;
  today: Date;
};

function toMonthInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function ExpenseSection({
  fixedExpenses,
  onAddFixedExpense,
  onRemoveFixedExpense,
  irregularExpenses,
  onAddIrregularExpense,
  onRemoveIrregularExpense,
  today,
}: ExpenseSectionProps) {
  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [irregularName, setIrregularName] = useState("");
  const [irregularAmount, setIrregularAmount] = useState("");
  const [irregularDate, setIrregularDate] = useState(
    toMonthInputValue(today),
  );

  const handleAddFixed = () => {
    if (!fixedName.trim() || !fixedAmount) return;
    onAddFixedExpense({ name: fixedName.trim(), amount: Number(fixedAmount) });
    setFixedName("");
    setFixedAmount("");
  };

  const handleAddIrregular = () => {
    if (!irregularName.trim() || !irregularAmount) return;
    onAddIrregularExpense({
      name: irregularName.trim(),
      amount: Number(irregularAmount),
      targetDate: irregularDate,
    });
    setIrregularName("");
    setIrregularAmount("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">고정지출</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {fixedExpenses.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm"
            >
              <span>
                {item.name} · {item.amount.toLocaleString()}원/월
              </span>
              <button
                type="button"
                onClick={() => onRemoveFixedExpense(item.id)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            value={fixedName}
            onChange={(e) => setFixedName(e.target.value)}
            placeholder="예: 월세, 구독료"
            className="flex-1 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <input
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="w-28 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <button
            type="button"
            onClick={handleAddFixed}
            className="rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            추가
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
        <h3 className="text-sm font-semibold text-gray-800">비정기 지출</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {irregularExpenses.map((item) => {
            const monthsFromNow = monthIndexFromTargetDate(
              item.targetDate,
              today,
            );
            return (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm"
              >
                <span>
                  {item.name} · {item.amount.toLocaleString()}원 ·{" "}
                  {monthsFromNow}개월 후
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveIrregularExpense(item.id)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={irregularName}
            onChange={(e) => setIrregularName(e.target.value)}
            placeholder="예: 여행, 가전 교체"
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <input
            value={irregularAmount}
            onChange={(e) => setIrregularAmount(e.target.value)}
            type="number"
            placeholder="금액"
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
          />
          <div className="flex items-center gap-2">
            <input
              value={irregularDate}
              onChange={(e) => setIrregularDate(e.target.value)}
              type="month"
              min={toMonthInputValue(today)}
              className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-500">
              {monthIndexFromTargetDate(irregularDate, today)}개월 후
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddIrregular}
            className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: InputPanel.tsx에 ExpenseSection 추가**

`InputPanel.tsx` 전체를 다음으로 교체한다 (import에 `FixedExpense`, `NewFixedExpenseInput`, `ExpenseSection` 추가, props에 지출 관련 필드 추가):

```tsx
"use client";

import {
  AssetClass,
  FixedExpense,
  Group,
  IrregularCashflow,
  NewAssetClassInput,
  NewFixedExpenseInput,
  NewIrregularCashflowInput,
} from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";
import IncomeSection from "./input-sections/IncomeSection";
import ExpenseSection from "./input-sections/ExpenseSection";

type InputPanelProps = {
  groups: Group[];
  onAddGroup: (name: string) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  monthlyIncome: number;
  onChangeMonthlyIncome: (value: number) => void;
  irregularIncomes: IrregularCashflow[];
  onAddIrregularIncome: (input: NewIrregularCashflowInput) => void;
  onRemoveIrregularIncome: (id: string) => void;
  fixedExpenses: FixedExpense[];
  onAddFixedExpense: (input: NewFixedExpenseInput) => void;
  onRemoveFixedExpense: (id: string) => void;
  irregularExpenses: IrregularCashflow[];
  onAddIrregularExpense: (input: NewIrregularCashflowInput) => void;
  onRemoveIrregularExpense: (id: string) => void;
  today: Date;
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onRemoveGroup={props.onRemoveGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onSetPrimaryAsset={props.onSetPrimaryAsset}
      />
      <IncomeSection
        monthlyIncome={props.monthlyIncome}
        onChangeMonthlyIncome={props.onChangeMonthlyIncome}
        irregularIncomes={props.irregularIncomes}
        onAddIrregularIncome={props.onAddIrregularIncome}
        onRemoveIrregularIncome={props.onRemoveIrregularIncome}
        today={props.today}
      />
      <ExpenseSection
        fixedExpenses={props.fixedExpenses}
        onAddFixedExpense={props.onAddFixedExpense}
        onRemoveFixedExpense={props.onRemoveFixedExpense}
        irregularExpenses={props.irregularExpenses}
        onAddIrregularExpense={props.onAddIrregularExpense}
        onRemoveIrregularExpense={props.onRemoveIrregularExpense}
        today={props.today}
      />
    </div>
  );
}
```

- [ ] **Step 3: AssetSimulator.tsx 수정**

`FixedExpense`, `NewFixedExpenseInput` import 추가. `useState` 목록에 추가:

```tsx
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [irregularExpenses, setIrregularExpenses] = useState<
    IrregularCashflow[]
  >([]);
```

핸들러 추가:

```tsx
  const handleAddFixedExpense = (input: NewFixedExpenseInput) => {
    setFixedExpenses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleRemoveFixedExpense = (id: string) => {
    setFixedExpenses((prev) => prev.filter((e) => e.id !== id));
  };
  const handleAddIrregularExpense = (input: NewIrregularCashflowInput) => {
    setIrregularExpenses((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleRemoveIrregularExpense = (id: string) => {
    setIrregularExpenses((prev) => prev.filter((e) => e.id !== id));
  };
```

`simulationInput`을 다음으로 교체:

```tsx
  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups,
      assetClasses,
      monthlyIncome,
      fixedExpenses,
      irregularIncomes,
      irregularExpenses,
      transferRules: [],
    }),
    [
      groups,
      assetClasses,
      monthlyIncome,
      fixedExpenses,
      irregularIncomes,
      irregularExpenses,
    ],
  );
```

`<InputPanel ... />`에 prop 추가:

```tsx
          fixedExpenses={fixedExpenses}
          onAddFixedExpense={handleAddFixedExpense}
          onRemoveFixedExpense={handleRemoveFixedExpense}
          irregularExpenses={irregularExpenses}
          onAddIrregularExpense={handleAddIrregularExpense}
          onRemoveIrregularExpense={handleRemoveIrregularExpense}
```

- [ ] **Step 4: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 수동 확인**

고정지출을 추가하고 슬라이더를 옮기면 총자산이 (수입 - 지출)만큼씩 늘어나는지 확인한다. 비정기 지출을 특정 달로 추가하면 그 달에만 한 번 반영되는지(그 이전/이후 달과 비교) 확인한다.

- [ ] **Step 6: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/ExpenseSection.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: 자산 시뮬레이터 지출 입력 섹션 추가"
```

---

### Task 7: 이체 규칙 입력 섹션

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/TransferRuleSection.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx`

**Interfaces:**
- Consumes: `AssetClass`, `TransferRule`, `TransferMode`, `TransferFrequency`, `NewTransferRuleInput` (Task 1)
- Produces: `TransferRuleSectionProps`. 이 태스크를 끝으로 `InputPanel.tsx`는 완성된다.

- [ ] **Step 1: TransferRuleSection.tsx 작성**

```tsx
"use client";

import { useState } from "react";
import {
  AssetClass,
  NewTransferRuleInput,
  TransferFrequency,
  TransferMode,
  TransferRule,
} from "../types";

type TransferRuleSectionProps = {
  assetClasses: AssetClass[];
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
};

export default function TransferRuleSection({
  assetClasses,
  transferRules,
  onAddTransferRule,
  onRemoveTransferRule,
}: TransferRuleSectionProps) {
  const [fromAssetId, setFromAssetId] = useState("");
  const [toAssetId, setToAssetId] = useState("");
  const [mode, setMode] = useState<TransferMode>("fixed");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<TransferFrequency>("monthly");

  const nameOf = (id: string) =>
    assetClasses.find((a) => a.id === id)?.name ?? "?";

  const handleAdd = () => {
    const from = fromAssetId || assetClasses[0]?.id;
    const to = toAssetId || assetClasses[1]?.id;
    if (!from || !to || from === to || !amount) return;
    onAddTransferRule({
      fromAssetId: from,
      toAssetId: to,
      mode,
      amount: Number(amount),
      frequency,
    });
    setAmount("");
  };

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-gray-800">이체 규칙</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {transferRules.map((rule) => (
          <li
            key={rule.id}
            className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm"
          >
            <span>
              {nameOf(rule.fromAssetId)} → {nameOf(rule.toAssetId)} ·{" "}
              {rule.mode === "fixed"
                ? `${rule.amount.toLocaleString()}원`
                : `${rule.amount}%`}{" "}
              · {rule.frequency === "monthly" ? "매월" : "매년"}
            </span>
            <button
              type="button"
              onClick={() => onRemoveTransferRule(rule.id)}
              className="text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <select
            value={fromAssetId || assetClasses[0]?.id || ""}
            onChange={(e) => setFromAssetId(e.target.value)}
            className="flex-1 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
          >
            {assetClasses.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
          <span className="text-gray-400">→</span>
          <select
            value={toAssetId || assetClasses[1]?.id || ""}
            onChange={(e) => setToAssetId(e.target.value)}
            className="flex-1 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
          >
            {assetClasses.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as TransferMode)}
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="fixed">고정 금액</option>
            <option value="percentOfSource">출발 잔액 비율(%)</option>
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            placeholder={mode === "fixed" ? "금액" : "%"}
            className="w-24 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as TransferFrequency)}
            className="rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm"
          >
            <option value="monthly">매월</option>
            <option value="yearly">매년</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={assetClasses.length < 2}
          className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          이체 규칙 추가
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: InputPanel.tsx에 TransferRuleSection 추가**

`InputPanel.tsx` 전체를 다음으로 교체한다:

```tsx
"use client";

import {
  AssetClass,
  FixedExpense,
  Group,
  IrregularCashflow,
  NewAssetClassInput,
  NewFixedExpenseInput,
  NewIrregularCashflowInput,
  NewTransferRuleInput,
  TransferRule,
} from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";
import IncomeSection from "./input-sections/IncomeSection";
import ExpenseSection from "./input-sections/ExpenseSection";
import TransferRuleSection from "./input-sections/TransferRuleSection";

type InputPanelProps = {
  groups: Group[];
  onAddGroup: (name: string) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  monthlyIncome: number;
  onChangeMonthlyIncome: (value: number) => void;
  irregularIncomes: IrregularCashflow[];
  onAddIrregularIncome: (input: NewIrregularCashflowInput) => void;
  onRemoveIrregularIncome: (id: string) => void;
  fixedExpenses: FixedExpense[];
  onAddFixedExpense: (input: NewFixedExpenseInput) => void;
  onRemoveFixedExpense: (id: string) => void;
  irregularExpenses: IrregularCashflow[];
  onAddIrregularExpense: (input: NewIrregularCashflowInput) => void;
  onRemoveIrregularExpense: (id: string) => void;
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
  today: Date;
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onRemoveGroup={props.onRemoveGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onSetPrimaryAsset={props.onSetPrimaryAsset}
      />
      <IncomeSection
        monthlyIncome={props.monthlyIncome}
        onChangeMonthlyIncome={props.onChangeMonthlyIncome}
        irregularIncomes={props.irregularIncomes}
        onAddIrregularIncome={props.onAddIrregularIncome}
        onRemoveIrregularIncome={props.onRemoveIrregularIncome}
        today={props.today}
      />
      <ExpenseSection
        fixedExpenses={props.fixedExpenses}
        onAddFixedExpense={props.onAddFixedExpense}
        onRemoveFixedExpense={props.onRemoveFixedExpense}
        irregularExpenses={props.irregularExpenses}
        onAddIrregularExpense={props.onAddIrregularExpense}
        onRemoveIrregularExpense={props.onRemoveIrregularExpense}
        today={props.today}
      />
      <TransferRuleSection
        assetClasses={props.assetClasses}
        transferRules={props.transferRules}
        onAddTransferRule={props.onAddTransferRule}
        onRemoveTransferRule={props.onRemoveTransferRule}
      />
    </div>
  );
}
```

- [ ] **Step 3: AssetSimulator.tsx 수정**

`TransferRule`, `NewTransferRuleInput` import 추가. `useState` 목록에 추가:

```tsx
  const [transferRules, setTransferRules] = useState<TransferRule[]>([]);
```

핸들러 추가:

```tsx
  const handleAddTransferRule = (input: NewTransferRuleInput) => {
    setTransferRules((prev) => [...prev, { id: newId(), ...input }]);
  };
  const handleRemoveTransferRule = (id: string) => {
    setTransferRules((prev) => prev.filter((r) => r.id !== id));
  };
```

`simulationInput`을 다음으로 교체:

```tsx
  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups,
      assetClasses,
      monthlyIncome,
      fixedExpenses,
      irregularIncomes,
      irregularExpenses,
      transferRules,
    }),
    [
      groups,
      assetClasses,
      monthlyIncome,
      fixedExpenses,
      irregularIncomes,
      irregularExpenses,
      transferRules,
    ],
  );
```

`<InputPanel ... />`에 prop 추가:

```tsx
          transferRules={transferRules}
          onAddTransferRule={handleAddTransferRule}
          onRemoveTransferRule={handleRemoveTransferRule}
```

- [ ] **Step 4: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 수동 확인**

자산군 2개를 만들고, "매월 고정 금액" 이체 규칙을 하나 추가한 뒤 슬라이더를 여러 달 옮기며 출발 자산군 잔액이 줄고 도착 자산군 잔액이 느는지 확인한다. "출발 잔액 비율(%)" 모드로 큰 비율(예: 200%)을 넣어도 출발 잔액이 음수로 내려가지 않는지 확인한다.

- [ ] **Step 6: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/input-sections/TransferRuleSection.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/InputPanel.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: 자산 시뮬레이터 이체 규칙 입력 섹션 추가"
```

---

### Task 8: TimelineSlider 컴포넌트

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/TimelineSlider.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx`

**Interfaces:**
- Consumes: `HORIZON_MONTHS` (Task 1)
- Produces: `TimelineSliderProps` — Task 3에서 만든 임시 `<input type="range">` 블록을 이 컴포넌트로 교체한다.

- [ ] **Step 1: TimelineSlider.tsx 작성**

```tsx
"use client";

import { HORIZON_MONTHS } from "./types";

type TimelineSliderProps = {
  selectedMonth: number;
  onChange: (month: number) => void;
  totalBalance: number;
  today: Date;
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
  totalBalance,
  today,
}: TimelineSliderProps) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-500">
          {selectedMonth === 0
            ? "지금"
            : `${selectedMonth}개월 후 · ${formatMonthLabel(selectedMonth, today)}`}
        </span>
        <span className="text-lg font-semibold text-gray-800">
          {Math.round(totalBalance).toLocaleString()}원
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={HORIZON_MONTHS}
        value={selectedMonth}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-indigo-500"
      />
    </div>
  );
}
```

- [ ] **Step 2: AssetSimulator.tsx 수정**

`TimelineSlider` import 추가. 기존에 있던 다음 블록:

```tsx
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            선택 시점: {selectedMonth}개월 후 · 총자산{" "}
            {selectedSnapshot.totalBalance.toLocaleString()}원
          </p>
          <input
            type="range"
            min={0}
            max={HORIZON_MONTHS}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
```

를 다음으로 교체한다:

```tsx
        <div className="flex flex-col gap-4">
          <TimelineSlider
            selectedMonth={selectedMonth}
            onChange={setSelectedMonth}
            totalBalance={selectedSnapshot.totalBalance}
            today={today}
          />
        </div>
```

이제 `HORIZON_MONTHS`를 `AssetSimulator.tsx`에서 직접 쓰지 않게 되면, import 목록에서 제거한다(다른 곳에서 여전히 쓰고 있다면 유지).

- [ ] **Step 3: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 수동 확인**

`http://localhost:3000/asset-simulator`에서 슬라이더 위에 "지금" 또는 "N개월 후 · YYYY.MM" 라벨과 총자산 금액이 같이 표시되는지, 슬라이더를 움직이면 즉시 갱신되는지 확인한다.

- [ ] **Step 5: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/TimelineSlider.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: 자산 시뮬레이터 타임라인 슬라이더 컴포넌트 추가"
```

---

### Task 9: AssetAreaChart 컴포넌트 (스택 영역 그래프)

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetAreaChart.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx`

**Interfaces:**
- Consumes: `Group`, `MonthSnapshot` (Task 1)
- Produces: `AssetAreaChartProps`

- [ ] **Step 1: AssetAreaChart.tsx 작성**

```tsx
"use client";

import { Group, MonthSnapshot } from "./types";

type AssetAreaChartProps = {
  snapshots: MonthSnapshot[];
  groups: Group[];
  selectedMonth: number;
};

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = 12;

export default function AssetAreaChart({
  snapshots,
  groups,
  selectedMonth,
}: AssetAreaChartProps) {
  if (groups.length === 0 || snapshots.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        그룹과 자산군을 추가하면 그래프가 나타납니다
      </div>
    );
  }

  const maxTotal = Math.max(1, ...snapshots.map((s) => s.totalBalance));
  const stepX = (WIDTH - PADDING * 2) / (snapshots.length - 1);
  const scaleY = (value: number) =>
    HEIGHT - PADDING - (value / maxTotal) * (HEIGHT - PADDING * 2);

  let runningBottom = snapshots.map(() => 0);
  const bands = groups.map((group) => {
    const bottom = runningBottom;
    const top = snapshots.map(
      (snapshot, i) => bottom[i] + (snapshot.groupTotals[group.id] ?? 0),
    );
    runningBottom = top;

    const topPoints = top.map(
      (value, i) => `${PADDING + i * stepX},${scaleY(value)}`,
    );
    const bottomPoints = bottom
      .map((value, i) => `${PADDING + i * stepX},${scaleY(value)}`)
      .reverse();

    return {
      groupId: group.id,
      color: group.color,
      points: [...topPoints, ...bottomPoints].join(" "),
    };
  });

  const cursorX = PADDING + selectedMonth * stepX;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        {bands.map((band) => (
          <polygon
            key={band.groupId}
            points={band.points}
            fill={band.color}
            fillOpacity={0.55}
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

- [ ] **Step 2: AssetSimulator.tsx 수정**

`AssetAreaChart` import 추가. `<TimelineSlider ... />` 바로 아래에 추가:

```tsx
          <AssetAreaChart
            snapshots={snapshots}
            groups={groups}
            selectedMonth={selectedMonth}
          />
```

- [ ] **Step 3: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 수동 확인**

그룹 2개, 각 그룹에 자산군을 하나씩 만들고 값을 입력하면 두 색의 스택 영역이 겹쳐 쌓인 그래프가 나오는지, 슬라이더를 움직이면 점선 커서가 같이 움직이는지 확인한다. 그룹이 없을 때는 "그룹과 자산군을 추가하면 그래프가 나타납니다" 안내가 보여야 한다.

- [ ] **Step 5: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetAreaChart.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: 자산 시뮬레이터 스택 영역 그래프 추가"
```

---

### Task 10: GroupDonutChart 컴포넌트

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/GroupDonutChart.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx`

**Interfaces:**
- Consumes: `AssetClass`, `Group`, `MonthSnapshot` (Task 1)
- Produces: `GroupDonutChartProps`

- [ ] **Step 1: GroupDonutChart.tsx 작성**

```tsx
"use client";

import { useState } from "react";
import { AssetClass, Group, MonthSnapshot } from "./types";

type GroupDonutChartProps = {
  groups: Group[];
  assetClasses: AssetClass[];
  snapshot: MonthSnapshot;
};

const SIZE = 160;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SLICE_COLORS = [
  "#6366f1",
  "#a855f7",
  "#14b8a6",
  "#ec4899",
  "#3b82f6",
  "#f59e0b",
];

export default function GroupDonutChart({
  groups,
  assetClasses,
  snapshot,
}: GroupDonutChartProps) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
  const activeGroupId = groups.some((g) => g.id === selectedGroupId)
    ? selectedGroupId
    : groups[0]?.id;

  if (!activeGroupId) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        그룹을 추가하면 비율을 볼 수 있습니다
      </div>
    );
  }

  const assetsInGroup = assetClasses.filter(
    (a) => a.groupId === activeGroupId,
  );
  const groupTotal = snapshot.groupTotals[activeGroupId] ?? 0;

  let offset = 0;
  const slices = assetsInGroup.map((asset, i) => {
    const value = snapshot.assetBalances[asset.id] ?? 0;
    const ratio = groupTotal > 0 ? value / groupTotal : 0;
    const dash = ratio * CIRCUMFERENCE;
    const slice = {
      id: asset.id,
      name: asset.name,
      ratio,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      dashArray: `${dash} ${CIRCUMFERENCE - dash}`,
      dashOffset: -offset,
    };
    offset += dash;
    return slice;
  });

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setSelectedGroupId(group.id)}
            className={`rounded-full px-3 py-1 text-xs ${
              group.id === activeGroupId
                ? "bg-indigo-500 text-white"
                : "bg-white/80 text-gray-600"
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {assetsInGroup.length === 0 ? (
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
              {slice.name} · {Math.round(slice.ratio * 100)}%
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: AssetSimulator.tsx 수정**

`GroupDonutChart` import 추가. `<AssetAreaChart ... />` 아래에 그리드 래퍼와 함께 추가:

```tsx
          <div className="grid gap-4 md:grid-cols-2">
            <GroupDonutChart
              groups={groups}
              assetClasses={assetClasses}
              snapshot={selectedSnapshot}
            />
          </div>
```

- [ ] **Step 3: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 수동 확인**

한 그룹에 자산군 2개를 넣고 잔액을 다르게 입력하면 도넛에 두 조각이 비율대로 나뉘어 보이는지, 그룹 탭을 클릭하면 다른 그룹의 구성으로 바뀌는지, 슬라이더를 옮기면(이체 규칙이 있는 경우) 비율이 같이 바뀌는지 확인한다.

- [ ] **Step 5: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/GroupDonutChart.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: 자산 시뮬레이터 그룹 도넛 차트 추가"
```

---

### Task 11: FlowDiagram 컴포넌트 + 레이아웃 마무리

**Files:**
- Create: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/FlowDiagram.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx`

**Interfaces:**
- Consumes: `AssetClass`, `MonthSnapshot` (Task 1)
- Produces: `FlowDiagramProps`. 이 태스크에서 `AssetSimulator.tsx`의 결과 영역 레이아웃을 최종 형태로 정리한다.

- [ ] **Step 1: FlowDiagram.tsx 작성**

```tsx
"use client";

import { AssetClass, MonthSnapshot } from "./types";

type FlowDiagramProps = {
  snapshot: MonthSnapshot;
  primaryAsset: AssetClass | undefined;
  assetClasses: AssetClass[];
};

const WIDTH = 600;
const HEIGHT = 220;

function NodeBox({
  x,
  y,
  label,
  amount,
  color,
}: {
  x: number;
  y: number;
  label: string;
  amount: number;
  color: string;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width={140} height={44} rx={12} fill={color} fillOpacity={0.85} />
      <text
        x={70}
        y={18}
        textAnchor="middle"
        className="fill-white text-[11px] font-medium"
      >
        {label}
      </text>
      <text x={70} y={34} textAnchor="middle" className="fill-white text-[11px]">
        {Math.round(amount).toLocaleString()}원
      </text>
    </g>
  );
}

export default function FlowDiagram({
  snapshot,
  primaryAsset,
  assetClasses,
}: FlowDiagramProps) {
  if (!primaryAsset) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-sm text-gray-400 backdrop-blur">
        기본 계좌를 지정하면 흐름도가 나타납니다
      </div>
    );
  }

  const destinationTotals = new Map<string, number>();
  for (const transfer of snapshot.flow.transfers) {
    destinationTotals.set(
      transfer.toAssetId,
      (destinationTotals.get(transfer.toAssetId) ?? 0) + transfer.amount,
    );
  }

  const rightEntries: { id: string; label: string; amount: number }[] = [];
  if (snapshot.flow.expenseOut > 0) {
    rightEntries.push({
      id: "expense",
      label: "지출",
      amount: snapshot.flow.expenseOut,
    });
  }
  for (const [assetId, amount] of destinationTotals) {
    const asset = assetClasses.find((a) => a.id === assetId);
    if (asset && amount > 0) {
      rightEntries.push({ id: assetId, label: asset.name, amount });
    }
  }

  const maxAmount = Math.max(
    1,
    snapshot.flow.incomeIn,
    ...rightEntries.map((entry) => entry.amount),
  );
  const strokeWidth = (amount: number) => 1 + (amount / maxAmount) * 10;

  const incomeY = 20;
  const primaryY = 88;
  const rightGap =
    rightEntries.length > 0 ? HEIGHT / (rightEntries.length + 1) : HEIGHT / 2;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        {snapshot.flow.incomeIn > 0 && (
          <line
            x1={140}
            y1={incomeY + 22}
            x2={230}
            y2={primaryY + 22}
            stroke="#6366f1"
            strokeWidth={strokeWidth(snapshot.flow.incomeIn)}
            strokeOpacity={0.5}
          />
        )}
        {rightEntries.map((entry, i) => (
          <line
            key={entry.id}
            x1={370}
            y1={primaryY + 22}
            x2={460}
            y2={rightGap * (i + 1) + 22}
            stroke="#a855f7"
            strokeWidth={strokeWidth(entry.amount)}
            strokeOpacity={0.5}
          />
        ))}

        {snapshot.flow.incomeIn > 0 && (
          <NodeBox
            x={0}
            y={incomeY}
            label="수입"
            amount={snapshot.flow.incomeIn}
            color="#6366f1"
          />
        )}
        <NodeBox
          x={230}
          y={primaryY}
          label={primaryAsset.name}
          amount={snapshot.assetBalances[primaryAsset.id] ?? 0}
          color="#4338ca"
        />
        {rightEntries.map((entry, i) => (
          <NodeBox
            key={entry.id}
            x={460}
            y={rightGap * (i + 1)}
            label={entry.label}
            amount={entry.amount}
            color="#a855f7"
          />
        ))}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: AssetSimulator.tsx 최종 정리**

`FlowDiagram` import 추가. `primaryAsset`을 계산하는 줄을 `selectedSnapshot` 근처에 추가:

```tsx
  const primaryAsset = assetClasses.find((a) => a.isPrimary);
```

Task 10에서 만든 그리드 블록을 다음으로 교체(도넛과 흐름도를 나란히 배치):

```tsx
          <div className="grid gap-4 md:grid-cols-2">
            <GroupDonutChart
              groups={groups}
              assetClasses={assetClasses}
              snapshot={selectedSnapshot}
            />
            <FlowDiagram
              snapshot={selectedSnapshot}
              primaryAsset={primaryAsset}
              assetClasses={assetClasses}
            />
          </div>
```

- [ ] **Step 3: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 4: 수동 확인**

기본 계좌, 고정지출, 이체 규칙을 모두 설정한 상태에서 슬라이더를 이체가 실행되는 달로 옮기면 흐름도에 "수입 → 기본 계좌 → 지출/이체 대상"의 링크가 두께와 함께 나타나는지 확인한다. 기본 계좌가 없으면 안내 문구가 보여야 한다.

- [ ] **Step 5: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/FlowDiagram.tsx" \
        "app/(portfolio)/playground/_sections/Works/6_AssetSimulator/AssetSimulator.tsx"
git commit -m "feat: 자산 시뮬레이터 흐름도 컴포넌트 추가"
```

---

### Task 12: WorkModal 라이트 테마 오버라이드 + 전체 검증

**Files:**
- Modify: `app/(portfolio)/playground/_sections/Works/Work.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/WorkModal.tsx`
- Modify: `app/(portfolio)/playground/_sections/Works/data.tsx`

**Interfaces:**
- Consumes: `WorkItem` (Work.tsx)
- Produces: `WorkItem.theme?: "light"` — data.tsx의 자산 시뮬레이터 항목에서만 사용하고, 다른 항목은 이 필드를 넣지 않는다(따라서 기존 다크 테마 그대로 유지).

- [ ] **Step 1: WorkItem 타입에 theme 필드 추가**

`Work.tsx`의 `WorkItem` 인터페이스(6~16번 줄)에 `path?: string;` 다음 줄로 추가:

```tsx
  theme?: "light";
```

- [ ] **Step 2: WorkModal.tsx 전체 교체**

```tsx
"use client";

import { CalendarRange, ExternalLink, Monitor, Smartphone, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkItem } from "./Work";

const WORK_MODAL_THEME_DARK = "from-[#2a2c32] via-[#3a3d45] to-[#575b66]";
const WORK_MODAL_THEME_LIGHT = "from-indigo-100 via-blue-50 to-purple-100";

interface WorkModalProps {
  works: WorkItem[];
  selectedIndex: number;
  onNavigate: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkModal({
  works,
  selectedIndex,
  onNavigate,
  isOpen,
  onClose,
}: WorkModalProps) {
  const selected = works[selectedIndex];
  const [mobileView, setMobileView] = useState<"description" | "content">(
    "description",
  );
  const isLight = selected.theme === "light";
  const theme = isLight
    ? {
        shell: "bg-white",
        shellBorder: "md:border-black/10",
        headerGradient: WORK_MODAL_THEME_LIGHT,
        navButton: "hover:bg-black/10 text-gray-500 hover:text-gray-900",
        dotActive: "bg-gray-900",
        dotInactive: "bg-gray-900/30",
        title: "text-gray-900",
        tabBarBorder: "border-black/10 bg-black/5",
        tabInactive: "bg-black/5 text-gray-600",
        tabActive: "bg-gray-900 text-white",
        descWrap: "text-gray-700",
        divide: "md:divide-gray-200",
        contentDivider: "border-gray-200",
        divider: "border-black/10",
        infoBox: "border-black/10 bg-black/3",
        labelText: "text-gray-500",
        valueText: "text-gray-800",
        platformBadge: "border-black/10 bg-black/5 text-gray-700",
        platformIcon: "text-gray-500",
        specializedBadge: "border-indigo-400 bg-indigo-500 font-medium text-white",
        specializedIcon: "text-white",
        prose: "prose",
        closeButton: "bg-black/10 text-gray-500 hover:bg-black/20 hover:text-gray-900",
      }
    : {
        shell: "bg-gray-900",
        shellBorder: "md:border-white/10",
        headerGradient: WORK_MODAL_THEME_DARK,
        navButton: "hover:bg-white/20 text-white/70 hover:text-white",
        dotActive: "bg-white",
        dotInactive: "bg-white/30",
        title: "text-white",
        tabBarBorder: "border-white/10 bg-black/20",
        tabInactive: "bg-white/5 text-gray-300",
        tabActive: "bg-white text-gray-900",
        descWrap: "text-gray-300",
        divide: "md:divide-gray-800",
        contentDivider: "border-gray-800",
        divider: "border-white/10",
        infoBox: "border-white/10 bg-white/3",
        labelText: "text-gray-500",
        valueText: "text-gray-200",
        platformBadge: "border-white/10 bg-black/20 text-gray-200",
        platformIcon: "text-gray-500",
        specializedBadge: "border-white/80 bg-white font-medium text-gray-900",
        specializedIcon: "text-gray-700",
        prose: "prose prose-invert",
        closeButton: "bg-black/30 text-white/70 hover:bg-black/60 hover:text-white",
      };

  useEffect(() => {
    if (typeof document === "undefined" || !isOpen) {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileView("description");
  }, [isOpen, selectedIndex]);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: isOpen ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0)",
          backdropFilter: isOpen ? "blur(8px)" : "blur(0px)",
          transition: "background-color 0.3s ease, backdrop-filter 0.3s ease",
        }}
      />
      <div
        className={`relative h-full flex items-center justify-center transition-all duration-300
          ${isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        onClick={onClose}
      >
        <div
          className={`relative flex h-full w-full flex-col overflow-hidden ${theme.shell} md:h-[90vh] md:w-[90vw] md:rounded-xl md:border ${theme.shellBorder}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`bg-linear-to-br ${theme.headerGradient} shrink-0 px-4 py-4 flex flex-col items-center`}
          >
            <div className="flex gap-1 items-center">
              <button
                onClick={() => onNavigate(selectedIndex - 1)}
                disabled={selectedIndex === 0}
                className={`w-8 h-8 flex items-center justify-center rounded-full ${theme.navButton} disabled:opacity-20 disabled:cursor-not-allowed transition-all text-lg leading-none`}
              >
                ‹
              </button>
              {works.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(i)}
                  className={`p-1 flex items-center justify-center rounded-full ${theme.navButton} transition-all disabled:cursor-not-allowed`}
                >
                  <span
                    className={`rounded-full size-1.5 block transition-colors ${
                      i === selectedIndex ? theme.dotActive : theme.dotInactive
                    }`}
                  />
                </button>
              ))}
              <button
                onClick={() => onNavigate(selectedIndex + 1)}
                disabled={selectedIndex === works.length - 1}
                className={`w-8 h-8 flex items-center justify-center rounded-full ${theme.navButton} disabled:opacity-20 disabled:cursor-not-allowed transition-all text-lg leading-none`}
              >
                ›
              </button>
            </div>
            <div className="flex justify-center items-center gap-2">
              <h4 className={`${theme.title} text-center text-2xl font-bold`}>
                {selected.title}
              </h4>
              {selected.path && (
                <Link
                  href={selected.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink
                    className="inline-block opacity-60 hover:opacity-80"
                    size={20}
                  />
                </Link>
              )}
            </div>
          </div>
          <div
            className={`flex shrink-0 gap-2 border-b ${theme.tabBarBorder} px-4 py-3 md:hidden`}
          >
            <button
              type="button"
              onClick={() => setMobileView("description")}
              className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
                mobileView === "description" ? theme.tabActive : theme.tabInactive
              }`}
            >
              설명
            </button>
            <button
              type="button"
              onClick={() => setMobileView("content")}
              className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
                mobileView === "content" ? theme.tabActive : theme.tabInactive
              }`}
            >
              결과물
            </button>
          </div>
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${theme.descWrap} md:flex-row md:divide-x ${theme.divide}`}
          >
            <div
              className={`min-h-[40dvh] h-full shrink-0 border-b ${theme.contentDivider} md:min-h-0 md:w-[calc(80vh-64px)] md:border-b-0 ${
                mobileView === "content" ? "block" : "hidden md:block"
              }`}
            >
              {selected.content}
            </div>
            <div
              className={`flex-1 overflow-y-auto px-5 py-4 ${
                mobileView === "description" ? "block" : "hidden md:block"
              }`}
            >
              <div
                className={`mb-6 flex flex-col gap-3 rounded-2xl border ${theme.infoBox} px-4 py-4`}
              >
                {selected.period ? (
                  <div
                    className={`flex flex-col gap-2 border-b ${theme.divider} pb-3 sm:flex-row sm:items-center sm:justify-between`}
                  >
                    <p
                      className={`text-xs uppercase tracking-[0.18em] ${theme.labelText}`}
                    >
                      제작 기간
                    </p>
                    <p
                      className={`inline-flex items-center gap-2 text-sm ${theme.valueText}`}
                    >
                      <CalendarRange className="h-4 w-4 text-gray-500" />
                      {selected.period}
                    </p>
                  </div>
                ) : null}

                {selected.platforms?.length ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p
                      className={`text-xs uppercase tracking-[0.18em] ${theme.labelText}`}
                    >
                      지원 플랫폼
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selected.platforms.map((platform) => (
                        <span
                          key={platform.type}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                            platform.specialized
                              ? theme.specializedBadge
                              : theme.platformBadge
                          }`}
                        >
                          {platform.specialized ? (
                            <Star
                              className={`h-3.5 w-3.5 fill-current ${theme.specializedIcon}`}
                            />
                          ) : null}
                          {platform.type === "mobile" ? (
                            <Smartphone
                              className={`h-4 w-4 ${
                                platform.specialized
                                  ? theme.specializedIcon
                                  : theme.platformIcon
                              }`}
                            />
                          ) : (
                            <Monitor
                              className={`h-4 w-4 ${
                                platform.specialized
                                  ? theme.specializedIcon
                                  : theme.platformIcon
                              }`}
                            />
                          )}
                          {platform.type === "mobile" ? "모바일" : "PC"}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={`${theme.prose} text-pretty whitespace-pre-wrap`}>
                {selected.description}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors ${theme.closeButton}`}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: data.tsx의 자산 시뮬레이터 항목에 theme 추가**

Task 3에서 추가한 id: 6 항목의 `path: "/asset-simulator",` 다음 줄에 추가:

```tsx
    theme: "light",
```

- [ ] **Step 4: 타입 체크 및 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 골든 패스 전체 수동 검증**

Run: `npm run dev`

1. `http://localhost:3000/playground`에서 캐러셀을 넘겨 다른 Work(예: 뜨개뜨개)를 열어본다 — 모달이 기존 다크 테마 그대로인지(색이 하나도 안 바뀌었는지) 확인한다.
2. 같은 캐러셀에서 "자산 시뮬레이터"를 열어본다 — 모달 헤더·설명 패널·탭·닫기 버튼이 전부 라이트 톤으로 바뀌어 있는지 확인한다.
3. 자산 시뮬레이터 안에서 그룹 2개(예: 저축, 투자), 자산군 3개(그중 하나는 기본 계좌), 월 고정수입, 고정지출 1개, 비정기 수입/지출 각 1개, 이체 규칙 1개를 모두 설정한다.
4. 슬라이더를 0개월부터 120개월까지 여러 지점으로 옮기며: 총자산 숫자, 스택 영역 그래프의 커서, 그룹 도넛 비율, 흐름도가 모두 같은 시점 기준으로 일관되게 바뀌는지 확인한다.
5. 자산군을 모두 삭제해 "그룹과 자산군을 추가하면 그래프가 나타납니다" 같은 빈 상태 안내들이 깨지지 않고 나오는지 확인한다.
6. `http://localhost:3000/asset-simulator`(독립 페이지)도 동일하게 동작하는지 확인한다.

- [ ] **Step 6: Commit**

```bash
git add "app/(portfolio)/playground/_sections/Works/Work.tsx" \
        "app/(portfolio)/playground/_sections/Works/WorkModal.tsx" \
        "app/(portfolio)/playground/_sections/Works/data.tsx"
git commit -m "feat: 자산 시뮬레이터용 모달 라이트 테마 오버라이드 추가"
```
